import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { Menu, MenuSchema } from './menus.model';

@Module({
  imports:[MongooseModule.forFeature([{name:Menu.name,schema:MenuSchema}])],
  providers: [MenusService],
  controllers: [MenusController]
})
export class MenusModule {}
