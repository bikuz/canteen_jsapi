import { Controller, Get, Post, Body, Patch, Param, Delete,
   Req,UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { UserService } from './users.service';
import { CreateUserDto,UpdateUserDto } from './dto';

import { Request } from 'express';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';
import { DynamicRolesGuard } from '../helper/dynamic-auth.guard';
import { Roles } from '../helper/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, DynamicRolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

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
}
