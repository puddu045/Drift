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

  describe('REQUIRE_ADMIN_MFA=false', () => {
    const originalEnv = process.env.REQUIRE_ADMIN_MFA;
    beforeEach(() => {
      process.env.REQUIRE_ADMIN_MFA = 'false';
    });
    afterEach(() => {
      process.env.REQUIRE_ADMIN_MFA = originalEnv;
    });

    it('allows an admin even at aal1', () => {
      expect(policy.before({ id: 'u1', role: 'admin', aal: 'aal1' })).toBe(true);
    });

    it('still denies a non-admin', () => {
      expect(policy.before({ id: 'u1', role: 'user', aal: 'aal2' })).toBe(false);
    });
  });
});
