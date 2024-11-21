import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category, CategorySchema } from './categories.model';
import { FoodItem, FoodItemSchema } from '../fooditems/fooditems.model';
import { FoodItemsModule } from '../fooditems/fooditems.module';
import { OrderTimeFrameModule } from '../ordertimeframe/ordertimeframe.module';

@Module({
  imports:[MongooseModule.forFeature([
    {name:Category.name, schema:CategorySchema},
    {name: FoodItem.name, schema: FoodItemSchema},
  ]),
  OrderTimeFrameModule, // Import the OrderTimeFrameModule
  FoodItemsModule,
],
  providers: [CategoriesService],
  controllers: [CategoriesController]
})
export class CategoriesModule {}
