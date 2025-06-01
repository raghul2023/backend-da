import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from '../dtos/category.dto';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Controller() // Keep empty for `/categories` and `/category/:categoryname`
@UseInterceptors(CacheInterceptor)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post('categories') // POST /categories
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const category = this.categoriesService.create(createCategoryDto);
    // Invalidate cache
    await this.cacheManager.del('all_categories_with_products');
    return category;
  }

  @Get('categories') // GET /categories
  @CacheKey('all_categories_with_products')
  @CacheTTL(300) // Cache for 5 minutes
  findAllWithProducts() {
    return this.categoriesService.findAllWithProducts();
  }

  // Route changed from /category/:categoryname to /categories/:categoryName
  // for consistency and RESTful practice.
  @Get('categories/:categoryName') // GET /categories/T-Shirts
  @CacheKey('category_products_') // Dynamic part will be appended by NestJS
  @CacheTTL(300)
  getProductsForCategory(@Param('categoryName') categoryName: string) {
    try {
      // URL decode categoryName if it might contain encoded characters like %20 for space
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
}
