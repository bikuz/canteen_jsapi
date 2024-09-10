import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../role/role.model';
import { User } from '../users/users.model';

@Injectable()
export class DynamicRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = await this.userModel.findById(request.user._id).populate('role').exec();
    const role = await this.roleModel.findById(user.role).exec();

    if (!role) {
      throw new ForbiddenException('Role not found');
    }

    const controllerName = context.getClass().name;
    const actionName = context.getHandler().name;

    if (role.permissions.has(controllerName)) {
      const controllerPermissions = role.permissions.get(controllerName);
      if (controllerPermissions.has(actionName)) {
        return controllerPermissions.get(actionName);
      }
    }
    return false; // Default to deny if no explicit permission is found
  }
}
