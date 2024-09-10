import { IsString } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  readonly name: string; // The name of the role, e.g., 'admin', 'manager', etc.
 
}
