import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoodItemsService } from './fooditems.service';
import { FooditemsController } from './fooditems.controller';
import { FoodItem, FoodItemSchema } from './fooditems.model';
import { OrderTimeFrameModule } from '../ordertimeframe/ordertimeframe.module';
import { CategoriesModule } from '../categories/categories.module';
import { UserModule } from '../users/users.module';

@Module({
  imports:[MongooseModule.forFeature([
      {name:FoodItem.name,schema:FoodItemSchema}
    ]),
    OrderTimeFrameModule, // Import the OrderTimeFrameModule
    UserModule,
    forwardRef(() =>CategoriesModule)
     
  ],
  providers: [FoodItemsService],
  controllers: [FooditemsController],
  exports: [FoodItemsService,MongooseModule],
})
export class FoodItemsModule {}


