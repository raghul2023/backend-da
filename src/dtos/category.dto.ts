import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ProductDto } from './product.dto';

export interface CategoryDto {
  name: string;
  products: ProductDto[];
}

export class CreateCategoryDto {
  @ApiProperty({ 
    description: 'The name of the category',
    example: 'Shirts'
  })
  @IsString({ message: 'Category name must be a string' })
  @IsNotEmpty({ message: 'Category name cannot be empty' })
  name: string;
}

export class UpdateCategoryDto {
  @ApiProperty({ 
    required: false,
    description: 'The name of the category',
    example: 'Updated Category Name'
  })
  @IsOptional()
  @IsString({ message: 'Category name must be a string' })
  @IsNotEmpty({ message: 'Category name cannot be empty' })
  name?: string;
}
