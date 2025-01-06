import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

}
