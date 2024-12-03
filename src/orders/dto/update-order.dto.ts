import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto';
import { IsEnum, IsOptional, IsString, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Order cancel reason', example: '' })
  cancelReason?: string;

  @IsOptional()
  @IsDate()
  @ApiPropertyOptional({ description: 'Order cancel date', example: 'created, cancelled' })
  cancelledAt?: Date;
}
