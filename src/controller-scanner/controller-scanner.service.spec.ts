import { Test, TestingModule } from '@nestjs/testing';
import { ControllerScannerService } from './controller-scanner.service';

describe('ControllerScannerService', () => {
  let service: ControllerScannerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ControllerScannerService],
    }).compile();

    service = module.get<ControllerScannerService>(ControllerScannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
