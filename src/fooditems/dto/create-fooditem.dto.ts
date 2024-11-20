import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsArray,IsBoolean, IsMongoId } from 'class-validator';

export class CreateFoodItemDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsMongoId()
  category: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  // @IsNotEmpty()
  // @IsEnum(['single', 'combo', 'buffet'])
  // type: string;

  @IsOptional()
  @IsString()
  image: string | null;  

  @IsBoolean()
  isAvailable: boolean;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags: string[] | null;
  
  // Fields for the OrderingTimeframe
  @IsNumber()
  orderingStartTime: number; // time in seconds (e.g., 32400 for 09:00)

  @IsNumber()
  orderingEndTime: number; // time in seconds (e.g., 32400 for 09:00)
}
