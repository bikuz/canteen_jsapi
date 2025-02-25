import { Controller, Get, Post, Body, UseGuards, Request, Query, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { LdapAuthGuard } from '../auth/ldap.guard';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Get('mobAppVersion')
  async mobAppVersion(@Query('os') os: string,) {
    if(os=='android'){
      return this.authService.androidAppVersion();
    }
    else{
      return this.authService.iosAppVersion();
    }     
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
}
