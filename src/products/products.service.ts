import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema';
import { CreateProductDto } from '../dtos/product.dto';
import { ProductDto } from '../dtos/product.dto';
import { CategoriesService } from 'src/categories/categories.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @Inject(forwardRef(() => CategoriesService))
    private categoriesService: CategoriesService,
  ) {}

  private transformToDto(product: ProductDocument): ProductDto {
    const plainProduct = product.toJSON();
    const transformedProduct = {
      ...plainProduct,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      variants: product.variants.map(variant => ({
        color: variant.color,
        images: variant.images,
        stock: {
          stock: Object.fromEntries(variant.stock.stock)
        }
      }))
    };
    return transformedProduct as ProductDto;
  }

  async findAll(): Promise<ProductDto[]> {
    try {
      const products = await this.productModel.find().exec();
      return products.map(product => this.transformToDto(product));
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch products');
    }
  }

  async findById(id: string): Promise<ProductDto> {
    if (!id) {
      throw new BadRequestException('Product ID is required');
    }

    try {
      const product = await this.productModel.findOne({ id }).exec();
      if (!product) {
        throw new NotFoundException(`Product with ID "${id}" not found`);
      }
      return this.transformToDto(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch product');
    }
  }

  async findByMongoId(mongoId: string): Promise<ProductDto> {
    if (!mongoId) {
      throw new BadRequestException('MongoDB ID is required');
    }

    try {
      const product = await this.productModel.findById(mongoId).exec();
      if (!product) {
        throw new NotFoundException(`Product with MongoDB ID "${mongoId}" not found`);
      }
      return this.transformToDto(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch product');
    }
  }

  async findByTitle(title: string): Promise<ProductDto> {
    if (!title) {
      throw new BadRequestException('Product title is required');
    }

    try {
      const product = await this.productModel
        .findOne({ title: { $regex: new RegExp(`^${title}$`, 'i') } })
        .exec();
      if (!product) {
        throw new NotFoundException(`Product with title "${title}" not found`);
      }
      return this.transformToDto(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch product');
    }
  }

  async create(createProductDto: CreateProductDto): Promise<ProductDto> {
    try {
      // Validate required fields
      if (!createProductDto.id || !createProductDto.title || !createProductDto.category) {
        throw new BadRequestException('ID, title, and category are required fields');
      }

      // Check for existing product
      const existingProduct = await this.productModel.findOne({
        $or: [
          { id: createProductDto.id },
          { title: createProductDto.title }
        ]
      }).exec();

      if (existingProduct) {
        throw new ConflictException(
          existingProduct.id === createProductDto.id
            ? `Product with ID "${createProductDto.id}" already exists`
            : `Product with title "${createProductDto.title}" already exists`
        );
      }

      const newProduct = new this.productModel(createProductDto);
      const savedProduct = await newProduct.save();

      // Add product to its category
      if (savedProduct.category) {
        try {
          const productId = new Types.ObjectId(savedProduct._id);
          await this.categoriesService.addProductToNamedCategory(
            savedProduct.category,
            productId,
          );
        } catch (error) {
          // Log the error but don't fail the product creation
          console.error('Failed to add product to category:', error);
        }
      }

      return this.transformToDto(savedProduct);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  async getProductsByCategory(categoryName: string): Promise<ProductDto[]> {
    if (!categoryName) {
      throw new BadRequestException('Category name is required');
    }

    try {
      const products = await this.productModel
        .find({ category: { $regex: new RegExp(`^${categoryName}$`, 'i') } })
        .exec();
      return products.map(product => this.transformToDto(product));
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch products by category');
    }
  }
}
