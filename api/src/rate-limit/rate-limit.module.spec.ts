import { getRateLimitTracker } from './rate-limit.module.js';

describe('getRateLimitTracker', () => {
  it('tracks by user id once authenticated', () => {
    expect(getRateLimitTracker({ user: { id: 'u1' }, ip: '1.2.3.4' })).toBe('user:u1');
  });

  it('falls back to IP for an unauthenticated request', () => {
    expect(getRateLimitTracker({ ip: '1.2.3.4' })).toBe('ip:1.2.3.4');
  });
});
