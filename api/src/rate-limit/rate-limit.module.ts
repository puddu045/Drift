import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

export function getRateLimitTracker(req: Record<string, any>) {
  return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
}

// Imported into AppModule AFTER AuthModule — global guards run in module
// import order, so registering ThrottlerGuard here (rather than directly in
// AppModule's own providers) means request.user is already populated by
// @nestjs/authentication's guard by the time getTracker reads it. Getting
// this ordering wrong silently falls back to limiting by IP only, which
// shares one counter across everyone behind the same IP/NAT and lets an
// abusive account dodge its own limit by rotating IPs.
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60, getTracker: getRateLimitTracker }],
    }),
  ],
  // ThrottlerGuard is listed on its own token too (not just via useExisting
  // below) so tests can still `.overrideProvider(ThrottlerGuard)` it, same
  // as before this was its own module.
  providers: [ThrottlerGuard, { provide: APP_GUARD, useExisting: ThrottlerGuard }],
})
export class RateLimitModule {}
