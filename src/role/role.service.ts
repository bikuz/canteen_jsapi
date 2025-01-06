import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './role.model';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { User } from '../users/users.model';

@Injectable()
export class RoleService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const createdRole = new this.roleModel(createRoleDto);
    return createdRole.save();
  }

  async findAll(): Promise<Role[]> {
    return this.roleModel.find().exec();
  }


  async findOne(id: string): Promise<Role> {
    const role = await this.roleModel.findById(id).exec();
    if (!role) {
      throw new NotFoundException(`Role #${id} not found`);
    }
    return role;
  }

  async findByName(roleName:string): Promise<Role>{
    const role = await this.roleModel.findOne({ name: roleName }).exec();
    if (!role) {
      throw new NotFoundException(`Role #${roleName} not found`);
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    // Transform permissions if needed
    if (!updateRoleDto.permissions) {
        updateRoleDto.permissions = new Map(Object.entries(updateRoleDto.permissions));
    }

    const existingRole = await this.roleModel.findByIdAndUpdate(id, updateRoleDto, { new: true }).exec();
    if (!existingRole) {
      throw new NotFoundException(`Role #${id} not found`);
    }
    return existingRole;
  }

  async setPermissions(id: string, controllerName: string, actionName: string, allowed: boolean): Promise<Role> {
    const role = await this.findOne(id);
    if (!role.permissions.has(controllerName)) {
      role.permissions.set(controllerName, new Map<string, boolean>());
    }
    const controllerPermissions = role.permissions.get(controllerName);
    controllerPermissions.set(actionName, allowed);
    role.permissions.set(controllerName, controllerPermissions); // Update map in role

    return role.save();
  }

  async hasPermission(id: string, controllerName: string, actionName: string): Promise<boolean> {
    const role = await this.findOne(id);
    return role.permissions.get(controllerName)?.get(actionName) || false;
  }
  
  async remove(id: string): Promise<Role> {
    const deletedRole = await this.roleModel.findByIdAndDelete(id).exec();
    if (!deletedRole) {
      throw new NotFoundException(`Role #${id} not found`);
    }
    return deletedRole;
  }

  async checkRoleHasUsers(id: string): Promise<boolean> {
    const usersWithRole = await this.userModel.countDocuments({ roleId: id });
    return usersWithRole > 0;
  }
}
