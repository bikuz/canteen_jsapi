import { Injectable, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST'),
      port: this.configService.get('MAIL_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASS'),
      },
    });
  }

  // Remove these decorators - they don't belong in a service
  // @Public()
  // @Res()
  async sendConfirmationEmail(email: string, token: string) {
    const confirmUrl = `http://localhost:3000/users/verify-email?token=${token}`;
    const mailOptions = {
      from: this.configService.get('MAIL_FROM'),
      to: email,
      subject: 'Confirm Your Email',
      text: `Click the following link to confirm your email: ${confirmUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Verification</h2>
          <p>Welcome to iCanteen! Please click the button below to verify your email address.</p>
          <a href="${confirmUrl}" 
             style="display: inline-block; 
                    background-color: #007bff; 
                    color: white; 
                    padding: 10px 20px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 20px 0;">
            Verify Email Address
          </a>
          <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="color: #007bff;">${confirmUrl}</p>
        </div>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Confirmation email sent to', email);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `icanteen://reset-password?token=${token}`;
    const mailOptions = {
      from: this.configService.get('MAIL_FROM'),
      to: email,
      subject: 'Reset Your Password',
      text: `Click the following link to reset your password: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Reset Your Password</h2>
          <p>Please click the button below to reset your password. This link will expire in 1 hour.</p>
          <a href="${resetUrl}" 
             style="display: inline-block; 
                    background-color: #007bff; 
                    color: white; 
                    padding: 10px 20px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 20px 0;">
            Reset Password
          </a>
          <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="color: #007bff;">${resetUrl}</p>
        </div>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent to', email);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}
