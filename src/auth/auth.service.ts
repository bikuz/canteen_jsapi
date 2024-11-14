// import { Injectable } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { UserService } from '../users/users.service';
// import * as bcrypt from 'bcryptjs';

// @Injectable()
// export class AuthService {
//   constructor(
//     private readonly userService: UserService,
//     private readonly jwtService: JwtService,
//   ) {}

//   async validateUser(username: string, password: string): Promise<any> {
//     const user = await this.userService.findByUsername(username);
//     if (user && (await this.comparePasswords(password, user.password))) {
//       const { password, ...result } = user.toObject();
//       return result;
//     }
//     return null;
//   }

//   async login(user: any) {
//     const payload = { username: user.username, sub: user._id };
//     return {
//       access_token: this.jwtService.sign(payload),
//     };
//   }

//   private async comparePasswords(password: string, hash: string): Promise<boolean> {
//     return bcrypt.compare(password, hash);
//   }
// }

// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
import { Model,Types } from 'mongoose';
// import { Role } from '../role/role.model';


import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/users.service';
import { RoleService } from '../role/role.service';

import * as bcrypt from 'bcryptjs';

import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly roleService: RoleService,
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    
  ) {}

  // Local authentication validation
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && bcrypt.compareSync(pass, user.password)) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  // LDAP authentication validation
  async validateLdapUser(ldapUser: any): Promise<any> {
    try{
      console.log('LDAP validation called with', ldapUser);
      const existingUser = await this.usersService.findByUsername(ldapUser.username);
      if (existingUser) {
        return existingUser; // Return existing user if already saved
      }
      console.log('New LDAP user registration:', ldapUser);

      const customerRole = await this.roleService.findByName('customer');
      // Register new user if they don't exist 
      const createUserDto: CreateUserDto = {
        username: ldapUser.username,
        password: 'ldap_authenticated', // You can use a constant password or special indicator for LDAP users
        role: customerRole._id as Types.ObjectId, // Assign a default role
        profile: {
          firstName: ldapUser.firstName || '',
          lastName: ldapUser.lastName || '',
          email: ldapUser.email || '',
          phoneNumber: ldapUser.phoneNumber || ''
        }
      };

      const newUser = await this.register(createUserDto);
      return newUser;
    }catch(error){
      console.error('Error in LDAP validation:', error);
      throw new UnauthorizedException('LDAP Authentication failed');
    }
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(createUserDto: CreateUserDto): Promise<any> {
    return this.usersService.create(createUserDto);
  }
}

