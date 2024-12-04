import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './orders.model';
import { OrderTimeFrameModule } from '../ordertimeframe/ordertimeframe.module';
import { FoodItemsModule } from '../fooditems/fooditems.module';
import { PaymentsModule } from '../payments/payments.module';
@Module({
  imports: [MongooseModule.forFeature([
    { name: Order.name, schema: OrderSchema }
  ]),
  OrderTimeFrameModule,
  FoodItemsModule,
  PaymentsModule,
],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}