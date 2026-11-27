import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

// The mobile app isn't a browser, so CORS never applies to it — this is only
// for the admin portal (a browser app on its own origin). Configurable via
// env since the admin portal's deployed URL won't always be the local dev
// default. Shared between main.ts and the e2e test harness so both actually
// run the same CORS configuration rather than the test silently skipping it.
export function corsOrigins() {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:3001').split(',').map((origin) => origin.trim());
}

export function configureApp(app: INestApplication) {
  // Pure JSON API, never serves HTML — disable the CSP/COEP defaults that
  // assume a page is being rendered (they'd just add no-op headers) and keep
  // the rest (HSTS, X-Content-Type-Options, X-Frame-Options, etc).
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.enableCors({ origin: corsOrigins() });
}
