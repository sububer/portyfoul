# AWS ECS Infrastructure Plan for Portyfoul

## Deployment Status

**AWS Region**: `us-east-2` (Ohio)
**CloudFormation Stack**: `portyfoul-infra`
**Stack Status**: `UPDATE_COMPLETE`
**Last Updated**: 2025-11-15

### Phase Progress

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ COMPLETED | Foundation & VPC - Deployed 2025-11-14 |
| Phase 2 | ✅ COMPLETED | RDS Database - Deployed 2025-11-15 |
| Phase 3 | ✅ COMPLETED | ECR & Deployment Script - Deployed 2025-11-15 |
| Phase 4 | ✅ COMPLETED | ECS Cluster & IAM - Deployed 2025-11-15 |
| Phase 5 | ✅ COMPLETED | Application Load Balancer - Deployed 2025-11-15 |
| Phase 6 | ✅ COMPLETED | Web Service (ECS) - Deployed 2025-11-15 |
| Phase 7 | 🔜 PENDING | Worker Service (ECS) |
| Phase 8 | 🔜 PENDING | Deployment Automation |
| Phase 9 | 🔜 PENDING | Secrets & Configuration |
| Phase 10 | 🔜 PENDING | Final Polish & Documentation |

### Deployed Resources

**Phase 1: Networking**
| Resource Type | Resource ID | CIDR/Details |
|---------------|-------------|--------------|
| VPC | `vpc-03e4e25ca7d9071a8` | 10.0.0.0/16 |
| Public Subnet | `subnet-079228717b3ec772d` | 10.0.1.0/24 (AZ: us-east-2a) |
| Private Subnet 1 | `subnet-02c50bb72212c4dba` | 10.0.2.0/24 (AZ: us-east-2a) |
| Private Subnet 2 | `subnet-044369b3db4cd5f7b` | 10.0.3.0/24 (AZ: us-east-2b) |
| Internet Gateway | `igw-06d1030d022e593ac` | - |
| NAT Gateway | `nat-0c4b574eccdaaba0e` | Public Subnet |

**Phase 2: RDS Database**
| Resource Type | Resource ID | Details |
|---------------|-------------|---------|
| RDS PostgreSQL | `portyfoul-dev-postgres` | PostgreSQL 17.2, db.t4g.micro, 20GB |
| RDS Endpoint | `portyfoul-dev-postgres.c1oump9unpwz.us-east-2.rds.amazonaws.com` | Port 5432 |
| DB Security Group | `sg-0ecbb448f9fb32e5c` | Allows 5432 from VPC |
| DB Subnet Group | `portyfoul-dev-db-subnet-group` | Spans us-east-2a, us-east-2b |
| Secrets Manager | `portyfoul/dev/rds/credentials` | Auto-generated credentials |

**Phase 3: ECR & Deployment**
| Resource Type | Resource ID | Details |
|---------------|-------------|---------|
| ECR Repository | `portyfoul-dev` | Container image registry |
| ECR URI | `946652103073.dkr.ecr.us-east-2.amazonaws.com/portyfoul-dev` | Full repository URI |
| Deployment Script | `scripts/deploy.sh` | Bash script for build & push |
| Current Images | `b9973763`, `latest` | Docker images in ECR |

**Phase 4: ECS Cluster & IAM**
| Resource Type | Resource ID | Details |
|---------------|-------------|---------|
| ECS Cluster | `portyfoul-dev-cluster` | Fargate cluster (Container Insights enabled) |
| Task Execution Role | `portyfoul-dev-ecs-task-execution-role` | ECR pull, logs write, secrets read |
| Task Role | `portyfoul-dev-ecs-task-role` | Application permissions |
| Web Log Group | `/ecs/portyfoul-dev-web` | 7-day retention |
| Worker Log Group | `/ecs/portyfoul-dev-worker` | 7-day retention |

