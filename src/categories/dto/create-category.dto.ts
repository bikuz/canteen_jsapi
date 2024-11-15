import { IsNotEmpty, IsOptional, IsString } from 'class-validator';


export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image: string | null;  // This will store the file path after upload
}