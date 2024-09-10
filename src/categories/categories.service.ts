import { Injectable, NotFoundException  } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import  {Category} from './categories.model'
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
    constructor(@InjectModel(Category.name) private categoryModel: Model<Category>){}

    async create(createCategoryDto: CreateCategoryDto): Promise<Category>{
        const createdCategory = new this.categoryModel(createCategoryDto);
        return createdCategory.save();
    }

    async findAll():Promise<Category[]>{
        return this.categoryModel.find().exec();
    }

    async findOne(id: string): Promise<Category> {
        const category = await this.categoryModel.findById(id).exec();
        if (!category) {
          throw new NotFoundException(`Category #${id} not found`);
        }
        return category;
    }

    async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
        const existingCategory  = await this.categoryModel.findByIdAndUpdate(id, updateCategoryDto, { new: true }).exec();
        if (!existingCategory ) {
          throw new NotFoundException(`Order #${id} not found`);
        }
        return existingCategory ;
    }
    
    async remove(id: string): Promise<Category> {
        const deletedCategory = await this.categoryModel.findByIdAndDelete(id).exec();
        if (!deletedCategory) {
          throw new NotFoundException(`Category #${id} not found`);
        }
        return deletedCategory;
    }
}
