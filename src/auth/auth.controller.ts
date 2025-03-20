import { Controller, Get, Post, Body, UseGuards, Request, Query, Headers, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { LdapAuthGuard } from '../auth/ldap.guard';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';
import { Public } from '../decorators/public.decorator'; // Add this import

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @Get('confirm-email')
  // async confirmEmail(@Query('token') token: string, @Res() res: Response) {
  //   try {
  //     await this.authService.verifyEmail(token);
  //     return res.status(200).json({ message: 'Email successfully verified!' });
  //   } catch (error) {
  //     throw new HttpException('Invalid or expired token', HttpStatus.BAD_REQUEST);
  //   }
  // }
  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Request() req) {
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

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Request() req) {
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @Public()
  async forgotPassword(@Body() body: { email: string }) {
    try {
      await this.authService.forgotPassword(body.email);
      return { message: 'Password reset email sent successfully' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('reset-password')
  @Public()
  async resetPassword(
    @Body() body: { token: string; newPassword: string }
  ) {
    try {
      await this.authService.resetPassword(body.token, body.newPassword);
      return { message: 'Password reset successfully' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
