import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Menu } from './menus.model';
import { CreateMenuDto, UpdateMenuDto } from './dto';
import { OrderTimeFrameService } from '../ordertimeframe/ordertimeframe.service';
import { FoodItem } from '../fooditems/fooditems.model';
import { FoodItemsService } from '../fooditems/fooditems.service';

@Injectable()
export class MenusService {
  constructor(
    @InjectModel(Menu.name) private menuModel: Model<Menu>,
    private readonly orderTimeFrameService:OrderTimeFrameService,
    private readonly fooditemService: FoodItemsService,
  ) {}

  async create(createMenuDto: CreateMenuDto): Promise<Menu> {
    try{
      
      const createdMenu = new this.menuModel(createMenuDto);
      // Save the menu
      const savedMenu = await createdMenu.save();

      // Populate the foodItems field
      await savedMenu.populate('foodItems');

      return savedMenu;
    }catch(error){
      throw new Error(`Error creating menu: ${error.message}`);
    }
  }

  async update(id: string, updateMenuDto: UpdateMenuDto): Promise<Menu> {
    // Filter out null or undefined values from updateMenuDto
    const filteredUpdate = Object.fromEntries(
      Object.entries(updateMenuDto).filter(([_, value]) => value !== null && value !== undefined)
    );
  
    // Update the document with filtered values
    const existingMenu = await this.menuModel
      .findByIdAndUpdate(id, filteredUpdate, { new: true, lean: true })
      .populate('foodItems')
      .exec();
  
    if (!existingMenu) {
      throw new NotFoundException(`Menu #${id} not found`);
    }
  
    return existingMenu;
  }

  async findAll(): Promise<Menu[]> {
    try{
      return await this.menuModel.find().populate('foodItems').exec();
    }catch (error) {
      throw new Error(`Error fetching menus: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<Menu> {
    const menu = await this.menuModel.findById(id).populate('foodItems').lean().exec();
    if (!menu) {
      throw new NotFoundException(`Menu #${id} not found`);
    }
    return menu;
  }

  async findByFields(filters: Record<string, any>): Promise<Menu[]> {
    // const foodItems = await this.foodItemModel.find(filters).populate('category').exec();
    const menus = await this.menuModel.find(filters).populate('foodItems').lean().exec();
    if (menus.length === 0) {
        throw new NotFoundException(`No Menus found with the given filters: ${JSON.stringify(filters)}`);
    }
    return menus;
  }

  async findFoodItems(id:string):Promise<FoodItem[]>{
    const menu = await this.menuModel.findById(id).populate('foodItems').lean().exec();
    if (!menu) {
      throw new NotFoundException(`Menu #${id} not found`);
    }
    return menu.foodItems;
  }
  
  // async addFoodItemToMenu(menuId: string, foodItemId: string): Promise<Menu> {
  //   const menu = await this.menuModel.findById(menuId);
  //   if (!menu) {
  //     throw new NotFoundException(`Menu with ID ${menuId} not found`);
  //   }

  //   // Convert foodItemId to ObjectId
  //   const foodItemObjectId = new Types.ObjectId(foodItemId);

  //   // Avoid duplicate food items
  //   if (!menu.foodItems.includes(foodItemObjectId)) {
  //     menu.foodItems.push(foodItemObjectId);
  //   }

  //   return menu.save();
  // }

  async findByPage(page: number, limit: number): Promise<{ menus: Menu[]; total: number }> {
    try {
        // Calculate the number of documents to skip
        const skip = (page - 1) * limit;

        // Fetch the categories with pagination
        const [menus, total] = await Promise.all([
            this.menuModel.find().populate('foodItems').skip(skip).limit(limit).lean().exec(),
            this.menuModel.countDocuments().exec(),
        ]);

        // Return paginated data along with the total count
        return {
          menus,
          total,
        };
    } catch (error) {
        throw new Error(`Error fetching categories: ${error.message}`);
    }
  }
  
  async remove(id: string): Promise<Menu> {
    try{
       // delete associate OrderTimeFrame
      this.orderTimeFrameService.remove('category',id);

      const deletedMenu = await this.menuModel.findByIdAndDelete(id).exec();
      if (!deletedMenu) {
        throw new NotFoundException(`Menu #${id} not found`);
      }
      return deletedMenu;
    }catch(error){
      throw new Error('Error deleting menu');
    }
  }
}
