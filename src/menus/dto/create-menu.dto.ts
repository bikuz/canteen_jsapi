import { IsArray, IsDate, IsEnum, IsMongoId, IsOptional,IsBoolean, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
// import { FoodItem } from '../../fooditems/fooditems.model';
import { Types } from 'mongoose';

export class CreateMenuDto {
  @IsString()
  name: string;

  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsEnum(['Daily', 'Weekly', 'Monthly'])
  scheduleType: string;

  @IsOptional()
  @IsString()
  image: string | null;

  @IsOptional()
  @IsBoolean()
  isAvailable: boolean;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @Type(() => String)  // Converts each string to a MongoId
  foodItems?: Types.ObjectId[] | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] | null;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

    // Fields for the OrderingTimeframe
    @IsNumber()
    @IsOptional()
    orderingStartTime?: number; // time in seconds (e.g., 32400 for 09:00)
  
    @IsNumber()
    @IsOptional()
    orderingEndTime?: number; // time in seconds (e.g., 32400 for 09:00)
  
    @IsBoolean()
    @IsOptional()
    isOrderTimeFrameActive: boolean=false;
}
