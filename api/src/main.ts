import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  // Bind explicitly to 0.0.0.0: without a host, Node listens on the
  // unspecified IPv6 address (::), which Render's container network can't
  // reliably reach — the app starts up fine by its own logs, but Render's
  // port probe never sees it until a restart happens to shake it loose.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
await bootstrap();
