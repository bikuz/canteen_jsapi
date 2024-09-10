import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './role.model';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { RoleInitService } from './role-init.service';
import { User, UserSchema } from '../users/users.model';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [RoleService,RoleInitService],
  controllers: [RoleController]
  // exports: [RolesService], // Exporting RolesService to be used in other modules if needed
})
export class RoleModule {}