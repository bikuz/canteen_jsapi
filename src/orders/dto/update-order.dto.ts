import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto';
import { IsEnum, IsOptional, IsString, IsDate } from 'class-validator';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @IsOptional()
  @IsEnum(['pending', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  cancelReason?: string;

  @IsOptional()
  @IsDate()
  completedAt?: Date;

  @IsOptional()
  @IsDate()
  cancelledAt?: Date;
}
