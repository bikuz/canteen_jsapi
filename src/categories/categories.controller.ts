import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Controller, Get, Post, Body, Param, Put, Patch, Delete, UseGuards } from '@nestjs/common';
import { UploadedFile, UseInterceptors, Req, HttpException,NotFoundException, HttpStatus } from '@nestjs/common';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { FoodItem } from '../fooditems/fooditems.model';
import { FoodItemsService } from '../fooditems/fooditems.service';
import { OrderTimeFrame } from '../ordertimeframe/ordertimeframe.model';
import { OrderTimeFrameService } from '../ordertimeframe/ordertimeframe.service';


import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';
import { DynamicRolesGuard } from '../helper/dynamic-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('categories')
@UseGuards(JwtAuthGuard, DynamicRolesGuard)
export class CategoriesController {
    
    private static readonly imagePath = 'assets/images/categories'; 

    constructor(
      private readonly categoryService: CategoriesService,
      private readonly orderTimeFrameService:OrderTimeFrameService,
      private readonly foodItemService:FoodItemsService,
      @InjectModel(OrderTimeFrame.name) private orderTimeFrameModel: Model<OrderTimeFrame>,
      private configService: ConfigService,
    ) {}

    private getBaseUrl(): string {
        return this.configService.get('baseURL')[0];  // Gets https://canteen.icimod.org/api
    }

    @Get('page/:page/limit/:limit')
    async findByPage(
      @Param('page') page: string,
      @Param('limit') limit: string,
      @Req() req: Request
    ){
      try {
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        // Validate the parameters
        if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
          throw new HttpException('Page and limit must be positive integers.', HttpStatus.BAD_REQUEST);
        }

        const baseUrl = this.getBaseUrl();
        const {categories,total} = await this.categoryService.findByPage(pageNumber,limitNumber);
        
        const categoriesWithOrdering = await Promise.all(
          categories.map(async (_item) => {
            const ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('category', _item._id.toString());
            const isOrderingAllowed = await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe);
            return {
              ..._item, // Convert category to plain object
              image: _item.image ? `${baseUrl}/${_item.image}` : null,
              orderingStartTime:ordertimeframe?ordertimeframe.orderingStartTime:0,
              orderingEndTime:ordertimeframe?ordertimeframe.orderingEndTime:0,
              isOrderTimeFrameActive:ordertimeframe?ordertimeframe.isActive:false,
              isOrderingAllowed, // Add the isOrderingAllowed field
              
            };
          }),
        );
        
