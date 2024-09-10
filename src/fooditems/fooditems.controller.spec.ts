import { Test, TestingModule } from '@nestjs/testing';
import { FooditemsController } from './fooditems.controller';

describe('FooditemsController', () => {
  let controller: FooditemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FooditemsController],
    }).compile();

    controller = module.get<FooditemsController>(FooditemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
