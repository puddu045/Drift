import type { INestApplication } from '@nestjs/common';

// The mobile app isn't a browser, so CORS never applies to it — this is only
// for the admin portal (a browser app on its own origin). Configurable via
// env since the admin portal's deployed URL won't always be the local dev
// default. Shared between main.ts and the e2e test harness so both actually
// run the same CORS configuration rather than the test silently skipping it.
export function corsOrigins() {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:3001').split(',').map((origin) => origin.trim());
}

export function configureApp(app: INestApplication) {
  app.enableCors({ origin: corsOrigins() });
}
