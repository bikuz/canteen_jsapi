import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './categories.model';
import { FoodItem } from  '../fooditems/fooditems.model';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { OrderTimeFrameService } from '../ordertimeframe/ordertimeframe.service';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectModel(Category.name) private categoryModel: Model<Category>,
        @InjectModel(FoodItem.name) private foodItemModel: Model<FoodItem>,
        private readonly orderTimeFrameService:OrderTimeFrameService,
    ) {}

    async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
        try{
            // const categoryData = {
            //     ...createCategoryDto,
            //     image: createCategoryDto.image ?? null,
            // };
            // const createdCategory = new this.categoryModel(categoryData);
            const createdCategory = new this.categoryModel(createCategoryDto);
            return createdCategory.save();
        }catch(error){
            throw new Error('Error createing caetgory');
        }
    }

    async findAll(): Promise<Category[]> {
        try{
            // Use lean() to return plain JavaScript objects that match the Category type
            const categories = await this.categoryModel.find().lean().exec();
            // return categories.map(category => ({
            //     ...category,
            //     image: category.image ?? null,
            // }));
            return categories;
        }catch(error){
            throw new Error('Error finding categories');
        }
    }

    async findOne(id: string): Promise<Category> {
        try{
            const category = await this.categoryModel.findById(id).lean().exec();
            if (!category) {
                throw new NotFoundException(`Category with ID #${id} not found`);
            }
            // return {
            //     ...category,
            //     image: category.image ?? null,
            // };
            return category;
        }catch(error){
            throw new Error('Error updating category');
        }
        
    }

    async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
        // const updatedData = {
        //     ...updateCategoryDto,
        //     image: updateCategoryDto.image ?? null,
        // };
        // const existingCategory = await this.categoryModel.findByIdAndUpdate(id, updatedData, { new: true, lean: true }).exec();
        // if (!existingCategory) {
        //     throw new NotFoundException(`Category with ID #${id} not found`);
        // }
        // return existingCategory;
        try{
            const updatedCategory = await this.categoryModel.findByIdAndUpdate(id, updateCategoryDto, {
                new: true, lean: true
              }).exec();
              if (!updatedCategory) {
                throw new NotFoundException(`Category with ID ${id} not found`);
              }
              return updatedCategory;
        }catch(error){
            throw new Error('Error updating category');
        }
    }

    // async remove(id: string): Promise<Category> {
    async remove(id: string) {
        try{
             // Check if there are any fooditem that reference the category
            const relatedFoodItems = await this.foodItemModel.countDocuments({ category: id });
            if (relatedFoodItems > 0) {
                // throw an error
                throw new Error('Error deleting Category as it is being used in Fooditem');

                // Or, we could delete all related products:
                // await this.foodItemModel.deleteMany({ category: id });
            }

            // delete associate OrderTimeFrame
            this.orderTimeFrameService.removeOrderTimeframe('category',id);

            // Proceed to delete the category
            const result = await this.categoryModel.findByIdAndDelete(id);

            if (!result) {
                throw new Error('Category not found');
            }

            return { message: 'Category deleted successfully' };
        }
        catch(error){
            throw new Error('Error deleting Category')
        }
    }
}
