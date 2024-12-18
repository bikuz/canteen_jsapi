import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { readFileSync } from 'fs';

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
import { SharedModule } from './authjwt/shared.module';
import { PassportModule } from '@nestjs/passport';
import { DiscountModule } from './discount/discount.module';
import { OrderTimeFrameModule } from './ordertimeframe/ordertimeframe.module';

// Load YAML configuration
const loadYamlConfig = () => {
  try {
    return yaml.load(
      readFileSync(join(__dirname, '../config/app.config.yml'), 'utf8'),
    ) as Record<string, any>;
  } catch (e) {
    console.error('Error loading YAML config:', e);
    return {};
  }
};

@Module({
  imports: [
    // MongooseModule.forRoot('mongodb://localhost/canteen_icimod'),
    ConfigModule.forRoot({
      isGlobal: true, // makes ConfigModule available application-wide
      load: [loadYamlConfig],  // Load YAML config
      envFilePath: '.env', // Load .env file
    }),
    PassportModule.register({ session: false }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'assets'), // Serve files from the assets directory
      serveRoot: '/assets', // The URL path to access the files
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
    DiscountModule,
    OrderTimeFrameModule,
    
       
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, AuthService],
})
export class AppModule {}
