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
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from '../dtos/product.dto';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Controller('products')
@UseInterceptors(CacheInterceptor)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post() // POST /api/products
  async create(@Body() createProductDto: CreateProductDto) {
    try {
      await this.cacheManager.clear();
      return this.productsService.create(createProductDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get() // GET /api/products
  @CacheKey('get_all_products')
  @CacheTTL(300)
  async findAll() {
    return this.productsService.findAll();
  }

  @Get(':productId') // GET /api/products/:productId
  @CacheKey('get_product_by_id_')
  @CacheTTL(300)
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

  @Get('name/:productName') // GET /api/products/name/:productName
  @CacheKey('get_product_by_name_')
  @CacheTTL(300)
  findByProductName(@Param('productName') productName: string) {
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

  @Put(':productId') // PUT /api/products/:productId
  async update(@Param('productId') productId: string, @Body() updateProductDto: UpdateProductDto) {
    try {
      const updatedProduct = await this.productsService.update(productId, updateProductDto);
      await this.cacheManager.del('get_all_products');
      await this.cacheManager.del(`get_product_by_id_${productId}`);
      if (updateProductDto.title) {
        const slugName = updateProductDto.title.replace(/\s+/g, '-');
        await this.cacheManager.del(`get_product_by_name_${slugName}`);
      }
      return updatedProduct;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':productId') // DELETE /api/products/:productId
  async remove(@Param('productId') productId: string) {
    try {
      await this.productsService.remove(productId);
      await this.cacheManager.del('get_all_products');
      await this.cacheManager.del(`get_product_by_id_${productId}`);
      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