**Phase 5: Application Load Balancer**
| Resource Type | Resource ID | Details |
|---------------|-------------|---------|
| Public Subnet 2 | `subnet-[new]` | 10.0.4.0/24 (AZ: us-east-2b) for ALB |
| ALB Security Group | `sg-072bf6e95925d5098` | Allows HTTP/HTTPS from internet |
| ECS Security Group | `sg-003c7f700c941e5f3` | Allows port 3000 from ALB |
| Application Load Balancer | `portyfoul-dev-alb` | Internet-facing, 2 AZs |
| ALB DNS Name | `portyfoul-dev-alb-148695500.us-east-2.elb.amazonaws.com` | Public endpoint |
| Web Target Group | `portyfoul-dev-web-tg` | HTTP:3000, health check on / |
| HTTP Listener | Port 80 | Forwards to web target group |

**Phase 6: Web Service**
| Resource Type | Resource ID | Details |
|---------------|-------------|---------|
| Secrets Manager (JWT) | `portyfoul/dev/jwt-secret` | Auto-generated JWT signing key |
| Secrets Manager (Finnhub) | `portyfoul/dev/finnhub-api-key` | Finnhub API key (placeholder) |
| Secrets Manager (CoinGecko) | `portyfoul/dev/coingecko-api-key` | CoinGecko API key (placeholder) |
| Web Task Definition | `portyfoul-dev-web-task:1` | ARM64, 0.25 vCPU, 512MB memory |
| Web ECS Service | `portyfoul-dev-web-service` | 2 tasks, integrated with ALB |
| Running Tasks | 2 tasks | RUNNING state, healthy targets |
| Application URL | `http://portyfoul-dev-alb-148695500.us-east-2.elb.amazonaws.com` | Live application endpoint |

**Current Monthly Cost**: ~$100-120 (NAT Gateway + RDS + ALB + Fargate web service)

---

## Architecture Overview

This document outlines the infrastructure plan for deploying Portyfoul to AWS using ECS Fargate, RDS PostgreSQL, and CloudFormation.

### High-Level Architecture

```
Internet
    ↓
Application Load Balancer (Public Subnet)
    ↓
ECS Web Service (Private Subnet, scalable)
    ↓
RDS PostgreSQL 17.x (Private Subnet)
    ↑
ECS Worker Service (Private Subnet, singleton)
```

### Key Components

- **VPC**: New VPC with public subnet (ALB) and private subnet (ECS + RDS)
- **Database**: RDS PostgreSQL 17.x (managed, single-AZ)
- **Compute**: ECS Fargate with two services:
  - **Web service**: Scalable, multiple containers handling HTTP requests
  - **Worker service**: Singleton (1 container) for background price updates
- **Load Balancer**: Application Load Balancer in public subnet, routes to web containers
- **Secrets**: AWS Secrets Manager for JWT_SECRET, API keys, DB credentials
- **Container Registry**: ECR for Docker images
- **Logging**: CloudWatch Logs for container output

### Design Decisions

1. **Single AZ**: Cost-optimized setup suitable for development or small-scale production
2. **Fargate**: Serverless container management, no EC2 instance management
3. **Worker Separation**: Dedicated ECS service ensures only 1 worker instance runs (prevents duplicate API calls)
4. **CloudFormation for Infrastructure**: One-time setup + updates only for infrastructure changes
5. **Deployment Script for Application**: Frequent deployments without CloudFormation stack updates

---

## Implementation Phases

### Phase 1: Foundation & VPC (CloudFormation) ✅ COMPLETED

**Status**: ✅ Deployed 2025-11-14 to us-east-2
**Objective**: Create the base infrastructure directory structure and VPC networking.

**Files Created**:
- ✅ `infra/main.yaml` - Main CloudFormation template
- ✅ `infra/parameters.json` - Parameter values for the stack
- ✅ `infra/README.md` - Infrastructure documentation

**CloudFormation Resources Deployed**:
- ✅ VPC with CIDR block 10.0.0.0/16 → `vpc-03e4e25ca7d9071a8`
- ✅ Internet Gateway → `igw-06d1030d022e593ac`
- ✅ NAT Gateway (for private subnet internet access) → `nat-0c4b574eccdaaba0e`
- ✅ Public subnet 10.0.1.0/24 (us-east-2a) for ALB → `subnet-079228717b3ec772d`
- ✅ Private subnet 1: 10.0.2.0/24 (us-east-2a) for ECS/RDS → `subnet-02c50bb72212c4dba`
- ✅ Private subnet 2: 10.0.3.0/24 (us-east-2b) for RDS → `subnet-044369b3db4cd5f7b`
- ✅ Route tables:
  - Public route table (routes to Internet Gateway)
  - Private route table (routes to NAT Gateway)
