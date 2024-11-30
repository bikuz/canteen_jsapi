import { IsNotEmpty, IsMongoId, IsArray, IsNumber, ArrayNotEmpty, IsEnum, IsOptional, IsString, IsDate } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsMongoId()
  customerId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  foodItems: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsNotEmpty({ each: true })
  quantities: number[];

  @IsNotEmpty()
  @IsNumber()
  totalPrice: number;

  @IsOptional()
  @IsNumber()
  token?: number;

  @IsOptional()
  @IsEnum(['created', 'processing', 'completed', 'cancelled'])
  status?: string;


}
