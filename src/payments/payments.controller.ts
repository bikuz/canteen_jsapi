 
import { Controller, Get, Post, Body, Param, Patch, Delete,Query,
   HttpException, HttpStatus, NotFoundException, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';
import { Model } from 'mongoose';
import { Payment } from './payments.model';
import { OrdersService } from '../orders/orders.service';
import { UserService } from '../users/users.service';

import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';
import { DynamicRolesGuard } from '../helper/dynamic-auth.guard';

@Controller('payment')
@UseGuards(JwtAuthGuard, DynamicRolesGuard)
export class PaymentsController {
  constructor(
    private readonly paymentService: PaymentsService,
    private readonly orderService: OrdersService,
    private readonly userService: UserService,
  ) {
   
  }
 
  @Get('findOrders')
  async findOrders(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('token') token?: string,
    @Query('shortId') shortId?: string,
    @Query('orderStatus') orderStatus?: string
  ) {
    try {
      // Build query object
      const query: any = {};
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          // Set end date to end of day (23:59:59.999)
          const endDateTime = new Date(endDate);
          // endDateTime.setHours(23, 59, 59, 999);
          endDateTime.setDate(endDateTime.getDate() + 1);
          query.createdAt.$lte = endDateTime;
        }
      }

      // Add shortId filter if provided
      if (shortId) {
        query.shortId = shortId;
      }

      if (orderStatus) {
        query.status = orderStatus;
      }

      const orders = await this.orderService.findAll(query);

      const ordersWithCancelStatus = await Promise.all(
        orders.map(async (item) => {
          const payment = await this.paymentService.filterOne({order: item._id.toString()});
          return {
            ...item,
            token: payment.token,
            userProfile: await this.userService.findProfile(item.customer.toString()),
            paymentStatus: payment.paymentStatus,
            paymentMethod: payment.paymentMethod,
            isCancelAllowed: await this.orderService.isCancelAllowed(item._id.toString())
          };
        })
      );

      let filteredOrders = ordersWithCancelStatus;

      // Filter by payment status if provided
      if (paymentStatus) {
        filteredOrders = filteredOrders.filter(order => 
          order.paymentStatus?.toLowerCase() === paymentStatus.toLowerCase()
        );
      }

      // Filter by token if provided
      if (token) {
        filteredOrders = filteredOrders.filter(order => 
          order.token?.toLowerCase() === token.toLowerCase()
        );
      }

      return filteredOrders;
      
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post()
  async create(@Body() createPaymentDto: CreatePaymentDto) {
    try{
      const payment= await this.paymentService.create(createPaymentDto);

      return {
        ...createPaymentDto,
        isCancelAllowed: this.orderService.isCancelAllowed(payment.order)
      }
      
      // return await this.paymentsService.create(createPaymentDto);
    }catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    try{
      const paymentdate = new Date(Date.now());
      const updatedPayment = await this.paymentService.update(id, {
        ...updatePaymentDto,
        paymentDate: paymentdate,
      });

      return updatedPayment;

    }catch (error) {
      if (error instanceof NotFoundException) {
          throw error;
      }
      throw new HttpException(
          error.message,
          error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }



  @Get()
  async findAll() {
    try{
      return this.paymentService.findAll();
    }catch (error) {
        throw new HttpException(
            error.message,
            error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }    
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try{
      return this.paymentService.findOne(id);
    }catch (error) {
        if (error instanceof NotFoundException) {
            throw error;
        }
        throw new HttpException(error.message,
            error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('page/:page/limit/:limit')
  async findByPage(
    @Param('page') page: string,
    @Param('limit') limit: string,
    @Req() req: Request
  ){
    try {
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);
      // Validate the parameters
      if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
        throw new HttpException('Page and limit must be positive integers.', HttpStatus.BAD_REQUEST);
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const {payments,total} = await this.paymentService.findByPage(pageNumber,limitNumber);
      
       

      return {payments:payments,total};

    } catch (error) {
      if (error instanceof NotFoundException) {
          throw error;
      }
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try{
      return this.paymentService.remove(id);
    }catch (error) {
      if (error instanceof NotFoundException) {
          throw error;
      }
      throw new HttpException(
          error.message,
          error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
  }
}
