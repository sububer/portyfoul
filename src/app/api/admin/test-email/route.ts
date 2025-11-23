/**
 * Test endpoint for email sending
 * This endpoint sends test emails using all three templates to verify SES configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/services/email-service';
import { getVerificationEmail } from '@/lib/email-templates/verification-email';
import { getResetPasswordEmail } from '@/lib/email-templates/reset-password-email';
import { getPasswordChangedEmail } from '@/lib/email-templates/password-changed-email';
import { requireAuth, handleAuthError } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    // Require authentication (you can add admin-specific checks here later)
    const user = requireAuth(request);

    const body = await request.json();
    const { emailType, recipientEmail } = body;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'recipientEmail is required' },
        { status: 400 }
      );
    }

    let emailContent: { html: string; text: string; subject: string };

    // Generate test email based on type
    switch (emailType) {
      case 'verification':
        emailContent = getVerificationEmail({
          username: user.username,
          verificationToken: 'test-token-12345',
        });
        break;

      case 'reset-password':
        emailContent = getResetPasswordEmail({
          username: user.username,
          resetToken: 'test-reset-token-12345',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Test Browser)',
        });
        break;

      case 'password-changed':
        emailContent = getPasswordChangedEmail({
          username: user.username,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          timestamp: new Date(),
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid emailType. Use: verification, reset-password, or password-changed' },
          { status: 400 }
        );
    }

    // Send the email
    await sendEmail({
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return NextResponse.json({
      success: true,
      message: `Test ${emailType} email sent successfully to ${recipientEmail}`,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthError') {
      return handleAuthError(error);
    }

    console.error('Error sending test email:', error);
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
