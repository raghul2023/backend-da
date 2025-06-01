import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Variant, VariantSchema } from './variant.schema';
import { Discount, DiscountSchema } from './discount.schema';

export type ProductDocument = Product & Document & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ 
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Product {
  @Prop({ required: true, unique: true, index: true })
  id: string; // Product's custom ID like "prod_001"

  @Prop({ required: true, index: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  brand: string;

  @Prop({ required: true, index: true })
  category: string; // Category name, kept as string as per original JSON

  @Prop()
  gender: string;

  @Prop({ required: true })
  price: number;

  @Prop({ type: DiscountSchema }) // Embedded subdocument
  discount?: Discount;

  @Prop([String])
  availableSizes: string[];

  @Prop([VariantSchema]) // Array of embedded subdocuments
  variants: Variant[];

  @Prop()
  material?: string;

  @Prop([String])
  careInstructions?: string[];

  @Prop()
  rating?: number;

  @Prop()
  reviews?: number;

  @Prop([String])
  tags?: string[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
