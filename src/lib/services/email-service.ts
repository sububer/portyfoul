/**
 * Email service using AWS SES
 * Handles sending transactional emails for the application
 *
 * AWS Credential Handling:
 * - Production (ECS): Uses IAM task role automatically (no credentials needed)
 * - Local Development: Uses AWS credential provider chain (environment vars, ~/.aws/credentials, etc.)
 * - Explicit Credentials: Only if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are both set
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config } from '@/lib/config';

// Initialize SES client with appropriate credential strategy
// If explicit credentials are provided, use them; otherwise use AWS credential provider chain
const hasExplicitCredentials = config.email.awsCredentials.accessKeyId && config.email.awsCredentials.secretAccessKey;

if (hasExplicitCredentials) {
  console.log('SES: Using explicit AWS credentials from environment variables');
} else {
  console.log('SES: Using AWS credential provider chain (IAM role, environment, or profile)');
}

const sesClient = new SESClient({
  region: config.email.sesRegion,
  credentials: hasExplicitCredentials
    ? {
        accessKeyId: config.email.awsCredentials.accessKeyId!,
        secretAccessKey: config.email.awsCredentials.secretAccessKey!,
      }
    : undefined, // Use default credential provider chain (IAM roles, etc.)
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send an email using AWS SES
 * @param options Email options including recipient, subject, and content
 * @returns Promise that resolves when email is sent
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, html, text } = options;

  if (!config.email.fromAddress) {
    throw new Error('Email from address is not configured. Please set AWS_SES_FROM_EMAIL environment variable.');
  }

  const command = new SendEmailCommand({
    Source: config.email.fromAddress,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: html,
          Charset: 'UTF-8',
        },
        Text: {
          Data: text,
          Charset: 'UTF-8',
        },
      },
    },
  });

  try {
    const response = await sesClient.send(command);
    console.log(`Email sent successfully to ${to}. MessageId: ${response.MessageId}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error(`Failed to send email to ${to}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate email address format
 * @param email Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