- ✅ Subnet associations

**Parameters**:
- `Environment`: dev
- `ProjectName`: portyfoul

**Stack Outputs**:
- VPC ID: `vpc-03e4e25ca7d9071a8`
- Public Subnet ID: `subnet-079228717b3ec772d`
- Private Subnet 1 ID: `subnet-02c50bb72212c4dba`
- Private Subnet 2 ID: `subnet-044369b3db4cd5f7b`
- VPC CIDR: 10.0.0.0/16
- NAT Gateway ID: `nat-0c4b574eccdaaba0e`
- Internet Gateway ID: `igw-06d1030d022e593ac`

**Success Criteria**: ✅ CloudFormation stack deployed successfully, VPC and subnets are created and operational.

---

### Phase 2: RDS Database (CloudFormation) ✅ COMPLETED

**Status**: ✅ Deployed 2025-11-15 to us-east-2
**Objective**: Add managed PostgreSQL database to the infrastructure.

**CloudFormation Resources Deployed**:
- ✅ DB Subnet Group → `portyfoul-dev-db-subnet-group` (spans both private subnets)
- ✅ DB Parameter Group → `portyfoul-dev-postgres17-params` (PostgreSQL 17 family)
- ✅ RDS PostgreSQL 17.2 instance → `portyfoul-dev-postgres` (db.t4g.micro)
- ✅ Security Group for RDS → `sg-0ecbb448f9fb32e5c` (allows port 5432 from VPC)
- ✅ Secrets Manager secret → `portyfoul/dev/rds/credentials` (auto-generated credentials)

**Configuration**:
- Engine: postgres
- Engine Version: 17.2
- Instance Class: db.t4g.micro
- Allocated Storage: 20GB gp3
- Backup Retention: 7 days
- Multi-AZ: false (single-AZ)
- Public Access: false
- Storage Encrypted: true
- CloudWatch Logs: postgresql logs exported

**Stack Outputs**:
- RDS Endpoint: `portyfoul-dev-postgres.c1oump9unpwz.us-east-2.rds.amazonaws.com`
- RDS Port: `5432`
- Database Name: `portyfoul`
- Secret ARN: `arn:aws:secretsmanager:us-east-2:946652103073:secret:portyfoul/dev/rds/credentials-wLVaLY`
- Security Group ID: `sg-0ecbb448f9fb32e5c`

**Success Criteria**: ✅ RDS instance created and available, secret contains credentials with endpoint info, instance accessible from private subnets.

---

### Phase 3: ECR & Deployment Script Foundation ✅ COMPLETED

**Status**: ✅ Deployed 2025-11-15 to us-east-2
**Objective**: Set up container registry and create deployment automation script.

**CloudFormation Resources Deployed**:
- ✅ ECR Repository → `portyfoul-dev` (with image scanning enabled)
- ✅ Lifecycle policy (keep last 10 tagged images, remove untagged after 7 days)

**Files Created**:
- ✅ `scripts/deploy.sh` - Bash deployment automation script

**Deployment Script Features**:
1. ✅ Authenticate with ECR (`aws ecr get-login-password`)
2. ✅ Build Docker image from root directory
3. ✅ Tag image with:
   - Git commit SHA (for traceability)
   - `latest` tag
4. ✅ Push both tags to ECR
5. ✅ Color-coded output for better readability
6. ✅ Options: `--build-only`, `--push-only`, `--tag`, `--region`, `--help`

**Script Usage**:
```bash
# Full build and push (default)
./scripts/deploy.sh

# Build only (for local testing)
./scripts/deploy.sh --build-only

# Push specific tag
./scripts/deploy.sh --push-only --tag abc123

# Show help
./scripts/deploy.sh --help
```

**Stack Outputs**:
- ECR Repository URI: `946652103073.dkr.ecr.us-east-2.amazonaws.com/portyfoul-dev`
- ECR Repository Name: `portyfoul-dev`

