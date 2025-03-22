import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './role.model';
import { User } from '../users/users.model';
import * as bcrypt from 'bcryptjs';


@Injectable()
export class RoleInitService implements OnModuleInit {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
     
  ) {}

  async onModuleInit() {
    await this.createDefaultRoles();
    await this.createAdminUser();
  }

  private async createDefaultRoles() {
    const roles = ['super-admin', 'canteen-admin', 'menu-manager', 'order-manager', 'payment-manager', 'cashier', 'customer'];
    for (const roleName of roles) {
      const roleExists = await this.roleModel.findOne({ name: roleName });
      if (!roleExists) {
        const permissions = new Map<string, Map<string, boolean>>();
        if (roleName === 'super-admin') {
          // Admin has all permissions
          permissions.set('*', new Map([['*', true]]));
        }
        const newRole = new this.roleModel({
          name: roleName,
          permissions,
        });
        await newRole.save();
      }
    }
  }

  private async createAdminUser() {    
    const adminRole = await this.roleModel.findOne({ name: 'super-admin' });
    if (adminRole) {
      const adminExists = await this.userModel.findOne({ username: 'admin' });
      if (!adminExists) {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash('admin123', salt); // default password
        const adminUser = new this.userModel({
          username: 'admin',
          password: hashedPassword,
          // Remove these fields as they're not in the schema
          // firstname: 'Super',
          // lastname: 'Admin',
          // email: 'admin@admin.com',
          roles: [adminRole._id as string],
          profile: {
            firstName: 'Super',
            lastName: 'Admin',
            email: 'admin@admin.com',
            phoneNumber: '1234567890',
          },
          isEmailVerified: true, // This is already set correctly
          emailVerifiedAt: new Date() // Add this to record when it was verified
        });
        await adminUser.save();
      }
    }
  }
}