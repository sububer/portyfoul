/**
 * Email template for password change confirmation
 */

import { config } from '@/lib/config';

export interface PasswordChangedEmailData {
  username: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export function getPasswordChangedEmail(data: PasswordChangedEmailData): { html: string; text: string; subject: string } {
  const { username, ipAddress, userAgent, timestamp } = data;
  const formattedDate = timestamp.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const subject = 'Your password has been changed - Portyfoul';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #059669; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Portyfoul</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Password Successfully Changed</h2>

              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Hi ${username},
              </p>

              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                This is a confirmation that your password for your Portyfoul account has been successfully changed.
              </p>

              <!-- Success Badge -->
              <div style="margin: 30px 0; padding: 20px; background-color: #ECFDF5; border-left: 4px solid #059669; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #065F46; font-size: 14px; font-weight: bold;">
                  ✓ Password Updated
                </p>
                <p style="margin: 0; color: #047857; font-size: 13px; line-height: 1.5;">
                  Changed on: ${formattedDate}
                </p>
                ${ipAddress || userAgent ? `
                <p style="margin: 10px 0 0 0; color: #047857; font-size: 12px; line-height: 1.5;">
                  ${ipAddress ? `IP Address: ${ipAddress}<br>` : ''}
                  ${userAgent ? `Device: ${userAgent}` : ''}
                </p>
                ` : ''}
              </div>

              <!-- Security Warning -->
              <div style="margin: 30px 0; padding: 20px; background-color: #FEF2F2; border-left: 4px solid #DC2626; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #991B1B; font-size: 14px; font-weight: bold;">
                  Didn't make this change?
                </p>
                <p style="margin: 0; color: #7F1D1D; font-size: 13px; line-height: 1.5;">
                  If you did not change your password, please contact support immediately. Your account security may be at risk.
                </p>
              </div>

              <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                You can now use your new password to log in to your Portyfoul account.
              </p>
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
Password Successfully Changed

Hi ${username},

This is a confirmation that your password for your Portyfoul account has been successfully changed.

Changed on: ${formattedDate}

${ipAddress || userAgent ? `Details:
${ipAddress ? `IP Address: ${ipAddress}` : ''}
${userAgent ? `Device: ${userAgent}` : ''}` : ''}

DIDN'T MAKE THIS CHANGE?
If you did not change your password, please contact support immediately. Your account security may be at risk.

You can now use your new password to log in to your Portyfoul account.

---
This is an automated message from Portyfoul. Please do not reply to this email.
  `.trim();

  return { html, text, subject };
}