**Images in ECR**:
- `b9973763` (git commit SHA)
- `latest`

**Success Criteria**: ✅ Script successfully built image and pushed to ECR with both tags.

---

### Phase 4: ECS Cluster & IAM ✅ COMPLETED

**Status**: ✅ Deployed 2025-11-15 to us-east-2
**Objective**: Create ECS cluster and IAM roles for container execution.

**CloudFormation Resources Deployed**:
- ✅ ECS Cluster → `portyfoul-dev-cluster` (Fargate with Container Insights enabled)
- ✅ IAM Task Execution Role → `portyfoul-dev-ecs-task-execution-role`:
  - ✅ Permissions to pull images from ECR (AmazonECSTaskExecutionRolePolicy)
  - ✅ Permissions to write to CloudWatch Logs
  - ✅ Permissions to read from Secrets Manager (RDS + future secrets)
  - ✅ Trust policy for ECS tasks
- ✅ IAM Task Role → `portyfoul-dev-ecs-task-role`:
  - ✅ Application-level permissions (CloudWatch metrics)
  - ✅ Trust policy for ECS tasks
- ✅ CloudWatch Log Groups:
  - ✅ `/ecs/portyfoul-dev-web` - Web service logs
  - ✅ `/ecs/portyfoul-dev-worker` - Worker service logs
  - ✅ Retention: 7 days

**Stack Outputs**:
- ECS Cluster ARN: `arn:aws:ecs:us-east-2:946652103073:cluster/portyfoul-dev-cluster`
- ECS Cluster Name: `portyfoul-dev-cluster`
- Task Execution Role ARN: `arn:aws:iam::946652103073:role/portyfoul-dev-ecs-task-execution-role`
- Task Role ARN: `arn:aws:iam::946652103073:role/portyfoul-dev-ecs-task-role`
- Web Log Group: `/ecs/portyfoul-dev-web`
- Worker Log Group: `/ecs/portyfoul-dev-worker`

**Success Criteria**: ✅ ECS cluster is ACTIVE, IAM roles created with correct permissions, log groups created.

---

### Phase 5: Application Load Balancer ✅ COMPLETED

**Status**: ✅ Deployed 2025-11-15 to us-east-2
**Objective**: Create load balancer to route traffic to web containers.

**CloudFormation Resources Deployed**:
- ✅ Public Subnet 2 → Added 10.0.4.0/24 in us-east-2b (ALB requires 2 AZs)
- ✅ Application Load Balancer → `portyfoul-dev-alb` (in public subnets)
- ✅ Target Group → `portyfoul-dev-web-tg`:
  - ✅ Protocol: HTTP
  - ✅ Port: 3000
  - ✅ Health check path: `/`
  - ✅ Health check interval: 30 seconds
  - ✅ Healthy threshold: 2
  - ✅ Unhealthy threshold: 3
  - ✅ Target type: IP (for Fargate)
  - ✅ Deregistration delay: 30 seconds
- ✅ HTTP Listener (port 80) → Forwards to web target group
- ✅ Security Group for ALB → `sg-072bf6e95925d5098`:
  - ✅ Ingress: HTTP (80) and HTTPS (443) from 0.0.0.0/0
  - ✅ Egress: All outbound
- ✅ Security Group for ECS → `sg-003c7f700c941e5f3`:
  - ✅ Ingress: Port 3000 from ALB security group
  - ✅ Egress: All (for RDS, NAT gateway, external APIs)
- ✅ RDS Security Group updated to allow ECS access on port 5432

**Stack Outputs**:
- ALB DNS Name: `portyfoul-dev-alb-148695500.us-east-2.elb.amazonaws.com`
- ALB ARN: `arn:aws:elasticloadbalancing:us-east-2:946652103073:loadbalancer/app/portyfoul-dev-alb/89bd8515947d42ca`
- Target Group ARN: `arn:aws:elasticloadbalancing:us-east-2:946652103073:targetgroup/portyfoul-dev-web-tg/5bb95c2c99e48b9f`
- ALB Security Group ID: `sg-072bf6e95925d5098`
- ECS Security Group ID: `sg-003c7f700c941e5f3`

