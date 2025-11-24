/**
 * Email template for password reset
 */

import { config } from '@/lib/config';

export interface ResetPasswordEmailData {
  username: string;
  resetToken: string;
  ipAddress?: string;
  userAgent?: string;
}

export function getResetPasswordEmail(data: ResetPasswordEmailData): { html: string; text: string; subject: string } {
  const { username, resetToken, ipAddress, userAgent } = data;
  const resetUrl = `${config.app.url}/reset-password?token=${resetToken}`;
  const expiryMinutes = config.tokens.passwordResetExpiryMinutes;

  const subject = 'Reset your password - Portyfoul';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #DC2626; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Portyfoul</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Reset Your Password</h2>

              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Hi ${username},
              </p>

              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                We received a request to reset your password for your Portyfoul account. Click the button below to create a new password.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 40px; background-color: #DC2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Reset Password</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>

              <p style="margin: 0 0 20px 0; color: #DC2626; font-size: 14px; word-break: break-all;">
                ${resetUrl}
              </p>

              <!-- Security Notice -->
              <div style="margin: 30px 0; padding: 20px; background-color: #FEF2F2; border-left: 4px solid #DC2626; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #991B1B; font-size: 14px; font-weight: bold;">
                  Security Notice
                </p>
                <p style="margin: 0; color: #7F1D1D; font-size: 13px; line-height: 1.5;">
                  This link will expire in ${expiryMinutes} minutes. If you didn't request a password reset, please ignore this email or contact support if you have concerns about your account security.
                </p>
                ${ipAddress || userAgent ? `
                <p style="margin: 10px 0 0 0; color: #7F1D1D; font-size: 12px; line-height: 1.5;">
                  Request details:<br>
                  ${ipAddress ? `IP Address: ${ipAddress}<br>` : ''}
                  ${userAgent ? `Device: ${userAgent}` : ''}
                </p>
                ` : ''}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This is an automated message from Portyfoul. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Reset Your Password

Hi ${username},

We received a request to reset your password for your Portyfoul account. Visit the link below to create a new password.

Reset Password Link:
${resetUrl}

SECURITY NOTICE:
This link will expire in ${expiryMinutes} minutes. If you didn't request a password reset, please ignore this email or contact support if you have concerns about your account security.

${ipAddress || userAgent ? `Request details:
${ipAddress ? `IP Address: ${ipAddress}` : ''}
${userAgent ? `Device: ${userAgent}` : ''}` : ''}

---
This is an automated message from Portyfoul. Please do not reply to this email.
  `.trim();

  return { html, text, subject };
}
