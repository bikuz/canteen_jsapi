
// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
import { Model,Types } from 'mongoose';
// import { Role } from '../role/role.model';


import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/users.service';
import { RoleService } from '../role/role.service';
import { ConfigService } from '@nestjs/config';

import * as bcrypt from 'bcryptjs';

import { CreateUserDto } from '../users/dto/create-user.dto';


@Injectable()
export class AuthService {
  private readonly allowedOrigins: string[];
  private readonly disallowedRoutes: RegExp[];

  constructor(
    private readonly roleService: RoleService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
          
     // Get values from YAML config
     this.allowedOrigins = this.configService.get<string[]>('security.allowedOrigins') || [];
     this.disallowedRoutes = (this.configService.get<string[]>('security.disallowedRoutes') || [])
       .map(route => new RegExp(route));

  }

  // Local authentication validation
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.userService.findByUsername(username);
    if (user && bcrypt.compareSync(pass, user.password)) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  // LDAP authentication validation
  async validateLdapUser(ldapUser: any): Promise<any> {
    try{
      console.log('LDAP validation called with', ldapUser);
      const existingUser = await this.userService.findByUsername(ldapUser.username);
      if (existingUser) {
        return existingUser; // Return existing user if already saved
      }
      console.log('New LDAP user registration:', ldapUser);

      const customerRole = await this.roleService.findByName('customer');
      // Register new user if they don't exist 
      const createUserDto: CreateUserDto = {
        username: ldapUser.username,
        password: 'ldap_authenticated', // You can use a constant password or special indicator for LDAP users
        role: customerRole._id as Types.ObjectId, // Assign a default role
        profile: {
          firstName: ldapUser.firstName || '',
          lastName: ldapUser.lastName || '',
          email: ldapUser.email || '',
          phoneNumber: ldapUser.phoneNumber || ''
        }
      };

      const newUser = await this.register(createUserDto);
      return newUser;
    }catch(error){
      console.error('Error in LDAP validation:', error);
      throw new UnauthorizedException('LDAP Authentication failed');
    }
  }

  private async generateAccessToken(user: any) {
    const payload = { username: user.username, sub: user._id };
    return this.jwtService.sign(payload); 

    // return this.jwtService.sign(payload, {
    //   expiresIn: '1m', // Use 1 hour for access tokens
    // }); // No need to set the secret here, as it's already registered in SharedModule
  }

  private async generateRefreshToken(user: any) {
    const payload = { username: user.username, sub: user._id };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get<string>('REFRESH_TOKEN_TIME'),
    });
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      });

      const user = await this.userService.findByUsername(payload.username);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return {
        access_token: await this.generateAccessToken(user),
        refresh_token: await this.generateRefreshToken(user),
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async login(user: any) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async register(createUserDto: CreateUserDto): Promise<any> {
    return this.userService.create(createUserDto);
  }

  async isValidRoute(returnUrl: string, origin: string): Promise<boolean> {
    // Validate origin
    if (!this.isValidOrigin(origin)) {
      throw new UnauthorizedException('Invalid origin');
    }

    // If the URL is empty or undefined, it's not valid
    if (!returnUrl) {
      return false;
    }

    try {
      // Remove any leading/trailing whitespace
      const sanitizedUrl = returnUrl.trim();

      // Ensure the URL starts with a forward slash
      if (!sanitizedUrl.startsWith('/')) {
        return false;
      }

      // Prevent directory traversal attempts
      if (sanitizedUrl.includes('..')) {
        return false;
      }

      // // Check if the URL matches any of the allowed patterns
      // return this.allowedRoutes.some(pattern => pattern.test(sanitizedUrl));

      // Block disallowed routes
      if (this.disallowedRoutes.some(pattern => pattern.test(sanitizedUrl))) {
        return false;
      }

      // The return URL is valid
      return true;
      
    } catch (error) {
      console.error('Error validating route:', error);
      return false;
    }
  }

  private isValidOrigin(origin: string): boolean {
    if (!origin) {
      return false;
    }
    return this.allowedOrigins.includes(origin);
  }

}

