 
import { Controller, Get, Post, Body, Param, Patch, Delete, HttpException, HttpStatus, NotFoundException, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';
import { Model } from 'mongoose';
import { Payment } from './payments.model';

import { Request } from 'express';

@Controller('payment')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {
   
  }

  

  @Post()
  async create(@Body() createPaymentDto: CreatePaymentDto) {
    try{
      return this.paymentsService.create(createPaymentDto);
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
      const updatedPayment = await this.paymentsService.update(id, {
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
      return this.paymentsService.findAll();
    }catch (error) {
        throw new HttpException(
            error.message,
            error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try{
      return this.paymentsService.findOne(id);
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
      const {payments,total} = await this.paymentsService.findByPage(pageNumber,limitNumber);
      
       

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
      return this.paymentsService.remove(id);
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
