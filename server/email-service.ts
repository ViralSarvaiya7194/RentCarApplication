import nodemailer from 'nodemailer';
import { pool } from './db/connection';

export interface EmailSettings {
  enableDayCloseEmail: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  emailSender: string;
  emailRecipients: string;
  emailSubjectTemplate: string;
}

export class EmailService {
  /**
   * Load SMTP and notification settings from PostgreSQL system_settings table
   */
  static async getSettings(): Promise<EmailSettings> {
    try {
      const res = await pool.query(
        `SELECT key, value FROM system_settings WHERE key IN (
          'ENABLE_DAY_CLOSE_EMAIL',
          'SMTP_HOST',
          'SMTP_PORT',
          'SMTP_USER',
          'SMTP_PASS',
          'EMAIL_SENDER',
          'EMAIL_RECIPIENTS',
          'EMAIL_SUBJECT_TEMPLATE'
        )`
      );

      const map = new Map<string, string>();
      for (const row of res.rows) {
        map.set(row.key, row.value);
      }

      return {
        enableDayCloseEmail: map.get('ENABLE_DAY_CLOSE_EMAIL') === 'true',
        smtpHost: map.get('SMTP_HOST') || process.env['SMTP_HOST'] || 'smtp.gmail.com',
        smtpPort: parseInt(map.get('SMTP_PORT') || process.env['SMTP_PORT'] || '587', 10),
        smtpUser: map.get('SMTP_USER') || process.env['SMTP_USER'] || '',
        smtpPass: map.get('SMTP_PASS') || process.env['SMTP_PASS'] || '',
        emailSender: map.get('EMAIL_SENDER') || process.env['EMAIL_SENDER'] || 'Kiddie Kruzzer POS <noreply@kiddiekruzzer.com>',
        emailRecipients: map.get('EMAIL_RECIPIENTS') || process.env['EMAIL_RECIPIENTS'] || '',
        emailSubjectTemplate: map.get('EMAIL_SUBJECT_TEMPLATE') || 'Kiddie Kruzzer POS - Daily Close & Audit Report ({date})',
      };
    } catch (err: any) {
      console.warn('Error fetching email settings from DB, using defaults:', err.message);
      return {
        enableDayCloseEmail: false,
        smtpHost: process.env['SMTP_HOST'] || 'smtp.gmail.com',
        smtpPort: parseInt(process.env['SMTP_PORT'] || '587', 10),
        smtpUser: process.env['SMTP_USER'] || '',
        smtpPass: process.env['SMTP_PASS'] || '',
        emailSender: process.env['EMAIL_SENDER'] || 'Kiddie Kruzzer POS <noreply@kiddiekruzzer.com>',
        emailRecipients: process.env['EMAIL_RECIPIENTS'] || '',
        emailSubjectTemplate: 'Kiddie Kruzzer POS - Daily Close & Audit Report ({date})',
      };
    }
  }

  /**
   * Save updated SMTP settings to PostgreSQL system_settings table
   */
  static async saveSettings(settings: Partial<EmailSettings>): Promise<EmailSettings> {
    const pairs: Array<{ key: string; value: string; desc: string }> = [];

    if (settings.enableDayCloseEmail !== undefined) {
      pairs.push({
        key: 'ENABLE_DAY_CLOSE_EMAIL',
        value: settings.enableDayCloseEmail ? 'true' : 'false',
        desc: 'Enable or disable automated Day Close report email dispatch',
      });
    }
    if (settings.smtpHost !== undefined) {
      pairs.push({ key: 'SMTP_HOST', value: settings.smtpHost, desc: 'SMTP Server Host' });
    }
    if (settings.smtpPort !== undefined) {
      pairs.push({ key: 'SMTP_PORT', value: String(settings.smtpPort), desc: 'SMTP Server Port' });
    }
    if (settings.smtpUser !== undefined) {
      pairs.push({ key: 'SMTP_USER', value: settings.smtpUser, desc: 'SMTP Username' });
    }
    if (settings.smtpPass !== undefined && settings.smtpPass !== '********') {
      pairs.push({ key: 'SMTP_PASS', value: settings.smtpPass, desc: 'SMTP Password' });
    }
    if (settings.emailSender !== undefined) {
      pairs.push({ key: 'EMAIL_SENDER', value: settings.emailSender, desc: 'Sender Email Address' });
    }
    if (settings.emailRecipients !== undefined) {
      pairs.push({ key: 'EMAIL_RECIPIENTS', value: settings.emailRecipients, desc: 'Comma-separated recipient emails for Day Close' });
    }
    if (settings.emailSubjectTemplate !== undefined) {
      pairs.push({ key: 'EMAIL_SUBJECT_TEMPLATE', value: settings.emailSubjectTemplate, desc: 'Email Subject Template' });
    }

    for (const p of pairs) {
      await pool.query(
        `INSERT INTO system_settings (key, value, description, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW()`,
        [p.key, p.value, p.desc]
      );
    }

    return this.getSettings();
  }

