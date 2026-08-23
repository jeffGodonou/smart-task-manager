import { afterEach, describe, expect, it } from 'vitest';
import { clearToken, getAuthHeaders, getStoredToken, saveToken } from './auth';

describe('auth token handling', () => {
  afterEach(() => {
    clearToken();
  });

  it('drops expired tokens before sending authenticated requests', () => {
    const expiredToken = [
      btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
      btoa(JSON.stringify({ sub: 'alice', exp: Math.floor(Date.now() / 1000) - 60 })),
      'signature',
    ].join('.');

    saveToken(expiredToken);

    expect(getStoredToken()).toBeNull();
    expect(getAuthHeaders()).toEqual({});
  });
});
