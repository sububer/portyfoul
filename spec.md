# Password Reset Feature Specification

## Overview

Implement a secure password reset flow that allows users to reset their password when they've forgotten it. This feature was deferred from the initial authentication implementation and should be added in a future coding session.

## User Flow

1. **Forgot Password Request**
   - User clicks "Forgot Password?" link on login form
   - User enters their email address
   - System sends password reset email (if email exists)
   - User sees confirmation message (same message regardless of email existence for security)

2. **Reset Email**
   - User receives email with password reset link
   - Link contains unique, time-limited token
   - Link format: `https://portyfoul.com/reset-password?token=<reset_token>`
   - Email includes expiration time (e.g., "This link expires in 1 hour")

3. **Password Reset Page**
   - User clicks link in email
   - Redirected to `/reset-password` page
   - Token is validated (not expired, not already used, exists in database)
   - User enters new password (must meet password requirements)
   - User confirms new password (must match)
   - Password strength indicator shows requirement compliance

4. **Completion**
   - Password is updated in database
   - Reset token is invalidated
   - User sees success message
   - User is redirected to login page (or auto-logged in)
   - Confirmation email sent to user's email address

## Technical Requirements

### Database Schema Changes

**New Table: `password_reset_tokens`**
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),  -- For security logging
  user_agent TEXT          -- For security logging
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
```

**Migration File:** `migrations/004_add_password_reset.sql`

### API Endpoints to Create

#### 1. POST `/api/auth/forgot-password`
**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (always 200, regardless of email existence):**
```json
{
  "message": "If an account exists with this email, you will receive a password reset link."
}
```

**Logic:**
- Validate email format
- Check if user exists with this email
- If exists:
  - Generate secure random token (crypto.randomBytes)
  - Store token in database with 1-hour expiration
  - Send email with reset link
- If not exists:
  - Return same success message (prevent email enumeration)
- Rate limit: 3 requests per 15 minutes per IP

#### 2. POST `/api/auth/validate-reset-token`
**Request:**
```json
{
  "token": "abc123..."
}
```

**Response (success):**
```json
{
  "valid": true,
  "email": "user@example.com"
}
```

**Response (invalid/expired):**
```json
{
  "valid": false,
  "error": "Invalid or expired reset token"
}
```

**Logic:**
- Check token exists in database
- Verify not expired (expires_at > NOW())
- Verify not already used (used_at IS NULL)
- Return user's email (for display on reset page)

#### 3. POST `/api/auth/reset-password`
**Request:**
```json
{
  "token": "abc123...",
  "password": "NewPassword123!"
}
```

**Response (success):**
```json
{
  "message": "Password has been reset successfully"
}
```

**Response (error):**
```json
{
  "error": "Invalid or expired reset token"
}
```

**Logic:**
- Validate token (same checks as validate endpoint)
- Validate new password (8+ chars, number, special char)
- Hash new password with bcrypt
- Update user's password in database
- Mark token as used (set used_at = NOW())
- Invalidate any other reset tokens for this user
- Send confirmation email to user
- Return success

### UI Components to Create

#### 1. `ForgotPasswordForm.tsx`
**Location:** `src/components/ForgotPasswordForm.tsx`

**Features:**
- Single email input field
- "Send Reset Link" button
- Loading state during submission
- Success message display
- Error handling
- "Back to Login" link

**Props:**
```typescript
interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

#### 2. `ResetPasswordForm.tsx`
**Location:** `src/components/ResetPasswordForm.tsx`

**Features:**
- Display email address (from token validation)
- New password input with strength indicator
- Confirm password input
- Password requirements checklist (reuse from RegisterForm)
- "Reset Password" button
- Loading state during submission
- Error handling
- Auto-validation on blur

**Props:**
```typescript
interface ResetPasswordFormProps {
  token: string;
  email: string;
  onSuccess?: () => void;
}
```

#### 3. `/reset-password` Page
**Location:** `src/app/reset-password/page.tsx`

**Features:**
- Extract token from URL query parameter
- Validate token on page load
- Show loading state during validation
- Display ResetPasswordForm if token valid
- Show error message if token invalid/expired
- Redirect to home after successful reset

**Flow:**
```typescript
1. Extract token from URL: ?token=abc123
2. Call /api/auth/validate-reset-token
3. If valid: Show ResetPasswordForm with email
4. If invalid: Show error + "Request New Link" button
5. On success: Show success message + auto-redirect to login
```

### Email Service Integration

**Options to Consider:**

1. **SendGrid** (Recommended)
   - Free tier: 100 emails/day
   - Easy API integration
   - Template support

2. **Resend** (Alternative)
   - Developer-friendly API
   - Free tier: 3,000 emails/month
   - React Email integration

3. **AWS SES** (Enterprise)
   - Cost-effective at scale
   - Requires AWS account

**Email Service Configuration:**
```typescript
// src/lib/services/email.ts
interface EmailService {
  sendPasswordResetEmail(
    to: string,
    resetLink: string,
    expiresInMinutes: number
  ): Promise<void>;

  sendPasswordChangedEmail(
    to: string,
    username: string
  ): Promise<void>;
}
```

**Email Template Requirements:**
- Password Reset Email:
  - Subject: "Reset Your Portyfoul Password"
  - Clear call-to-action button
  - Display expiration time
  - Include security notice
  - Link to support/help

- Password Changed Confirmation:
  - Subject: "Your Password Has Been Changed"
  - Confirm the change was intentional
  - Include timestamp of change
  - "Contact us if you didn't make this change"

### Security Considerations

1. **Token Generation**
   - Use `crypto.randomBytes(32).toString('hex')` for tokens
   - Tokens should be at least 64 characters
   - Never reuse tokens

