import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './orders.model';
import { OrderTimeFrameModule } from '../ordertimeframe/ordertimeframe.module';
import { FoodItemsModule } from '../fooditems/fooditems.module';
import { PaymentsModule } from '../payments/payments.module';
import { UserModule } from '../users/users.module';
@Module({
  imports: [MongooseModule.forFeature([
    { name: Order.name, schema: OrderSchema }
  ]),
  OrderTimeFrameModule,
  FoodItemsModule,
  forwardRef(() => PaymentsModule),
  forwardRef(() =>UserModule)
],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService,MongooseModule],
})
export class OrdersModule {}