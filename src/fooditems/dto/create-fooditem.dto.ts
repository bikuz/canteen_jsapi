import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsArray, IsMongoId } from 'class-validator';

export class CreateFoodItemDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsNotEmpty()
  @IsMongoId()
  category: string;

  @IsNotEmpty()
  @IsEnum(['single', 'combo', 'buffet'])
  type: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  comboItems?: string[];

  @IsNotEmpty()
  @IsString()
  filename: string;
}
