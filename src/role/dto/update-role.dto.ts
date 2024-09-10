import { PartialType } from '@nestjs/mapped-types';
import { ValidateNested, IsOptional } from 'class-validator';
import { CreateRoleDto } from './create-role.dto';
import { IsMap } from '../../helper/custom-map.validator';
import { Type } from 'class-transformer';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  
  @IsMap()
  @ValidateNested({ each: true })
  @Type(() => Object) // Transform to plain object if needed
  permissions?: Map<string, Map<string, boolean>>;
}
