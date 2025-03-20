import { Controller, Get, Post, Body, Patch, Param, Delete,
   Req, UseGuards, HttpException, HttpStatus, 
   Query, Res } from '@nestjs/common';
import { UserService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';
import { DynamicRolesGuard } from '../helper/dynamic-auth.guard';
import { Roles } from '../helper/roles.decorator';
import { Public } from '../decorators/public.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, DynamicRolesGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @Get('permissions')
  @Roles('*')
  async getUserPermissions(
    @Req() req: Request& { user?: any },
  ) {
    if (!req.user) {
      throw new HttpException(
        'User must be logged in to get permissions',
        HttpStatus.UNAUTHORIZED
      );
    }
    const userId = req.user?._id;
    return await this.userService.getUserPermissions(userId.toString());
  }

  @Get('profile')
  @Roles('*')
  async findProfile(  
    @Req() req: Request & { user?: any },
  ) {
    if (!req.user) {
      throw new HttpException(
        'User must be logged in to get profile',
        HttpStatus.UNAUTHORIZED
      );
    }
    const userId = req.user?._id;
    return await this.userService.findProfile(userId.toString());
  }

  @Get('roles')
  @Roles('*')
  async getUserRoles(
    @Req() req: Request & { user?: any },
  ) {
    if (!req.user) {
      throw new HttpException(
        'User must be logged in to get roles',
        HttpStatus.UNAUTHORIZED
      );
    }
    const userId = req.user?._id;
    return await this.userService.findUserRole(userId.toString());
  }

  // Remove @Public() from register endpoint
  @Public()  // Add this decorator
@Post('register')
async register(@Body() createUserDto: CreateUserDto) {
  try {
    const user = await this.userService.createUser(createUserDto);
    return { message: 'User registered successfully', user };
  } catch (error) {
    throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
  }
}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  async findAll(
    @Req() req: Request & { user?: any },
  ) {
    if (!req.user) {
      throw new HttpException(
        'User must be logged in to create an order',
        HttpStatus.UNAUTHORIZED
      );
    }
    
    // Get user ID from the token
    const userId = req.user?._id;
    const roles = await this.userService.findUserRole(userId);

    // Check if user has super-admin role
    const isSuperAdmin = roles.some(role => role === 'super-admin');
    
    if (isSuperAdmin) {
      return await this.userService.findAll();
    }
     
    const users = await this.userService.findAllExceptSuperAdmin();
    return users;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  // @Get('verify-email/:token')
  // @Public()
  // @Get('verify-email/:token')
  // async verifyEmail(@Param('token') token: string) {
  //   try {
  //     return await this.userService.verifyEmail(token);
  //   } catch (error) {
  //     throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
  //   }
  // }
  
  // Add this new endpoint for email verification
  // Place this before any parameterized routes
  // Remove @Public() from verify-email endpoint
  @Public()  // Make it public
  @Get('verify-email')
  async verifyEmailWithResponse(
    @Query('token') token: string,
    @Res() res: Response
  ) {
    try {
      const user = await this.userService.verifyEmail(token);
      
      // Generate JWT token after successful verification
      const jwtToken = await this.userService.generateToken(user._id.toString());

      // Return success page with token
      return res.send(`
        <html>
          <head>
            <title>Email Verification</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .success { color: green; font-size: 24px; margin-bottom: 20px; }
              .message { margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="success">✓ Email Verified Successfully</div>
            <p class="message">Your email has been verified.</p>
            <p>Your token: ${jwtToken}</p>
            <a href="icanteen://login?token=${jwtToken}">Open App</a>
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
}
