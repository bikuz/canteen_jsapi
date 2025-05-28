import { Controller, Get, Post, Body, Patch, Param, Delete,
  Req,UseGuards, HttpException, HttpStatus, Query } from '@nestjs/common';
import { UserService } from './users.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';

import { CreateUserDto,UpdateUserDto } from './dto';

import { Request } from 'express';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';
import { DynamicRolesGuard } from '../helper/dynamic-auth.guard';
import { Roles } from '../helper/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, DynamicRolesGuard)
export class UserController {
 constructor(private readonly userService: UserService,
  private readonly orderService: OrdersService,
  private readonly paymentService: PaymentsService
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

 @Get('search')
 async searchUsers(@Req() req: Request & { user?: any }, @Query() query: {
   search?: string;
   page?: number;
   limit?: number;
 }) {
   return this.findAll(req, query);
 }

 @Post()
 async create(@Body() createUserDto: CreateUserDto) {
   return this.userService.create(createUserDto);
 }


 @Get()
 async findAll(
   @Req() req: Request & { user?: any },
   @Query() query: {
     search?: string;
     page?: number;
     limit?: number;
   }
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

   // Set default pagination values
   const page = query.page || 1;
   const limit = query.limit || 10;
   
   // Create search criteria
   const searchCriteria = query.search ? {
     $or: [
       { username: { $regex: query.search, $options: 'i' } },
       { 'profile.firstName': { $regex: query.search, $options: 'i' } },
       { 'profile.lastName': { $regex: query.search, $options: 'i' } },
       { 'profile.phoneNumber': { $regex: query.search, $options: 'i' } },
       { 'profile.email': { $regex: query.search, $options: 'i' } },
       {
         $expr: {
           $regexMatch: {
             input: { $concat: ['$profile.firstName', ' ', '$profile.lastName'] },
             regex: query.search,
             options: 'i'
           }
         }
       }
     ]
   } : {};

   // Check if user has super-admin role
   const isSuperAdmin = roles.some(role => role === 'super-admin');
   
   if (isSuperAdmin) {
     return await this.userService.findAll(searchCriteria, page, limit);
   }
   
   return await this.userService.findAllExceptSuperAdmin(searchCriteria, page, limit);
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

    if (await this.orderService.hasPendingOrders(id)) {
      throw new HttpException(
        'Cannot delete user with pending orders.',
        HttpStatus.FORBIDDEN
      )
    }

    if (await this.paymentService.hasPendingPayments(id)) {
      throw new HttpException(
        'Cannot delete user with pending payments.',
        HttpStatus.FORBIDDEN
      )
    }

    // const deletedUser =this.userService.remove(id);
    const deletedUser = await this.userService.softDelete(id);
    // const a = (await deletedUser).username
    return deletedUser;
 }

 @Delete('me')
 @Roles('*')
 async removeSelf(@Req() request: Request) {
   const user = request.user as any; // Adjust type if using a custom user type
 
   if (!user || !user._id) {
     throw new HttpException(
      'User not authenticated',
      HttpStatus.UNAUTHORIZED
    );
   }
 
   const userId = user._id;
 
   if (await this.orderService.hasPendingOrders(userId)) {
     throw new HttpException(
       'Cannot delete user with pending orders.',
       HttpStatus.FORBIDDEN
     );
   }
 
   if (await this.paymentService.hasPendingPayments(userId)) {
     throw new HttpException(
       'Cannot delete user with pending payments.',
       HttpStatus.FORBIDDEN
     );
   }
 
   const deletedUser = await this.userService.softDelete(userId);
   
   return {
    success: true,
    message: 'Your account has been successfully deleted.',
  };
 }
 
}