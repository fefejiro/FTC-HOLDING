import Mailjet from 'node-mailjet';

let mailjet: Mailjet | null = null;

if (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) {
  mailjet = new Mailjet({
    apiKey: process.env.MAILJET_API_KEY,
    apiSecret: process.env.MAILJET_SECRET_KEY
  });
}

interface EmailOptions {
  to: string;
  toName: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Skip sending if API keys are not configured
  if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
    console.log('[Email] Mailjet API keys not configured - email not sent');
    console.log(`[Email] Subject: ${options.subject}`);
    return false;
  }

  if (!mailjet) {
    return false;
  }

  try {
    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: 'peacepad@peacepad.ca',
              Name: 'PeacePad'
            },
            To: [
              {
                Email: options.to,
                Name: options.toName
              }
            ],
            Subject: options.subject,
            TextPart: options.textContent,
            HTMLPart: options.htmlContent
          }
        ]
      });

    const result = await request;
    console.log(`[Email] Successfully sent: ${options.subject}`);
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send email:', error.message || error);
    return false;
  }
}

// Welcome email for users who accept a partnership invite
export async function sendInviteAcceptanceEmail(userEmail: string, userName: string, partnerName: string) {
  const subject = 'Welcome to PeacePad!';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to PeacePad!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          
          <p>You've successfully joined PeacePad by accepting ${partnerName}'s partnership invitation!</p>
          
          <p>PeacePad is your AI-powered co-parenting platform designed to make communication easier and keep everyone on the same page.</p>
          
          <p><strong>Here's what you can do now:</strong></p>
          <ul>
            <li><strong>Message your co-parent</strong> with AI tone analysis to keep conversations constructive</li>
            <li><strong>Share a custody calendar</strong> to coordinate schedules and avoid conflicts</li>
            <li><strong>Manage shared tasks</strong> like school pickups, doctor appointments, and activities</li>
            <li><strong>Track shared expenses</strong> with automatic splitting and payment tracking</li>
            <li><strong>Use Conch Mode</strong> for structured, respectful conversations when things get tense</li>
          </ul>
          
          <p style="text-align: center;">
            <a href="${process.env.VITE_BASE_URL || 'https://peacepad.ca'}" class="button">Open PeacePad</a>
          </p>
          
          <p>Need help getting started? Check out our <a href="${process.env.VITE_BASE_URL || 'https://peacepad.ca'}/resources">resource library</a> for co-parenting tips and guides.</p>
          
          <p>Thanks for choosing PeacePad to support your co-parenting journey!</p>
          
          <p>Best,<br>The PeacePad Team</p>
        </div>
        <div class="footer">
          <p>PeacePad - Making Co-Parenting Easier</p>
          <p>This email was sent because you accepted a partnership invitation on PeacePad.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hi ${userName},

You've successfully joined PeacePad by accepting ${partnerName}'s partnership invitation!

PeacePad is your AI-powered co-parenting platform designed to make communication easier and keep everyone on the same page.

Here's what you can do now:

- Message your co-parent with AI tone analysis to keep conversations constructive
- Share a custody calendar to coordinate schedules and avoid conflicts
- Manage shared tasks like school pickups, doctor appointments, and activities
- Track shared expenses with automatic splitting and payment tracking
- Use Conch Mode for structured, respectful conversations when things get tense

Get started: ${process.env.VITE_BASE_URL || 'https://peacepad.ca'}

Need help? Check out our resource library: ${process.env.VITE_BASE_URL || 'https://peacepad.ca'}/resources

Thanks for choosing PeacePad to support your co-parenting journey!

Best,
The PeacePad Team

---
This email was sent because you accepted a partnership invitation on PeacePad.
  `;

  return sendEmail({
    to: userEmail,
    toName: userName,
    subject,
    htmlContent,
    textContent
  });
}

// Welcome email for users who create a new partnership (first parent)
export async function sendNewPartnershipEmail(userEmail: string, userName: string) {
  const subject = 'Welcome to PeacePad! Your Invite Link is Ready';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .invite-box { background: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to PeacePad!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          
          <p>Welcome to PeacePad! Your account is all set up and ready to go.</p>
          
          <p><strong>Next Step: Invite Your Co-Parent</strong></p>
          
          <p>To start using PeacePad's shared features like messaging, calendar, tasks, and expense tracking, you'll need to invite your co-parent.</p>
          
          <div class="invite-box">
            <p><strong>How to Send Your Invite:</strong></p>
            <ol style="text-align: left; display: inline-block;">
              <li>Log in to PeacePad</li>
              <li>Go to Settings</li>
              <li>Copy your unique invite link</li>
              <li>Share it with your co-parent via text or email</li>
            </ol>
          </div>
          
          <p style="text-align: center;">
            <a href="${process.env.VITE_BASE_URL || 'https://peacepad.ca'}" class="button">Open PeacePad</a>
          </p>
          
          <p><strong>What PeacePad Offers:</strong></p>
          <ul>
            <li><strong>AI-Powered Messaging</strong> - Get tone analysis to keep conversations constructive</li>
            <li><strong>Shared Calendar</strong> - Coordinate custody schedules with conflict detection</li>
            <li><strong>Task Management</strong> - Track pickups, appointments, and activities together</li>
            <li><strong>Expense Tracking</strong> - Split costs fairly with automatic calculations</li>
            <li><strong>Conch Mode</strong> - Structured conversations when emotions run high</li>
          </ul>
          
          <p>Need help? Visit our <a href="${process.env.VITE_BASE_URL || 'https://peacepad.ca'}/resources">resource library</a> for guides and co-parenting tips.</p>
          
          <p>Thanks for choosing PeacePad!</p>
          
          <p>Best,<br>The PeacePad Team</p>
        </div>
        <div class="footer">
          <p>PeacePad - Making Co-Parenting Easier</p>
          <p>This email was sent because you created an account on PeacePad.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hi ${userName},

Welcome to PeacePad! Your account is all set up and ready to go.

NEXT STEP: Invite Your Co-Parent

To start using PeacePad's shared features like messaging, calendar, tasks, and expense tracking, you'll need to invite your co-parent.

How to Send Your Invite:
1. Log in to PeacePad
2. Go to Settings
3. Copy your unique invite link
4. Share it with your co-parent via text or email

Get started: ${process.env.VITE_BASE_URL || 'https://peacepad.ca'}

What PeacePad Offers:

- AI-Powered Messaging - Get tone analysis to keep conversations constructive
- Shared Calendar - Coordinate custody schedules with conflict detection
- Task Management - Track pickups, appointments, and activities together
- Expense Tracking - Split costs fairly with automatic calculations
- Conch Mode - Structured conversations when emotions run high

Need help? Visit our resource library: ${process.env.VITE_BASE_URL || 'https://peacepad.ca'}/resources

Thanks for choosing PeacePad!

Best,
The PeacePad Team

---
This email was sent because you created an account on PeacePad.
  `;

  return sendEmail({
    to: userEmail,
    toName: userName,
    subject,
    htmlContent,
    textContent
  });
}

