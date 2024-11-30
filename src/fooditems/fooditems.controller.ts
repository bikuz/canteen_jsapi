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
import { v4 as uuidv4 } from 'uuid';

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
                // // Extract the fooditem name and use it as the filename
                // const fooditemName = (req.body.name || 'default').replace(/\s+/g, '-').toLowerCase(); // Normalize name
                // const extension = extname(file.originalname); // Extract extension from the original file name
                // const filename = `${fooditemName}${extension}`; // Generate the filename
                // callback(null, filename); // Use fooditem name as filename

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
             let ordertimeframe=null;
             if (
                createFoodItemDto.orderingStartTime > 0 &&
                createFoodItemDto.orderingEndTime > 0
              ) {
                const ordertimeframe = await this.orderTimeFrameService.create({
                  orderingStartTime: createFoodItemDto.orderingStartTime,
                  orderingEndTime: createFoodItemDto.orderingEndTime,
                  isActive: createFoodItemDto.isOrderTimeFrameActive,
                  applicableTo: 'fooditem', // Indicating that this applies to the category
                  applicableId: fooditem._id.toString(),
                });
              
                await ordertimeframe.save();
              }

            return {
                ...fooditem.toObject(),
                image:`${baseUrl}/${fooditem.image}`,
                orderingStartTime:ordertimeframe?ordertimeframe.orderingStartTime:0,
                orderingEndTime:ordertimeframe?ordertimeframe.orderingEndTime:0,
                isOrderTimeFrameActive:ordertimeframe?ordertimeframe.isActive:false,
            };

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

            // // Extract the fooditem name and use it as the filename
            // const fooditemName = (req.body.name || 'default').replace(/\s+/g, '-').toLowerCase(); // Normalize name
            // const extension = extname(file.originalname); // Extract extension from the original file name
            // const filename = `${fooditemName}${extension}`; // Generate the filename
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

             if (image) {
              // Delete the old image if it exists
              if (imagePath && fs.existsSync(imagePath)) {
                  fs.unlinkSync(imagePath);
              }

              // Use the new image path generated by Multer
              imagePath = `${FooditemsController.imagePath}/${image.filename}`;
            }

            const updateFooditem={ ...updateFoodItemDto, image: imagePath };
            let ordertimeframe=null;
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
                ordertimeframe = await this.orderTimeFrameService.update(existOrderTimeFrame._id.toString(), orderingTimeframeData);
              } else {
                // no ordering time frame exists, create a new one
                ordertimeframe = await this.orderTimeFrameService.create(orderingTimeframeData);
              }

            }

            const updatedfood= await this.foodItemService.update(id, updateFooditem);

            return {
                ...updatedfood,
                image:`${baseUrl}/${updatedfood.image}`,
                orderingStartTime:ordertimeframe?ordertimeframe.orderingStartTime:0,
                orderingEndTime:ordertimeframe?ordertimeframe.orderingEndTime:0,
                isOrderTimeFrameActive:ordertimeframe?ordertimeframe.isActive:false,
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

    @Get()
    async findAll(@Req() req: Request) {
        try {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const fooditems = await this.foodItemService.findAll();

            const fooditemWithOrdering = await Promise.all(
                fooditems.map(async (_item) => {
                  let ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('fooditem', _item._id.toString());
                  let isOrderingAllowed = await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe);
                  if(isOrderingAllowed){
                      //check if it is disabled through category
                      ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('category', _item.category.toString());
                      isOrderingAllowed = await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe);
                  }
                  return {
                      ..._item,  
                      image: _item.image ? `${baseUrl}/${_item.image}` : null,
                      orderingStartTime:ordertimeframe?ordertimeframe.orderingStartTime:0,
                      orderingEndTime:ordertimeframe?ordertimeframe.orderingEndTime:0,
                      isOrderTimeFrameActive:ordertimeframe?ordertimeframe.isActive:false,
                      isOrderingAllowed,  
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

            let ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('fooditem', id);
            // Call OrderingTimeframeService to check if ordering is allowed for this category
            let isOrderingAllowed=await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe);
            if(isOrderingAllowed){
                //check if it is disabled through category
                ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('category', fooditem.category.toString());
                isOrderingAllowed = await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe);
            }
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

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const {fooditems,total} = await this.foodItemService.findByPage(pageNumber,limitNumber);
        
        const foodItemWithOrdering = await Promise.all(
            fooditems.map(async (_item) => {
            let ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('fooditem', _item._id.toString());
            let isOrderingAllowed = await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe);
            if(isOrderingAllowed){
                //check if it is disabled through category
                ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('category', _item.category.toString());
                isOrderingAllowed = await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe);
            }
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
        
        return {fooditems:foodItemWithOrdering,total};

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


