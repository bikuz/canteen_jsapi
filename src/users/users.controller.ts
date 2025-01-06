import { Controller, Get, Post, Body, Patch, Param, Delete,
   Req,UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { UserService } from './users.service';
import { CreateUserDto,UpdateUserDto } from './dto';

import { Request } from 'express';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';
import { DynamicRolesGuard } from '../helper/dynamic-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, DynamicRolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

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
    const isSuperAdmin = roles.some(role => role.name === 'super-admin');
    
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
  @Get(':id/profile')
  async findProfile(@Param('id') id: string) {
    return await this.userService.findProfile(id);
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
