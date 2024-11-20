import { IsNotEmpty, IsMongoId, IsArray, ArrayNotEmpty, IsEnum, IsOptional, IsString, IsDate, IsNumber, IsBoolean } from 'class-validator';

export class CreateOrderTimeFrameDto {
  @IsNumber()
  orderingStartTime: number; // time in seconds

  @IsNumber()
  orderingEndTime: number; // time in seconds

  @IsBoolean()
  isActive:boolean=false;

  @IsEnum(['category', 'menu', 'fooditem'])
  applicableTo: string; // E.g., 'category'

  @IsString()
  @IsNotEmpty()
  applicableId: string; // Reference to the ID of the category/menu/etc.
}
