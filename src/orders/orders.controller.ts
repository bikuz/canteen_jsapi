import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { UploadedFile, UseInterceptors, Req, HttpException, NotFoundException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto,CheckItemsDto } from './dto';

import { FoodItemsService } from '../fooditems/fooditems.service';
// import { OrderTimeFrameService } from '../ordertimeframe/ordertimeframe.service';
import { CreatePaymentDto } from '../payments/dto';

import { PaymentsService } from '../payments/payments.service';

import { Request } from 'express';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    // private readonly orderTimeService:OrderTimeFrameService,
    private readonly fooditemService:FoodItemsService,
    private readonly paymentService:PaymentsService,
     
  ) {
    
  }

  
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Orders if fooditems are available' })
  // @ApiResponse({ status: 200, description: 'Order created successfully' })
  async create(
    @Req() req: Request& { user?: any },
    @Body() createOrderDto: CreateOrderDto
  ) {
    try {

      // Check if user is logged in
      if (!req.user) {
        throw new HttpException(
          'User must be logged in to create an order',
          HttpStatus.UNAUTHORIZED
        );
      }
      
      // Get user ID from the token
      const userId = req.user?._id;

      // Add userId to the order
      const orderWithUser = {
        ...createOrderDto,
        customer: userId
      };

      // Array to store items with their `isOrderingAllowed` status
      const itemsWithStatus = await Promise.all(
        orderWithUser.foodItems.map(async (fd) => {
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
          message: 'Some food items are not available.',
          // data: itemsWithStatus,
          // createOrderDto,
          order:{
            ...orderWithUser,
            foodItems:itemsWithStatus,
            status:'Order not available'
          }
        };
      }

      // Create the order if all items are allowed
      const order = await this.ordersService.create(orderWithUser);

      //Now also create payement
      const createPaymentDto = {
        customer:order.customer.toString(),
        order:order._id.toString(),
        amount:order.totalPrice,
        paymentStatus:'pending',
        // paymentMethod: createOrderDto.paymentMethod && createOrderDto.paymentMethod.trim() 
        //                 ? createOrderDto.paymentMethod 
        //                 : 'cash'
        // paymentMethod: createOrderDto.paymentMethod?.trim() || 'cash',
        paymentMethod: createOrderDto.paymentMethod,
      };

      const payment = await this.paymentService.create({
        ...createPaymentDto,
      })

      return {
        success: true,
        order: {
          ...order.toObject(),
          token:payment.token
        },
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
  async update(
    @Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto
  ) {
    try{
      const order = await this.ordersService.findOne(id);
      if (!order) {
          throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }
      // Check if the order is already canceled
      if (order.status === 'cancelled') {
        return { 
          success: false,
          message: "Order is already cancelled.",
          order:order
        };
      }

      // Check if the order is within the cancellation window
      // const cancelTime = this.configService.get<string>('ORDER_CANCEL_TIME');
      // const currentTime = new Date();
      // const cancellationDeadline = new Date(order.createdAt);
      // cancellationDeadline.setMinutes(cancellationDeadline.getMinutes() + parseInt(cancelTime)); // 5 minutes window
      const cancelAllowed= await this.ordersService.isCancelAllowed(id);
      if (!cancelAllowed) {
          return { 
              success: false, 
              message: "Cancellation is not allowed after 15 minutes of order.",
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

  @Patch('cancelOrder/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel order with reason' })
  async cancelOrderByUser(
    @Req() req: Request& { user?: any },
    @Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto
  ) {
    try{

      if (!req.user) {
        throw new HttpException(
          'User must be logged in to create an order',
          HttpStatus.UNAUTHORIZED
        );
      }
      
      // Get user ID from the token
      const userId = req.user?._id;
      const order = await this.ordersService.findOne(id);
      // Allow if it's their own order
      if (order.customer.toString() !== userId.toString()) {
        throw new HttpException('You are not authorized to view this order', HttpStatus.UNAUTHORIZED);
      }

      if (!order) {
          throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }
      // Check if the order is already canceled
      if (order.status === 'cancelled') {
        return { 
          success: false,
          message: "Order is already cancelled.",
          order:order
        };
      }

      // Check if the order is within the cancellation window
      // const cancelTime = this.configService.get<string>('ORDER_CANCEL_TIME');
      // const currentTime = new Date();
      // const cancellationDeadline = new Date(order.createdAt);
      // cancellationDeadline.setMinutes(cancellationDeadline.getMinutes() + parseInt(cancelTime)); // 5 minutes window
      const cancelAllowed= await this.ordersService.isCancelAllowed(id);
      if (!cancelAllowed) {
          return { 
              success: false, 
              message: "Cancellation is not allowed after 15 minutes of order.",
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


  @Post('checkItems')
  @ApiOperation({ summary: 'Check if food items are available' })
  async checkItems(@Body() checkItemsDto: CheckItemsDto) {
    try {
      const { foodItems } = checkItemsDto;

      if (!foodItems || !Array.isArray(foodItems)) {
        throw new HttpException('Invalid or missing foodItems array.', HttpStatus.BAD_REQUEST);
      }

      const itemsWithStatus = await Promise.all(
        foodItems.map(async (fd) => {
          const foodItem = await this.fooditemService.findOne(fd);
          if (!foodItem) {
            return { foodItemId: fd, isOrderingAllowed: false, message: 'Food item not found.' };
          }
          const isOrderingAllowed = await this.fooditemService.isOrderingAllowed(fd);
          return { ...foodItem, isOrderingAllowed };
        }),
      );

      return { success: true, foodItems: itemsWithStatus };
    } catch (error) {
      throw new HttpException(
        error.message || 'An error occurred while checking food items.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }



  @Get('history')
  @UseGuards(JwtAuthGuard)
  async findOrderHistoryByUser(
    @Req() req: Request& { user?: any }
  ) {
    try{

      if (!req.user) {
        throw new HttpException(
          'User must be logged in to create an order',
          HttpStatus.UNAUTHORIZED
        );
      }
      
      // Get user ID from the token
      const userId = req.user?._id;

      const orders= await this.ordersService.findAll({customer:userId});

      const orersWithCancelStatus= await Promise.all(
        orders.map(async (item)=>{
          const payment = await this.paymentService.filterOne({order:item._id.toString()});
          return{
            ...item,
            token:payment.token,
            paymentStatus:payment.paymentStatus,
            isCancelAllowed: await this.ordersService.isCancelAllowed(item._id.toString())
          };
        })
      );
      return orersWithCancelStatus;

    }catch (error) {
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

  @Get('orderDetail/:id')
  @UseGuards(JwtAuthGuard)
  async orderDetailByUser(
    @Req() req: Request& { user?: any },
    @Param('id') id: string
  ) {
    try{
      if (!req.user) {
        throw new HttpException(
          'User must be logged in to create an order',
          HttpStatus.UNAUTHORIZED
        );
      }
      
      // Get user ID from the token
      const userId = req.user?._id;
      const order = await this.ordersService.findOne(id);
      if(order.customer.toString() !== userId.toString()){
        throw new HttpException('You are not authorized to view this order', HttpStatus.UNAUTHORIZED);
      }

      const payment = await this.paymentService.filterOne({order:id});
      const isCancelAllowed = await this.ordersService.isCancelAllowed(id);
      return {
        ...order,
        token:payment.token,
        paymentStatus:payment.paymentStatus,
        paymentMethod:payment.paymentMethod,
        isCancelAllowed: isCancelAllowed
      };
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
