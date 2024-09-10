import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category, CategorySchema } from './categories.model';

@Module({
  imports:[MongooseModule.forFeature([{name:Category.name, schema:CategorySchema}])],
  providers: [CategoriesService],
  controllers: [CategoriesController]
})
export class CategoriesModule {}
