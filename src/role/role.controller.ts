import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';
import { DynamicRolesGuard } from '../helper/dynamic-auth.guard';
import { Roles } from '../helper/roles.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, DynamicRolesGuard)
@Roles('super-admin')
export class RoleController {
  constructor(private readonly rolesService: RoleService) {}

  @Post()
  async create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  async findAll() {
    const roles = await this.rolesService.findAll();
    return roles
      .filter(role => role.name !== 'super-admin')
      .map(role => {
        if (role.permissions) {
          const transformedPermissions = new Map();
          for (const [controller, actions] of role.permissions.entries()) {
            const controllerName = controller.replace(/Controller$/, '');
            transformedPermissions.set(controllerName, actions);
          }
          role.permissions = transformedPermissions;
        }
        return role;
      });
  }

  // @Get(':id')
  // async findOne(@Param('id') id: string) {
  //   return this.rolesService.findOne(id);
  // }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    if (updateRoleDto.permissions) {
      const modifiedPermissions = new Map();
      
      for (const [controller, actions] of Object.entries(updateRoleDto.permissions)) {
        const controllerName = controller.endsWith('Controller') ? controller : `${controller}Controller`;
        const actionsMap = new Map(Object.entries(actions));
        modifiedPermissions.set(controllerName, actionsMap);
      }
      
      updateRoleDto.permissions = modifiedPermissions;
    }
    
    return this.rolesService.update(id, updateRoleDto);
  }

  @Patch(':id/permissions')
  async setPermissions(
    @Param('id') id: string,
    @Body('controllerName') controllerName: string,
    @Body('actionName') actionName: string,
    @Body('allowed') allowed: boolean,
  ) {
    return this.rolesService.setPermissions(id, controllerName, actionName, allowed);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const hasUsers = await this.rolesService.checkRoleHasUsers(id);
    if (hasUsers) {
      return { success: false, message: 'Cannot delete role because it is already assigned to users' };
    }
    await this.rolesService.remove(id);
    return { success: true, message: 'Role successfully deleted' };
  }

  
}
