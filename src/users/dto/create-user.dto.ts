// create-user.dto.ts
import { IsNotEmpty, IsString, IsEmail, IsMongoId, IsArray } from 'class-validator';
import {  Types } from 'mongoose';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  // @IsNotEmpty()
  // @IsMongoId()
  // role: Types.ObjectId; 
  
  @IsNotEmpty()
  @IsArray()
  @IsMongoId({ each: true })
  roles: string[]; // Assumes `Types.ObjectId` translates to string

  @IsNotEmpty()
  profile: {
    firstName: string;
    lastName: string;   
    email: string;
    phoneNumber: string;
  };

  isEmailVerified?: boolean | null;

  emailVerifiedAt: Date;
  
  verificationToken?: string;
}