**Success Criteria**: ✅ ALB is active and accessible via DNS name, target group configured (no targets registered yet).

---

### Phase 6: Web Service (ECS) ✅ COMPLETED

**Status**: ✅ Deployed 2025-11-15 to us-east-2
**Objective**: Deploy the web application containers.

**Secrets Manager Resources Created**:
- ✅ `portyfoul/dev/jwt-secret` - Auto-generated JWT signing key
- ✅ `portyfoul/dev/finnhub-api-key` - Finnhub API key (placeholder - needs real key)
- ✅ `portyfoul/dev/coingecko-api-key` - CoinGecko API key (placeholder - needs real key)

**CloudFormation Resources Deployed**:
- ✅ ECS Task Definition (Web) → `portyfoul-dev-web-task`:
  - ✅ Container definition:
    - Image: `946652103073.dkr.ecr.us-east-2.amazonaws.com/portyfoul-dev:latest`
    - Port: 3000
    - Environment variables:
      - `NODE_ENV=production`
      - `PRICE_UPDATE_WORKER_ENABLED=false` (disable worker in web containers)
      - `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB` (from RDS)
    - Secrets (from Secrets Manager):
      - `JWT_SECRET`, `FINNHUB_API_KEY`, `COINGECKO_API_KEY`
      - `POSTGRES_USER`, `POSTGRES_PASSWORD` (from RDS secret)
  - CPU: 256 (0.25 vCPU)
  - Memory: 512 MB
  - Runtime Platform: ARM64 / Linux (critical for Apple Silicon builds)
  - Network mode: awsvpc
  - Requires compatibilities: FARGATE
  - Execution role: `portyfoul-dev-ecs-task-execution-role`
  - Task role: `portyfoul-dev-ecs-task-role`
  - Log configuration: CloudWatch Logs → `/ecs/portyfoul-dev-web`

- ✅ ECS Service (Web) → `portyfoul-dev-web-service`:
  - Launch type: FARGATE
  - Desired count: 2
  - Network configuration:
    - Subnets: Private subnet 1 and 2
    - Security groups: ECS security group (`sg-003c7f700c941e5f3`)
    - Assign public IP: false
  - Load balancer:
    - Target group: `portyfoul-dev-web-tg`
    - Container name: web
    - Container port: 3000
  - Health check grace period: 60 seconds
  - Deployment configuration:
    - Maximum percent: 200
    - Minimum healthy percent: 100
    - Deployment circuit breaker: Enabled (rollback on failure)

**Deployment Details**:
- Docker image used: `b9973763` (git commit SHA) and `latest` tags
- Architecture fix applied: Added `RuntimePlatform` with ARM64 to match Docker build
- Initial deployment issue resolved: Fixed "exec format error" by specifying ARM64 architecture

**Service Status**:
- ✅ Service Status: ACTIVE
- ✅ Running Tasks: 2/2 (both in RUNNING state)
- ✅ Target Health: 2 healthy targets in ALB target group
- ✅ Application Response: HTTP 200 OK

**Application Endpoints**:
- Public URL: `http://portyfoul-dev-alb-148695500.us-east-2.elb.amazonaws.com`
- Health Status: Application serving Next.js pages successfully

**Success Criteria**: ✅ Web containers started successfully, registered with ALB, responding to HTTP requests.

---

### Phase 7: Worker Service (ECS)

**Objective**: Deploy the background price update worker.

**CloudFormation Resources**:
- ECS Task Definition (Worker):
  - Container definition:
    - Image: Same ECR repository URI (with image tag parameter)
    - No exposed ports
    - Environment variables:
      - `NODE_ENV=production`
      - `PRICE_UPDATE_WORKER_ENABLED=true` (enable worker)
      - `PRICE_UPDATE_INTERVAL_MINUTES=15`
    - Same secrets as web service (needs DB access)
  - CPU: 256 (0.25 vCPU)
  - Memory: 512 MB
  - Network mode: awsvpc
  - Requires compatibilities: FARGATE
  - Execution role: Task Execution Role ARN
  - Task role: Task Role ARN
  - Log configuration: CloudWatch Logs

