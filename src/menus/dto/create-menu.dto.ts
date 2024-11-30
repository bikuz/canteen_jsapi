import { IsArray, IsBoolean, IsNotEmpty, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateMenuDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  foodItems?: string[]; // Assumes `Types.ObjectId` translates to string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  repeatDay?: string[]; // Should contain valid day strings

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
