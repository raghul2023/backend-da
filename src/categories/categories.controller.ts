import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dtos/category.dto';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post('test')
  async testCreate(@Body() body: any) {
    console.log('=== TEST ENDPOINT ===');
    console.log('Received body:', body);
    console.log('Body type:', typeof body);
    console.log('Body keys:', Object.keys(body || {}));
    
    // Test DTO validation manually
    const dto = new CreateCategoryDto();
    dto.name = body.name;
    console.log('Created DTO:', dto);
    
    return {
      success: true,
      receivedBody: body,
      createdDto: dto,
      message: 'Test endpoint working'
    };
  }

  @Post()
  async create(@Body() body: any) {
    try {
      console.log('=== Creating category ===');
      console.log('Received body:', body);
      console.log('Body type:', typeof body);
      console.log('Body properties:', Object.keys(body || {}));
      
      // Validate manually for now
      if (!body || !body.name) {
        throw new HttpException('Name is required', HttpStatus.BAD_REQUEST);
      }

      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        throw new HttpException('Name must be a non-empty string', HttpStatus.BAD_REQUEST);
      }

      const createCategoryDto: CreateCategoryDto = {
        name: body.name.trim()
      };
      
      const category = await this.categoriesService.create(createCategoryDto);
      
      await this.cacheManager.del('all_categories_with_products');
      return category;
    } catch (error) {
      console.error('Error creating category:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @CacheKey('all_categories_with_products')
  @CacheTTL(300)
  findAllWithProducts() {
    return this.categoriesService.findAllWithProducts();
  }

  @Get(':categoryName')
  @CacheKey('category_products_')
  @CacheTTL(300)
  getProductsForCategory(@Param('categoryName') categoryName: string) {
    try {
      const decodedCategoryName = decodeURIComponent(categoryName);
      return this.categoriesService.getProductsForCategory(decodedCategoryName);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    try {
      const updatedCategory = await this.categoriesService.update(id, updateCategoryDto);
      await this.cacheManager.del('all_categories_with_products');
      if (updateCategoryDto.name) {
        await this.cacheManager.del(`category_products_${updateCategoryDto.name}`);
      }
      return updatedCategory;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.categoriesService.remove(id);
      await this.cacheManager.del('all_categories_with_products');
      return { message: 'Category deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
