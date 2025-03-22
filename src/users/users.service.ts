import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './users.model';
import { Role } from '../role/role.model';
import { CreateUserDto,UpdateUserDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { FlattenMaps } from 'mongoose';
import { randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly jwtService: JwtService,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    private readonly emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {    
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
    
    // If roles aren't provided, assign customer role by default
    if (!createUserDto.roles || createUserDto.roles.length === 0) {
      const customerRole = await this.roleModel.findOne({ name: 'customer' });
      if (customerRole) {
        createUserDto.roles = [customerRole._id as string];
      }
    }
    
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    try {
      // const { email, password, username, firstname, lastname, profile } = createUserDto;
      const { email, password, username, firstname, lastname, profile } = createUserDto;
      const { phoneNumber } = profile;
      
      // Check if user already exists
      const existingUser = await this.userModel.findOne({ 
        $or: [{ email }, { username }]
      });
      
      if (existingUser) {
        throw new HttpException(
          existingUser.email === email ? 'Email already in use' : 'Username already taken', 
          HttpStatus.BAD_REQUEST
        );
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Find customer role in database
      const customerRole = await this.roleModel.findOne({ name: 'customer' });
      if (!customerRole) {
        throw new HttpException('Customer role not found', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Generate verification token
      const verificationToken = randomBytes(32).toString('hex');

      // Create new user object
      const newUser = new this.userModel({
        username,
        password: hashedPassword,
        firstname,
        lastname,
        email,
        roles: [customerRole._id], // Assigning customer role by default
        profile: {
          firstName: firstname,
          lastName: lastname,
          email,
          phoneNumber,
        },
        verificationToken,
        isEmailVerified: false
      });
      
      // Save user to database
      const savedUser = await newUser.save();
      
      // Generate verification link
      //const verificationLink = `https://yourapp.com/verify-email?token=${verificationToken}`;
      const verificationLink = `icanteen://verify-email?token=${verificationToken}`;
      
      // Send verification email
      // In createUser method, pass only the token, not the full link
      await this.emailService.sendConfirmationEmail(
        email, 
        verificationToken  // Changed from verificationLink to verificationToken
      );
      
      // Return user without sensitive information
      const userResponse = savedUser.toObject();
      delete userResponse.password;
      delete userResponse.verificationToken;
      
      return userResponse;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error creating user', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  async verifyEmail(token: string): Promise<User> {
    if (!token) {
      throw new HttpException('Verification token is required', HttpStatus.BAD_REQUEST);
    }
    
    console.log('Attempting to verify email with token:', token);
    
    // Find user with this token to check if it exists
    const userWithToken = await this.userModel.findOne({ verificationToken: token });
    if (!userWithToken) {
      console.log('No user found with this verification token');
      throw new HttpException(
        'Invalid verification token', 
        HttpStatus.BAD_REQUEST
      );
    }
    
    console.log('Found user with token:', userWithToken.email);
    
    // Find and update user by verification token in one operation
    const user = await this.userModel.findOneAndUpdate(
      { verificationToken: token, isEmailVerified: false },
      { 
        $set: { 
          isEmailVerified: true,
          emailVerifiedAt: new Date()
        },
        $unset: { verificationToken: 1 }
      },
      { new: true }
    );
    
    if (!user) {
      throw new HttpException(
        'Invalid verification token or email already verified', 
        HttpStatus.BAD_REQUEST
      );
    }
    
    console.log('Email verified successfully for user:', user.email);
    return user;
  }
  
  // Remove the generateToken method as it's no longer needed
  async findAll():Promise<FlattenMaps<User>[]> {
    return this.userModel.find()
      .select('-password')
      .populate('roles')
      .lean()
      .exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id)
    .select('-password')
      .populate('roles')
      .exec();
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }
  
  async findProfile(id: string): Promise<User["profile"]> {
    const user = await this.userModel.findById(id).populate('roles').exec();
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user.profile;
  }
  
  async update(id: string, updateUserDto: UpdateUserDto):Promise<FlattenMaps<User>> {
    // First get the existing user
    const existingUser = await this.findOne(id);

    // Filter out null, undefined, or empty string values from updateUserDto
    const filteredUpdates = Object.fromEntries(
      Object.entries(updateUserDto).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    );

    // Handle password encryption first if it exists
    if (filteredUpdates.password) {
      const salt = await bcrypt.genSalt();
      filteredUpdates.password = await bcrypt.hash(filteredUpdates.password, salt);
    }

    // Merge existing data with filtered updates
    const mergedData = {
      ...existingUser.toObject(),
      ...filteredUpdates
    };

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id, 
      mergedData, 
      { new: true }
    ).lean().exec();

    if (!updatedUser) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return updatedUser;
  }

  async remove(id: string): Promise<FlattenMaps<User>> {
    const deletedUser = await this.userModel.findByIdAndDelete(id)
    .select('-password')
    .populate('roles')
    .lean()
    .exec();
    if (!deletedUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return deletedUser;
  }

  async findByUsername(username: string): Promise<User> {
    return this.userModel.findOne({ username })
    // .select('-password')
    .populate('roles')
    .exec();
  }

  async findUserRole(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate('roles', 'name')
      .select('roles')
      .exec();

    if (!user) {
      throw new HttpException(
        'User not found',
        HttpStatus.NOT_FOUND
      );
    }

    return user.roles.map(role => role.name);
  }
  
  async findAllExceptSuperAdmin(): Promise<FlattenMaps<User>[]> {
    // Find the super-admin role ID first
    const superAdminRole = await this.roleModel.findOne({ name: 'super-admin' }).exec();
    
    if (!superAdminRole) {
      throw new NotFoundException('Super-admin role not found');
    }

    const said = superAdminRole._id;
    return this.userModel.find()
      .select('-password')
      .populate('roles')
      .lean()
      .exec()
      .then(users => users.filter(user => 
        !user.roles.some(role => role._id.toString() === said.toString())
      ));
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    // Find user with populated roles
    const user = await this.userModel
      .findById(userId)
      .populate('roles')
      .exec();

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Extract all permissions from all roles
    const allPermissions = user.roles.flatMap(role => {
      const permissions: string[] = [];
      
      // Iterate through the outer map (controllers)
      role.permissions.forEach((actionMap, controller) => {
        // Remove 'Controller' suffix if present
        const cleanController = controller.replace(/Controller$/, '');
        
        // Iterate through the inner map (actions)
        actionMap.forEach((isAllowed, action) => {
          // Only include permissions that are set to true
          if (isAllowed) {
            permissions.push(`${cleanController}.${action}`);
          }
        });
      });
      return permissions;
    });

    // Remove duplicates using Set and convert back to array
    const uniquePermissions = [...new Set(allPermissions)];

    return uniquePermissions;
  }

  async createPasswordResetToken(email: string): Promise<void> {
      const user = await this.userModel.findOne({ email });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
  
      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
  
      // Save the reset token and expiry
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpiry;
      await user.save();
  
      // Send reset email
      await this.emailService.sendPasswordResetEmail(email, resetToken);
    }
  
    async resetPassword(token: string, newPassword: string): Promise<void> {
      const user = await this.userModel.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });
  
      if (!user) {
        throw new HttpException(
          'Invalid or expired password reset token',
          HttpStatus.BAD_REQUEST
        );
      }
  
      // Hash the new password
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(newPassword, salt);
  
      // Update user's password and clear reset token
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
    }

    async updateEmailVerification(userId: string): Promise<void> {
        const user = await this.userModel.findById(userId);
        if (!user) {
          throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }
    
        user.isEmailVerified = true;
        await user.save();
      }

    async generateToken(userId: string): Promise<string> {
        // Use your JWT service to generate token
        return this.jwtService.sign({ sub: userId });
      }
}
