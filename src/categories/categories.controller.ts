import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Controller, Get, Post, Body, Param, Put, Patch, Delete } from '@nestjs/common';
import { UploadedFile, UseInterceptors, Req, HttpException, HttpStatus } from '@nestjs/common';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { FoodItem } from '../fooditems/fooditems.model';
import { OrderTimeFrame } from '../ordertimeframe/ordertimeframe.model';
import { OrderTimeFrameService } from '../ordertimeframe/ordertimeframe.service';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';

@Controller('categories')
export class CategoriesController {
    
    private static readonly imagePath = 'assets/images'; 

    constructor(
      private readonly categoryService: CategoriesService,
      private readonly orderTimeFrameService:OrderTimeFrameService,
      @InjectModel(OrderTimeFrame.name) private orderTimeFrameModel: Model<OrderTimeFrame>,
    ) {}

    @Post()
    @UseInterceptors(FileInterceptor('image',{
        storage:diskStorage({
            destination:(req, file, callback)=>{
                
                if (!fs.existsSync(CategoriesController.imagePath)) {
                    fs.mkdirSync(CategoriesController.imagePath, { recursive: true }); // Create directory if it doesn't exist
                }
                callback(null, CategoriesController.imagePath);
            },
            filename:(req, file, callback)=>{
                // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                // const extension = extname(file.originalname);
                // callback(null, `${uniqueSuffix}${extension}`);

                // Extract the category name and use it as the filename
                const categoryName = (req.body.name || 'default').replace(/\s+/g, '-').toLowerCase(); // Normalize name
                const extension = extname(file.originalname); // Extract extension from the original file name
                const filename = `${categoryName}${extension}`; // Generate the filename
                callback(null, filename); // Use category name as filename
            }
        }),
        fileFilter: (req, file, callback) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
              return callback(new HttpException('Only image (jpg,jpeg,png) files are allowed!', HttpStatus.BAD_REQUEST), false);
            }
            callback(null, true);
          },
    }))
    async create(
        @Body() createCategoryDto: CreateCategoryDto,
        @UploadedFile() image: Express.Multer.File,
        @Req() req: Request
    ) {
        try {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            // Ensure the image path is set if an image file was uploaded
            const imagePath = image ? `${CategoriesController.imagePath}/${image.filename}` : null;
            
            // Save the category with the image path
            const catgory= await this.categoryService.create({
               ...createCategoryDto,
                image: imagePath
                });

              // check if stratTime or endTime is zero
              if (
                createCategoryDto.orderingStartTime > 0 &&
                createCategoryDto.orderingEndTime > 0
              ) {
                const orderingTimeframe = await this.orderTimeFrameService.create({
                  orderingStartTime: createCategoryDto.orderingStartTime,
                  orderingEndTime: createCategoryDto.orderingEndTime,
                  isActive: createCategoryDto.isOrderTimeFrameActive,
                  applicableTo: 'category', // Indicating that this applies to the category
                  applicableId: catgory._id.toString(),
                });
              
                await orderingTimeframe.save();
              }

            return {...catgory.toObject(),image:`${baseUrl}/${catgory.image}`};
        } catch (error) {
            throw new HttpException(error.message ||'Error creating category', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // // Ensure the image is either set from the DTO or default to `null`
        // const categoryData = {
        //     ...createCategoryDto,
        //     image: imagePath  
        // };
        // return this.categoryService.create(categoryData);
    }

    @Get()
    async findAll(@Req() req: Request) {
       
        try {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const categories = await this.categoryService.findAll();
            // return categories.map((category) => ({
            //   ...category,
            //   image: category.image ? `${baseUrl}/${category.image}` : null,
            // }));
             
            // Map through categories and add isOrderingAllowed for each
            const categoriesWithOrdering = await Promise.all(
              categories.map(async (category) => {
                const ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('category', category._id.toString());
                const isOrderingAllowed = await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe);
                return {
                  ...category, // Convert category to plain object
                  image: category.image ? `${baseUrl}/${category.image}` : null,
                  orderingStartTime:ordertimeframe?ordertimeframe.orderingStartTime:0,
                  orderingEndTime:ordertimeframe?ordertimeframe.orderingEndTime:0,
                  isOrderTimeFrameActive:ordertimeframe?ordertimeframe.isActive:false,
                  isOrderingAllowed, // Add the isOrderingAllowed field
                };
              }),
            );

            return categoriesWithOrdering;
            
          } catch (error) {
            throw new HttpException( 
              error.message ||'Error fetching categories', 
              error.status ||HttpStatus.INTERNAL_SERVER_ERROR);
          }
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Req() req: Request) {

        try {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const category = await this.categoryService.findOne(id);
            if (!category) {
              throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
            }

            const ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('category', id);
            // Call OrderingTimeframeService to check if ordering is allowed for this category
            const isOrderingAllowed=await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe);
            

            return {
              ...category,
              image: category.image ? `${baseUrl}/${category.image}` : null,
              orderingStartTime:ordertimeframe?ordertimeframe.orderingStartTime:0,
              orderingEndTime:ordertimeframe?ordertimeframe.orderingEndTime:0,
              isOrderTimeFrameActive:ordertimeframe?ordertimeframe.isActive:false,
              isOrderingAllowed
            };
          } catch (error) {
            throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
          }
    }

    @Patch(':id')
    @UseInterceptors(FileInterceptor('image', {
        storage: diskStorage({
          destination: (req, file, callback) => {
            
            if (!fs.existsSync(CategoriesController.imagePath)) {
              fs.mkdirSync(CategoriesController.imagePath, { recursive: true });
            }
            callback(null, CategoriesController.imagePath);
          },
          filename: (req, file, callback) => {
            // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            // const extension = extname(file.originalname);
            // callback(null, `${uniqueSuffix}${extension}`);

            // Extract the category name and use it as the filename
            const categoryName = (req.body.name || 'default').replace(/\s+/g, '-').toLowerCase(); // Normalize name
            const extension = extname(file.originalname); // Extract extension from the original file name
            const filename = `${categoryName}${extension}`; // Generate the filename
            callback(null, filename);
          },
        }),
        fileFilter: (req, file, callback) => {
            // Allow only images (jpg, jpeg, png)
            if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
              return callback(new HttpException('Only image (jpg, jpeg, png) files are allowed!', HttpStatus.BAD_REQUEST), false);
            }
            callback(null, true);
        },

      }))
    async update(
        @Req() req: Request,
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
        @UploadedFile() image?: Express.Multer.File,
        
    ) {
        try {
            const category = await this.categoryService.findOne(id);
            if (!category) {
                throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
            }

            let imagePath = category.image;;
            const baseUrl = `${req.protocol}://${req.get('host')}`;

            // If a new image is uploaded, process it and replace the old one
            if (image) {
                // Simply use the image path generated by Multer
                imagePath = `${CategoriesController.imagePath}/${image.filename}`;
            } 

            const updateCatData={ ...updateCategoryDto, image: imagePath };

            if (updateCategoryDto.orderingStartTime >0 && updateCategoryDto.orderingEndTime > 0){
              const orderingTimeframeData = {
                orderingStartTime: updateCategoryDto.orderingStartTime,
                orderingEndTime: updateCategoryDto.orderingEndTime,
                isActive: updateCategoryDto.isOrderTimeFrameActive,
                applicableTo: 'category',  
                applicableId: id,              
              };

              const existOrderTimeFrame = await this.orderTimeFrameModel.findOne({ applicableId: id });
              if (existOrderTimeFrame) {
                // ordering time frame already exists, update it
                await this.orderTimeFrameService.update(existOrderTimeFrame._id.toString(), orderingTimeframeData);
              } else {
                // no ordering time frame exists, create a new one
                const newOrderingTimeframe = await this.orderTimeFrameService.create(orderingTimeframeData);
              }

            }

            const updatedCat= await this.categoryService.update(id, updateCatData);


            return {...updatedCat,image:`${baseUrl}/${updatedCat.image}`};


        } catch (error) {
            throw new HttpException(
                error.message ||'Error updating category', 
                error.status ||HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.categoryService.remove(id);
    }
}
