
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
    
    const user = await this.userService.findByUsernameOrEmail(username);
    if (!user) {
      console.log('User not found:', username);
      return null;
    }
    
    // Check if the user has a verified email
    if (!user.isEmailVerified) {
      console.log('Email not verified for user:', username);
      
      // Generate a new verification token if needed
      if (!user.verificationToken) {
        user.verificationToken = randomBytes(32).toString('hex');
        await user.save();
      }
      
      // Send verification email
      try {
        await this.emailService.sendConfirmationEmail(
          user.profile.email,
          user.verificationToken
        );
        console.log('Verification email sent to:', user.profile.email);
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
      }
      
      throw new UnauthorizedException('Email not verified. A verification email has been sent to your email address.');
    }
    
    // Remove sensitive data logging
    try {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        console.log('Invalid password for user:', username);
        return null;
      }
      
      console.log('User validated successfully:', username);
      const { password: pwd, ...result } = user.toObject();
      return result;
      
    } catch (error) {
      console.error('Error during password validation:', error);
      return null;
    }
  }

  // LDAP authentication validation
  async validateLdapUser(ldapUser: any): Promise<any> {
    try {
      console.log('LDAP validation called with', ldapUser);
      const existingUser = await this.userService.findByUsernameOrEmail(ldapUser.username);
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
        roles: customerRole ? [customerRole._id.toString()] : [], // Check if customerRole exists before accessing _id
        profile: {
          firstName: ldapUser.firstName || '',
          lastName: ldapUser.lastName || '',
          email: ldapUser.email || '',
          phoneNumber: ldapUser.phoneNumber || ''
        },
        isEmailVerified:true,
        emailVerifiedAt: new Date(), 
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
      console.log('Registering user:', createUserDto.username);
      console.log('Password to hash:', createUserDto.password);

      // Check if user already exists
      const existingUser = await this.userService.findByUsername(createUserDto.username);
      if (existingUser) {
        throw new HttpException('Username already exists', HttpStatus.BAD_REQUEST);
      }

      // Validate email is not empty
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

      // Generate verification token only if email verification is required
      const verificationToken = !createUserDto.isEmailVerified ? 
        randomBytes(32).toString('hex') : undefined;

      // Hash password with consistent salt rounds (10) - same as in role-init.service.ts
      const salt = await bcrypt.genSalt(10);
      console.log('Generated salt:', salt);
      const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
      console.log('Generated password hash:', hashedPassword);
      
      // Find customer role if no roles provided
      let userRoles = createUserDto.roles;
      if (!userRoles || userRoles.length === 0) {
        // Fix: Make sure we're using findByName correctly - it expects a string name
        const customerRole = await this.roleService.findByName('customer');
        if (!customerRole) {
          throw new HttpException('Customer role not found', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        // Make sure we're using the ObjectId as a string
        userRoles = [customerRole._id.toString()];
      } else {
        // Make sure all role IDs are valid ObjectId strings
        const validRoles = [];
        for (const role of userRoles) {
          // If it's already a valid ObjectId string, use it
          if (Types.ObjectId.isValid(role)) {
            validRoles.push(role);
          } else {
            // If it's a role name (like "customer"), try to find the role by name
            try {
              const foundRole = await this.roleService.findByName(role);
              if (foundRole) {
                validRoles.push(foundRole._id.toString());
              }
            } catch (error) {
              console.error(`Error finding role by name "${role}":`, error);
            }
          }
        }
        
        // If no valid roles were found, use customer role as fallback
        if (validRoles.length === 0) {
          const customerRole = await this.roleService.findByName('customer');
          if (!customerRole) {
            throw new HttpException('Customer role not found', HttpStatus.INTERNAL_SERVER_ERROR);
          }
          userRoles = [customerRole._id.toString()];
        } else {
          userRoles = validRoles;
        }
      }
      
      // Default to verified for testing, or use the provided value
      const isVerified = createUserDto.isEmailVerified !== undefined ? 
        createUserDto.isEmailVerified : false;
      
      // Create user object matching the structure in role-init.service.ts
      const newUser = {
        username: createUserDto.username,
        password: hashedPassword,
        roles: userRoles,
        profile: {
          firstName: createUserDto.profile.firstName,
          lastName: createUserDto.profile.lastName,
          email: createUserDto.profile.email,
          phoneNumber: createUserDto.profile.phoneNumber || '',
        },
        isEmailVerified: isVerified,
        emailVerifiedAt: isVerified ? new Date() : undefined,
        verificationToken: verificationToken
      };
      
      // Create the user
      const user = await this.userService.create(newUser);
      console.log('User created successfully:', user.username);

      // Send verification email only if not already verified
      if (!isVerified && verificationToken) {
        await this.emailService.sendConfirmationEmail(
          createUserDto.profile.email,
          verificationToken
        );
      }

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




  async forgotPassword(email: string): Promise<any> {
    try {
      console.log('Forgot password request for email:', email);
      
      // Find user by email
      const user = await this.userService.findByEmail(email);
      if (!user) {
        console.log('User not found with email:', email);
        // For security reasons, don't reveal if the email exists or not
        return { message: 'If your email is registered, you will receive a password reset link.' };
      }
      
      // Generate a password reset token
      const resetToken = randomBytes(32).toString('hex');
      console.log('Generated reset token:', resetToken);
      
      // Set expiration time (1 hour from now)
      const resetTokenExpiry = new Date();
      resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);
      
      // Save token to user
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpiry;
      await user.save();
      console.log('Reset token saved for user:', user.username);
      
      // Send password reset email
      try {
        await this.emailService.sendPasswordResetEmail(
          user.profile.email,
          resetToken
        );
        console.log('Password reset email sent to:', user.profile.email);
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
        throw new HttpException('Failed to send password reset email', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      return { message: 'If your email is registered, you will receive a password reset link.' };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw new HttpException(
        error.message || 'Error processing forgot password request',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  async findUserByResetToken(token: string): Promise<any> {
    try {
      console.log('Finding user by reset token for password reset page');
      
      const user = await this.userService.findByResetToken(token);
      if (!user) {
        console.log('No user found with this reset token');
        throw new HttpException('Invalid or expired reset token', HttpStatus.BAD_REQUEST);
      }
      
      // Check if token is expired
      const now = new Date();
      if (user.resetPasswordExpires < now) {
        console.log('Reset token has expired');
        throw new HttpException('Reset token has expired', HttpStatus.BAD_REQUEST);
      }
      
      return user;
    } catch (error) {
      console.error('Error finding user by reset token:', error);
      throw new HttpException(
        error.message || 'Invalid or expired reset token',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }
  
  async resetPassword(token: string, newPassword: string): Promise<any> {
    try {
      // console.log('Reset password request with token');
      
      // Find user with the reset token
      const user = await this.userService.findByResetToken(token);
      
      if (!user) {
        console.log('Invalid token');
        throw new HttpException('Invalid or expired reset token', HttpStatus.BAD_REQUEST);
      }
      // console.log(user.profile)
      // Check if token is expired
      const now = new Date();
      if (user.resetPasswordExpires < now) {
        console.log('Reset token has expired');
        throw new HttpException('Reset token has expired', HttpStatus.BAD_REQUEST);
      }
      
      if (!newPassword) {
        console.log('new Password is required');
        throw new HttpException('new Password is required', HttpStatus.BAD_REQUEST);
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      console.log('Generated salt for new password');
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      console.log('Generated hash for new password');
      
      // Update user's password and clear reset token
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      console.log('Password reset successful for user:', user.username);
      
      return { message: 'Password has been reset successfully' };
    } catch (error) {
      console.error('Reset password error:', error);
      throw new HttpException(
        error.message || 'Error resetting password',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}