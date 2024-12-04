import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { UploadedFile, UseInterceptors, Req, HttpException, NotFoundException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from './dto';

import { FoodItemsService } from '../fooditems/fooditems.service';
// import { OrderTimeFrameService } from '../ordertimeframe/ordertimeframe.service';
import { PaymentsService } from '../payments/payments.service';

import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    // private readonly orderTimeService:OrderTimeFrameService,
    private readonly fooditemService:FoodItemsService,
    private readonly paymentService:PaymentsService,

    private configService: ConfigService,
  ) {
    
  }

  @Post()
  @ApiOperation({ summary: 'Create Orders if fooditems are available' })
  @ApiResponse({ status: 200, description: 'Order created successfully' })
  async create(@Body() createOrderDto: CreateOrderDto) {
    try{
      // Array to store items with their `isOrderingAllowed` status
      const itemsWithStatus = await Promise.all(
        createOrderDto.foodItems.map(async (fd) => {
          const fooditem= await this.fooditemService.findOne(fd);
          const isOrderingAllowed = await this.fooditemService.isOrderingAllowed(fd);
          return { foodItem: fooditem, isOrderingAllowed };
        }),
      );

      // Check if all items have `isOrderingAllowed` as true
      const allAllowed = itemsWithStatus.every(item => item.isOrderingAllowed);
      // check if all items are available
      const allAvailable = itemsWithStatus.every(item => item.foodItem.isAvailable);
      
      // allowed only if both are true
      const isAllAllowed = allAllowed && allAvailable;
      
      
      if (!isAllAllowed) {
        // Return the DTO with the `isOrderingAllowed` status for each item
        return {
          success: false,
          // message: 'Some food items cannot be ordered.',
          // data: itemsWithStatus,
          // createOrderDto,
          order:{
            ...createOrderDto,
            foodItems:itemsWithStatus,
            status:'Order not available'
          }
        };
      }


      // Create the order if all items are allowed
      const order = await this.ordersService.create({
        ...createOrderDto,
        status:'created'
      });

      return {
        success: true,
        order: order.toObject(),
      };
    }catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('cancel/:id')
  @ApiOperation({ summary: 'Cancel order with reason' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    try{
      const order = await this.ordersService.findOne(id);
      if (!order) {
          throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }
      // Check if the order is already canceled
      if (order.status === 'cancelled') {
        return { 
          success: false,
          message: "Order cannot be canceled.",
          order:order
          
        };
      }

      // Check if the order is within the cancellation window
      const cancelTime = this.configService.get<string>('ORDER_CANCEL_TIME');
      const currentTime = new Date();
      const cancellationDeadline = new Date(order.createdAt);
      cancellationDeadline.setMinutes(cancellationDeadline.getMinutes() + parseInt(cancelTime)); // 5 minutes window

      if (currentTime > cancellationDeadline) {
          return { 
              success: false, 
              // message: "Order preparation has started. Cancellation not allowed."
              order:order
          };
      }
    
      const cancelDate = new Date(Date.now());
      const updatedOrder = await this.ordersService.update(id, {
        // ...order,
        // cancelReason: updateOrderDto.cancelReason,
        ...updateOrderDto,
        status:'cancelled',
        cancelledAt: cancelDate,
      });

      // if payment as been initiated, make paymentstatus cancelled
      const pay = this.paymentService.filterOne({order:id});
      if(pay){
        await this.paymentService.updateStatus((await pay)._id.toString(), 'cancelled');
      }

      return updatedOrder;

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
      return await this.ordersService.findAll();
    }catch (error) {
        throw new HttpException(
            error.message,
            error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try{
      return this.ordersService.findOne(id);
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
      const {orders,total} = await this.ordersService.findByPage(pageNumber,limitNumber);
      
      orders.forEach(menu => {
        if (menu.foodItems && Array.isArray(menu.foodItems)) {
          menu.foodItems.forEach(foodItem => {
            if (foodItem.image) {
              // Prepend baseUrl to food item's image URL
              foodItem.image = `${baseUrl}/${foodItem.image}`;
            }
          });
        }
      });

      return {orders:orders,total};

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
      return await this.ordersService.remove(id);
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
