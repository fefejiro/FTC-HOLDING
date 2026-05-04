
# Garden Client Screenshot Walkthrough & QA Evidence Pipeline

**Purpose:**
This guide documents the required screenshots and walkthrough script for the first operational MVP handoff of the Garden Cleaners portal. **These screenshots are required QA artifacts for the controlled walkthrough.**

Each screenshot must include:
- Date/time captured
- Tester/owner name
- URL/location
- Expected evidence (what should be visible)
- Pass/fail note
- Issue annotation if needed (arrows/circles)

**Required screenshots:**
1. Public homepage proof
2. Portal login proof
3. Auth email proof
4. Post-login admin portal proof

**Naming convention:**
- garden-walkthrough-01-homepage-YYYYMMDD.png
- garden-walkthrough-02-portal-login-YYYYMMDD.png
- garden-walkthrough-03-auth-email-YYYYMMDD.png
- garden-walkthrough-04-admin-portal-YYYYMMDD.png

**Storage path:**
- DOCS/qa-evidence/garden-cleaners/YYYY-MM-DD/

*This screenshot pattern should become part of the future FTC/Una Labs QA skill.*

---

## Screenshot 1: Public Homepage Proof
- **File name:** garden-walkthrough-01-homepage-YYYYMMDD.png
- **URL/Location:** https://gardencleaners.ca/
- **Expected evidence:**
  - Garden Cleaners branding (logo, name)
  - Main navigation (Home, About, Services, Contact, Get a Quote)
  - Hero section with service promise
- **Pass/fail note:**
  - Confirm all expected elements are present and correct
- **Issue annotation:**
  - Use red arrows or circles to highlight missing/broken elements
- **What would count as a problem:**
  - Broken images, missing branding
  - Navigation links missing or incorrect
  - Placeholder/test content visible

---

## Screenshot 2: Portal Login Proof
- **File name:** garden-walkthrough-02-portal-login-YYYYMMDD.png
- **URL/Location:** https://gardencleaners.ca/garden-cleaners/portal
- **Expected evidence:**
  - Portal login form (email, password fields)
  - Garden Cleaners branding
  - Option for magic link login (if enabled)
- **Pass/fail note:**
  - Confirm login form is present, styled, and error-free
- **Issue annotation:**
  - Use arrows/circles to highlight missing form fields or branding
- **What would count as a problem:**
  - Login form missing or broken
  - Error messages before login attempt
  - Branding missing or inconsistent

---

## Screenshot 3: Auth Email Proof
- **File name:** garden-walkthrough-03-auth-email-YYYYMMDD.png
- **Location:** Client's email inbox (subject: "FTC Client Portal")
- **Expected evidence:**
  - Email from correct sender (currently: Una Labs, should be FTC Client Portal)
  - Subject: "FTC Client Portal"
  - Login button or magic link
- **Pass/fail note:**
  - Confirm email is received, sender/subject correct, login button/link present
- **Issue annotation:**
  - Circle sender/subject, arrow to login button
- **What would count as a problem:**
  - Email not received
  - Sender/subject incorrect
  - Login button/link missing or broken

---

## Screenshot 4: Post-Login Admin Portal Proof
- **File name:** garden-walkthrough-04-admin-portal-YYYYMMDD.png
- **URL/Location:** https://gardencleaners.ca/garden-cleaners/portal (after login)
- **Expected evidence:**
  - Admin or client dashboard (depending on user role)
  - Welcome message or user email
  - Navigation to jobs, quotes, or admin controls
- **Pass/fail note:**
  - Confirm correct dashboard for role, all controls present, no errors
- **Issue annotation:**
  - Use arrows/circles to highlight missing or incorrect elements
- **What would count as a problem:**
  - Wrong dashboard (e.g., staff view for admin)
  - Missing controls or navigation
  - Error messages after login

---

## Client Walkthrough Script

**What to say:**
> “This is the first operational MVP walkthrough.”

**What not to say:**
> “This is the full final operations system.”
> “No more setup is needed.”

---

## Remaining Final Handoff Gates
- Admin login confirmation (see admin login verification doc)
- SMTP sender branding (email sender display name must be FTC Client Portal)
- Security/key gate (final review before full production handoff)

---

*Use this guide to ensure all client-facing flows are visually and functionally correct before the final handoff.*
