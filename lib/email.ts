import nodemailer from "nodemailer";

interface SendHandoverOtpParams {
  toEmail: string;
  claimantName: string;
  founderName: string;
  productTitle: string;
  otp: string;
  expiresAt: Date;
}

/**
 * Sends the 24-hour handover security OTP to the claimant's logged-in email.
 * If EMAIL_USER and EMAIL_PASS are set in .env.local, delivers directly to inbox.
 * Otherwise, logs the dispatch clearly in the server console with full OTP details.
 */
export async function sendHandoverOtpEmail({
  toEmail,
  claimantName,
  founderName,
  productTitle,
  otp,
  expiresAt,
}: SendHandoverOtpParams): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  const formattedExpiry = new Date(expiresAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const subject = `Found!t - Handover OTP for "${productTitle}"`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #0f172a; padding: 28px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; }
          .content { padding: 32px 28px; color: #1e293b; line-height: 1.6; }
          .otp-box { background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
          .otp-code { font-family: monospace, Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #1d4ed8; margin: 0; }
          .badge { display: inline-block; padding: 4px 12px; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; border-radius: 9999px; margin-top: 10px; }
          .instructions { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 0 12px 12px 0; font-size: 13px; color: #334155; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Found!t</h1>
            <p>Campus Lost &amp; Found Security</p>
          </div>
          <div class="content">
            <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">
              Item Handover Verification Code
            </h2>
            <p style="font-size: 14px; margin-bottom: 16px;">
              Hello <strong>${claimantName}</strong>,
            </p>
            <p style="font-size: 14px; margin-bottom: 8px;">
              <strong>${founderName}</strong> has initiated the handover process for your item: <strong>"${productTitle}"</strong>.
            </p>

            <div class="otp-box">
              <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 8px 0;">
                Your 6-Digit Handover OTP
              </p>
              <div class="otp-code">${otp}</div>
              <div class="badge">⏰ Valid for 24 Hours &bull; Expires ${formattedExpiry}</div>
            </div>

            <div class="instructions">
              <strong>In-Person Handover Instructions:</strong><br>
              Show or read this 6-digit OTP code to <strong>${founderName}</strong> when meeting on campus. The founder will validate this code on their device to officially confirm that you have received your item.
            </div>

            <p style="font-size: 12px; color: #64748b;">
              &bull; <strong>Campus Safety Tip:</strong> Always meet in public, well-lit campus areas like the Central Library, Student Center, or Dean&apos;s Office during daylight hours.<br>
              &bull; Do not share this code over phone or message until you have physically checked and received your item.
            </p>
          </div>
          <div class="footer">
            Found!t &bull; College Campus Lost &amp; Found System<br>
            Automated security notification sent to ${toEmail}
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Found!t - Security Handover Verification Code

Hello ${claimantName},

${founderName} has initiated the handover process for your item: "${productTitle}".

YOUR 6-DIGIT HANDOVER OTP: ${otp}
(Valid for 24 Hours until ${formattedExpiry})

INSTRUCTIONS:
Show or read this code to ${founderName} when meeting on campus. The founder will enter this OTP to officially complete the return.

Safety Reminder: Only share this code in person once you have received and inspected your item.
  `.trim();

  // If credentials exist, send via real SMTP
  if (user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user,
          pass,
        },
      });

      await transporter.sendMail({
        from: `"Found!t Campus Security" <${user}>`,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`✓ [Found!t Email] Handover OTP successfully dispatched to ${toEmail}`);
      return { success: true, simulated: false };
    } catch (smtpError) {
      console.error("Error sending email via SMTP:", smtpError);
      // Fallback to console log if SMTP fails (e.g. invalid app password)
    }
  }

  // Fallback / Simulated Log Mode (if SMTP credentials are not yet added to .env.local)
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║               FOUND!T EMAIL NOTIFICATION - OTP DISPATCH            ║
╠════════════════════════════════════════════════════════════════════╣
║ TO:         ${toEmail.padEnd(52)} ║
║ RECIPIENT:  ${claimantName.padEnd(52)} ║
║ FOUNDER:    ${founderName.padEnd(52)} ║
║ ITEM:       ${productTitle.padEnd(52)} ║
║ OTP CODE:   ${otp.padEnd(52)} ║
║ EXPIRES AT: ${formattedExpiry.padEnd(52)} ║
╠════════════════════════════════════════════════════════════════════╣
║ (To deliver real emails to inbox, add EMAIL_USER and EMAIL_PASS    ║
║  to your .env.local file)                                          ║
╚════════════════════════════════════════════════════════════════════╝
  `);

  return { success: true, simulated: true };
}
