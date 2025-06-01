import { ProductDto } from './product.dto';

export interface CategoryDto {
  name: string;
  products: ProductDto[];
}

export class CreateCategoryDto {
  name: string;
}
