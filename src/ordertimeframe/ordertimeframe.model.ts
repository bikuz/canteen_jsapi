import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class OrderTimeFrame extends Document {
    @Prop({ required: true })
    orderingStartTime: number; // Time in seconds from midnight (e.g., 32400 for 09:00)

    @Prop({ required: true })
    orderingEndTime: number; // Time in seconds from midnight (e.g., 39600 for 11:00)

    @Prop({ default: false })
    isActive: boolean; // To toggle time frame activation

    @Prop({ type: String, enum: ['category', 'menu', 'fooditem'], required: true })
    applicableTo: string; // What the time frame applies to (e.g., category, menu, etc.)

    @Prop({ type: Types.ObjectId, refPath: 'applicableTo', required: true })
    applicableId: string; // ID of the entity this time frame is associated with
}

export const OrderTimeFrameSchema = SchemaFactory.createForClass(OrderTimeFrame);
