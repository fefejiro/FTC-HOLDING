# Supabase Auth Email Template Update — FTC Client Portal Branding

## Why Generic Branding?
- The previous Supabase Auth emails referenced “Una Labs,” which is not client-facing and caused confusion for Garden Cleaners users.
- To support multiple brands and avoid future rebranding, we are switching to a generic, shared template: **FTC Client Portal**.
- This ensures a consistent, neutral experience for all clients and avoids accidental cross-branding.

## Dashboard Path
Supabase Dashboard → Authentication → Email Templates

---

## Templates

### 1. Magic Link
- **Subject:** Your client portal login link
- **Plain Text:**
  FTC Client Portal
  
  Click the link below to securely sign in to your client portal. This link expires in 1 hour.
  
  {{ .ConfirmationURL }}
  
  If you did not request this, you can ignore this email.
  
  FTC Client Portal
- **HTML:**
  <html>
    <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
      <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px;">
        <h2 style="color: #1a202c;">FTC Client Portal</h2>
        <p>Click below to securely sign in to your client portal. This link expires in 1 hour.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="{{ .ConfirmationURL }}" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 4px; font-weight: bold;">Sign in to portal</a>
        </p>
        <p style="color: #555; font-size: 13px;">If you did not request this, you can ignore this email.</p>
        <div style="margin-top: 32px; color: #888; font-size: 12px;">FTC Client Portal</div>
      </div>
    </body>
  </html>

---

### 2. Invite User
- **Subject:** Your client portal invitation
- **Plain Text:**
  FTC Client Portal
  
  You have been invited to join the client portal. Click the link below to set up your account. This link expires in 1 hour.
  
  {{ .ConfirmationURL }}
  
  If you did not expect this, you can ignore this email.
  
  FTC Client Portal
- **HTML:**
  <html>
    <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
      <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px;">
        <h2 style="color: #1a202c;">FTC Client Portal</h2>
        <p>You have been invited to join the client portal. Click below to set up your account. This link expires in 1 hour.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="{{ .ConfirmationURL }}" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 4px; font-weight: bold;">Set up your account</a>
        </p>
        <p style="color: #555; font-size: 13px;">If you did not expect this, you can ignore this email.</p>
        <div style="margin-top: 32px; color: #888; font-size: 12px;">FTC Client Portal</div>
      </div>
    </body>
  </html>

---

### 3. Reset Password / Recovery
- **Subject:** Reset your client portal password
- **Plain Text:**
  FTC Client Portal
  
  Click the link below to reset your client portal password. This link expires in 1 hour.
  
  {{ .ConfirmationURL }}
  
  If you did not request this, you can ignore this email.
  
  FTC Client Portal
- **HTML:**
  <html>
    <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
      <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px;">
        <h2 style="color: #1a202c;">FTC Client Portal</h2>
        <p>Click below to reset your client portal password. This link expires in 1 hour.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="{{ .ConfirmationURL }}" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 4px; font-weight: bold;">Reset password</a>
        </p>
        <p style="color: #555; font-size: 13px;">If you did not request this, you can ignore this email.</p>
        <div style="margin-top: 32px; color: #888; font-size: 12px;">FTC Client Portal</div>
      </div>
    </body>
  </html>

---

## Post-Update Verification
1. Send a test magic link to fejiro.efiuvwere@gmail.com from the Supabase dashboard.
2. Confirm the received email no longer says “Una Labs.”
3. Confirm the button routes to the portal and the link works.

## Gate Update
- Controlled walkthrough remains HOLD until a verified email is received with correct branding.
- Full handoff remains NO-GO until production admin login confirmation and security/key-rotation gate.

// No secrets, passwords, or keys included.
