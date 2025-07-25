import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// import { Role } from '../role/role.model';
// import { User } from '../users/users.model';
// import {RoleService} from '../role/role.service';
import {UserService} from '../users/users.service';
import { ROLES_KEY } from './roles.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class DynamicRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    // @InjectModel(Role.name) private roleModel: Model<Role>,
    // @InjectModel(User.name) private userModel: Model<User>,
    // private roleService: RoleService,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check if the route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = await this.userService.findOne(request.user._id);

    if (!user) {
      throw new ForbiddenException('User not found');
    }

     // If user has no roles, deny access
    if (!user.roles || user.roles.length === 0) {
      console.log(`User ${user.username} has no roles assigned`);
      return false;
    }

    // Check if user is super-admin first
    if (user.roles.some(role => role.name === 'super-admin')) {
      return true;
    }

    // If specific roles are required via @Roles decorator
    if (requiredRoles && requiredRoles.length > 0) {
      // If * is in required roles, allow access
      if (requiredRoles.includes('*')) {
        return true;
      }

      // Check if user has any of the required roles
      const hasRequiredRole = user.roles.some(role => 
        requiredRoles.includes(role.name)
      );
      
      if (!hasRequiredRole) {
        console.log(`User ${user.username} does not have required roles: ${requiredRoles.join(', ')}`);
        return false;
      }
    }

    // Check permissions in all roles
    const controllerName = context.getClass().name;
    const actionName = context.getHandler().name;

    // // Check permissions across all roles
    // for (const role of user.roles) {
    //   if (role.permissions && role.permissions.has(controllerName)) {
    //     const controllerPermissions = role.permissions.get(controllerName);
    //     if (controllerPermissions.has(actionName)) {
    //       // If any role grants permission, allow access
    //       const hasPermission = controllerPermissions.get(actionName);
    //       if (hasPermission) {
    //         console.log(`Access granted to ${user.username} for ${controllerName}.${actionName} through role ${role.name}`);
    //         return true;
    //       }
    //     }
    //   }
    // }
    
    for (const role of user.roles.filter(r => r.permissions)) {
        if (role.permissions.get(controllerName)?.get(actionName)) {
            console.log(`Access granted to ${user.username} for ${controllerName}.${actionName} through role ${role.name}`);
            return true;
        }
    }
  
    // If no role grants permission, deny access
    console.log(`Access denied to ${user.username} for ${controllerName}.${actionName}`);
    return false;
  }
}