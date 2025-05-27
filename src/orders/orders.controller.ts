import { Controller, Get, Post, Body, Param, Patch, Delete, Query } from '@nestjs/common';
import { UploadedFile, UseInterceptors, Req, HttpException, NotFoundException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
 

import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto,CheckItemsDto } from './dto';

import { FoodItemsService } from '../fooditems/fooditems.service';
// import { OrderTimeFrameService } from '../ordertimeframe/ordertimeframe.service';
import { CreatePaymentDto } from '../payments/dto';

import { PaymentsService } from '../payments/payments.service';
import { UserService } from '../users/users.service';

import { Request } from 'express';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';
import { generateShortId } from '../helper/code-generator';
import { DynamicRolesGuard } from '../helper/dynamic-auth.guard';
import { Roles } from '../helper/roles.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard, DynamicRolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    // private readonly orderTimeService:OrderTimeFrameService,
    private readonly fooditemService:FoodItemsService,
    private readonly paymentService:PaymentsService,
    private readonly userService:UserService,
    private readonly configService:ConfigService,
  ) {
    
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

  @Post('checkItems')
  @Roles('*')
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
  async findOrderHistoryByUser(
    @Req() req: Request & { user?: any },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      if (!req.user) {
        throw new HttpException(
          'User must be logged in to create an order',
          HttpStatus.UNAUTHORIZED
        );
      }
      
      const userId = req.user?._id;
      
      // Build query object
      const query: any = { customer: userId };
      
      // If no dates provided, set default to last 30 days
      if (!startDate && !endDate) {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        
        query.createdAt = {
          $gte: start,
          $lte: end
        };
      } 
      // If dates are provided, use them
      else {
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

      const orders = await this.ordersService.findAll(query);

      const ordersWithCancelStatus = await Promise.all(
        orders.map(async (item) => {
          const payment = await this.paymentService.filterOne({order: item._id.toString()});
          return {
            ...item,
            token: payment?.token || null,
            paymentStatus: payment?.paymentStatus || 'unknown',
            isCancelAllowed: await this.ordersService.isCancelAllowed(item._id.toString())
          };
        })
      );
      return ordersWithCancelStatus;

    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }    
  }

  @Post('createOrderPayment')
  @ApiOperation({ summary: 'Create completed order with paid payment' })
  async createOrderPayment(
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
      const shortId = generateShortId('ORD',4);

      // Create order with completed status
      const orderWithUser = {
        ...createOrderDto,
        customer: userId,
        shortId: shortId,
        status: 'completed' // Set status to completed
      };

      // Create the order
      const order = await this.ordersService.create(orderWithUser);

      // Create payment with paid status
      const createPaymentDto = {
        customer: order.customer.toString(),
        order: order._id.toString(),
        amount: order.totalPrice,
        paymentStatus: 'paid', // Set payment status to paid
        paymentMethod: createOrderDto.paymentMethod,
        paymentDate: new Date(Date.now()) // Add payment date
      };

      const payment = await this.paymentService.create({
        ...createPaymentDto,
      });

      return {
        success: true,
        order: {
          ...order.toObject(),
          token: payment.token,
          cancelTime: this.configService.get<string>('ORDER_CANCEL_TIME')
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  
  @Post()
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

      const shortId = generateShortId('ORD',4);
      // Add userId to the order an shortId
      const orderWithUser = {
        ...createOrderDto,
        customer: userId,
        shortId:shortId
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
          token:payment.token,
          cancelTime: this.configService.get<string>('ORDER_CANCEL_TIME')
        },
      };
    }catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  @Patch(':id')
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

      await this.paymentService.updateStatus(id, 'cancelled');

      return {
        success: true,
        order: updatedOrder,
        message: 'Order cancelled successfully'
      };

    }catch (error) {
      if (error instanceof NotFoundException) {
          throw error;
      }
      throw new HttpException(
          error.message,
          error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch('cancel/:id')
  @ApiOperation({ summary: 'Cancel order with reason' })
  async cancelOrderByUser(
    @Req() req: Request& { user?: any },
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto
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
              message: "Cancellation time has been expired.",
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

      await this.paymentService.updateStatus(id, 'cancelled');

      return {
        success: true,
        order: updatedOrder,
        message: 'Order cancelled successfully'
      };

    }catch (error) {
      if (error instanceof NotFoundException) {
          throw error;
      }
      throw new HttpException(
          error.message,
          error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('searchOrderPayment')
  @ApiOperation({ summary: 'Search orders for payment processing' })
  async searchOrderForPayment(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('token') token?: string,
    @Query('shortId') shortId?: string,
    @Query('orderStatus') orderStatus?: string
  ) {
    return this.findAll(
      startDate,
      endDate,
      paymentStatus,
      token,
      shortId,
      orderStatus
    );
  }

  @Get('analyze')
  @ApiOperation({ summary: 'Search orders for analytics' })
  async analyze(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.findAll(
      startDate,
      endDate
    );
  }

  @Get()
  async findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('token') token?: string,
    @Query('shortId') shortId?: string,
    @Query('orderStatus') orderStatus?: string,
    @Query('customer') customer?: string
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
          const endDateTime = new Date(endDate);
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

      // If customer search parameter is provided
      if (customer) {
        // Find users matching the search criteria
        const userSearchPipeline = [
          {
            $match: {
              $or: [
                { username: { $regex: customer, $options: 'i' } },
                { 'profile.firstName': { $regex: customer, $options: 'i' } },
                { 'profile.lastName': { $regex: customer, $options: 'i' } },
                { 'profile.fullName': { $regex: customer, $options: 'i' } }
              ]
            }
          }
        ];
        
        const matchingUsers = await this.userService.findWithPipeline(userSearchPipeline);
        const userIds = matchingUsers.data.map(user => user._id);
        
        if (userIds.length > 0) {
          query.customer = { $in: userIds };
        } else {
          // If no matching users found, return empty result
          return [];
        }
      }

      const orders = await this.ordersService.findAll(query);

      const ordersWithCancelStatus = await Promise.all(
        orders.map(async (item) => {
          const payment = await this.paymentService.filterOne({order: item._id.toString()});
          const userProfile = await this.userService.findProfile(item.customer.toString());
          return {
            ...item,
            token: payment?.token || null,
            paymentStatus: payment?.paymentStatus || 'unknown',
            isCancelAllowed: await this.ordersService.isCancelAllowed(item._id.toString()),
            userProfile: userProfile || null
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

@Patch(':id/payment')
@ApiOperation({ summary: 'Process payment for an order' })
async processPayment(
  @Req() req: Request & { user?: any },
  @Param('id') id: string,
  @Body() body: { paymentMethod: string }
) {
  try {
    const { paymentMethod } = body;


    const pay = await this.paymentService.updateStatus(
      id, 'paid', paymentMethod, new Date(Date.now())
    );

    const order = await this.ordersService.update(id, {
      status: 'completed',
    });

    return {
      success: true,
      message: 'Payment processed successfully',
      order,
    };
  } catch (error) {
    throw new HttpException(
      error.message,
      error.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

  
}
 
