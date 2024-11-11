import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './categories.model';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
    constructor(@InjectModel(Category.name) private categoryModel: Model<Category>) {}

    async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
        const categoryData = {
            ...createCategoryDto,
            image: createCategoryDto.image ?? null,
        };
        const createdCategory = new this.categoryModel(categoryData);
        return createdCategory.save();
    }

    async findAll(): Promise<Category[]> {
        // Use lean() to return plain JavaScript objects that match the Category type
        const categories = await this.categoryModel.find().lean().exec();
        return categories.map(category => ({
            ...category,
            image: category.image ?? null,
        }));
    }

    async findOne(id: string): Promise<Category> {
        const category = await this.categoryModel.findById(id).lean().exec();
        if (!category) {
            throw new NotFoundException(`Category with ID #${id} not found`);
        }
        return {
            ...category,
            image: category.image ?? null,
        };
    }

    async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
        const updatedData = {
            ...updateCategoryDto,
            image: updateCategoryDto.image ?? null,
        };
        const existingCategory = await this.categoryModel.findByIdAndUpdate(id, updatedData, { new: true, lean: true }).exec();
        if (!existingCategory) {
            throw new NotFoundException(`Category with ID #${id} not found`);
        }
        return existingCategory;
    }

    async remove(id: string): Promise<Category> {
        const deletedCategory = await this.categoryModel.findByIdAndDelete(id).lean().exec();
        if (!deletedCategory) {
            throw new NotFoundException(`Category with ID #${id} not found`);
        }
        return deletedCategory;
    }
}
