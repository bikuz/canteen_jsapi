// create-user.dto.ts
import { IsNotEmpty, IsString, IsEmail, IsMongoId } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsMongoId()
  role: string;

  @IsNotEmpty()
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
}


