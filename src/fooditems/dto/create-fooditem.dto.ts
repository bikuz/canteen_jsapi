import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsArray,IsBoolean, IsMongoId } from 'class-validator';

export class CreateFoodItemDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description: string|null;

  @IsNotEmpty()
  @IsMongoId()
  category: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  image: string | null;  

  @IsBoolean()
  @IsOptional()
  isAvailable: boolean=true;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags: string[] | null;
  
  // Fields for the OrderingTimeframe
  @IsNumber()
  @IsOptional()
  orderingStartTime?: number; // time in seconds (e.g., 32400 for 09:00)

  @IsNumber()
  @IsOptional()
  orderingEndTime?: number; // time in seconds (e.g., 32400 for 09:00)
}
