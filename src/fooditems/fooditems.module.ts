import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoodItemsService } from './fooditems.service';
import { FooditemsController } from './fooditems.controller';
import { FoodItem, FoodItemSchema } from './fooditems.model';

@Module({
  imports:[MongooseModule.forFeature([{name:FoodItem.name,schema:FoodItemSchema}])],
  providers: [FoodItemsService],
  controllers: [FooditemsController]
})
export class FoodItemsModule {}


