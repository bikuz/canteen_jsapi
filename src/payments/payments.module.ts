import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment, PaymentSchema } from './payments.model';
import { OrdersModule } from '../orders/orders.module'; 

@Module({
  imports: [MongooseModule.forFeature([
    { name: Payment.name, schema: PaymentSchema },
  ]),
  forwardRef(() => OrdersModule)
],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService,MongooseModule],
})
export class PaymentsModule {}
