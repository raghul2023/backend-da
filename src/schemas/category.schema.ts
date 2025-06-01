import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Product } from './product.schema'; // For type referencing

export type CategoryDocument = Category & Document & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true, index: true })
  name: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Product' }] })
  products: Types.ObjectId[]; // Array of Product ObjectIds
}

export const CategorySchema = SchemaFactory.createForClass(Category);
