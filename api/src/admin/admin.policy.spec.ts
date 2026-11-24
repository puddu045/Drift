import { AdminPolicy } from './admin.policy.js';

describe('AdminPolicy', () => {
  const policy = new AdminPolicy();

  it('allows an admin through before()', () => {
    expect(policy.before({ id: 'u1', role: 'admin' })).toBe(true);
  });

  it('denies a regular user', () => {
    expect(policy.before({ id: 'u1', role: 'user' })).toBe(false);
  });

  it('denies a guest', () => {
    expect(policy.before(null)).toBe(false);
  });
});
