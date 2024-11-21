import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Controller, Get, Post, Body, Param, Put, Patch, Delete } from '@nestjs/common';
import { UploadedFile, UseInterceptors, Req, HttpException, NotFoundException, HttpStatus } from '@nestjs/common';

import { FoodItemsService } from './fooditems.service';
import { CreateFoodItemDto, UpdateFoodItemDto } from './dto';
import { OrderTimeFrame } from '../ordertimeframe/ordertimeframe.model';
import { OrderTimeFrameService } from '../ordertimeframe/ordertimeframe.service';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';

@Controller('fooditems')
export class FooditemsController {
    private static readonly imagePath = 'assets/images/fooditems'; 

    constructor(
        private readonly foodItemService: FoodItemsService,
        private readonly orderTimeFrameService:OrderTimeFrameService,
        @InjectModel(OrderTimeFrame.name) private orderTimeFrameModel: Model<OrderTimeFrame>,
    ){}

   

    @Post()
    @UseInterceptors(FileInterceptor('image',{
        storage:diskStorage({
            destination:(req, file, callback)=>{
                if (!fs.existsSync(FooditemsController.imagePath)) {
                    fs.mkdirSync(FooditemsController.imagePath, { recursive: true }); // Create directory if it doesn't exist
                }
                callback(null, FooditemsController.imagePath);
            },
            filename:(req, file, callback)=>{
                // Extract the fooditem name and use it as the filename
                const fooditemName = (req.body.name || 'default').replace(/\s+/g, '-').toLowerCase(); // Normalize name
                const extension = extname(file.originalname); // Extract extension from the original file name
                const filename = `${fooditemName}${extension}`; // Generate the filename
                callback(null, filename); // Use fooditem name as filename
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
        @Body() createFoodItemDto: CreateFoodItemDto,
        @UploadedFile() image: Express.Multer.File,
        @Req() req: Request
    ) {
        try {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            // Ensure the image path is set if an image file was uploaded
            const imagePath = image ? `${FooditemsController.imagePath}/${image.filename}` : null;
            
            // Save the category with the image path
            const fooditem = await this.foodItemService.create({
                ...createFoodItemDto,
                image: imagePath
            });

             // check if stratTime or endTime is zero
             if (
                createFoodItemDto.orderingStartTime > 0 &&
                createFoodItemDto.orderingEndTime > 0
              ) {
                const orderingTimeframe = await this.orderTimeFrameService.create({
                  orderingStartTime: createFoodItemDto.orderingStartTime,
                  orderingEndTime: createFoodItemDto.orderingEndTime,
                  isActive: createFoodItemDto.isOrderTimeFrameActive,
                  applicableTo: 'fooditem', // Indicating that this applies to the category
                  applicableId: fooditem._id.toString(),
                });
              
                await orderingTimeframe.save();
              }

            return {...fooditem.toObject(),image:`${baseUrl}/${fooditem.image}`};

        } catch (error) {
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    @Patch(':id')
    @UseInterceptors(FileInterceptor('image', {
        storage: diskStorage({
          destination: (req, file, callback) => {
            
            if (!fs.existsSync(FooditemsController.imagePath)) {
              fs.mkdirSync(FooditemsController.imagePath, { recursive: true });
            }
            callback(null, FooditemsController.imagePath);
          },
          filename: (req, file, callback) => {

            // Extract the fooditem name and use it as the filename
            const fooditemName = (req.body.name || 'default').replace(/\s+/g, '-').toLowerCase(); // Normalize name
            const extension = extname(file.originalname); // Extract extension from the original file name
            const filename = `${fooditemName}${extension}`; // Generate the filename
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
        @Body() updateFoodItemDto: UpdateFoodItemDto,
        @UploadedFile() image?: Express.Multer.File,
    ) {
        try {
            const fooditem = await this.foodItemService.findOne(id);
            if (!fooditem) {
                throw new HttpException('FoodItem not found', HttpStatus.NOT_FOUND);
            }

            let imagePath = fooditem.image;;
            const baseUrl = `${req.protocol}://${req.get('host')}`;

            // If a new image is uploaded, process it and replace the old one
            if (image) {
                // Simply use the image path generated by Multer
                imagePath = `${FooditemsController.imagePath}/${image.filename}`;
            } 

            const updateFooditem={ ...updateFoodItemDto, image: imagePath };

            if (updateFoodItemDto.orderingStartTime >0 && updateFoodItemDto.orderingEndTime > 0){
              const orderingTimeframeData = {
                orderingStartTime: updateFoodItemDto.orderingStartTime,
                orderingEndTime: updateFoodItemDto.orderingEndTime,
                isActive: updateFoodItemDto.isOrderTimeFrameActive,
                applicableTo: 'fooditem',  
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

            const updatedCat= await this.foodItemService.update(id, updateFooditem);

            return {...updatedCat,image:`${baseUrl}/${updatedCat.image}`};

        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get()
    async findAll(@Req() req: Request) {
        try {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const fooditems = await this.foodItemService.findAll();

            // Map through categories and add isOrderingAllowed for each
            const fooditemWithOrdering = await Promise.all(
                fooditems.map(async (_item) => {
                const ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('fooditem', _item._id.toString());
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

            return fooditemWithOrdering;
            
        } catch (error) {
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':id')
    async findOne(@Param('id') id: string,@Req() req: Request) {
        try {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const fooditem = await this.foodItemService.findOne(id);
            if (!fooditem) {
              throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
            }

            const ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('category', id);
            // Call OrderingTimeframeService to check if ordering is allowed for this category
            const isOrderingAllowed=await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe);
            
            return {
              ...fooditem,
              image: fooditem.image ? `${baseUrl}/${fooditem.image}` : null,
              orderingStartTime:ordertimeframe?ordertimeframe.orderingStartTime:0,
              orderingEndTime:ordertimeframe?ordertimeframe.orderingEndTime:0,
              isOrderTimeFrameActive:ordertimeframe?ordertimeframe.isActive:false,
              isOrderingAllowed
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException(error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        try {
            return await this.foodItemService.remove(id);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
