import { AdminPolicy } from './admin.policy.js';

describe('AdminPolicy', () => {
  const policy = new AdminPolicy();

  it('allows an admin at aal2 through before()', () => {
    expect(policy.before({ id: 'u1', role: 'admin', aal: 'aal2' })).toBe(true);
  });

  it('denies an admin who hasn\'t completed MFA (aal1)', () => {
    expect(policy.before({ id: 'u1', role: 'admin', aal: 'aal1' })).toBe(false);
  });

  it('denies a regular user even at aal2', () => {
    expect(policy.before({ id: 'u1', role: 'user', aal: 'aal2' })).toBe(false);
  });

  it('denies a guest', () => {
    expect(policy.before(null)).toBe(false);
  });
});