  /**
   * Create configured nodemailer transport
   */
  private static createTransporter(settings: EmailSettings) {
    const isSecure = settings.smtpPort === 465;
    return nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: isSecure,
      auth: settings.smtpUser && settings.smtpPass ? {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      } : undefined,
      tls: {
        rejectUnauthorized: false, // Permit self-signed or enterprise TLS certs
      },
    });
  }

  /**
   * Record email attempt in email_logs table
   */
  static async logEmail(eventType: string, recipient: string, subject: string, status: 'SENT' | 'FAILED' | 'DISABLED', error?: string) {
    try {
      await pool.query(
        `INSERT INTO email_logs (event_type, recipient, subject, status, error_message, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [eventType, recipient, subject, status, error || null]
      );
    } catch (e: any) {
      console.warn('Failed to record email log in DB:', e.message);
    }
  }

  /**
   * Test SMTP server connectivity
   */
  static async testConnection(customConfig?: Partial<EmailSettings>): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const base = await this.getSettings();
      const settings: EmailSettings = { ...base, ...customConfig };

      if (!settings.smtpHost) {
        return { success: false, message: 'SMTP Host is missing.' };
      }

      const transporter = this.createTransporter(settings);
      await transporter.verify();

      return {
        success: true,
        message: `Successfully connected and verified SMTP server ${settings.smtpHost}:${settings.smtpPort}.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to SMTP server: ${err.message}`,
        error: err.message,
      };
    }
  }

  /**
   * Send test email to verify end-to-end delivery
   */
  static async sendTestEmail(targetRecipient?: string): Promise<{ success: boolean; message: string; error?: string }> {
    const settings = await this.getSettings();
    const recipient = targetRecipient || settings.emailRecipients.split(',')[0]?.trim();

    if (!recipient) {
      return { success: false, message: 'No recipient email specified for test email.' };
    }

    try {
      const transporter = this.createTransporter(settings);
      const subject = `[TEST] Kiddie Kruzzer POS - Email Notification Test`;
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">KIDDIE KRUZZER POS</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Email Notification System Verification</p>
          </div>
          <div style="padding: 24px; color: #334155;">
            <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">
              Hello,<br><br>
              This is a test notification confirming that the <strong>Automated Day Close & Shift Reporting Service</strong> is properly configured and successfully transmitting emails through:
            </p>
            <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px 16px; border-radius: 4px; font-size: 13px; margin: 16px 0;">
              <strong>SMTP Server:</strong> ${settings.smtpHost}:${settings.smtpPort}<br>
              <strong>Sender:</strong> ${settings.emailSender}<br>
              <strong>Timestamp:</strong> ${new Date().toLocaleString()}
            </div>
            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
              End of Day financial settlement reports will be automatically dispatched to this destination upon day closure.
            </p>
          </div>
          <div style="background: #f1f5f9; padding: 14px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            Kiddie Kruzzer Entertainment POS &bull; Automated System Notification
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: settings.emailSender,
        to: recipient,
        subject,
        html,
      });

      await this.logEmail('TEST_EMAIL', recipient, subject, 'SENT');

      return {
        success: true,
        message: `Test email successfully dispatched to ${recipient}.`,
      };
    } catch (err: any) {
      await this.logEmail('TEST_EMAIL', recipient, 'Test Email', 'FAILED', err.message);
      return {
        success: false,
        message: `Failed to dispatch test email: ${err.message}`,
        error: err.message,
      };
    }
  }

  /**
   * Dispatch full Day Close report email immediately after day close is completed
   */
  static async sendDayCloseEmail(
    dayCloseData: {
      closeDate: string;
      totalRentals: number | string;
      totalRevenue: number | string;
      cashAmount: number | string;
      cardAmount: number | string;
      discountAmount?: number | string;
      refundAmount?: number | string;
      totalShifts?: number | string;
      closedBy?: string;
      notes?: string;
      branchName?: string;
      locationName?: string;
    },
    options?: {
      force?: boolean;
      customRecipients?: string;
    }
  ): Promise<{ success: boolean; message: string; error?: string; recipients?: string }> {
    const settings = await this.getSettings();

    if (!settings.enableDayCloseEmail && !options?.force) {
      await this.logEmail('DAY_CLOSE', 'DISABLED', `Day Close ${dayCloseData.closeDate}`, 'DISABLED', 'Automated email dispatch is turned off in settings');
      return {
        success: true,
        message: 'Day Close email is disabled in settings. Skipping dispatch.',
      };
    }

    const recipientsStr = (options?.customRecipients || settings.emailRecipients).trim();
    if (!recipientsStr) {
      const err = 'No recipient email addresses configured for Day Close report.';
      await this.logEmail('DAY_CLOSE', 'NONE', `Day Close ${dayCloseData.closeDate}`, 'FAILED', err);
      return { success: false, message: err, error: err };
    }

    const recipients = recipientsStr
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (recipients.length === 0) {
      const err = 'Recipient list is empty.';
      await this.logEmail('DAY_CLOSE', 'NONE', `Day Close ${dayCloseData.closeDate}`, 'FAILED', err);
      return { success: false, message: err, error: err };
    }

    const dateStr = dayCloseData.closeDate;
    const subject = settings.emailSubjectTemplate.replace('{date}', dateStr);

    // Format numbers
    const totalRev = Number(dayCloseData.totalRevenue || 0).toFixed(3);
    const cash = Number(dayCloseData.cashAmount || 0).toFixed(3);
    const card = Number(dayCloseData.cardAmount || 0).toFixed(3);
    const discount = Number(dayCloseData.discountAmount || 0).toFixed(3);
    const refund = Number(dayCloseData.refundAmount || 0).toFixed(3);
    const netRevenue = (Number(dayCloseData.totalRevenue || 0) - Number(dayCloseData.refundAmount || 0)).toFixed(3);

    // Fetch shift breakdown for this date if available
    let shiftRows: any[] = [];
    try {
      const sRes = await pool.query(
        `SELECT shift_number, cashier_name, total_transactions, total_sales, cash_amount, card_amount, status
         FROM shifts WHERE business_date = $1 ORDER BY shift_number ASC`,
        [dateStr]
      );
      shiftRows = sRes.rows;
    } catch {}

    const shiftTableHtml = shiftRows.length > 0 ? `
      <div style="margin-top: 24px;">
        <h3 style="font-size: 13px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">Shift Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <thead>
            <tr style="background: #f1f5f9; color: #475569; font-weight: 700;">
              <th style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1;">Shift</th>
              <th style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1;">Cashier</th>
              <th style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: center;">Trips</th>
              <th style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: right;">Cash (KWD)</th>
              <th style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: right;">K-Net / Card</th>
              <th style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: right;">Total (KWD)</th>
            </tr>
          </thead>
          <tbody>
            ${shiftRows.map(s => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 10px; font-weight: 600; color: #334155;">Shift ${s.shift_number}</td>
                <td style="padding: 8px 10px; color: #475569;">${s.cashier_name || 'Cashier'}</td>
                <td style="padding: 8px 10px; text-align: center; color: #475569;">${s.total_transactions || 0}</td>
                <td style="padding: 8px 10px; text-align: right; color: #10b981; font-weight: 600;">${Number(s.cash_amount || 0).toFixed(3)}</td>
                <td style="padding: 8px 10px; text-align: right; color: #6366f1; font-weight: 600;">${Number(s.card_amount || 0).toFixed(3)}</td>
                <td style="padding: 8px 10px; text-align: right; color: #0f172a; font-weight: 700;">${Number(s.total_sales || 0).toFixed(3)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 28px 24px; color: #ffffff; text-align: center;">
            <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">
              DAILY FINANCIAL AUDIT REPORT
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">KIDDIE KRUZZER ENTERTAINMENT</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;">
              ${dayCloseData.branchName || 'Kiddie Kruzzer'} &bull; ${dayCloseData.locationName || 'Avenues Mall - Phase 4'}
            </p>
          </div>

          <!-- Audit Metadata Bar -->
          <div style="background: #f8fafc; padding: 12px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
            <div><strong>Audit Date:</strong> <span style="color: #0f172a; font-weight: 700;">${dateStr}</span></div>
            <div><strong>Closed By:</strong> <span style="color: #0f172a; font-weight: 700;">${dayCloseData.closedBy || 'Admin'}</span></div>
            <div><strong>Timestamp:</strong> <span>${new Date().toLocaleTimeString()}</span></div>
          </div>

          <!-- Main Content Body -->
          <div style="padding: 24px;">

            <!-- Revenue Summary Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
              
              <!-- Total Revenue Card -->
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">Total Gross Revenue</div>
                <div style="font-size: 26px; font-weight: 900; color: #1e3a8a; margin-top: 4px;">${totalRev} <span style="font-size: 13px;">KWD</span></div>
                <div style="font-size: 11px; color: #60a5fa; margin-top: 2px;">${dayCloseData.totalRentals} Completed Trips</div>
              </div>

              <!-- Net Settlement Card -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">Net Settlement</div>
                <div style="font-size: 26px; font-weight: 900; color: #14532d; margin-top: 4px;">${netRevenue} <span style="font-size: 13px;">KWD</span></div>
                <div style="font-size: 11px; color: #4ade80; margin-top: 2px;">After Discounts &amp; Refunds</div>
              </div>

            </div>

            <!-- Payment Breakdown Details -->
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <h3 style="font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">Payment Method Breakdown</h3>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; color: #475569;">💵 Cash Collections:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #059669;">${cash} KWD</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; color: #475569;">💳 K-Net / Credit Card:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #4f46e5;">${card} KWD</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; color: #475569;">🏷️ Discounts Applied:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #d97706;">-${discount} KWD</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #475569;">↩️ Refunds / Returns:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #dc2626;">-${refund} KWD</td>
                </tr>
              </table>
            </div>

            <!-- Shifts Table -->
            ${shiftTableHtml}

            <!-- Auditor Notes -->
            ${dayCloseData.notes ? `
              <div style="margin-top: 20px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #92400e;">
                <strong>Closing Notes:</strong> ${dayCloseData.notes}
              </div>
            ` : ''}

          </div>

          <!-- Footer Signature -->
          <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
            This automated email was securely generated by Kiddie Kruzzer Point of Sale System.<br>
            Direct Inquiries: support@kiddiekruzzer.com &bull; Confidential &copy; ${new Date().getFullYear()}
          </div>

        </div>
      </body>
      </html>
    `;

    try {
      const transporter = this.createTransporter(settings);
      await transporter.sendMail({
        from: settings.emailSender,
        to: recipients.join(', '),
        subject,
        html,
      });

      await this.logEmail('DAY_CLOSE', recipients.join(', '), subject, 'SENT');
      console.log(`[EMAIL SERVICE] Day Close report for ${dateStr} successfully emailed to: ${recipients.join(', ')}`);

      return {
        success: true,
        message: `Day Close report successfully emailed to ${recipients.join(', ')}.`,
        recipients: recipients.join(', '),
      };
    } catch (err: any) {
      console.error(`[EMAIL SERVICE ERROR] Failed to email Day Close report:`, err.message);
      await this.logEmail('DAY_CLOSE', recipients.join(', '), subject, 'FAILED', err.message);

      return {
        success: false,
        message: `Failed to deliver Day Close email: ${err.message}`,
        error: err.message,
        recipients: recipients.join(', '),
      };
    }
  }
}
