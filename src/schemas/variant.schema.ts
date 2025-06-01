import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class Stock {
  @Prop({ type: MongooseSchema.Types.Map, of: Number, required: true })
  stock: Map<string, number>;
}

export const StockSchema = SchemaFactory.createForClass(Stock);

@Schema({ _id: false })
export class Variant {
  @Prop({ required: true })
  color: string;

  @Prop({ type: [String], required: true })
  images: string[];

  @Prop({ type: StockSchema, required: true })
  stock: Stock;
}

export const VariantSchema = SchemaFactory.createForClass(Variant);
