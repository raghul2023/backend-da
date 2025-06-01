import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category, CategorySchema } from '../schemas/category.schema';
import { ProductsModule } from '../products/products.module';
import { Product, ProductSchema } from '../schemas/product.schema';
// Removed ProductsModule import from here if not strictly needed by service for direct product ops
// If CategoriesService needs to directly operate on ProductModel, it can be imported.
// For now, ProductsService handles product creation and CategoriesService handles linking.

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Product.name, schema: ProductSchema }
    ]),
    forwardRef(() => ProductsModule)
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService], // Export for ProductsService
})
export class CategoriesModule {}
