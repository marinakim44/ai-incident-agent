terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
    access_key = var.access_key
    secret_key = var.secret_key
    region = var.aws_region
}