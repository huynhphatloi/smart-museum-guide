import { signBody, verifySignature } from './ai-service-signature';

describe('AI service request signatures', () => {
  const secret = 'test-secret-with-enough-length';
  const body = '{"taskId":"abc","event":"task.completed"}';
  const now = new Date('2026-09-17T08:00:00Z');

  it('accepts a signature it produced', () => {
    expect(verifySignature(secret, signBody(secret, body, now), body, now)).toBe(true);
  });

  it('matches the scheme used by the Python AI service', () => {
    // hmac.new(b"test-secret-with-enough-length", b"1789632000." + body, sha256).hexdigest()
    expect(signBody(secret, body, now)).toBe(
      't=1789632000,v1=61cab1ed109657cc39ecf6a3932579462e36748788a8a69a9e601acc68b7c6a7',
    );
  });

  it('rejects a tampered body', () => {
    const header = signBody(secret, body, now);
    expect(verifySignature(secret, header, body.replace('abc', 'xyz'), now)).toBe(false);
  });

  it('rejects the wrong secret', () => {
    const header = signBody('another-secret-of-enough-length', body, now);
    expect(verifySignature(secret, header, body, now)).toBe(false);
  });

  it('rejects stale timestamps', () => {
    const header = signBody(secret, body, now);
    const later = new Date(now.getTime() + 10 * 60 * 1000);
    expect(verifySignature(secret, header, body, later)).toBe(false);
  });

  it('rejects missing or malformed headers', () => {
    expect(verifySignature(secret, undefined, body, now)).toBe(false);
    expect(verifySignature(secret, 'garbage', body, now)).toBe(false);
    expect(verifySignature(secret, 't=1789632000,v1=zz', body, now)).toBe(false);
  });
});
