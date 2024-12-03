import { IsNotEmpty, IsMongoId, IsArray, IsNumber, ArrayNotEmpty, IsEnum, IsOptional, IsString, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsMongoId()
  @ApiProperty({ description: 'UserID of customer', example: '' })
  customer: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @ApiProperty({ description: 'List of associated fooditems id', example: '' })
  foodItems: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsNotEmpty({ each: true })
  @ApiProperty({ description: 'List of associated fooditems quantity', example: '' })
  quantities: number[];

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'Total price', example: '' })
  totalPrice: number;

  @IsOptional()
  @IsEnum(['created', 'processing', 'completed', 'cancelled'])
  @ApiPropertyOptional({ description: 'Order Status', example: 'created, cancelled' })
  status?: string;


}
