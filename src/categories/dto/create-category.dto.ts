import { IsNotEmpty, IsOptional, IsString } from 'class-validator';


export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;


  @IsString()
  @IsOptional()
  image: string | null;
}