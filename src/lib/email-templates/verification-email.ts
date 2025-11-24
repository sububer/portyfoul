/**
 * Email template for email verification
 */

import { config } from '@/lib/config';

export interface VerificationEmailData {
  username: string;
  verificationToken: string;
}

export function getVerificationEmail(data: VerificationEmailData): { html: string; text: string; subject: string } {
  const { username, verificationToken } = data;
  const verificationUrl = `${config.app.url}/verify-email?token=${verificationToken}`;

  const subject = 'Verify your email address - Portyfoul';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #4F46E5; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Portyfoul</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Welcome to Portyfoul!</h2>

              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Hi ${username},
              </p>

              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Thanks for signing up! To complete your registration and start managing your portfolio, please verify your email address by clicking the button below.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 14px 40px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Verify Email Address</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>

              <p style="margin: 0 0 20px 0; color: #4F46E5; font-size: 14px; word-break: break-all;">
                ${verificationUrl}
              </p>

              <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.5;">
                This verification link will expire in 24 hours. If you didn't create an account with Portyfoul, you can safely ignore this email.
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
Welcome to Portyfoul!

Hi ${username},

Thanks for signing up! To complete your registration and start managing your portfolio, please verify your email address by visiting the link below.

Verification Link:
${verificationUrl}

This verification link will expire in 24 hours. If you didn't create an account with Portyfoul, you can safely ignore this email.

---
This is an automated message from Portyfoul. Please do not reply to this email.
  `.trim();

  return { html, text, subject };
}
