import { Controller, Get, Post, Body, UseGuards, Request, Query, Headers, Res, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { LdapAuthGuard } from '../auth/ldap.guard';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';
import { Response } from 'express';
import { Public } from '../helper/public.decorator';

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
}