
// auth.service.ts
import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/users.service';
import { RoleService } from '../role/role.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly allowedOrigins: string[];
  private readonly disallowedRoutes: RegExp[];

  constructor(
    private readonly roleService: RoleService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    // Get values from YAML config
    this.allowedOrigins = this.configService.get<string[]>('security.allowedOrigins') || [];
    this.disallowedRoutes = (this.configService.get<string[]>('security.disallowedRoutes') || [])
      .map(route => new RegExp(route));
  }

  // Local authentication validation
  async validateUser(username: string, password: string): Promise<any> {
    console.log('Validating user:', username);
    
    const user = await this.userService.findByUsername(username);
    if (!user) {
      console.log('User not found:', username);
      return null;
    }
    
    // Check if the user has a verified email
    if (!user.isEmailVerified) {
      console.log('Email not verified for user:', username);
      throw new UnauthorizedException('Email not verified. Please verify your email before logging in.');
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', username);
      return null;
    }
    
    console.log('User validated successfully:', username);
    const { password: pwd, ...result } = user.toObject();
    return result;
  }

  // LDAP authentication validation
  async validateLdapUser(ldapUser: any): Promise<any> {
    try {
      console.log('LDAP validation called with', ldapUser);
      const existingUser = await this.userService.findByUsername(ldapUser.username);
      if (existingUser) {
        // Check if the user has a verified email
        if (!existingUser.isEmailVerified) {
          throw new HttpException('Email not verified. Please verify your email before logging in.', HttpStatus.UNAUTHORIZED);
        }
        return existingUser; // Return existing user if already saved
      }
      
      console.log('New LDAP user registration:', ldapUser);

      const customerRole = await this.roleService.findByName('customer');
      // Register new user if they don't exist 
      const createUserDto: CreateUserDto = {
        username: ldapUser.username,
        password: 'ldap_authenticated', // You can use a constant password or special indicator for LDAP users
        // role: customerRole._id as Types.ObjectId, // Assign a default role
        roles: [customerRole._id as string],
        profile: {
          firstName: ldapUser.firstName || '',
          lastName: ldapUser.lastName || '',
          email: ldapUser.email || '',
          phoneNumber: ldapUser.phoneNumber || ''
        }
      };

      const newUser = await this.register(createUserDto);
      return newUser;
    } catch (error) {
      console.error('Error in LDAP validation:', error);
      if (error instanceof HttpException) {
        throw error; // Rethrow HTTP exceptions
      }
      // Check if it's a connection error
      if (error.code === 'ECONNREFUSED') {
        throw new UnauthorizedException('LDAP server unavailable. Please try local authentication.');
      }
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
    try {
      // Check if user already exists
      const existingUser = await this.userService.findByUsername(createUserDto.username);
      if (existingUser) {
        throw new HttpException('Username already exists', HttpStatus.BAD_REQUEST);
      }

      // Validate email is not empty
      // Check if email is provided and not empty
      if (!createUserDto.profile?.email) {
        throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(createUserDto.profile.email)) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }

      // Check if email already exists
      const existingEmail = await this.userService.findByEmail(createUserDto.profile.email);
      if (existingEmail) {
        throw new HttpException('Email already in use', HttpStatus.BAD_REQUEST);
      }

      // Generate verification token
      const verificationToken = randomBytes(32).toString('hex');

      // Hash password
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

      // Find customer role
      const customerRole = await this.roleService.findByName('customer');
      if (!customerRole) {
        throw new HttpException('Customer role not found', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Create user with verification token
      const user = await this.userService.create({
        ...createUserDto,
        password: hashedPassword,
        roles: [customerRole._id.toString()],
        isEmailVerified: false,
        verificationToken
      } as any); // Use type assertion to bypass TypeScript checking

      // Send verification email
      await this.emailService.sendConfirmationEmail(
        createUserDto.profile.email,
        verificationToken
      );

      // Return user without sensitive information
      const userObj = user.toObject ? user.toObject() : user;
      const { password: pwd, verificationToken: token, ...result } = userObj;
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      throw new HttpException(
        error.message || 'Error registering user',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async verifyEmail(token: string): Promise<any> {
    if (!token) {
      throw new HttpException('Verification token is required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      return this.userService.verifyEmail(token);
    } catch (error) {
      console.error('Email verification error:', error);
      throw new HttpException(
        error.message || 'Error verifying email',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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

  async androidAppVersion():Promise<string>{
    return this.configService.get<string>('androidAppVersion') || "";
  }

  async iosAppVersion():Promise<string>{
    return this.configService.get<string>('iosAppVersion') || "";
  }

  private isValidOrigin(origin: string): boolean {
    if (!origin) {
      return false;
    }
    return this.allowedOrigins.includes(origin);
  }

}