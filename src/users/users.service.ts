import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './users.model';
import { Role } from '../role/role.model';
import { CreateUserDto,UpdateUserDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { FlattenMaps } from 'mongoose';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {    
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  
  async findAll():Promise<FlattenMaps<User>[]> {
    return this.userModel.find()
      .select('-password')
      .populate('roles')
      .lean()
      .exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id)
    .select('-password')
      .populate('roles')
      .exec();
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }
  
  async findProfile(id: string): Promise<User["profile"]> {
    const user = await this.userModel.findById(id).populate('roles').exec();
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user.profile;
  }
  
  async update(id: string, updateUserDto: UpdateUserDto):Promise<FlattenMaps<User>> {
    // First get the existing user
    const existingUser = await this.findOne(id);

    // Filter out null, undefined, or empty string values from updateUserDto
    const filteredUpdates = Object.fromEntries(
      Object.entries(updateUserDto).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    );

    // Handle password encryption first if it exists
    if (filteredUpdates.password) {
      const salt = await bcrypt.genSalt();
      filteredUpdates.password = await bcrypt.hash(filteredUpdates.password, salt);
    }

    // Merge existing data with filtered updates
    const mergedData = {
      ...existingUser.toObject(),
      ...filteredUpdates
    };

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id, 
      mergedData, 
      { new: true }
    ).lean().exec();

    if (!updatedUser) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return updatedUser;
  }

  async remove(id: string): Promise<FlattenMaps<User>> {
    const deletedUser = await this.userModel.findByIdAndDelete(id)
    .select('-password')
    .populate('roles')
    .lean()
    .exec();
    if (!deletedUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return deletedUser;
  }

  async findByUsername(username: string): Promise<User> {
    return this.userModel.findOne({ username })
    // .select('-password')
    .populate('roles')
    .exec();
  }

  async findUserRole(userId: string): Promise<Role[]> {
    const user = await this.userModel.findById(userId).populate('roles');
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user.roles || [];
  }
  
  async findAllExceptSuperAdmin(): Promise<FlattenMaps<User>[]> {
    // Find the super-admin role ID first
    const superAdminRole = await this.roleModel.findOne({ name: 'super-admin' }).exec();
    
    if (!superAdminRole) {
      throw new NotFoundException('Super-admin role not found');
    }

    const said = superAdminRole._id;
    return this.userModel.find()
      .select('-password')
      .populate('roles')
      .lean()
      .exec()
      .then(users => users.filter(user => 
        !user.roles.some(role => role._id.toString() === said.toString())
      ));
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    // Find user with populated roles
    const user = await this.userModel
      .findById(userId)
      .populate('roles')
      .exec();

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Extract all permissions from all roles
    const allPermissions = user.roles.flatMap(role => {
      const permissions: string[] = [];
      
      // Iterate through the outer map (controllers)
      role.permissions.forEach((actionMap, controller) => {
        // Iterate through the inner map (actions)
        actionMap.forEach((isAllowed, action) => {
          // Only include permissions that are set to true
          if (isAllowed) {
            permissions.push(`${controller}.${action}`);
          }
        });
      });
      
      return permissions;
    });

    // Remove duplicates using Set and convert back to array
    const uniquePermissions = [...new Set(allPermissions)];

    return uniquePermissions;
  }
}
