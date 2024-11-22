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

@Controller('menus')
export class MenusController {
  private static readonly imagePath = 'assets/images/menus'; 

  constructor(
    private readonly menusService: MenusService,
    
    private readonly orderTimeFrameService:OrderTimeFrameService,
    @InjectModel(OrderTimeFrame.name) private orderTimeFrameModel: Model<OrderTimeFrame>,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('image',{
      storage:diskStorage({
          destination:(req, file, callback)=>{
              if (!fs.existsSync(MenusController.imagePath)) {
                  fs.mkdirSync(MenusController.imagePath, { recursive: true }); // Create directory if it doesn't exist
              }
              callback(null, MenusController.imagePath);
          },
          filename:(req, file, callback)=>{
              // Extract the menu name and use it as the filename
              const menuName = (req.body.name || 'default').replace(/\s+/g, '-').toLowerCase(); // Normalize name
              const extension = extname(file.originalname); // Extract extension from the original file name
              const filename = `${menuName}${extension}`; // Generate the filename
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
    @Body() createMenuDto: CreateMenuDto,
    @UploadedFile() image: Express.Multer.File,
    @Req() req: Request
  ) {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      // Ensure the image path is set if an image file was uploaded
      const imagePath = image ? `${MenusController.imagePath}/${image.filename}` : null;
      
      // Save the category with the image path
      const menu = await this.menusService.create({
          ...createMenuDto,
          image: imagePath
      });

       // check if stratTime or endTime is zero
       if (
        createMenuDto.orderingStartTime > 0 &&
        createMenuDto.orderingEndTime > 0
        ) {
          const orderingTimeframe = await this.orderTimeFrameService.create({
            orderingStartTime: createMenuDto.orderingStartTime,
            orderingEndTime: createMenuDto.orderingEndTime,
            isActive: createMenuDto.isOrderTimeFrameActive,
            applicableTo: 'menu', // Indicating that this applies to the category
            applicableId: menu._id.toString(),
          });
        
          await orderingTimeframe.save();
        }

      return {...menu.toObject(),image:`${baseUrl}/${menu.image}`};

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
          
          if (!fs.existsSync(MenusController.imagePath)) {
            fs.mkdirSync(MenusController.imagePath, { recursive: true });
          }
          callback(null, MenusController.imagePath);
        },
        filename: (req, file, callback) => {

          // Extract the menu name and use it as the filename
          const menuName = (req.body.name || 'default').replace(/\s+/g, '-').toLowerCase(); // Normalize name
          const extension = extname(file.originalname); // Extract extension from the original file name
          const filename = `${menuName}${extension}`; // Generate the filename
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
    @Body() updateMenuDto: UpdateMenuDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    try {
      const menu = await this.menusService.findOne(id);
      if (!menu) {
          throw new HttpException('Menu not found', HttpStatus.NOT_FOUND);
      }

      let imagePath = menu.image;;
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      // If a new image is uploaded, process it and replace the old one
      if (image) {
          // Simply use the image path generated by Multer
          imagePath = `${MenusController.imagePath}/${image.filename}`;
      } 

      const updateMenu={ ...updateMenuDto, image: imagePath };

      if (updateMenuDto.orderingStartTime >0 && updateMenuDto.orderingEndTime > 0){
        const orderingTimeframeData = {
          orderingStartTime: updateMenuDto.orderingStartTime,
          orderingEndTime: updateMenuDto.orderingEndTime,
          isActive: updateMenuDto.isOrderTimeFrameActive,
          applicableTo: 'menu',  
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

      const updatedmenu= await this.menusService.update(id, updateMenu);

      return {...updatedmenu,image:`${baseUrl}/${updatedmenu.image}`};

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
      const menus = await this.menusService.findAll();

      const menuWithOrdering = await Promise.all(
        menus.map(async (_item) => {
          const ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('fooditem', _item._id.toString());
          const isOrderingAllowed = await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe);
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

      return menuWithOrdering;
      
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

      const ordertimeframe= await this.orderTimeFrameService.findOrderTimeframe('category', id);
      // Call OrderingTimeframeService to check if ordering is allowed for this category
      const isOrderingAllowed=await this.orderTimeFrameService.isOrderingAllowed(ordertimeframe);
      
      return {
        ...menu,
        image: menu.image ? `${baseUrl}/${menu.image}` : null,
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

  @Get('/:id/fooditems')
  async fooditemsByMenu(@Param('id') id: string){
      // here id belongs to menu id
      try{
          return await this.menusService.findFoodItems(id);
      }catch(error){
          if (error instanceof NotFoundException) {
              throw error;
          }
          throw new HttpException(
              error.message,
              error.status || HttpStatus.INTERNAL_SERVER_ERROR);
      }
  }

  @Post('/:id/add-food-item/:fooditemid')
  async addFooditemToMenu(
    @Param('id') menuId: string,
    @Param('fooditemid') foodItemId:string
  ){
    try {
      return await this.menusService.addFoodItemToMenu(menuId, foodItemId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Error adding food item to menu',
        error.status || HttpStatus.BAD_REQUEST,
      );
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
