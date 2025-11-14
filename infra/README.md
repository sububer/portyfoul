# Portyfoul AWS Infrastructure

This directory contains CloudFormation templates and configuration for deploying Portyfoul to AWS using ECS Fargate.

## Architecture Overview

```
Internet
    ↓
Application Load Balancer (Public Subnet - 10.0.1.0/24)
    ↓
ECS Web Service (Private Subnet 1 - 10.0.2.0/24)
    ↓
RDS PostgreSQL (Private Subnets 1 & 2 - 10.0.2.0/24, 10.0.3.0/24)
    ↑
ECS Worker Service (Private Subnet 1 - 10.0.2.0/24)
```

### Current Implementation Status

**Phase 1: Foundation & VPC** ✅
- VPC with CIDR 10.0.0.0/16
- Internet Gateway for public internet access
- NAT Gateway for private subnet internet access
- Public subnet (10.0.1.0/24) for Application Load Balancer
- Private subnet 1 (10.0.2.0/24) for ECS tasks and RDS
- Private subnet 2 (10.0.3.0/24) for RDS (multi-AZ requirement)
- Route tables with proper routing

**Upcoming Phases**:
- Phase 2: RDS PostgreSQL database
- Phase 3: ECR repository and deployment scripts
- Phase 4: ECS cluster and IAM roles
- Phase 5: Application Load Balancer
- Phase 6: ECS web service
- Phase 7: ECS worker service
- Phase 8: Deployment automation
- Phase 9: Secrets management
- Phase 10: Monitoring and documentation

## Prerequisites

- AWS CLI installed and configured
- AWS account with appropriate permissions to create:
  - VPC and networking resources
  - ECS clusters and services
  - RDS instances
  - IAM roles and policies
  - Secrets Manager secrets
  - CloudWatch resources
- Appropriate AWS credentials configured (`aws configure`)

## Files

- `main.yaml` - Main CloudFormation template
- `parameters.json` - CloudFormation stack parameters
- `README.md` - This documentation

## Initial Deployment

### Step 1: Validate the Template

Before deploying, validate the CloudFormation template:

```bash
aws cloudformation validate-template \
  --template-body file://infra/main.yaml
```

### Step 2: Create the Stack

Deploy the infrastructure stack:

```bash
aws cloudformation create-stack \
  --stack-name portyfoul-infra \
  --template-body file://infra/main.yaml \
  --parameters file://infra/parameters.json \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

**Note**: Adjust the `--region` parameter as needed for your deployment.

### Step 3: Monitor Stack Creation

Watch the stack creation progress:

```bash
aws cloudformation describe-stack-events \
  --stack-name portyfoul-infra \
  --region us-east-1
```

Or wait for completion:

```bash
aws cloudformation wait stack-create-complete \
  --stack-name portyfoul-infra \
  --region us-east-1
```

This typically takes 3-5 minutes (mostly waiting for NAT Gateway creation).

### Step 4: View Stack Outputs

Once the stack is created, view the outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name portyfoul-infra \
  --region us-east-1 \
  --query 'Stacks[0].Outputs'
```

## Updating the Infrastructure

When you make changes to the CloudFormation template:

### Step 1: Validate Changes

```bash
aws cloudformation validate-template \
  --template-body file://infra/main.yaml
```

### Step 2: Create Change Set (Recommended)

Preview changes before applying:

```bash
aws cloudformation create-change-set \
  --stack-name portyfoul-infra \
  --template-body file://infra/main.yaml \
  --parameters file://infra/parameters.json \
  --capabilities CAPABILITY_IAM \
  --change-set-name my-changes \
  --region us-east-1
```

View the change set:

```bash
aws cloudformation describe-change-set \
  --stack-name portyfoul-infra \
  --change-set-name my-changes \
  --region us-east-1
```

Execute the change set:

```bash
aws cloudformation execute-change-set \
  --stack-name portyfoul-infra \
  --change-set-name my-changes \
  --region us-east-1
```

### Step 3: Or Update Directly

Alternatively, update the stack directly:

```bash
aws cloudformation update-stack \
  --stack-name portyfoul-infra \
  --template-body file://infra/main.yaml \
  --parameters file://infra/parameters.json \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

Wait for update to complete:

```bash
aws cloudformation wait stack-update-complete \
  --stack-name portyfoul-infra \
  --region us-east-1
```

## Deleting the Infrastructure

**WARNING**: This will delete all resources including databases. Make sure you have backups!

```bash
aws cloudformation delete-stack \
  --stack-name portyfoul-infra \
  --region us-east-1
```

Wait for deletion to complete:

```bash
aws cloudformation wait stack-delete-complete \
  --stack-name portyfoul-infra \
  --region us-east-1
