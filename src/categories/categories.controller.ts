import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoryService: CategoriesService) {}

    @Post()
    async create(@Body() createCategoryDto: CreateCategoryDto) {
        // Ensure the image is either set from the DTO or default to `null`
        const categoryData = {
            ...createCategoryDto,
            image: createCategoryDto.image ?? null,  
        };
        return this.categoryService.create(categoryData);
    }

    @Get()
    async findAll() {
        // Fetch all categories and ensure each has an `image` property
        const categories = await this.categoryService.findAll();
        return categories.map(category => ({
            ...category,
            image: category.image ?? null,  
        }));
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const category = await this.categoryService.findOne(id);
        return {
            ...category,
            image: category.image ?? null,  
        };
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
        // Ensure the `image` is either provided in the DTO or default to `null`
        const updatedData = {
            ...updateCategoryDto,
            image: updateCategoryDto.image ?? null,  
        };
        return this.categoryService.update(id, updatedData);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.categoryService.remove(id);
    }
}
