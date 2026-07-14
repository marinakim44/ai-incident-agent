resource "aws_cloudwatch_event_rule" "incident_schedule" {
  name                = "${var.project_name}-incident-check"
  schedule_expression = "rate(${var.health_check_interval_minutes} minute${var.health_check_interval_minutes == 1 ? "" : "s"})"
}

data "archive_file" "health_check_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/health-check"
  output_path = "${path.module}/health-check.zip"
}

resource "aws_iam_role" "health_check_lambda" {
  name = "${var.project_name}-health-check-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.health_check_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "health_check" {
  function_name = "${var.project_name}-health-check"
  environment {
    variables = {
      AWS_REGION       = var.aws_region
      FRONTEND_URL     = var.frontend_url
      BACKEND_URL      = var.backend_url
      INCIDENT_TABLE   = aws_dynamodb_table.incident_state.name
      INCIDENT_ID      = var.incident_id
      AGENT_RUNTIME_ARN = var.agent_runtime_arn
    }
  }

  role    = aws_iam_role.health_check_lambda.arn
  handler = "index.handler"
  runtime = "nodejs22.x"
  timeout = 30

  filename         = data.archive_file.health_check_zip.output_path
  source_code_hash = data.archive_file.health_check_zip.output_base64sha256
}

resource "aws_cloudwatch_event_target" "health_check_lambda" {
  rule = aws_cloudwatch_event_rule.incident_schedule.name
  arn  = aws_lambda_function.health_check.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health_check.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.incident_schedule.arn
}

resource "aws_iam_role_policy" "invoke_agentcore" {
  name = "invoke-agentcore"
  role = aws_iam_role.health_check_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock-agentcore:InvokeAgentRuntime"
        ]
        Resource = [
          "*"
        ]
      }
    ]
  })
}

resource "aws_dynamodb_table" "incident_state" {
  name         = "${var.project_name}-incident-state"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

resource "aws_iam_role_policy" "incident_state_access" {
  name = "incident-state-access"
  role = aws_iam_role.health_check_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.incident_state.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "elastic_beanstalk_access" {
  name = "elastic-beanstalk-access"
  role = aws_iam_role.health_check_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticbeanstalk:DescribeEnvironments"
        ]
        Resource = "*"
      }
    ]
  })
}