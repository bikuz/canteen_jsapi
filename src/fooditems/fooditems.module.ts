import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoodItemsService } from './fooditems.service';
import { FooditemsController } from './fooditems.controller';
import { FoodItem, FoodItemSchema } from './fooditems.model';
import { OrderTimeFrameModule } from '../ordertimeframe/ordertimeframe.module';

@Module({
  imports:[MongooseModule.forFeature([
      {name:FoodItem.name,schema:FoodItemSchema}
    ]),
    OrderTimeFrameModule, // Import the OrderTimeFrameModule
  ],
  providers: [FoodItemsService],
  controllers: [FooditemsController],
  exports: [FoodItemsService,MongooseModule],
})
export class FoodItemsModule {}


