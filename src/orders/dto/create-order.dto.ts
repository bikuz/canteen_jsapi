import { IsNotEmpty, IsMongoId, IsArray, ArrayNotEmpty, IsEnum, IsOptional, IsString, IsDate } from 'class-validator';

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

  @IsOptional()
  @IsString()
  remarks?: string;
}
