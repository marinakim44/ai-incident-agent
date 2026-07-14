variable "access_key" {}
variable "secret_key" {}
variable "aws_region" {}

variable "project_name" {
  description = "Prefix used for AWS resource names."
  type        = string
  default     = "ai-incident-agent"
}

variable "health_check_interval_minutes" {
  description = "How often the health check Lambda should run."
  type        = number
  default     = 1
}

variable "backend_url" {
  description = "Backend URL monitored by the health check."
  type        = string
}

variable "incident_id" {
  description = "Unique identifier used to track the monitored service."
  type        = string
  default     = "platform"
}

variable "agent_runtime_arn" {
  description = "ARN of the Bedrock AgentCore runtime."
  type        = string
}