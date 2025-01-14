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

  
  async findAll(searchCriteria = {}, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      this.userModel
        .find(searchCriteria)
        .select('-password')
        .populate('roles')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(searchCriteria)
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
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

  async findUserRole(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate('roles', 'name')
      .select('roles')
      .exec();

    if (!user) {
      throw new HttpException(
        'User not found',
        HttpStatus.NOT_FOUND
      );
    }

    return user.roles.map(role => role.name);
  }
  
  async findAllExceptSuperAdmin(searchCriteria = {}, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const finalCriteria = {
      ...searchCriteria,
      roles: { $ne: 'super-admin' }
    };

    const [users, total] = await Promise.all([
      this.userModel
        .find(finalCriteria)
        .select('-password')
        .populate('roles')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(finalCriteria)
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
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
        // Remove 'Controller' suffix if present
        const cleanController = controller.replace(/Controller$/, '');
        
        // Iterate through the inner map (actions)
        actionMap.forEach((isAllowed, action) => {
          // Only include permissions that are set to true
          if (isAllowed) {
            permissions.push(`${cleanController}.${action}`);
          }
        });
      });
      
      return permissions;
    });

    // Remove duplicates using Set and convert back to array
    const uniquePermissions = [...new Set(allPermissions)];

    return uniquePermissions;
  }

  async findWithPipeline(pipeline: any[], page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    // Add pagination to pipeline
    const paginatedPipeline = [
      ...pipeline,
      { $skip: skip },
      { $limit: limit }
    ];

    // Execute the aggregation
    const [results, countResult] = await Promise.all([
      this.userModel.aggregate(paginatedPipeline),
      this.userModel.aggregate([
        ...pipeline,
        { $count: 'total' }
      ])
    ]);

    const total = countResult[0]?.total || 0;

    return {
      data: results,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
