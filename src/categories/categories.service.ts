import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './categories.model';
import { FoodItem } from  '../fooditems/fooditems.model';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { OrderTimeFrameService } from '../ordertimeframe/ordertimeframe.service';

import * as fs from 'fs';

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
            throw new Error(`Error createing caetgory: ${error.message}`);
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
         
        const updatedCategory = await this.categoryModel.findByIdAndUpdate(
            id,
            updateCategoryDto, {
            new: true, lean: true            
        }).exec();
        if (!updatedCategory) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }
        return updatedCategory;
        
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
            throw new Error(`Error fetching categories: ${error.message}`);
        }
    }

    async findByPage(page: number, limit: number): Promise<{ categories: Category[]; total: number }> {
        try {
            // Calculate the number of documents to skip
            const skip = (page - 1) * limit;
    
            // Fetch the categories with pagination
            const [categories, total] = await Promise.all([
                this.categoryModel.find().skip(skip).limit(limit).lean().exec(),
                this.categoryModel.countDocuments().exec(),
            ]);
    
            // Return paginated data along with the total count
            return {
                categories,
                total,
            };
        } catch (error) {
            throw new Error(`Error fetching categories: ${error.message}`);
        }
    }

    async findOne(id: string): Promise<Category> {
       
        const category = await this.categoryModel.findById(id).lean().exec();
        if (!category) {
            throw new NotFoundException(`Category with ID #${id} not found`);
        }
        // return {
        //     ...category,
        //     image: category.image ?? null,
        // };
        return category;
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
            this.orderTimeFrameService.remove('category',id);

            

            // Proceed to delete the category
            const result = await this.categoryModel.findByIdAndDelete(id);

            //also delete associate image
            if (result.image && fs.existsSync(result.image)) {
                fs.unlinkSync(result.image);
            }

            if (!result) {
                throw new Error('Category not found');
            }

            return { message: 'Category deleted successfully' };
        }
        catch(error){
            throw new Error('Error deleting Category');
        }
    }
}
