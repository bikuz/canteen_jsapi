import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsNumber, IsPositive } from 'class-validator';


export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image: string | null;  // This will store the file path after upload

  @IsBoolean()
  isAvailable: boolean;

  // Fields for the OrderingTimeframe
  @IsNumber()
  @IsOptional()
  @IsPositive()
  orderingStartTime?: number; // time in seconds (e.g., 32400 for 09:00)

  @IsNumber()
  @IsOptional()
  @IsPositive()
  orderingEndTime?: number; // time in seconds (e.g., 32400 for 09:00)

  @IsBoolean()
  @IsOptional()
  isOrderTimeFrameActive: boolean=false;

}