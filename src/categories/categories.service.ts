import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from '../schemas/category.schema';
import { CreateCategoryDto } from '../dtos/category.dto';
import { ProductDto } from '../dtos/product.dto';
import { Product, ProductDocument } from '../schemas/product.schema';

export interface CategoryWithProductsDto {
  _id: Types.ObjectId;
  name: string;
  products: ProductDto[];
  createdAt: Date;
  updatedAt: Date;
}

interface LeanCategory {
  _id: Types.ObjectId;
  name: string;
  products: any[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  private transformProductToDto(product: any): ProductDto {
    if (!product) {
      return {
        id: '',
        title: '',
        description: '',
        category: '',
        price: 0,
        availableSizes: [],
        variants: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    const plainProduct = product.toJSON ? product.toJSON() : product;
    return {
      ...plainProduct,
      createdAt: product.createdAt || new Date(),
      updatedAt: product.updatedAt || new Date(),
      variants: Array.isArray(product.variants) 
        ? product.variants.map(variant => ({
            color: variant.color,
            images: variant.images,
            stock: {
              stock: variant.stock?.stock instanceof Map 
                ? Object.fromEntries(variant.stock.stock)
                : variant.stock?.stock || {}
            }
          }))
        : []
    };
  }

  private transformToDto(category: LeanCategory): CategoryWithProductsDto {
    return {
      _id: category._id,
      name: category.name,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      products: Array.isArray(category.products) 
        ? category.products.map(product => this.transformProductToDto(product))
        : [],
    };
  }

  async findAllWithProducts(): Promise<CategoryWithProductsDto[]> {
    const categories = await this.categoryModel
      .find()
      .populate<{ products: ProductDocument[] }>('products')
      .lean()
      .exec();
    return categories.map(category => this.transformToDto(category as LeanCategory));
  }

  async findByName(name: string): Promise<CategoryDocument> {
    const category = await this.categoryModel
      .findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })
      .exec();
    if (!category) {
      throw new NotFoundException(`Category "${name}" not found`);
    }
    return category;
  }

  async getProductsForCategory(categoryName: string): Promise<ProductDto[]> {
    const category = await this.categoryModel
      .findOne({ name: { $regex: new RegExp(`^${categoryName}$`, 'i') } })
      .populate<{ products: ProductDocument[] }>('products')
      .lean()
      .exec();
    if (!category) {
      throw new NotFoundException(`Category "${categoryName}" not found`);
    }
    return Array.isArray(category.products) 
      ? category.products.map(product => this.transformProductToDto(product))
      : [];
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryDocument> {
    const existingCategory = await this.categoryModel
      .findOne({
        name: { $regex: new RegExp(`^${createCategoryDto.name}$`, 'i') },
      })
      .exec();
    if (existingCategory) {
      throw new ConflictException(
        `Category "${createCategoryDto.name}" already exists.`,
      );
    }
    const newCategory = new this.categoryModel(createCategoryDto);
    try {
      return await newCategory.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          `Category "${createCategoryDto.name}" already exists (race condition or non-regex match).`,
        );
      }
      throw new InternalServerErrorException('Error creating category.');
    }
  }

  async findOrCreateByName(name: string): Promise<CategoryDocument> {
    let category = await this.categoryModel
      .findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })
      .exec();
    if (!category) {
      category = new this.categoryModel({ name });
      try {
        await category.save();
      } catch (error) {
        if (error.code === 11000) {
          category = await this.categoryModel
            .findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })
            .exec();
          if (!category)
            throw new InternalServerErrorException(
              'Failed to create or find category after race condition.',
            );
        } else {
          throw new InternalServerErrorException(
            'Error creating category during findOrCreate.',
          );
        }
      }
    }
    return category;
  }

  async addProductToNamedCategory(
    categoryName: string,
    productId: Types.ObjectId,
  ): Promise<void> {
    const category = await this.findOrCreateByName(categoryName);
    if (!category.products.some(id => id.equals(productId))) {
      category.products.push(productId);
      await category.save();
    }
  }
}
