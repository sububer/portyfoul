#!/usr/bin/env python3
"""
Portyfoul Deployment Automation Script

Automates the complete deployment workflow:
1. Build and push Docker images to ECR
2. Create new ECS task definition revisions
3. Update ECS services
4. Monitor deployment progress
5. Verify health checks
6. Rollback on failure

Usage:
    ./scripts/deploy.py                    # Full deployment
    ./scripts/deploy.py --build-only       # Build and push only
    ./scripts/deploy.py --update-services  # Update services with existing image
    ./scripts/deploy.py --service web      # Deploy only web service
    ./scripts/deploy.py --dry-run          # Preview changes without executing
"""

import argparse
import base64
import boto3
import subprocess
import sys
import time
from typing import Dict, List, Optional
from datetime import datetime


# Color codes for terminal output
class Colors:
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[0;33m'
    RED = '\033[0;31m'
    NC = '\033[0m'  # No Color
    BOLD = '\033[1m'


def log_info(message: str):
    """Log informational message in blue"""
    print(f"{Colors.BLUE}ℹ {Colors.NC}{message}")


def log_success(message: str):
    """Log success message in green"""
    print(f"{Colors.GREEN}✓{Colors.NC} {message}")


def log_warning(message: str):
    """Log warning message in yellow"""
    print(f"{Colors.YELLOW}⚠{Colors.NC} {message}")


def log_error(message: str):
    """Log error message in red"""
    print(f"{Colors.RED}✗{Colors.NC} {message}", file=sys.stderr)


def log_header(message: str):
    """Log header message"""
    print(f"\n{Colors.BOLD}{message}{Colors.NC}")
    print("━" * 60)


class PortyfoulDeployer:
    """Main deployment automation class"""

    def __init__(self, region: str, stack_name: str, timeout: int = 600, dry_run: bool = False):
        """
        Initialize the deployer

        Args:
            region: AWS region name
            stack_name: CloudFormation stack name
            timeout: Deployment timeout in seconds
            dry_run: If True, preview changes without executing
        """
        self.region = region
        self.stack_name = stack_name
        self.timeout = timeout
        self.dry_run = dry_run

        # Initialize AWS clients
        self.cf_client = boto3.client('cloudformation', region_name=region)
        self.ecs_client = boto3.client('ecs', region_name=region)
        self.ecr_client = boto3.client('ecr', region_name=region)
        self.elbv2_client = boto3.client('elbv2', region_name=region)

        # Cache for stack outputs
        self._stack_outputs: Optional[Dict[str, str]] = None

        # Track previous task definitions for rollback
        self.previous_task_defs: Dict[str, str] = {}

    def get_stack_outputs(self) -> Dict[str, str]:
        """
        Query CloudFormation stack outputs and cache the results

        Returns:
            Dictionary mapping output keys to values

        Raises:
            SystemExit: If stack doesn't exist or is in failed state
        """
        if self._stack_outputs is not None:
            return self._stack_outputs

        log_info(f"Querying CloudFormation stack: {self.stack_name}")

        try:
            response = self.cf_client.describe_stacks(StackName=self.stack_name)
            stack = response['Stacks'][0]
            stack_status = stack['StackStatus']

            if stack_status not in ['CREATE_COMPLETE', 'UPDATE_COMPLETE']:
                log_error(f"Stack is in {stack_status} state. Expected CREATE_COMPLETE or UPDATE_COMPLETE.")
                sys.exit(1)

            # Convert outputs list to dictionary
            outputs = {}
            for output in stack.get('Outputs', []):
                outputs[output['OutputKey']] = output['OutputValue']

            self._stack_outputs = outputs
            log_success(f"Retrieved {len(outputs)} stack outputs")
            return outputs

        except self.cf_client.exceptions.ClientError as e:
            log_error(f"Failed to query CloudFormation stack: {e}")
            sys.exit(1)

    def get_git_sha(self) -> str:
        """
        Get current git commit SHA (short version)

        Returns:
            8-character git commit SHA

        Raises:
            SystemExit: If not in a git repository
        """
        try:
            result = subprocess.run(
                ['git', 'rev-parse', '--short=8', 'HEAD'],
                capture_output=True,
                text=True,
                check=True
            )
            sha = result.stdout.strip()
            log_info(f"Using git commit SHA: {sha}")
            return sha
        except subprocess.CalledProcessError:
            log_error("Failed to get git commit SHA. Are you in a git repository?")
            sys.exit(1)

    def build_and_push_image(self, tag: Optional[str] = None) -> str:
        """
        Build Docker image and push to ECR

        Args:
            tag: Optional custom tag (defaults to git SHA)

        Returns:
            Full ECR image URI with tag

        Raises:
            SystemExit: If build or push fails
        """
        log_header("Building and Pushing Docker Image")

        # Get ECR repository URI from stack outputs
        outputs = self.get_stack_outputs()
        ecr_uri = outputs.get('ECRRepositoryUri')
        if not ecr_uri:
            log_error("ECR repository URI not found in stack outputs")
            sys.exit(1)

        # Determine tag
        if tag is None:
            tag = self.get_git_sha()

        image_uri = f"{ecr_uri}:{tag}"

        if self.dry_run:
            log_warning("[DRY RUN] Would build and push image:")
            log_info(f"  Image URI: {image_uri}")
            return image_uri

        # Build Docker image
        log_info("Building Docker image...")
        try:
            subprocess.run(
                ['docker', 'build', '-t', f'portyfoul:{tag}', '-t', 'portyfoul:latest', '.'],
                check=True
            )
            log_success(f"Docker image built: portyfoul:{tag}")
        except subprocess.CalledProcessError as e:
            log_error(f"Docker build failed: {e}")
            sys.exit(1)

        # Authenticate with ECR
        log_info("Authenticating with ECR...")
        try:
            response = self.ecr_client.get_authorization_token()
            auth_token = response['authorizationData'][0]['authorizationToken']
            endpoint = response['authorizationData'][0]['proxyEndpoint']

            # Decode the base64 token and extract the password
            # AWS returns base64-encoded credentials in format "AWS:password"
            decoded_token = base64.b64decode(auth_token).decode('utf-8')
            password = decoded_token.split(':')[1]  # Extract password after the colon

            subprocess.run(
                ['docker', 'login', '--username', 'AWS', '--password-stdin', endpoint],
                input=password,
                text=True,
                check=True,
                capture_output=True
            )
            log_success("Successfully authenticated with ECR")
        except Exception as e:
            log_error(f"ECR authentication failed: {e}")
            sys.exit(1)

        # Tag for ECR
        log_info("Tagging images for ECR...")
        try:
            subprocess.run(['docker', 'tag', f'portyfoul:{tag}', image_uri], check=True)
            subprocess.run(['docker', 'tag', f'portyfoul:latest', f'{ecr_uri}:latest'], check=True)
            log_success("Images tagged for ECR")
        except subprocess.CalledProcessError as e:
            log_error(f"Docker tag failed: {e}")
            sys.exit(1)

        # Push to ECR
        log_info(f"Pushing {image_uri}...")
        try:
            subprocess.run(['docker', 'push', image_uri], check=True)
            log_success(f"Pushed {image_uri}")
        except subprocess.CalledProcessError as e:
            log_error(f"Docker push failed: {e}")
            sys.exit(1)

        log_info(f"Pushing {ecr_uri}:latest...")
        try:
            subprocess.run(['docker', 'push', f'{ecr_uri}:latest'], check=True)
            log_success(f"Pushed {ecr_uri}:latest")
        except subprocess.CalledProcessError as e:
            log_error(f"Docker push failed: {e}")
            sys.exit(1)

        return image_uri

    def create_task_definition_revision(self, service_type: str, image_uri: str) -> str:
        """
        Create new task definition revision with updated image

        Args:
            service_type: 'web' or 'worker'
            image_uri: Full ECR image URI with tag

        Returns:
            New task definition ARN

        Raises:
            SystemExit: If task definition creation fails
        """
        outputs = self.get_stack_outputs()
        task_def_name = f"portyfoul-dev-{service_type}"

        log_info(f"Creating new task definition revision for {service_type} service...")

        try:
            # Get current task definition
            response = self.ecs_client.describe_task_definition(taskDefinition=task_def_name)
            task_def = response['taskDefinition']

            # Store current ARN for potential rollback
            self.previous_task_defs[service_type] = task_def['taskDefinitionArn']

            # Remove read-only fields
            fields_to_remove = [
                'taskDefinitionArn', 'revision', 'status', 'requiresAttributes',
                'compatibilities', 'registeredAt', 'registeredBy', 'deregisteredAt'
            ]
            for field in fields_to_remove:
                task_def.pop(field, None)

            # Update container image
            container_name = service_type  # 'web' or 'worker'
            for container in task_def['containerDefinitions']:
                if container['name'] == container_name:
                    old_image = container['image']
                    container['image'] = image_uri
                    log_info(f"  Updated {container_name} container image:")
                    log_info(f"    From: {old_image}")
                    log_info(f"    To:   {image_uri}")
                    break

            if self.dry_run:
                log_warning(f"[DRY RUN] Would register new task definition for {service_type}")
                return f"arn:aws:ecs:{self.region}:000000000000:task-definition/{task_def_name}:99"

            # Register new task definition
            response = self.ecs_client.register_task_definition(**task_def)
            new_task_def_arn = response['taskDefinition']['taskDefinitionArn']
            revision = response['taskDefinition']['revision']

            log_success(f"Registered new task definition: {task_def_name}:{revision}")
            return new_task_def_arn

        except Exception as e:
            log_error(f"Failed to create task definition for {service_type}: {e}")
            sys.exit(1)

    def update_service(self, service_type: str, task_def_arn: str):
        """
        Update ECS service with new task definition

        Args:
            service_type: 'web' or 'worker'
            task_def_arn: Task definition ARN to deploy

        Raises:
            SystemExit: If service update fails
        """
        outputs = self.get_stack_outputs()
        cluster_name = outputs.get('ECSClusterName')
        service_name = outputs.get(f'{service_type.capitalize()}ServiceName')

        if not cluster_name or not service_name:
            log_error(f"Cluster or service name not found in stack outputs")
            sys.exit(1)

        log_info(f"Updating {service_type} service: {service_name}")

        if self.dry_run:
            log_warning(f"[DRY RUN] Would update service {service_name} to task definition:")
            log_info(f"  {task_def_arn}")
            return

        try:
            self.ecs_client.update_service(
                cluster=cluster_name,
                service=service_name,
                taskDefinition=task_def_arn,
                forceNewDeployment=True
            )
            log_success(f"Service update initiated for {service_name}")

        except Exception as e:
            log_error(f"Failed to update {service_type} service: {e}")
            sys.exit(1)

    def wait_for_deployment(self, service_type: str):
        """
        Wait for ECS service deployment to complete

        Args:
            service_type: 'web' or 'worker'

        Raises:
            SystemExit: If deployment times out or fails
        """
        outputs = self.get_stack_outputs()
        cluster_name = outputs.get('ECSClusterName')
        service_name = outputs.get(f'{service_type.capitalize()}ServiceName')

        log_info(f"Waiting for {service_type} service deployment to stabilize...")
        log_info(f"  Timeout: {self.timeout} seconds")

        if self.dry_run:
            log_warning(f"[DRY RUN] Would wait for service {service_name} to stabilize")
            return

        start_time = time.time()
        waiter = self.ecs_client.get_waiter('services_stable')

        try:
            # Monitor deployment progress
            check_interval = 15
            max_attempts = self.timeout // check_interval

            waiter.wait(
                cluster=cluster_name,
                services=[service_name],
                WaiterConfig={
                    'Delay': check_interval,
                    'MaxAttempts': max_attempts
                }
            )

            elapsed = int(time.time() - start_time)
            log_success(f"{service_type.capitalize()} service stabilized in {elapsed} seconds")

        except Exception as e:
            elapsed = int(time.time() - start_time)
            log_error(f"Deployment failed after {elapsed} seconds: {e}")
            log_warning("Attempting rollback...")
            self.rollback_service(service_type)
            sys.exit(1)

    def verify_service_health(self, service_type: str):
        """
        Verify ECS service and task health

        Args:
            service_type: 'web' or 'worker'

        Raises:
            SystemExit: If health checks fail
        """
        outputs = self.get_stack_outputs()
        cluster_name = outputs.get('ECSClusterName')
        service_name = outputs.get(f'{service_type.capitalize()}ServiceName')

        log_info(f"Verifying {service_type} service health...")

        if self.dry_run:
            log_warning(f"[DRY RUN] Would verify health for {service_name}")
            return

        try:
            # Get service details
            response = self.ecs_client.describe_services(
                cluster=cluster_name,
                services=[service_name]
            )
            service = response['services'][0]

            running_count = service['runningCount']
            desired_count = service['desiredCount']

            if running_count != desired_count:
                log_error(f"Health check failed: running={running_count}, desired={desired_count}")
                return False

            log_success(f"ECS tasks healthy: {running_count}/{desired_count} running")

            # For web service, also check ALB target health
            if service_type == 'web':
                self.verify_alb_target_health()

            return True

        except Exception as e:
            log_error(f"Health verification failed: {e}")
            return False

    def verify_alb_target_health(self):
        """Verify ALB target group health for web service"""
        outputs = self.get_stack_outputs()
        target_group_arn = outputs.get('WebTargetGroupArn')

        if not target_group_arn:
            log_warning("Target group ARN not found, skipping ALB health check")
            return

        log_info("Checking ALB target health...")

        try:
            response = self.elbv2_client.describe_target_health(
                TargetGroupArn=target_group_arn
            )

            healthy_count = 0
            total_count = len(response['TargetHealthDescriptions'])

            for target in response['TargetHealthDescriptions']:
                if target['TargetHealth']['State'] == 'healthy':
                    healthy_count += 1

            if healthy_count == total_count and total_count > 0:
                log_success(f"ALB targets healthy: {healthy_count}/{total_count}")
            else:
                log_warning(f"ALB targets: {healthy_count}/{total_count} healthy")

        except Exception as e:
            log_warning(f"Failed to check ALB health: {e}")

    def rollback_service(self, service_type: str):
        """
        Rollback service to previous task definition

        Args:
            service_type: 'web' or 'worker'
        """
        if service_type not in self.previous_task_defs:
            log_error(f"No previous task definition found for {service_type}")
            return

        previous_task_def = self.previous_task_defs[service_type]
        log_warning(f"Rolling back {service_type} service to {previous_task_def}")

        if self.dry_run:
            log_warning(f"[DRY RUN] Would rollback {service_type} to {previous_task_def}")
            return

        try:
            outputs = self.get_stack_outputs()
            cluster_name = outputs.get('ECSClusterName')
            service_name = outputs.get(f'{service_type.capitalize()}ServiceName')

            self.ecs_client.update_service(
                cluster=cluster_name,
                service=service_name,
                taskDefinition=previous_task_def,
                forceNewDeployment=True
            )
            log_success(f"Rollback initiated for {service_type} service")

        except Exception as e:
            log_error(f"Rollback failed for {service_type}: {e}")

    def deploy(self, services: List[str], image_tag: Optional[str] = None, build_only: bool = False,
               update_services_only: bool = False):
        """
        Execute full deployment workflow

        Args:
            services: List of services to deploy ('web', 'worker', or both)
            image_tag: Optional custom image tag
            build_only: If True, only build and push image
            update_services_only: If True, skip build and only update services
        """
        log_header("Portyfoul Deployment")
        log_info(f"Region: {self.region}")
        log_info(f"Stack: {self.stack_name}")
        log_info(f"Services: {', '.join(services)}")
        if self.dry_run:
            log_warning("DRY RUN MODE - No changes will be made")

        # Step 1: Build and push image (unless update-services-only)
        if not update_services_only:
            image_uri = self.build_and_push_image(tag=image_tag)

            if build_only:
                log_success("Build and push completed!")
                return
        else:
            # When updating services only, construct image URI from tag
            outputs = self.get_stack_outputs()
            ecr_uri = outputs.get('ECRRepositoryUri')
            tag = image_tag if image_tag else 'latest'
            image_uri = f"{ecr_uri}:{tag}"
            log_info(f"Using existing image: {image_uri}")

        # Step 2: Create task definition revisions and update services
        log_header("Updating ECS Services")

        for service in services:
            # Create new task definition revision
            task_def_arn = self.create_task_definition_revision(service, image_uri)

            # Update service
            self.update_service(service, task_def_arn)

        # Step 3: Wait for deployments to complete
        log_header("Monitoring Deployments")

        for service in services:
            self.wait_for_deployment(service)

        # Step 4: Verify health
        log_header("Verifying Health")

        all_healthy = True
        for service in services:
            if not self.verify_service_health(service):
                all_healthy = False

        # Final status
        log_header("Deployment Summary")

        if all_healthy:
            log_success("Deployment completed successfully!")
            log_info(f"Services deployed: {', '.join(services)}")
            log_info(f"Image: {image_uri}")
        else:
            log_error("Deployment completed with health check warnings")
            sys.exit(1)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Portyfoul Deployment Automation',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument('--region', default='us-east-2',
                        help='AWS region (default: us-east-2)')
    parser.add_argument('--stack', default='portyfoul-infra',
                        help='CloudFormation stack name (default: portyfoul-infra)')
    parser.add_argument('--service', choices=['web', 'worker'],
                        help='Deploy specific service only (default: both)')
    parser.add_argument('--tag', help='Docker image tag (default: git SHA)')
    parser.add_argument('--timeout', type=int, default=600,
                        help='Deployment timeout in seconds (default: 600)')
    parser.add_argument('--build-only', action='store_true',
                        help='Build and push image only, skip service updates')
    parser.add_argument('--update-services', action='store_true',
                        help='Update services with existing image, skip build')
    parser.add_argument('--dry-run', action='store_true',
                        help='Preview changes without executing')

    args = parser.parse_args()

    # Determine which services to deploy
    if args.service:
        services = [args.service]
    else:
        services = ['web', 'worker']

    # Create deployer and execute
    deployer = PortyfoulDeployer(
        region=args.region,
        stack_name=args.stack,
        timeout=args.timeout,
        dry_run=args.dry_run
    )

    deployer.deploy(
        services=services,
        image_tag=args.tag,
        build_only=args.build_only,
        update_services_only=args.update_services
    )


if __name__ == '__main__':
    main()
