import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto';
import { IsEnum, IsOptional, IsString, IsDate } from 'class-validator';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {


  @IsOptional()
  @IsString()
  cancelReason?: string;

  

  @IsOptional()
  @IsDate()
  cancelledAt?: Date;
}