// Admin notification email for new user signups
export async function sendNewUserAdminNotification(
  newUserEmail: string, 
  newUserName: string, 
  newUserId: string,
  signupTimestamp: Date
) {
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!adminEmail) {
    console.log('[Email] ADMIN_EMAIL not configured - admin notification not sent');
    return false;
  }

  const subject = `New PeacePad Beta User: ${newUserName}`;
  
  const formattedDate = signupTimestamp.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .info-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
        .label { font-weight: bold; color: #059669; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Beta User Signed Up!</h1>
        </div>
        <div class="content">
          <p>Great news! A new user just joined PeacePad Beta.</p>
          
          <div class="info-box">
            <p><span class="label">Name:</span> ${newUserName}</p>
            <p><span class="label">Email:</span> ${newUserEmail}</p>
            <p><span class="label">User ID:</span> ${newUserId}</p>
            <p><span class="label">Signup Time:</span> ${formattedDate}</p>
          </div>
          
          <p><strong>Beta Progress:</strong> You now have another tester helping shape PeacePad!</p>
          
          <p>You may want to:</p>
          <ul>
            <li>Monitor their activity in the admin dashboard</li>
            <li>Reach out to welcome them personally</li>
            <li>Check if they need help getting started</li>
          </ul>
          
          <p>This notification was sent from your PeacePad Beta signup monitoring system.</p>
        </div>
        <div class="footer">
          <p>PeacePad Beta Admin Notification</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
New Beta User Signed Up!

Name: ${newUserName}
Email: ${newUserEmail}
User ID: ${newUserId}
Signup Time: ${formattedDate}

Beta Progress: You now have another tester helping shape PeacePad!

You may want to:
- Monitor their activity in the admin dashboard
- Reach out to welcome them personally  
- Check if they need help getting started

---
This notification was sent from your PeacePad Beta signup monitoring system.
  `;

  return sendEmail({
    to: adminEmail,
    toName: 'PeacePad Admin',
    subject,
    htmlContent,
    textContent
  });
}

// P1 Error Alert Email
export async function sendP1ErrorAlert(
  errorMessage: string,
  errorDetails: any,
  errorStack?: string,
  category?: string
) {
  const adminEmail = process.env.ADMIN_EMAIL || 'peacepad@peacepad.ca';
  
  const timestamp = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  const subject = `[P1 CRITICAL ERROR] PeacePad`;
  
  const detailsString = errorDetails ? JSON.stringify(errorDetails, null, 2) : 'No additional details';
  const stackString = errorStack || 'No stack trace available';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .error-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; font-family: 'Courier New', monospace; }
        .details-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; margin: 20px 0; font-family: 'Courier New', monospace; font-size: 12px; overflow-x: auto; }
        .label { font-weight: bold; color: #dc2626; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>P1 CRITICAL ERROR</h1>
          <p style="margin: 0; font-size: 14px;">Immediate attention required</p>
        </div>
        <div class="content">
          <p><span class="label">Time:</span> ${timestamp}</p>
          <p><span class="label">Category:</span> ${category || 'Unknown'}</p>
          
          <div class="error-box">
            <strong>Error Message:</strong><br>
            ${errorMessage}
          </div>
          
          <div class="details-box">
            <strong>Error Details:</strong><br>
            <pre style="margin: 10px 0; white-space: pre-wrap; word-wrap: break-word;">${detailsString}</pre>
          </div>
          
          <div class="details-box">
            <strong>Stack Trace:</strong><br>
            <pre style="margin: 10px 0; white-space: pre-wrap; word-wrap: break-word;">${stackString}</pre>
          </div>
          
          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Check the admin dashboard at <a href="https://dev.peacepad.ca/admin/errors">dev.peacepad.ca/admin/errors</a></li>
            <li>Review logs in the monitoring panel</li>
            <li>Fix the issue if it's blocking user access</li>
          </ul>
          
          <p style="color: #dc2626; font-weight: bold;">WARNING: This is a P1 (critical) error that may be blocking users from accessing the application.</p>
        </div>
        <div class="footer">
          <p>PeacePad Beta - P1 Error Monitoring</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
P1 CRITICAL ERROR - PeacePad

Time: ${timestamp}
Category: ${category || 'Unknown'}

ERROR MESSAGE:
${errorMessage}

ERROR DETAILS:
${detailsString}

STACK TRACE:
${stackString}

NEXT STEPS:
- Check the admin dashboard at https://dev.peacepad.ca/admin/errors
- Review logs in the monitoring panel
- Fix the issue if it's blocking user access

WARNING: This is a P1 (critical) error that may be blocking users from accessing the application.

---
PeacePad Beta - P1 Error Monitoring
  `;

  return sendEmail({
    to: adminEmail,
    toName: 'PeacePad Admin',
    subject,
    htmlContent,
    textContent
  });
}

