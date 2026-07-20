const nodemailer = require("nodemailer");

/**
 * Send email utility
 * Configure with environment variables:
 * - EMAIL_SERVICE: Email service provider (default: gmail)
 * - EMAIL_USER: Email address/username
 * - EMAIL_PASS: Email password/app password
 */

let transporter = null;

const initializeEmailTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const emailTransporter = initializeEmailTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
      text,
    };

    const result = await emailTransporter.sendMail(mailOptions);
    return { success: true, result };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
};

const sendBulkEmails = async (recipients, subject, html, text) => {
  const results = {
    success: [],
    failed: [],
  };

  for (const recipient of recipients) {
    try {
      const result = await sendEmail({
        to: recipient,
        subject,
        html,
        text,
      });

      if (result.success) {
        results.success.push(recipient);
      } else {
        results.failed.push({
          email: recipient,
          error: result.error,
        });
      }
    } catch (error) {
      results.failed.push({
        email: recipient,
        error: error.message,
      });
    }
  }

  return results;
};

const sendSuspensionEmail = async ({
  to,
  studentName,
  reason,
  suspensionEndDate,
  duration,
}) => {
  try {
    const formattedEndDate = new Date(suspensionEndDate).toLocaleDateString(
      "en-IN",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Account Suspended</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${studentName}</strong>,</p>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Your account has been suspended due to the following reason:
          </p>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <p style="color: #333; margin: 0; font-weight: bold;">Reason for Suspension:</p>
            <p style="color: #555; margin: 5px 0 0 0;">${reason}</p>
          </div>
          
          <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #555;">
                  <strong>Suspension Duration:</strong>
                </td>
                <td style="padding: 8px 0; color: #333; text-align: right;">
                  ${duration} days
                </td>
              </tr>
              <tr style="border-top: 1px solid #ccc;">
                <td style="padding: 8px 0; color: #555;">
                  <strong>Account Will Be Restored:</strong>
                </td>
                <td style="padding: 8px 0; color: #333; text-align: right;">
                  ${formattedEndDate}
                </td>
              </tr>
            </table>
          </div>
          
          <div style="background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <p style="color: #666; margin: 0; font-size: 14px;">
              <strong>During this suspension period, you will:</strong>
            </p>
            <ul style="color: #666; margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
              <li>Not be able to login to your account</li>
              <li>Not have access to any courses</li>
              <li>Not be able to submit assignments or take quizzes</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-bottom: 20px; text-align: center;">
            If you believe this suspension is unfair or have questions, please contact the platform support.
          </p>
        </div>
        
        <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 0;">This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to,
      subject: "Account Suspension Notification",
      html: htmlTemplate,
    });

    if (result.success) {
      console.log(`Suspension email sent to ${to}`);
    }
    return result;
  } catch (error) {
    console.error("Error sending suspension email:", error);
    throw error;
  }
};

const sendUnsuspensionEmail = async ({ to, studentName }) => {
  try {
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Account Reactivated ✓</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${studentName}</strong>,</p>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Great news! Your account suspension has been lifted and you can now login again.
          </p>
          
          <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <p style="color: #155724; margin: 0;">
              ✓ You now have full access to all courses and features.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
            We hope this is a fresh start. Please review our community guidelines and terms of service to ensure you follow the rules going forward.
          </p>
        </div>
        
        <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 0;">This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to,
      subject: "Account Reactivated - Welcome Back!",
      html: htmlTemplate,
    });

    if (result.success) {
      console.log(`Unsuspension email sent to ${to}`);
    }
    return result;
  } catch (error) {
    console.error("Error sending unsuspension email:", error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  initializeEmailTransporter,
  sendSuspensionEmail,
  sendUnsuspensionEmail,
};
