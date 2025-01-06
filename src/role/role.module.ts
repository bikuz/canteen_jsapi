import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './role.model';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { RoleInitService } from './role-init.service';
import { User, UserSchema } from '../users/users.model';
import { UserModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => UserModule)
  ],
  providers: [RoleService, RoleInitService],
  controllers: [RoleController],
  exports: [RoleService, MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }])],
})
export class RoleModule {}