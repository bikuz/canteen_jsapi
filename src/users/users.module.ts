import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './users.model';
import { UserService } from './users.service';
import { RoleModule } from '../role/role.module';
import { UserController } from './users.controller';
import { EmailService } from '../email/email.service';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60m' },
    }),
    forwardRef(() => RoleModule),
    forwardRef(()=> OrdersModule),
    forwardRef(()=> PaymentsModule),
  ],
  providers: [UserService, EmailService], // Added EmailService
  controllers: [UserController],
  exports: [UserService, EmailService], // Exporting EmailService for use in other modules
})
export class UserModule {}
