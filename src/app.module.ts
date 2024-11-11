import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersModule } from './orders/orders.module';
import { MenusModule } from './menus/menus.module';
import { PaymentsModule } from './payments/payments.module';
import { CategoriesModule } from './categories/categories.module';
import { FoodItemsModule } from './fooditems/fooditems.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { RoleModule } from './role/role.module';
import { UserModule } from './users/users.module';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { SharedModule } from './auth/shared.module';

@Module({
  imports: [
    // MongooseModule.forRoot('mongodb://localhost/canteen_icimod'),
    ConfigModule.forRoot({
      isGlobal: true, // makes ConfigModule available application-wide
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
      }),
      inject: [ConfigService],
    }),
    SharedModule,
    AuthModule, 
    RoleModule,
    UserModule,
    OrdersModule,    
    MenusModule,
    PaymentsModule,
    CategoriesModule,    
    FoodItemsModule,
    AnalyticsModule,  
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, AuthService],
})
export class AppModule {}
