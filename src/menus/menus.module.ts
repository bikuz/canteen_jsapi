import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { Menu, MenuSchema } from './menus.model';
import { OrderTimeFrameModule } from '../ordertimeframe/ordertimeframe.module';
import { FoodItemsModule } from '../fooditems/fooditems.module';

@Module({
  imports:[MongooseModule.forFeature([
    {name:Menu.name,schema:MenuSchema}
  ]),
  OrderTimeFrameModule,
  FoodItemsModule,
],
  providers: [MenusService],
  controllers: [MenusController]
})
export class MenusModule {}
