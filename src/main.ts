import { NestFactory } from '@nestjs/core';
const { dLog } = require('@daozhao/utils');

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = 5566;
  await app.listen(PORT, () => {
    dLog(`监听${PORT}端口`);
  });
}
bootstrap();
