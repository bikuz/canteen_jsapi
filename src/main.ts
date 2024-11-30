import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);   
    // Enable validation and transformation
  // app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors();   
  await app.listen(3000);
}
bootstrap();
