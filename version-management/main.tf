terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region  = "us-west-2"
}

resource "aws_ecr_repository" "repositories" {
  for_each = toset( ["deployer", "l2geth", "integration-tests", "gas-oracle", "batch-submitter-service", "data-transport-layer", "proxyd", "balance-maintainer", "fault-detector"] )
  name                 = each.key
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
