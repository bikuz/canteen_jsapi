import { Test, TestingModule } from '@nestjs/testing';
import { FooditemsService } from './fooditems.service';

describe('FooditemsService', () => {
  let service: FooditemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FooditemsService],
    }).compile();

    service = module.get<FooditemsService>(FooditemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
