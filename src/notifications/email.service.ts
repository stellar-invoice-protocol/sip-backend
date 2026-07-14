import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Email Service - Abstraction over email provider
 *
 * Supports:
 * - Console transport (default for development)
 * - Nodemailer SMTP transport (production)
 *
 * TODO: Add support for other providers:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const transportType = process.env.EMAIL_TRANSPORT || 'console';

    if (transportType === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
      this.logger.log('✓ Email transport: SMTP');
    } else {
      // Console transport for development
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      this.logger.log('✓ Email transport: Console (development)');
    }
  }

  async send(options: { to: string; subject: string; body: string }) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@stellar-invoices.app',
        to: options.to,
        subject: options.subject,
        text: options.body,
        html: `<pre>${options.body}</pre>`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.debug(`Email sent to ${options.to}:`, result);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }
}
