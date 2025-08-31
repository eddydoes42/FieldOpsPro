import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface WelcomeEmailParams {
  to: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  temporaryPassword: boolean;
  appUrl: string;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
  try {
    const temporaryPasswordNote = params.temporaryPassword 
      ? "⚠️ This is a temporary password that must be changed on your first login."
      : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to FieldOps Pro</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background: #1e293b; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to FieldOps Pro</h1>
              <p>Your account has been successfully created</p>
            </div>
            <div class="content">
              <h2>Hello ${params.firstName} ${params.lastName}!</h2>
              <p>Your FieldOps Pro account has been created and you're ready to get started with our field operations management platform.</p>
              
              <div class="credentials">
                <h3>🔐 Your Login Credentials</h3>
                <p><strong>Username:</strong> ${params.username}</p>
                <p><strong>Password:</strong> ${params.password}</p>
                <p><strong>Login URL:</strong> <a href="${params.appUrl}" style="color: #60a5fa;">${params.appUrl}</a></p>
              </div>
              
              ${temporaryPasswordNote ? `
                <div class="warning">
                  <p><strong>⚠️ Important Security Notice</strong></p>
                  <p>${temporaryPasswordNote}</p>
                </div>
              ` : ''}
              
              <p>Click the button below to access your dashboard:</p>
              <a href="${params.appUrl}" class="button">Access FieldOps Pro Dashboard</a>
              
              <h3>Getting Started</h3>
              <ul>
                <li>Log in using your credentials above</li>
                <li>Complete your profile setup</li>
                <li>Familiarize yourself with the dashboard</li>
                <li>Contact your administrator if you need assistance</li>
              </ul>
              
              <p>If you have any questions or need support, please contact your system administrator.</p>
            </div>
            <div class="footer">
              <p>This email was sent automatically by FieldOps Pro.<br>
              Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Welcome to FieldOps Pro!

Hello ${params.firstName} ${params.lastName}!

Your FieldOps Pro account has been successfully created.

Login Credentials:
Username: ${params.username}
Password: ${params.password}
Login URL: ${params.appUrl}

${temporaryPasswordNote}

Getting Started:
- Log in using your credentials above
- Complete your profile setup  
- Familiarize yourself with the dashboard
- Contact your administrator if you need assistance

If you have any questions or need support, please contact your system administrator.

This email was sent automatically by FieldOps Pro.
Please do not reply to this email.
    `;

    // Log the API key and sender info for debugging
    console.log('SendGrid API Key exists:', !!process.env.SENDGRID_API_KEY);
    console.log('Sending from:', 'onboarding@immeditechs.com');
    console.log('Sending to:', params.to);
    
    await mailService.send({
      to: params.to,
      from: 'onboarding@immeditechs.com', // Updated to verified sender
      subject: 'Welcome to FieldOps Pro - Your Account is Ready',
      text: textContent,
      html: htmlContent,
    });

    console.log(`Welcome email sent successfully to ${params.to}`);
    return true;
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    if (error && typeof error === 'object' && 'response' in error && error.response?.body) {
      console.error('SendGrid error details:', JSON.stringify(error.response.body, null, 2));
      
      // Check for specific error messages
      if (error.response.body.errors) {
        error.response.body.errors.forEach((err: any) => {
          console.error('SendGrid specific error:', err.message);
        });
      }
    }
    return false;
  }
}