2. **Token Expiration**
   - Default: 1 hour expiration
   - Configurable via environment variable
   - Clean up expired tokens (background job)

3. **Rate Limiting**
   - Forgot password: 3 requests per 15 minutes per IP
   - Reset password: 5 attempts per token before invalidation
   - Track failed attempts in database

4. **Email Enumeration Prevention**
   - Always return success message (even if email doesn't exist)
   - Same response time for existing/non-existing emails
   - Don't reveal if email exists in system

5. **Token Invalidation**
   - Mark as used after successful reset
   - Invalidate all user's tokens after password change
   - Delete expired tokens older than 24 hours

6. **Logging**
   - Log all password reset requests (IP, user agent, timestamp)
   - Log successful password changes
   - Alert on suspicious patterns (multiple requests from same IP)

### Configuration

**Environment Variables:**
```bash
# Email service
EMAIL_SERVICE_PROVIDER=sendgrid  # or 'resend', 'ses'
EMAIL_API_KEY=your_api_key_here
EMAIL_FROM_ADDRESS=noreply@portyfoul.com
EMAIL_FROM_NAME=Portyfoul

# Password reset
PASSWORD_RESET_TOKEN_EXPIRY_MINUTES=60
PASSWORD_RESET_MAX_ATTEMPTS=5
PASSWORD_RESET_RATE_LIMIT_PER_IP=3
PASSWORD_RESET_RATE_LIMIT_WINDOW_MINUTES=15

# Frontend URL (for email links)
APP_URL=http://localhost:3000  # or production URL
```

**Config File Updates:**
```typescript
// src/lib/config.ts
export const config = {
  // ... existing config ...

  email: {
    provider: process.env.EMAIL_SERVICE_PROVIDER || 'sendgrid',
    apiKey: process.env.EMAIL_API_KEY,
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@portyfoul.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Portyfoul',
  },

  passwordReset: {
    tokenExpiryMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || '60'),
    maxAttempts: parseInt(process.env.PASSWORD_RESET_MAX_ATTEMPTS || '5'),
    rateLimitPerIp: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_PER_IP || '3'),
    rateLimitWindowMinutes: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MINUTES || '15'),
  },

  app: {
    url: process.env.APP_URL || 'http://localhost:3000',
  },
};
```

### Data Access Layer

**New File:** `src/lib/data/password-reset-db.ts`

```typescript
interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export const passwordResetStore = {
  async createToken(
    userId: string,
    token: string,
    expiryMinutes: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PasswordResetToken>;

  async validateToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    email?: string;
  }>;

  async markTokenAsUsed(token: string): Promise<void>;

  async invalidateUserTokens(userId: string): Promise<void>;

  async cleanupExpiredTokens(): Promise<number>;

  async getRecentRequestsByIp(
    ipAddress: string,
    windowMinutes: number
  ): Promise<number>;
};
```

### Testing Requirements

#### Unit Tests

1. **Password Reset Token Generation**
   - Test token uniqueness
   - Test expiration calculation
   - Test token length/format

2. **Token Validation**
   - Valid token returns user info
   - Expired token returns invalid
   - Used token returns invalid
   - Non-existent token returns invalid

3. **Password Update**
   - Password is properly hashed
   - Old password no longer works
   - New password works for login

#### Integration Tests

1. **Forgot Password API**
   - Valid email returns success
   - Invalid email returns success (same message)
   - Rate limiting works correctly
   - Email is sent for valid user

2. **Reset Password API**
   - Valid token allows password reset
   - Invalid token rejects request
   - Expired token rejects request
   - Used token rejects request
   - Password validation enforced

#### E2E Tests (Manual)

1. Complete flow from forgot password to login with new password
2. Token expiration after timeout
3. Multiple reset requests (ensure old tokens invalidated)
4. Email delivery and link functionality
5. Mobile responsiveness of reset forms

### Implementation Milestones

**Milestone 1: Database & Backend (2-3 hours)**
- [ ] Create migration for password_reset_tokens table
- [ ] Implement password-reset-db.ts data layer
- [ ] Create /api/auth/forgot-password endpoint
- [ ] Create /api/auth/validate-reset-token endpoint
- [ ] Create /api/auth/reset-password endpoint
- [ ] Add rate limiting middleware

**Milestone 2: Email Service (1-2 hours)**
- [ ] Choose and configure email provider
- [ ] Create email service abstraction layer
- [ ] Design password reset email template
- [ ] Design password changed confirmation template
- [ ] Test email delivery

**Milestone 3: UI Components (2-3 hours)**
- [ ] Create ForgotPasswordForm component
- [ ] Create ResetPasswordForm component
- [ ] Create /reset-password page
- [ ] Add "Forgot Password?" link to LoginForm
- [ ] Add styling and UX polish

**Milestone 4: Testing & Polish (1-2 hours)**
- [ ] Write unit tests for new endpoints
- [ ] Write integration tests
- [ ] Manual E2E testing
- [ ] Security review
- [ ] Update CLAUDE.md with new patterns

**Total Estimated Time: 6-10 hours**

### Future Enhancements

1. **Two-Factor Authentication (2FA)**
   - Require 2FA code during password reset
   - Send 2FA code via email or SMS

2. **Password History**
   - Prevent reuse of last N passwords
   - Store password history in database

3. **Account Recovery Questions**
   - Security questions as alternative to email
   - Multi-factor account recovery

4. **Notification Preferences**
   - Let users choose email notifications
   - SMS option for critical security events

5. **Admin Dashboard**
   - View password reset activity
   - Flag suspicious patterns
   - Manually invalidate tokens

## References

- OWASP Password Reset Best Practices: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- Current auth implementation: `src/lib/auth.ts`, `src/lib/middleware/auth.ts`
- Existing validation patterns: `src/lib/validation.ts`
