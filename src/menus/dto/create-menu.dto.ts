import { IsNotEmpty, IsString, IsArray, IsMongoId, IsEnum, IsDate } from 'class-validator';

export class CreateMenuDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsArray()
  @IsMongoId({ each: true })
  foodItems: string[];

  @IsNotEmpty()
  @IsEnum(['daily', 'weekly'])
  type: string;

  @IsNotEmpty()
  @IsDate()
  startDate: Date;

  @IsNotEmpty()
  @IsDate()
  endDate: Date;
}
