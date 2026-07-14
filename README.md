# AI Incident Response Agent

An open source AI incident response agent built with Amazon Bedrock AgentCore.

This AI agent can investigate production incidents by gathering evidence from cloud infrastructure, reasoning over the collected information, and producing an incident report. It also explores the engineering challenges involved in building reliable agentic systems beyond prompt engineering.

This repository is intended as a learning resource and a reference implementation for developers interested in building AI agents that interact with real infrastructure.

## What the agent does?

When an incident is detected, the agent can:

- investigate application availability
- inspect AWS infrastructure
- analyse CloudWatch metrics and logs
- inspect Elastic Beanstalk environments
- identify likely root causes
- recommend remediation actions
- execute approved remediation tools
- generate a structured incident report

The exact investigation workflow depends on the tools made available to the agent.

## Architecture / Terraform

This repository includes a Terraform project that provisions the infrastructure required to run the AI incident response system on AWS.

The default architecture consists of:

- Amazon EventBridge schedule that triggers a monitoring Lambda at a configurable interval
- AWS Lambda function responsible for monitoring the health of one or more system components
- Amazon DynamoDB table used to track the incident state and prevent duplicate investigations
- Amazon Bedrock AgentCore runtime hosting the AI incident response agent
- Amazon Bedrock Guardrails protecting the agent during execution
- IAM roles and policies granting the minimum permissions required for monitoring and investigation

### Monitoring Lambda

The monitoring Lambda performs health checks against the configured endpoints. If one or more components are unavailable and there is no active incident, it invokes the AI agent and passes the monitoring results as the starting context for the investigation.

The agent can then:

- investigate the incident using the available tools
- gather evidence from AWS services
- perform remediation actions (where configured)
- produce a structured incident report
- optionally send the report via email

The Terraform configuration is intended as a reference implementation. The monitoring layer can be replaced with any system capable of invoking the agent, such as CloudWatch alarms, third-party monitoring platforms, or existing incident management systems.

## Running locally

### Prerequisites

- Node.js 22+
- AWS CLI configured
- Bedrock model access enabled
- Appropriate IAM permissions

1. Install dependencies `npm install`
2. Configure environment variables `cp .env.example .env`
3. Run locally `npm start`

Important: asjust components of agentic system to align with your application, e.g.:

- prompt.js
- .env
- aws-targets.json
- toolsConfig.js
- your Bedrock Guardrail ID(s)
- list of your Lambda functions

# Deployment

Deployment

Before deploying the agent to your AWS account, update the deployment configuration.

1. Configure the deployment target

Edit incidentagent/aws-targets.json and replace the account ID with your own AWS account.

2. Configure the infrastructure

Update infra/terraform.tfvars with values appropriate for your environment, such as:

- project name
- frontend URL
- backend URL
- AgentCore runtime ARN

3. Provision the infrastructure

- cd infra
- terraform init
- terraform apply

4. Deploy the agent

Deploy the agent to Amazon Bedrock AgentCore using the AgentCore CLI `cdk deploy`, but you can also use AgentCore CLI command `agentcore deploy` if it works for you

## Configuration

Most behaviour is configurable through:

- system prompt
- tool configuration
- IAM permissions
- Bedrock Guardrails
- execution limits

The agent itself contains very little infrastructure-specific logic.

# Production considerations

This repository intentionally includes patterns that became important while building a production-ready agent.

Examples include:

- clear separation of responsibilities between deterministic code and LLM reasoning
- IAM-scoped tool permissions
- tool allow-lists
- execution limits
- observability / investigation timeline / audit traces
- structured incident reports
- enabled guardrails

# Limitations

This project is intended as a reference implementation.
It is not a complete incident management platform and does not include:

- monitoring
- alerting
- authentication
- dashboards
- CI/CD
- production deployment pipelines

Those components will vary depending on the environment in which the agent is deployed.

# Contributing

Issues and pull requests are welcome.

If you find bugs or have ideas for improving the project, feel free to open an issue or submit a pull request.

MIT License
