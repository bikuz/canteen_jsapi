import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Menu } from './menus.model';
import { CreateMenuDto, UpdateMenuDto } from './dto';

@Injectable()
export class MenusService {
  constructor(@InjectModel(Menu.name) private menuModel: Model<Menu>) {}

  async create(createMenuDto: CreateMenuDto): Promise<Menu> {
    const createdMenu = new this.menuModel(createMenuDto);
    return createdMenu.save();
  }

  async findAll(): Promise<Menu[]> {
    return this.menuModel.find().populate('foodItems').exec();
  }

  async findOne(id: string): Promise<Menu> {
    const menu = await this.menuModel.findById(id).populate('foodItems').exec();
    if (!menu) {
      throw new NotFoundException(`Menu #${id} not found`);
    }
    return menu;
  }

  async update(id: string, updateMenuDto: UpdateMenuDto): Promise<Menu> {
    const existingMenu = await this.menuModel.findByIdAndUpdate(id, updateMenuDto, { new: true }).exec();
    if (!existingMenu) {
      throw new NotFoundException(`Menu #${id} not found`);
    }
    return existingMenu;
  }

  async remove(id: string): Promise<Menu> {
    const deletedMenu = await this.menuModel.findByIdAndDelete(id).exec();
    if (!deletedMenu) {
      throw new NotFoundException(`Menu #${id} not found`);
    }
    return deletedMenu;
  }
}