- ECS Service (Worker):
  - Launch type: FARGATE
  - Desired count: 1 (MUST BE 1 - singleton)
  - Network configuration:
    - Subnets: Private subnet
    - Security groups: ECS security group
    - Assign public IP: false
  - No load balancer attachment
  - Deployment configuration:
    - Maximum percent: 100
    - Minimum healthy percent: 0 (allows single container replacement)

**Parameters to Add**:
- `WorkerImageTag` - Docker image tag for worker service (default: latest)

**Success Criteria**: Single worker container starts, price update worker begins periodic updates.

---

### Phase 8: Deployment Automation Enhancement

**Objective**: Enhance deployment script to handle full deployment lifecycle.

**Deployment Script Features (Enhanced)**:
1. **Build and Push** (from Phase 3)
2. **Database Migration**:
   - Run migrations before deploying new code
   - Options:
     - a) Run as ECS one-off task (Fargate task with migration command)
     - b) Run locally pointing to RDS (requires VPN/bastion)
     - c) Build into container startup (current approach - keep this)
3. **Register New Task Definitions**:
   - Create new task definition revision for web service
   - Create new task definition revision for worker service
   - Update image tag to new SHA/version
4. **Update ECS Services**:
   - Update web service to new task definition revision
   - Update worker service to new task definition revision
5. **Wait for Deployment**:
   - Poll ECS service status
   - Wait for deployment to complete (all tasks running new revision)
   - Timeout after 10 minutes
6. **Rollback on Failure**:
   - Optionally revert to previous task definition if deployment fails

**Script Usage**:
```bash
# Full deployment
python scripts/deploy.py --full-deploy

# Build and push only
python scripts/deploy.py --build-and-push

# Update services only (use existing image)
python scripts/deploy.py --update-services --image-tag abc123

# Deploy specific service
python scripts/deploy.py --full-deploy --service web
```

**Script Configuration**:
- Read CloudFormation stack outputs for resource names
- Support environment-specific deployments (dev, staging, prod)

**Success Criteria**: Script successfully builds, pushes, and deploys new version with zero downtime.

---

### Phase 9: Secrets & Configuration Management

**Objective**: Properly configure all secrets and sensitive configuration.

**CloudFormation Resources**:
- Secrets Manager Secrets:
  - `portyfoul/db/credentials` (already created in Phase 2)
  - `portyfoul/jwt-secret` - JWT signing key
  - `portyfoul/finnhub-api-key` - Finnhub API key
  - `portyfoul/coingecko-api-key` - CoinGecko API key (optional)

- Systems Manager Parameter Store (for non-sensitive config):
  - `/portyfoul/price-update-interval` - Update interval in minutes
  - `/portyfoul/environment` - Environment name

**Secret Creation Script**:
- `scripts/create-secrets.sh` - Helper script to populate secrets

```bash
#!/bin/bash
# Usage: ./scripts/create-secrets.sh us-east-2

REGION=${1:-us-east-2}

aws secretsmanager create-secret \
  --name portyfoul/jwt-secret \
  --secret-string "$(openssl rand -base64 32)" \
  --region $REGION

aws secretsmanager create-secret \
  --name portyfoul/finnhub-api-key \
  --secret-string "your-finnhub-key" \
  --region $REGION

aws secretsmanager create-secret \
  --name portyfoul/coingecko-api-key \
  --secret-string "your-coingecko-key" \
  --region $REGION
```

**Task Definition Updates**:
- Update both web and worker task definitions to reference all secrets
- Inject secrets as environment variables

**Success Criteria**: All secrets are in Secrets Manager, task definitions successfully inject them.

---

### Phase 10: Final Polish & Documentation

**Objective**: Add finishing touches for production readiness.

**Optional Enhancements**:

1. **Health Check Endpoint** (Application Code):
   - Add `src/app/api/health/route.ts`
   - Returns 200 OK with basic status
   - Update ALB target group health check to use `/api/health`

2. **CloudWatch Alarms** (CloudFormation):
   - High CPU utilization on ECS tasks
   - High memory utilization on ECS tasks
   - RDS CPU/storage/connections
   - ALB 5xx error rate
   - Target health (unhealthy targets)

3. **Cost Optimization**:
   - Review instance sizes
   - Consider Fargate Spot for non-critical workloads
   - Set appropriate log retention periods

