import { Controller, Get, Post, Body, UseGuards, Request, Query, Headers, Res, HttpException, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { LdapAuthGuard } from '../auth/ldap.guard';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';
import { Response } from 'express';
import { Public } from '../helper/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('mobAppVersion')
  async mobAppVersion(@Query('os') os: string,) {
    if(os=='android'){
      return this.authService.androidAppVersion();
    }
    else{
      return this.authService.iosAppVersion();
    }     
  }
  
  @Post('login/local')
  @UseGuards(LocalAuthGuard)
  async loginLocal(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('login/ldap')
  @UseGuards(LdapAuthGuard)
  async loginLdap(@Request() req){
    const ldapUser = req.user;
    const user = await this.authService.validateLdapUser(ldapUser);
    return this.authService.login(user);
  }

  @Get('validate-route')
  async validateRoute(
    @Query('returnUrl') returnUrl: string,
    @Headers('origin') origin: string,
  ) {
    const isValid = await this.authService.isValidRoute(returnUrl, origin);
    return { isValid, safeUrl: isValid ? returnUrl : '/' };
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refreshToken(body.refresh_token);
  }



  @Post('register')
  async register(@Body() createUserDto: any) {
    return this.authService.register(createUserDto);
  }

  @Get('verify-email')
  @Public()
  async verifyEmail(
    @Query('token') token: string,
    @Res() res: Response
  ) {
    try {
      if (!token) {
        throw new HttpException('Verification token is required', HttpStatus.BAD_REQUEST);
      }
      
      const result = await this.authService.verifyEmail(token);
      
      // Return success page
      return res.send(`
        <html>
          <head>
            <title>Email Verification</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .success { color: green; font-size: 24px; margin-bottom: 20px; }
              .message { margin: 20px 0; }
              .app-link { display: inline-block; background-color: #007bff; color: white; 
                          padding: 10px 20px; text-decoration: none; border-radius: 5px; 
                          margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="success">✓ Email Verified Successfully</div>
            <p class="message">Your email has been verified. You can now use all features of the app.</p>
            <a href="icanteen://login" class="app-link">Open App</a>
          </body>
        </html>
      `);
    } catch (error) {
      // Return an error page
      return res.status(HttpStatus.BAD_REQUEST).send(`
        <html>
          <head>
            <title>Verification Failed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: red; font-size: 24px; margin-bottom: 20px; }
              .message { margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="error">✗ Verification Failed</div>
            <p class="message">${error.message}</p>
          </body>
        </html>
      `);
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Request() req) {
    return { message: 'Logged out successfully' };
  }
  
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<any> {
    console.log('Received forgot password request');
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }
  
  @Get('reset-password')
  @Public()
  async resetPasswordPage(
    @Query('token') token: string,
    @Res() res: Response
  ) {
    try {
      if (!token) {
        throw new HttpException('Reset token is required', HttpStatus.BAD_REQUEST);
      }
      
      // Verify token exists and is valid
      const user = await this.authService.findUserByResetToken(token);
      
      // Return reset password page
      return res.send(`
        <html>
          <head>
            <title>Reset Password</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .title { font-size: 24px; margin-bottom: 20px; }
              .form-group { margin-bottom: 15px; }
              input { padding: 10px; width: 300px; border-radius: 5px; border: 1px solid #ddd; }
              button { background-color: #007bff; color: white; border: none; padding: 10px 20px; 
                      border-radius: 5px; cursor: pointer; }
              .error { color: red; display: none; margin-top: 10px; }
              .success { color: green; display: none; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="title">Reset Your Password</div>
            <div id="resetForm">
              <div class="form-group">
                <input type="password" id="password" placeholder="New Password" minlength="6" required>
              </div>
              <div class="form-group">
                <input type="password" id="confirmPassword" placeholder="Confirm Password" required>
              </div>
              <button onclick="resetPassword()">Reset Password</button>
              <div id="error" class="error"></div>
              <div id="success" class="success"></div>
            </div>
            
            <script>
              async function resetPassword() {
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const errorDiv = document.getElementById('error');
                const successDiv = document.getElementById('success');
                
                errorDiv.style.display = 'none';
                successDiv.style.display = 'none';
                
                if (!password || password.length < 6) {
                  errorDiv.textContent = 'Password must be at least 6 characters';
                  errorDiv.style.display = 'block';
                  return;
                }
                
                if (password !== confirmPassword) {
                  errorDiv.textContent = 'Passwords do not match';
                  errorDiv.style.display = 'block';
                  return;
                }
                
                try {
                  const response = await fetch('/api/auth/reset-password', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/x-www-form-urlencoded', 
                      },
                      body: new URLSearchParams({
                        token: '${token}',
                        newPassword: password,
                      }).toString(),
                    });

                    const data = await response.json();
                  
                  
                  if (response.ok) {
                    document.getElementById('resetForm').innerHTML = '<div class="success">✓ Password Reset Successfully</div><p>Your password has been reset. You can now log in with your new password.</p><a id="openAppLink" href="#" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Open App</a>';
                    document.getElementById('openAppLink').addEventListener('click', function (e) {
                        e.preventDefault();

                        const isAndroid = /android/i.test(navigator.userAgent);
                        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

                        const appScheme = 'icanteen://login';
                        const androidIntent = 'intent://login#Intent;scheme=icanteen;package=com.icimod.canteen;end';
                        const fallbackUrl = 'https://play.google.com/store/apps/details?id=com.icimod.canteen'; 

                        let now = new Date().getTime();
                        setTimeout(() => {
                          // if the app didn't open, fallback
                          if (new Date().getTime() - now < 1500) {
                            window.location.href = fallbackUrl;
                          }
                        }, 1000);

                        if (isIOS) {
                          window.location = appScheme;
                        } else if (isAndroid) {
                          window.location = androidIntent;
                        } else {
                          alert("Please open this link on your mobile device.");
                        }
                      });

                    } else {
                    errorDiv.textContent = data.message || 'Failed to reset password';
                    errorDiv.style.display = 'block';
                  }
                } catch (error) {
                  errorDiv.textContent = 'An error occurred. Please try again.';
                  errorDiv.style.display = 'block';
                }
              }
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      // Return an error page
      return res.status(HttpStatus.BAD_REQUEST).send(`
        <html>
          <head>
            <title>Reset Password Failed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: red; font-size: 24px; margin-bottom: 20px; }
              .message { margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="error">✗ Reset Password Failed</div>
            <p class="message">${error.message || 'Invalid or expired reset token'}</p>
          </body>
        </html>
      `);
    }
  }
  
  @Post('reset-password')
  @UsePipes(new ValidationPipe({ transform: true }))
  async resetPassword(@Request() req, @Body() resetPasswordDto: ResetPasswordDto): Promise<any> {
    // console.log('Raw body:', req.body);
    // console.log('Received reset password request');
    // console.log(resetPasswordDto.token);
    // console.log(resetPasswordDto.newPassword);
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }
}