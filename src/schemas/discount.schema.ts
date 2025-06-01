import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false }) // No separate _id for subdocument
export class Discount extends Document {
  @Prop({ required: true })
  isActive: boolean;

  @Prop({ required: true })
  percentage: number;

  @Prop({ required: true })
  discountedPrice: number;
}
export const DiscountSchema = SchemaFactory.createForClass(Discount);