4. **Documentation**:
   - `infra/README.md` - Complete infrastructure guide:
     - Architecture diagram
     - Deployment instructions
     - Troubleshooting guide
     - Cost estimates
     - Scaling guidance
   - Update main `README.md` with AWS deployment section

5. **Monitoring Dashboard** (CloudFormation):
   - CloudWatch Dashboard showing:
     - ECS service metrics (CPU, memory, task count)
     - ALB metrics (request count, latency, errors)
     - RDS metrics (connections, CPU, storage)

**Success Criteria**:
- Production-ready infrastructure
- Complete documentation
- Monitoring in place
- Successful end-to-end deployment

---

## Files Structure

```
portyfoul/
├── infra/
│   ├── main.yaml              # ✅ Main CloudFormation template (Phases 1-3)
│   ├── parameters.json        # ✅ CloudFormation parameters (Phases 1-3)
│   └── README.md              # ✅ Infrastructure documentation (Phase 1)
├── scripts/
│   ├── deploy.sh              # ✅ Bash deployment script (Phase 3)
│   └── create-secrets.sh      # 🔜 Secret creation helper (Phase 9)
├── migrations/                # ✅ Database migrations (existing)
├── Dockerfile                 # ✅ Container definition (existing)
└── infra_plan_spec.md        # ✅ This document (updated with progress)
```

**Legend**: ✅ Created | 🔜 To be created

---

## Deployment Workflow

**IMPORTANT**: All commands use region **us-east-2** (Ohio).

### Initial Infrastructure Setup (One-time)

1. **Deploy CloudFormation stack** (✅ COMPLETED):
   ```bash
   aws cloudformation create-stack \
     --stack-name portyfoul-infra \
     --template-body file://infra/main.yaml \
     --parameters file://infra/parameters.json \
     --region us-east-2
   ```

2. **Wait for stack creation** (✅ COMPLETED):
   ```bash
   aws cloudformation wait stack-create-complete \
     --stack-name portyfoul-infra \
     --region us-east-2
   ```

3. **Create secrets** (🔜 TODO - after Phase 9):
   ```bash
   ./scripts/create-secrets.sh us-east-2
   ```

4. **Initial application deployment** (🔜 TODO - after Phase 8):
   ```bash
   python scripts/deploy.py --full-deploy --region us-east-2
   ```

### Regular Application Updates

For subsequent code changes (no infrastructure changes):

```bash
# Build, push, and deploy new version
python scripts/deploy.py --full-deploy
```

This will:
1. Build new Docker image
2. Tag with git SHA
3. Push to ECR
4. Register new task definitions
5. Update ECS services
6. Wait for deployment to complete

### Infrastructure Updates

When infrastructure changes are needed (Phase 2+):

```bash
aws cloudformation update-stack \
  --stack-name portyfoul-infra \
  --template-body file://infra/main.yaml \
  --parameters file://infra/parameters.json \
  --capabilities CAPABILITY_IAM \
  --region us-east-2
```

Wait for update:

```bash
aws cloudformation wait stack-update-complete \
  --stack-name portyfoul-infra \
  --region us-east-2
```

---

## Cost Estimate (Single-AZ, Minimal Setup)

Approximate monthly costs (us-east-2 Ohio pricing):

- **Fargate**: ~$30-40/month
  - Web service: 2 tasks × 0.25 vCPU × 0.5GB × 730 hours
  - Worker service: 1 task × 0.25 vCPU × 0.5GB × 730 hours
- **RDS db.t4g.micro**: ~$15/month
  - 20GB storage: ~$2.30/month
- **NAT Gateway**: ~$32/month (730 hours × $0.045)
- **ALB**: ~$16/month (730 hours × $0.0225)
- **ECR**: ~$1/month (10GB storage)
- **Data Transfer**: Variable (estimated $5-10/month)
- **CloudWatch Logs**: ~$2-5/month

**Total estimated cost**: ~$100-120/month

**Note**: This is a rough estimate. Actual costs vary based on usage, data transfer, and API calls.

---

## Environment Variables Reference

