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
import { ProductsService } from './products.service';
import { CreateProductDto } from '../dtos/product.dto';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Controller('products')
@UseInterceptors(CacheInterceptor) // Apply caching to all routes in this controller
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    // Ensure CreateProductDto matches Product schema needs
    // Invalidate relevant caches
    await this.cacheManager.clear(); // Simple reset, or target specific keys
    return this.productsService.create(createProductDto); // No change here if createProductDto is good
  }

  @Get()
  @CacheKey('get_all_products')
  @CacheTTL(300)
  async findAll() {
    return this.productsService.findAll();
  }

  // To match your request for /product/product-name (using ID for uniqueness)
  // Changed from :productName to :productId for clarity and uniqueness.
  // If you truly want to use names, ensure they are URL-friendly (slugs).
  @Get(':productId')
  @CacheKey('get_product_by_id_') // Dynamic part will be appended by NestJS
  @CacheTTL(300) // Cache for 5 minutes (300 seconds)
  findOneById(@Param('productId') productId: string) {
    try {
      return this.productsService.findByMongoId(productId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // If you want to keep the :productName endpoint (less reliable than ID)
  @Get('name/:productName')
  @CacheKey('get_product_by_name_')
  @CacheTTL(300)
  findByProductName(@Param('productName') productName: string) {
    // Replace hyphens with spaces for lookup if your titles have spaces
    const actualProductName = productName.replace(/-/g, ' ');
    try {
      return this.productsService.findByTitle(actualProductName);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
