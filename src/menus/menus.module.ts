import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { Menu, MenuSchema } from './menus.model';
import { OrderTimeFrameModule } from '../ordertimeframe/ordertimeframe.module';

@Module({
  imports:[MongooseModule.forFeature([
    {name:Menu.name,schema:MenuSchema}
  ]),
  OrderTimeFrameModule,
],
  providers: [MenusService],
  controllers: [MenusController]
})
export class MenusModule {}