        return {categories:categoriesWithOrdering,total};

      } catch (error) {
        if (error instanceof NotFoundException) {
            throw error;
        }
        throw new HttpException(
          error.message,
          error.status || HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    @Get(':id/fooditems')
    async fooditemsByCategory(
      @Param('id') id: string, 
      @Req() req: Request
    ){
        // here id belongs to category id
        try{
            const baseUrl = this.getBaseUrl();
            const fooditems = await this.foodItemService.findByFields({
                'category':id
            });

            const categoriesWithOrdering = await Promise.all(
              fooditems.map(async (_item) => {
                
                // const ordertimeframe_cat= await this.orderTimeFrameService.findOrderTimeframe('category', _item._id.toString());
                const isOrderingAllowed_cat = await this.orderTimeFrameService.isOrderingAllowed('category', id);
                const ordertimeframe_food= await this.orderTimeFrameService.findOrderTimeframe('fooditems', _item._id.toString());
                const isOrderingAllowed_food = await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe_food);
                const isOrderingAllowed = isOrderingAllowed_cat && isOrderingAllowed_food;

                return {
                  ..._item, // Convert category to plain object
                  image: _item.image ? `${baseUrl}/${_item.image}` : null,
                  orderingStartTime:ordertimeframe_food?ordertimeframe_food.orderingStartTime:0,
                  orderingEndTime:ordertimeframe_food?ordertimeframe_food.orderingEndTime:0,
                  isOrderTimeFrameActive:ordertimeframe_food?ordertimeframe_food.isActive:false,
                  isOrderingAllowed, // Add the isOrderingAllowed field
                };
              }),
            );

            return categoriesWithOrdering;

        }catch(error){
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

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

                // // Extract the category name and use it as the filename
                // const categoryName = (req.body.name || 'default').replace(/\s+/g, '-').toLowerCase(); // Normalize name
                // const extension = extname(file.originalname); // Extract extension from the original file name
                // const filename = `${categoryName}${extension}`; // Generate the filename
                // callback(null, filename); // Use category name as filename

                // Generate a unique filename using UUID
                const extension = extname(file.originalname); // Extract file extension
                const uniqueFilename = `${uuidv4()}${extension}`; // Unique filename
                callback(null, uniqueFilename);
            }
        }),
        fileFilter: (req, file, callback) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
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
          console.log(createCategoryDto);
            const baseUrl = this.getBaseUrl();
            // Ensure the image path is set if an image file was uploaded
            const imagePath = image ? `${CategoriesController.imagePath}/${image.filename}` : null;
            
            // Save the category with the image path
            const catgory= await this.categoryService.create({
               ...createCategoryDto,
                image: imagePath
                });

              // check if stratTime or endTime is zero
              let ordertimeframe=null;
              if (
                createCategoryDto.orderingStartTime >= 0 &&
                createCategoryDto.orderingEndTime >= 0
              ) {
                ordertimeframe = await this.orderTimeFrameService.create({
                  orderingStartTime: createCategoryDto.orderingStartTime,
                  orderingEndTime: createCategoryDto.orderingEndTime,
                  isActive: createCategoryDto.isOrderTimeFrameActive,
                  applicableTo: 'category', // Indicating that this applies to the category
                  applicableId: catgory._id.toString(),
                });
              
                await ordertimeframe.save();
              }

                 
              return {
                ...catgory.toObject(),
                image:`${baseUrl}/${catgory.image}`,
                orderingStartTime:ordertimeframe?ordertimeframe.orderingStartTime:0,
                orderingEndTime:ordertimeframe?ordertimeframe.orderingEndTime:0,
                isOrderTimeFrameActive:ordertimeframe?ordertimeframe.isActive:false,
              };
        } catch (error) {
            throw new HttpException(
              error.message ||'Error creating category',
              error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // // Ensure the image is either set from the DTO or default to `null`
        // const categoryData = {
        //     ...createCategoryDto,
        //     image: imagePath  
        // };
        // return this.categoryService.create(categoryData);
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

            // // Extract the category name and use it as the filename
            // const categoryName = (req.body.name || 'default').replace(/\s+/g, '-').toLowerCase(); // Normalize name
            // const extension = extname(file.originalname); // Extract extension from the original file name
            // const filename = `${categoryName}${extension}`; // Generate the filename
            // callback(null, filename);

            // Generate a unique filename using UUID
            const extension = extname(file.originalname); // Extract file extension
            const uniqueFilename = `${uuidv4()}${extension}`; // Unique filename
            callback(null, uniqueFilename);
          },
        }),
        fileFilter: (req, file, callback) => {
            // Allow only images (jpg, jpeg, png)
            if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
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

            let imagePath = category.image;
            const baseUrl = this.getBaseUrl();

            // // If a new image is uploaded, process it and replace the old one
            // if (image) {
            //     // Simply use the image path generated by Multer
            //     imagePath = `${CategoriesController.imagePath}/${image.filename}`;
            // } 

            if (image) {
              // Delete the old image if it exists
              if (imagePath && fs.existsSync(imagePath)) {
                  fs.unlinkSync(imagePath);
              }

              // Use the new image path generated by Multer
              imagePath = `${CategoriesController.imagePath}/${image.filename}`;
            }

            const updateCatData={ ...updateCategoryDto, image: imagePath };
            let ordertimeframe=null;
            if (updateCategoryDto.orderingStartTime >=0 && updateCategoryDto.orderingEndTime >=0){
              ordertimeframe = {
                orderingStartTime: updateCategoryDto.orderingStartTime,
                orderingEndTime: updateCategoryDto.orderingEndTime,
                isActive: updateCategoryDto.isOrderTimeFrameActive,
                applicableTo: 'category',  
                applicableId: id,              
              };

              const existOrderTimeFrame = await this.orderTimeFrameModel.findOne({ applicableId: id });
              if (existOrderTimeFrame) {
                // ordering time frame already exists, update it
                ordertimeframe = await this.orderTimeFrameService.update(existOrderTimeFrame._id.toString(), ordertimeframe);
              } else {
                // no ordering time frame exists, create a new one
                ordertimeframe = await this.orderTimeFrameService.create(ordertimeframe);
              }

            }

            const updatedCat= await this.categoryService.update(id, updateCatData);
            return {
              ...updatedCat,
              image:`${baseUrl}/${updatedCat.image}`,
              orderingStartTime:ordertimeframe?ordertimeframe.orderingStartTime:0,
              orderingEndTime:ordertimeframe?ordertimeframe.orderingEndTime:0,
              isOrderTimeFrameActive:ordertimeframe?ordertimeframe.isActive:false,
            };


        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException(
                error.message ||'Error updating category', 
                error.status ||HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get()
    async findAll(@Req() req: Request) {
       
        try {
            const baseUrl = this.getBaseUrl();
            const categories = await this.categoryService.findAll();
            // return categories.map((category) => ({
            //   ...category,
            //   image: category.image ? `${baseUrl}/${category.image}` : null,
            // }));
             
            // Map through categories and add isOrderingAllowed for each
            const categoriesWithOrdering = await Promise.all(
              categories.map(async (_item) => {
                const ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('category', _item._id.toString());
                const isOrderingAllowed = await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe);
                return {
                  ..._item, // Convert category to plain object
                  image: _item.image ? `${baseUrl}/${_item.image}` : null,
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
            const baseUrl = this.getBaseUrl();
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
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException(
              error.message,
              error.status || HttpStatus.INTERNAL_SERVER_ERROR);
          }
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        try{
          return this.categoryService.remove(id);
        }catch(error){
          if (error instanceof NotFoundException) {
              throw error;
          }
          throw new HttpException(
            error.message || 'Error deleting category',
            error.status || HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
    }
}