### Required for All Containers
- `NODE_ENV` - Set to `production`
- `JWT_SECRET` - From Secrets Manager
- `FINNHUB_API_KEY` - From Secrets Manager
- `POSTGRES_HOST` - RDS endpoint
- `POSTGRES_PORT` - 5432
- `POSTGRES_DB` - Database name (e.g., portyfoul)
- `POSTGRES_USER` - From RDS secret
- `POSTGRES_PASSWORD` - From RDS secret

### Optional
- `COINGECKO_API_KEY` - From Secrets Manager (optional)
- `PRICE_UPDATE_INTERVAL_MINUTES` - Default: 15

### Service-Specific
- `PRICE_UPDATE_WORKER_ENABLED`
  - Web service: `false`
  - Worker service: `true`

---

## Resuming Work

### Current State (as of 2025-11-15)

**Completed**:
- ✅ Phase 1 (Foundation & VPC)
- ✅ Phase 2 (RDS Database)
- ✅ Phase 3 (ECR & Deployment Script)
- ✅ Phase 4 (ECS Cluster & IAM)
- ✅ Phase 5 (Application Load Balancer)
- ✅ Phase 6 (Web Service - ECS) - **Application is LIVE!**

**Application Status**:
- 🟢 Web Service: 2 tasks running, healthy
- 🟢 Load Balancer: Active, serving traffic
- 🌐 Public URL: http://portyfoul-dev-alb-148695500.us-east-2.elb.amazonaws.com

**Next Phase**: Phase 7 (Worker Service - ECS)

### To Resume from Phase 7

1. **Verify existing infrastructure**:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name portyfoul-infra \
     --region us-east-2 \
     --query 'Stacks[0].[StackStatus,LastUpdatedTime]'
   ```

2. **Verify web service is running**:
   ```bash
   aws ecs describe-services \
     --cluster portyfoul-dev-cluster \
     --services portyfoul-dev-web-service \
     --region us-east-2 \
     --query 'services[0].[status,runningCount,desiredCount]'
   ```

3. **Test application**:
   ```bash
   curl -I http://portyfoul-dev-alb-148695500.us-east-2.elb.amazonaws.com
   # Should return 200 OK
   ```

4. **Check web service logs**:
   ```bash
   aws logs tail /ecs/portyfoul-dev-web --follow --region us-east-2
   ```

5. **Start Phase 7**: Add ECS Task Definition and Service for worker container to `infra/main.yaml`.

### Quick Reference Commands

**Check stack status**:
```bash
aws cloudformation describe-stacks \
  --stack-name portyfoul-infra \
  --region us-east-2
```

**View CloudFormation events** (troubleshooting):
```bash
aws cloudformation describe-stack-events \
  --stack-name portyfoul-infra \
  --region us-east-2 \
  --max-items 20
```

**Validate template** (before updating):
```bash
aws cloudformation validate-template \
  --template-body file://infra/main.yaml \
  --region us-east-2
```

### Implementation Checklist

- [x] Phase 1: Foundation & VPC
- [x] Phase 2: RDS Database
- [x] Phase 3: ECR & Deployment Script
- [x] Phase 4: ECS Cluster & IAM
- [x] Phase 5: Application Load Balancer
- [x] Phase 6: Web Service (ECS)
- [ ] Phase 7: Worker Service (ECS)
- [ ] Phase 8: Deployment Automation
- [ ] Phase 9: Secrets & Configuration
- [ ] Phase 10: Final Polish & Documentation

---

## Next Steps

We proceed phase by phase:

1. ✅ Phase 1 (Foundation & VPC) - COMPLETED
2. ✅ Phase 2 (RDS Database) - COMPLETED
3. ✅ Phase 3 (ECR & Deployment Script) - COMPLETED
4. ✅ Phase 4 (ECS Cluster & IAM) - COMPLETED
5. ✅ Phase 5 (Application Load Balancer) - COMPLETED
6. ✅ Phase 6 (Web Service - ECS) - COMPLETED - **Application is LIVE!**
7. 🔜 Phase 7 (Worker Service - ECS) - NEXT
8. Test each phase before moving to the next
9. Make adjustments as needed based on testing
10. Complete all phases for full production deployment

Each phase builds on the previous one, allowing for incremental testing and validation.