```

## Current Resources

### Phase 1: VPC and Networking

| Resource Type | Resource Name | Purpose |
|---------------|---------------|---------|
| VPC | portyfoul-dev-vpc | Main VPC (10.0.0.0/16) |
| Internet Gateway | portyfoul-dev-igw | Public internet access |
| NAT Gateway | portyfoul-dev-nat | Private subnet internet access |
| Elastic IP | portyfoul-dev-nat-eip | Static IP for NAT Gateway |
| Subnet (Public) | portyfoul-dev-public-subnet | ALB subnet (10.0.1.0/24) |
| Subnet (Private 1) | portyfoul-dev-private-subnet-1 | ECS/RDS subnet (10.0.2.0/24) |
| Subnet (Private 2) | portyfoul-dev-private-subnet-2 | RDS subnet (10.0.3.0/24) |
| Route Table (Public) | portyfoul-dev-public-rt | Routes to Internet Gateway |
| Route Table (Private) | portyfoul-dev-private-rt | Routes to NAT Gateway |

### Stack Outputs

The CloudFormation stack exports these values for use by other stacks or resources:

- `portyfoul-dev-VPCId` - VPC ID
- `portyfoul-dev-VPCCidr` - VPC CIDR block
- `portyfoul-dev-PublicSubnetId` - Public subnet ID
- `portyfoul-dev-PrivateSubnet1Id` - Private subnet 1 ID
- `portyfoul-dev-PrivateSubnet2Id` - Private subnet 2 ID
- `portyfoul-dev-NATGatewayId` - NAT Gateway ID
- `portyfoul-dev-InternetGatewayId` - Internet Gateway ID

## Configuration

### Parameters

Edit `parameters.json` to customize:

- `Environment`: Environment name (dev, staging, production)
- `ProjectName`: Project name for resource naming (default: portyfoul)

### Network CIDR Blocks

The VPC uses the following CIDR allocation:

- VPC: `10.0.0.0/16` (65,536 addresses)
- Public Subnet: `10.0.1.0/24` (256 addresses) - for ALB
- Private Subnet 1: `10.0.2.0/24` (256 addresses) - for ECS and RDS
- Private Subnet 2: `10.0.3.0/24` (256 addresses) - for RDS Multi-AZ
- Reserved: `10.0.4.0/22` onwards for future expansion

To change CIDR blocks, edit the `CidrBlock` properties in `main.yaml`.

## Cost Estimation

Approximate monthly costs for Phase 1 (VPC only):

- **NAT Gateway**: ~$32/month (730 hours × $0.045/hour)
- **Elastic IP**: $0 (while attached to NAT Gateway)
- **VPC/Subnets**: Free
- **Data Transfer through NAT**: ~$0.045/GB (variable)

**Estimated Phase 1 cost**: ~$32-40/month

**Note**: Costs will increase significantly in later phases when adding ECS, RDS, ALB, etc.

## Troubleshooting

### Stack Creation Fails

1. Check CloudFormation events for specific error:
   ```bash
   aws cloudformation describe-stack-events \
     --stack-name portyfoul-infra \
     --region us-east-1 | head -50
   ```

2. Common issues:
   - Insufficient permissions - ensure IAM user/role has VPC creation permissions
   - Resource limits - check VPC, EIP, or NAT Gateway limits in your account
   - Region availability - ensure NAT Gateway is available in your region

### Template Validation Errors

If template validation fails:

1. Check YAML syntax (indentation, structure)
2. Verify all CloudFormation resource types are correct
3. Ensure parameter references use `!Ref` or `!Sub` correctly

### Cannot Delete Stack

If stack deletion fails:

1. Check for dependencies (other stacks using exports)
2. Manually delete dependent resources first
3. Use AWS Console to identify stuck resources
4. Contact AWS support for VPC deletion issues

## Security Considerations

### Current Security Posture

- **Network Isolation**: Private subnets have no direct internet access (only via NAT Gateway)
- **Future Considerations**:
  - Add security groups (Phase 5: ALB, ECS)
  - Add Network ACLs if needed
  - Enable VPC Flow Logs for audit trail
  - Consider AWS PrivateLink for AWS service access

## Next Steps

After completing Phase 1:

1. **Phase 2**: Add RDS PostgreSQL database
2. **Phase 3**: Set up ECR and deployment scripts
3. Continue through remaining phases per `infra_plan_spec.md`

See `../infra_plan_spec.md` for the complete implementation plan.

## Support

For issues or questions:
- Review AWS CloudFormation documentation
- Check CloudFormation stack events for detailed error messages
- Refer to `../infra_plan_spec.md` for architecture decisions
