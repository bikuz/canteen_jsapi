import { Test, TestingModule } from '@nestjs/testing';
import { FoodItemsService } from './fooditems.service';

describe('FooditemsService', () => {
  let service: FoodItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FoodItemsService],
    }).compile();

    service = module.get<FoodItemsService>(FoodItemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
