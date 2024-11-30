import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Controller, Get, Post, Body, Param, Put, Patch, Delete } from '@nestjs/common';
import { UploadedFile, UseInterceptors, Req, HttpException, NotFoundException, HttpStatus } from '@nestjs/common';

import { MenusService } from './menus.service';
import { CreateMenuDto, UpdateMenuDto } from './dto';
import { OrderTimeFrame } from '../ordertimeframe/ordertimeframe.model';
import { OrderTimeFrameService } from '../ordertimeframe/ordertimeframe.service';
import { FoodItemsService } from '../fooditems/fooditems.service';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';

// FoodItem.find({ tags: { $in: ['vegan', 'gluten-free'] } });
// This would allow you to find food items that are either vegan or gluten-free.
@Controller('menus')
export class MenusController {
  // private static readonly imagePath = 'assets/images/menus'; 

  constructor(
    private readonly menusService: MenusService,
    private readonly foodItemService: FoodItemsService,
    // private readonly orderTimeFrameService:OrderTimeFrameService,
    // @InjectModel(OrderTimeFrame.name) private orderTimeFrameModel: Model<OrderTimeFrame>,
  ) {}

  @Post()
async create(
    @Body() createMenuDto: CreateMenuDto,
    @Req() req: Request
) {
  try {
    // console.log('Raw DTO:', createMenuDto);    
    const menu = await this.menusService.create(createMenuDto);

    return {
      ...menu.toObject(),
    };
  } catch (error) {
    throw new HttpException(
      error.message,
      error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateMenuDto: UpdateMenuDto,
    // @UploadedFile() image?: Express.Multer.File,
  ) {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const menu = await this.menusService.findOne(id);
        if (!menu) {
            throw new HttpException('Menu not found', HttpStatus.NOT_FOUND);
        }

        // let imagePath = menu.image;;
        // const baseUrl = `${req.protocol}://${req.get('host')}`;

        // If a new image is uploaded, process it and replace the old one
        // if (image) {
        //     // Simply use the image path generated by Multer
        //     imagePath = `${MenusController.imagePath}/${image.filename}`;
        // } 

        const updateMenu={
            ...updateMenuDto, 
            //  image: imagePath 
            };

        const updatedMenu= await this.menusService.update(id, updateMenu);
       
        if (updatedMenu.foodItems && Array.isArray(updatedMenu.foodItems)) {
            updatedMenu.foodItems.forEach(foodItem => {
                if (foodItem.image) {
                    // Prepend baseUrl to food item's image URL
                    foodItem.image = `${baseUrl}/${foodItem.image}`;
                }
            });
        }
         
        return updatedMenu;

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
        const menus= await this.menusService.findAll();

        // // Process each menu
        // await Promise.all(menus.map(async (menu) => {
        //     if (menu.foodItems && Array.isArray(menu.foodItems)) {
        //     // Fetch foodItems details from foodItemService and prepend the image base URL
        //     menu.foodItems = await Promise.all(menu.foodItems.map(async (fid) => {
        //         const foodItem = await this.foodItemService.findOne(fid.toString());
                
        //         // If the foodItem has an image, prepend the base URL
        //         if (foodItem.image) {
        //         foodItem.image = `${baseUrl}${foodItem.image}`;
        //         }
    
        //         return foodItem;  // Return the full foodItem object
        //     }));
        //     }
        // }));
        menus.forEach(menu => {
            if (menu.foodItems && Array.isArray(menu.foodItems)) {
              menu.foodItems.forEach(foodItem => {
                if (foodItem.image) {
                  // Prepend baseUrl to food item's image URL
                  foodItem.image = `${baseUrl}/${foodItem.image}`;
                }
              });
            }
          });

        
        return menus;  // Return the updated menus

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
      const menu = await this.menusService.findOne(id);
      if (!menu) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }
      
      
        if (menu.foodItems && Array.isArray(menu.foodItems)) {
          menu.foodItems.forEach(foodItem => {
            if (foodItem.image) {
              // Prepend baseUrl to food item's image URL
              foodItem.image = `${baseUrl}/${foodItem.image}`;
            }
          });
        }
     

      return {
        ...menu,
        // image: menu.image ? `${baseUrl}/${menu.image}` : null,
      };
    } catch (error) {
        if (error instanceof NotFoundException) {
            throw error;
        }
        throw new HttpException(error.message,
            error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

//   @Get('/:id/fooditems')
//   async fooditemsByMenu(@Param('id') id: string){
//       // here id belongs to menu id
//       try{
//           return await this.menusService.findFoodItems(id);
//       }catch(error){
//           if (error instanceof NotFoundException) {
//               throw error;
//           }
//           throw new HttpException(
//               error.message,
//               error.status || HttpStatus.INTERNAL_SERVER_ERROR);
//       }
//   }

    @Get('day/:day/fooditems')
    async fooditemsByDay(
        @Param('day') day: string,
        @Req() req: Request
    ) {
        try {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            // Use the findByFields service to find menus where repeatDay contains the provided day
            const menus = await this.menusService.findByFields({
                repeatDay: { $in: [day] },  // Check if the day exists in repeatDay array
            });

            if (menus.length === 0) {
                // throw new NotFoundException(`No menus found for the day "${day}"`);
                return [];
            }

            // Combine foodItems from all matching menus into a single array
            const foodItems = menus.reduce((acc, menu) => {
                if (menu.foodItems && Array.isArray(menu.foodItems)) {
                    acc.push(...menu.foodItems);  // Add foodItems to the accumulator
                }
                return acc;
            }, []);  // Start with an empty array

            // Ensure unique food items by their _id
            const uniqueFoodItems = Array.from(
                new Map(foodItems.map(item => [item._id, item])).values()
            );
            
            // Prepend baseUrl to each foodItem's image URL if it exists
            uniqueFoodItems.forEach(foodItem => {
                if (foodItem.image) {
                foodItem.image = `${baseUrl}/${foodItem.image}`;
                }
            });

            return uniqueFoodItems;
        } catch (error) {
            return [];
            
        }
    }

    @Get('today/fooditems')
    async fooditemsToday(
        @Req() req: Request
    ) {
        try {
            let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            let todayIndex = new Date().getDay();
            let today = days[todayIndex];

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            // Use the findByFields service to find menus where repeatDay contains the provided day
            const menus = await this.menusService.findByFields({
                repeatDay: { $in: [today] },  // Check if the day exists in repeatDay array
            });

            if (menus.length === 0) {
                // throw new NotFoundException(`No menus found for the day "${day}"`);
                return [];
            }

            // Combine foodItems from all matching menus into a single array
            const foodItems = menus.reduce((acc, menu) => {
                if (menu.foodItems && Array.isArray(menu.foodItems)) {
                    acc.push(...menu.foodItems);  // Add foodItems to the accumulator
                }
                return acc;
            }, []);  // Start with an empty array

            // Ensure unique food items by their _id
            const uniqueFoodItems = Array.from(
                new Map(foodItems.map(item => [item._id, item])).values()
            );
            
            // Prepend baseUrl to each foodItem's image URL if it exists
            uniqueFoodItems.forEach(foodItem => {
                if (foodItem.image) {
                foodItem.image = `${baseUrl}/${foodItem.image}`;
                }
            });

            return uniqueFoodItems;
        } catch (error) {
            return [];
            
        }
    }

    @Get('today/fooditems/category/:categoryId')
    async fooditemsTodayByCategory(
        @Req() req: Request,
        @Param('categoryId') categoryId: string // Extract categoryId from the route parameter
    ) {
        try {
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const todayIndex = new Date().getDay();
            const today = days[todayIndex];

            const baseUrl = `${req.protocol}://${req.get('host')}`;

            // Step 1: Get all food items for the given category
            const allFoodItems = await this.foodItemService.findByFields({
                category: categoryId,
            });

            if (!allFoodItems || allFoodItems.length === 0) {
                return [];
            }

            // Step 2: Get all menus where repeatDay contains today
            const menus = await this.menusService.findByFields({
                repeatDay: { $in: [today] },
            });

            const todayFoodItemIds = new Set(
                menus.flatMap(menu => menu.foodItems.map(item => item._id.toString()))
            );

            // console.log(todayFoodItemIds);
            // Step 3: Mark availability for each food item
            const foodItemsWithAvailability = allFoodItems.map(foodItem => {
                const isAvailable = todayFoodItemIds.has(foodItem._id.toString());
                return {
                    ...foodItem,
                    isAvailable,
                    image: foodItem.image ? `${baseUrl}/${foodItem.image}` : null, // Add base URL for image
                };
            });

            return foodItemsWithAvailability;
        } catch (error) {
            console.error('Error fetching food items by category:', error);
            return [];
        }
    }


    // @Post('/:id/add-food-item/:fooditemid')
    // async addFooditemToMenu(
    //     @Param('id') menuId: string,
    //     @Param('fooditemid') foodItemId:string
    // ){
    //     try {
    //         return await this.menusService.addFoodItemToMenu(menuId, foodItemId);
    //     } catch (error) {
    //         throw new HttpException(
    //         error.message || 'Error adding food item to menu',
    //         error.status || HttpStatus.BAD_REQUEST,
    //         );
    //     }
    // }


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
      const {menus,total} = await this.menusService.findByPage(pageNumber,limitNumber);
      
      menus.forEach(menu => {
        if (menu.foodItems && Array.isArray(menu.foodItems)) {
          menu.foodItems.forEach(foodItem => {
            if (foodItem.image) {
              // Prepend baseUrl to food item's image URL
              foodItem.image = `${baseUrl}/${foodItem.image}`;
            }
          });
        }
      });

  

      return {menus:menus,total};

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
        return await this.menusService.remove(id);
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
