import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as path from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS設定
  app.enableCors();

  // 静的ファイルの設定
  app.useStaticAssets(path.join(__dirname, '..', 'static'));
  app.useStaticAssets(path.join(__dirname, '..', 'static', 'images'), {
    prefix: '/images',
  });
  app.useStaticAssets(path.join(__dirname, '..', 'static', 'js'), {
    prefix: '/js',
  });
  app.useStaticAssets(path.join(__dirname, '..', 'static', 'css'), {
    prefix: '/css',
  });

  const PORT = process.env.PORT || 8000;
  await app.listen(PORT);
  console.log(`Server is running on port ${PORT}`);
}
bootstrap();
