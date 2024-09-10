// import { Module } from '@nestjs/common';
// import { JwtModule } from '@nestjs/jwt';
// import { PassportModule } from '@nestjs/passport';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { UserModule } from '../users/users.module'; // Import the UserModule
// import { UserService } from '../users/users.service';
// import { AuthService } from './auth.service';
// import { AuthController } from './auth.controller';
// import { JwtStrategy } from './jwt.strategy';

// @Module({
//   imports: [    
//     ConfigModule.forRoot(),
//     PassportModule,
//     JwtModule.registerAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: async (configService: ConfigService) => ({
//         secret: configService.get<string>('JWT_SECRET'),
//         signOptions: { expiresIn: '60m' }, // Customize the expiration time
//       }),
//     }),
//     UserModule,
//   ],
//   // providers: [AuthService, JwtStrategy, UserService],
//   providers: [AuthService, JwtStrategy,UserService],
//   controllers: [AuthController],
//   exports: [AuthService],
// })
// export class AuthModule {}

// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { UserService } from '../users/users.service';
import { UserSchema, User } from '../users/users.model';
import { RoleSchema, Role } from '../role/role.model';
import { AuthController } from './auth.controller';
import { SharedModule } from './shared.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }, { name: Role.name, schema: RoleSchema }]),
    PassportModule,
    // JwtModule.register({
    //   secret: 'your_jwt_secret',
    //   signOptions: { expiresIn: '60m' },
    // }),
    SharedModule,
  ],
  providers: [AuthService, UserService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

