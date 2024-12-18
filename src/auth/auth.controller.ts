// import { Controller, Post, Body, Req,UnauthorizedException  } from '@nestjs/common';
// import { AuthService } from './auth.service';


// @Controller('auth')
// export class AuthController {
//   constructor(private readonly authService: AuthService) {}

//   @Post('login')
//   async login(@Body() body: { username: string; password: string }) {
//     const user = await this.authService.validateUser(body.username, body.password);
//     if (!user) {
//       throw new UnauthorizedException('Invalid credentials');
//     }
//     return this.authService.login(user);
//   }

//   // Optionally, you can add a route for user registration
//   @Post('register')
//   async register(@Body() createUserDto: any) {
//     return this.authService.register(createUserDto);
//   }
// }

// auth.controller.ts
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
    console.log(req.user);
    return this.authService.login(req.user);
  }

  @Post('login/ldap')
  @UseGuards(LdapAuthGuard)
  async loginLdap(@Request() req){
    const ldapUser = req.user;
    

    console.log('hit login/ldap');
    
    const user = await this.authService.validateLdapUser(ldapUser);
    return this.authService.login(user);
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

  @Get('validate-route')
  // @UseGuards(JwtAuthGuard)
  async validateRoute(
    @Query('returnUrl') returnUrl: string,
    // @Request() req,
    @Headers('origin') origin: string,
  ) {
    const isValid = await this.authService.isValidRoute(returnUrl, origin);
    return { isValid, safeUrl: isValid ? returnUrl : '/' };
  }
}
