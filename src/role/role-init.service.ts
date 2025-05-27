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
    // await this.createDummyCustomer(); // Add this line to create a dummy customer on init
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

  // Add a new method to create a dummy customer account
  private async createDummyCustomer() {
    const customerRole = await this.roleModel.findOne({ name: 'customer' });
    if (customerRole) {
      // Create regular customer
      const customerExists = await this.userModel.findOne({ username: 'customer' });
      if (!customerExists) {
        const salt = await bcrypt.genSalt(10); // Use 10 rounds consistently
        const hashedPassword = await bcrypt.hash('customer123', salt); // default password
        console.log('Customer password hash:', hashedPassword);
        
        const customerUser = new this.userModel({
          username: 'customer',
          password: hashedPassword,
          roles: [customerRole._id as string],
          profile: {
            firstName: 'Test',
            lastName: 'Customer',
            email: 'customer@example.com',
            phoneNumber: '9876543210',
          },
          isEmailVerified: true, // Set as verified for testing
          emailVerifiedAt: new Date()
        });
        await customerUser.save();
        console.log('Dummy customer account created successfully');
      }
      
      // Create a test user with a very simple password
      const testUserExists = await this.userModel.findOne({ username: 'test' });
      if (!testUserExists) {
        const salt = await bcrypt.genSalt(10); // Use 10 rounds consistently
        const simplePassword = '123456';
        const hashedPassword = await bcrypt.hash(simplePassword, salt);
        console.log('Test user simple password:', simplePassword);
        console.log('Test user password hash:', hashedPassword);
        
        const testUser = new this.userModel({
          username: 'test',
          password: hashedPassword,
          roles: [customerRole._id as string],
          profile: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            phoneNumber: '5555555555',
          },
          isEmailVerified: true,
          emailVerifiedAt: new Date()
        });
        await testUser.save();
        console.log('Test user created with username: test, password: 123456');
      }
    }
  }
}