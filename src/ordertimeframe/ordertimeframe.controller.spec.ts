import { Test, TestingModule } from '@nestjs/testing';
import { OrderTimeFrameController } from './ordertimeframe.controller';

describe('OrdertimeframeController', () => {
  let controller: OrderTimeFrameController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderTimeFrameController],
    }).compile();

    controller = module.get<OrderTimeFrameController>(OrderTimeFrameController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