// Weekly Consolidated Report Email
export async function sendWeeklyReport(reportData: {
  weekStart: Date;
  weekEnd: Date;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  totalPartnerships: number;
  totalMessages: number;
  totalP1Errors: number;
  totalP2Errors: number;
  totalFeedback: number;
  newBugs: number;
  newSuggestions: number;
  topAPIEndpoints: Array<{ endpoint: string; avgResponseTime: number; callCount: number }>;
  recentBugs: Array<{ type: string; description: string; severity?: string; createdAt: Date }>;
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'peacepad@peacepad.ca';
  
  const weekStartFormatted = reportData.weekStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  const weekEndFormatted = reportData.weekEnd.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const subject = `PeacePad Weekly Report - ${weekStartFormatted} to ${weekEndFormatted}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .stat-card { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; }
        .stat-value { font-size: 28px; font-weight: bold; color: #1e40af; }
        .stat-label { font-size: 14px; color: #64748b; }
        .section { margin: 30px 0; }
        .section-title { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        .bug-item { background: #fef2f2; border-left: 3px solid #ef4444; padding: 12px; margin: 10px 0; border-radius: 4px; }
        .api-item { background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px; margin: 8px 0; border-radius: 4px; display: flex; justify-content: space-between; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Weekly Report</h1>
          <p style="margin: 0;">${weekStartFormatted} - ${weekEndFormatted}</p>
        </div>
        <div class="content">
          
          <div class="section">
            <div class="section-title">User Statistics</div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${reportData.totalUsers}</div>
                <div class="stat-label">Total Users</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${reportData.newUsers}</div>
                <div class="stat-label">New This Week</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${reportData.activeUsers}</div>
                <div class="stat-label">Active Users</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${reportData.totalPartnerships}</div>
                <div class="stat-label">Partnerships</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Activity</div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${reportData.totalMessages}</div>
                <div class="stat-label">Messages Sent</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${reportData.totalFeedback}</div>
                <div class="stat-label">Feedback Submitted</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">System Health</div>
            <div class="stats-grid">
              <div class="stat-card" style="background: ${reportData.totalP1Errors > 0 ? '#fef2f2' : '#f0fdf4'}; border-left-color: ${reportData.totalP1Errors > 0 ? '#ef4444' : '#10b981'};">
                <div class="stat-value" style="color: ${reportData.totalP1Errors > 0 ? '#dc2626' : '#059669'};">${reportData.totalP1Errors}</div>
                <div class="stat-label">P1 Errors</div>
              </div>
              <div class="stat-card" style="background: ${reportData.totalP2Errors > 5 ? '#fef3c7' : '#f0fdf4'}; border-left-color: ${reportData.totalP2Errors > 5 ? '#f59e0b' : '#10b981'};">
                <div class="stat-value" style="color: ${reportData.totalP2Errors > 5 ? '#d97706' : '#059669'};">${reportData.totalP2Errors}</div>
                <div class="stat-label">P2 Errors</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Feedback Summary</div>
            <table>
              <tr>
                <th>Type</th>
                <th>Count</th>
              </tr>
              <tr>
                <td>New Bugs</td>
                <td><strong>${reportData.newBugs}</strong></td>
              </tr>
              <tr>
                <td>New Suggestions</td>
                <td><strong>${reportData.newSuggestions}</strong></td>
              </tr>
            </table>
          </div>

          ${reportData.recentBugs.length > 0 ? `
          <div class="section">
            <div class="section-title">Recent Critical Bugs</div>
            ${reportData.recentBugs.map(bug => `
              <div class="bug-item">
                <strong>[${bug.type.toUpperCase()}] ${bug.severity ? `[${bug.severity.toUpperCase()}]` : ''}</strong><br>
                ${bug.description}<br>
                <small style="color: #64748b;">${bug.createdAt.toLocaleDateString()}</small>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Top API Endpoints (Performance)</div>
            ${reportData.topAPIEndpoints.map(api => `
              <div class="api-item">
                <span><strong>${api.endpoint}</strong></span>
                <span>${api.avgResponseTime.toFixed(0)}ms avg (${api.callCount} calls)</span>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <p><strong>View Full Details:</strong></p>
            <ul>
              <li><a href="https://dev.peacepad.ca/admin">Admin Dashboard</a></li>
              <li><a href="https://dev.peacepad.ca/admin/users">User Management</a></li>
              <li><a href="https://dev.peacepad.ca/admin/feedback">Feedback & Bugs</a></li>
              <li><a href="https://dev.peacepad.ca/admin/errors">Error Logs</a></li>
            </ul>
          </div>

        </div>
        <div class="footer">
          <p>PeacePad Beta - Weekly Consolidated Report</p>
          <p>Sent every Monday at 9:00 AM</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
PEACEPAD WEEKLY REPORT
${weekStartFormatted} - ${weekEndFormatted}

USER STATISTICS
- Total Users: ${reportData.totalUsers}
- New This Week: ${reportData.newUsers}
- Active Users: ${reportData.activeUsers}
- Partnerships: ${reportData.totalPartnerships}

ACTIVITY
- Messages Sent: ${reportData.totalMessages}
- Feedback Submitted: ${reportData.totalFeedback}

SYSTEM HEALTH
- P1 Errors: ${reportData.totalP1Errors}
- P2 Errors: ${reportData.totalP2Errors}

FEEDBACK SUMMARY
- New Bugs: ${reportData.newBugs}
- New Suggestions: ${reportData.newSuggestions}

${reportData.recentBugs.length > 0 ? `
RECENT CRITICAL BUGS:
${reportData.recentBugs.map(bug => `- ${bug.severity ? `[${bug.severity.toUpperCase()}]` : ''} ${bug.description} (${bug.createdAt.toLocaleDateString()})`).join('\n')}
` : ''}

TOP API ENDPOINTS (Performance):
${reportData.topAPIEndpoints.map(api => `- ${api.endpoint}: ${api.avgResponseTime.toFixed(0)}ms avg (${api.callCount} calls)`).join('\n')}

VIEW FULL DETAILS:
- Admin Dashboard: https://dev.peacepad.ca/admin
- User Management: https://dev.peacepad.ca/admin/users
- Feedback & Bugs: https://dev.peacepad.ca/admin/feedback
- Error Logs: https://dev.peacepad.ca/admin/errors

---
PeacePad Beta - Weekly Consolidated Report
Sent every Monday at 9:00 AM
  `;

  return sendEmail({
    to: adminEmail,
    toName: 'PeacePad Admin',
    subject,
    htmlContent,
    textContent
  });
}

// Security notification: New partnership connection
export async function sendPartnershipConnectedEmail(userEmail: string, userName: string, partnerName: string, timestamp: Date) {
  const subject = 'New Partnership Connected - PeacePad Security Alert';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .alert-box { background: #f0f9ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Security Alert</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          
          <div class="alert-box">
            <strong>New Partnership Connection Detected</strong>
            <p style="margin: 10px 0 0 0;">A new co-parenting partnership was established on your PeacePad account.</p>
          </div>
          
          <div class="details">
            <p style="margin: 5px 0;"><strong>Partner:</strong> ${partnerName}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Account:</strong> ${userEmail}</p>
          </div>
          
          <p><strong>What this means:</strong></p>
          <ul>
            <li>This partner now has access to your shared calendar, tasks, and messaging</li>
            <li>You can view and manage partnerships in your Settings</li>
            <li>You can remove this partnership at any time</li>
          </ul>
          
          <div class="warning">
            <strong>⚠️ Didn't authorize this connection?</strong>
            <p style="margin: 10px 0 0 0;">If you didn't create this partnership, please log in immediately and remove it from your Settings page. Contact support if you need assistance.</p>
          </div>
          
          <p style="text-align: center;">
            <a href="${process.env.VITE_BASE_URL || 'https://peacepad.ca'}/settings" class="button">Review Partnerships</a>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated security notification. You're receiving this because a new partnership was established on your account.
          </p>
        </div>
        <div class="footer">
          <p>PeacePad - Secure Co-Parenting Platform</p>
          <p>Questions? Contact peacepad@peacepad.ca</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
SECURITY ALERT - New Partnership Connected

Hi ${userName},

A new co-parenting partnership was established on your PeacePad account.

DETAILS:
- Partner: ${partnerName}
- Time: ${timestamp.toLocaleString()}
- Account: ${userEmail}

WHAT THIS MEANS:
- This partner now has access to your shared calendar, tasks, and messaging
- You can view and manage partnerships in your Settings
- You can remove this partnership at any time

DIDN'T AUTHORIZE THIS?
If you didn't create this partnership, please log in immediately and remove it from your Settings page.

Review Partnerships: ${process.env.VITE_BASE_URL || 'https://peacepad.ca'}/settings

---
PeacePad - Secure Co-Parenting Platform
Questions? Contact peacepad@peacepad.ca
  `;

  return sendEmail({
    to: userEmail,
    toName: userName,
    subject,
    htmlContent,
    textContent
  });
}

// Security notification: Data export requested
export async function sendDataExportEmail(userEmail: string, userName: string, timestamp: Date, ipAddress?: string) {
  const subject = 'Data Export Requested - PeacePad Security Alert';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .alert-box { background: #f0f9ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 Data Export Alert</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          
          <div class="alert-box">
            <strong>Data Export Requested</strong>
            <p style="margin: 10px 0 0 0;">A complete export of your PeacePad data was just requested.</p>
          </div>
          
          <div class="details">
            <p style="margin: 5px 0;"><strong>Account:</strong> ${userEmail}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
            ${ipAddress ? `<p style="margin: 5px 0;"><strong>IP Address:</strong> ${ipAddress}</p>` : ''}
          </div>
          
          <p><strong>What's included in your export:</strong></p>
          <ul>
            <li>Profile information and settings</li>
            <li>Messages and attachments</li>
            <li>Calendar events and tasks</li>
            <li>Expense records</li>
            <li>Child updates and shared notes</li>
          </ul>
          
          <p>Your data export will be sent to this email address shortly in ZIP format. The file contains sensitive information, so please:</p>
          <ul>
            <li>Store it securely</li>
            <li>Don't share it with unauthorized parties</li>
            <li>Delete it when no longer needed</li>
          </ul>
          
          <div class="warning">
            <strong>⚠️ Didn't request this export?</strong>
            <p style="margin: 10px 0 0 0;">If you didn't initiate this data export, your account may be compromised. Please change your password immediately and review your account security.</p>
          </div>
          
          <p style="text-align: center;">
            <a href="${process.env.VITE_BASE_URL || 'https://peacepad.ca'}/settings" class="button">Review Account Security</a>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated security notification for data privacy compliance (GDPR).
          </p>
        </div>
        <div class="footer">
          <p>PeacePad - Secure Co-Parenting Platform</p>
          <p>Questions? Contact peacepad@peacepad.ca</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
SECURITY ALERT - Data Export Requested

Hi ${userName},

A complete export of your PeacePad data was just requested.

DETAILS:
- Account: ${userEmail}
- Time: ${timestamp.toLocaleString()}
${ipAddress ? `- IP Address: ${ipAddress}` : ''}

WHAT'S INCLUDED:
- Profile information and settings
- Messages and attachments
- Calendar events and tasks
- Expense records
- Child updates and shared notes

Your data export will be sent to this email address shortly in ZIP format.

SECURITY REMINDER:
- Store your export securely
- Don't share it with unauthorized parties
- Delete it when no longer needed

DIDN'T REQUEST THIS?
If you didn't initiate this export, your account may be compromised.
Change your password immediately and review your account security.

Review Account: ${process.env.VITE_BASE_URL || 'https://peacepad.ca'}/settings

---
PeacePad - Secure Co-Parenting Platform
Questions? Contact peacepad@peacepad.ca
  `;

  return sendEmail({
    to: userEmail,
    toName: userName,
    subject,
    htmlContent,
    textContent
  });
}

// Security notification: Partnership ended/removed
export async function sendPartnershipRemovedEmail(userEmail: string, userName: string, partnerName: string, timestamp: Date, removedBy: 'you' | 'partner') {
  const subject = 'Partnership Removed - PeacePad Security Alert';
  
  const actionText = removedBy === 'you' 
    ? 'You ended your partnership' 
    : `${partnerName} ended the partnership`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .alert-box { background: #f0f9ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔓 Partnership Removed</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          
          <div class="alert-box">
            <strong>Partnership Ended</strong>
            <p style="margin: 10px 0 0 0;">${actionText} with ${partnerName}.</p>
          </div>
          
          <div class="details">
            <p style="margin: 5px 0;"><strong>Partner:</strong> ${partnerName}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Action:</strong> ${removedBy === 'you' ? 'Initiated by you' : 'Initiated by partner'}</p>
          </div>
          
          <p><strong>What this means:</strong></p>
          <ul>
            <li>${partnerName} no longer has access to your shared data</li>
            <li>You can no longer access shared messages, calendar, or tasks with this partner</li>
            <li>Your personal data and settings remain secure</li>
            <li>You can create new partnerships anytime</li>
          </ul>
          
          ${removedBy === 'partner' ? `
          <div class="warning">
            <strong>⚠️ Partnership ended by your co-parent</strong>
            <p style="margin: 10px 0 0 0;">If this was unexpected, you may want to reach out to ${partnerName} outside of PeacePad to discuss next steps.</p>
          </div>
          ` : ''}
          
          <p style="text-align: center;">
            <a href="${process.env.VITE_BASE_URL || 'https://peacepad.ca'}/settings" class="button">View Account Settings</a>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated security notification. You're receiving this because a partnership on your account was removed.
          </p>
        </div>
        <div class="footer">
          <p>PeacePad - Secure Co-Parenting Platform</p>
          <p>Questions? Contact peacepad@peacepad.ca</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
SECURITY ALERT - Partnership Removed

Hi ${userName},

${actionText} with ${partnerName}.

DETAILS:
- Partner: ${partnerName}
- Time: ${timestamp.toLocaleString()}
- Action: ${removedBy === 'you' ? 'Initiated by you' : 'Initiated by partner'}

WHAT THIS MEANS:
- ${partnerName} no longer has access to your shared data
- You can no longer access shared messages, calendar, or tasks with this partner
- Your personal data and settings remain secure
- You can create new partnerships anytime

${removedBy === 'partner' ? `
UNEXPECTED CHANGE?
If this was unexpected, you may want to reach out to ${partnerName} outside of PeacePad to discuss next steps.
` : ''}

View Settings: ${process.env.VITE_BASE_URL || 'https://peacepad.ca'}/settings

---
PeacePad - Secure Co-Parenting Platform
Questions? Contact peacepad@peacepad.ca
  `;

  return sendEmail({
    to: userEmail,
    toName: userName,
    subject,
    htmlContent,
    textContent
  });
}
