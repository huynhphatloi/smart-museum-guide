import { loadConfig } from './env.validation';

describe('media storage configuration', () => {
  const base = { DATABASE_URL: 'postgresql://localhost/db', JWT_SECRET: 'long-enough-secret' };
  const r2 = {
    MEDIA_STORAGE: 'r2',
    R2_ACCOUNT_ID: 'account',
    R2_ACCESS_KEY_ID: 'key-id',
    R2_SECRET_ACCESS_KEY: 'secret',
    R2_BUCKET: 'museum-media',
    R2_PUBLIC_URL: 'https://media.example.com/',
  };

  it('defaults to local disk', () => {
    const config = loadConfig(base);
    expect(config.mediaStorage).toBe('local');
    expect(config.r2).toBeUndefined();
  });

  it('builds the R2 config and trims the public URL', () => {
    expect(loadConfig({ ...base, ...r2 }).r2).toEqual({
      accountId: 'account',
      accessKeyId: 'key-id',
      secretAccessKey: 'secret',
      bucket: 'museum-media',
      publicUrl: 'https://media.example.com',
    });
  });

  it('refuses to boot with R2 selected but not configured', () => {
    expect(() =>
      loadConfig({ ...base, ...r2, R2_BUCKET: '', R2_SECRET_ACCESS_KEY: undefined }),
    ).toThrow(/R2_SECRET_ACCESS_KEY is required[\s\S]*R2_BUCKET is required/);
  });

  it('rejects a public URL that is not http(s)', () => {
    expect(() => loadConfig({ ...base, ...r2, R2_PUBLIC_URL: 'media.example.com' })).toThrow(
      'R2_PUBLIC_URL must be an http(s) URL',
    );
  });

  it('requires public HTTPS URLs in production', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production' })).toThrow(
      /PUBLIC_BASE_URL must use a real HTTPS domain[\s\S]*VISITOR_WEB_URL must use a real HTTPS domain[\s\S]*CORS_ORIGINS/,
    );
  });

  it('rejects sample domains even when they use HTTPS', () => {
    expect(() => loadConfig({
      ...base,
      NODE_ENV: 'production',
      PUBLIC_BASE_URL: 'https://api.museum.example.com',
      VISITOR_WEB_URL: 'https://museum.example.com',
      CORS_ORIGINS: 'https://museum.example.com',
    })).toThrow(/real HTTPS domain/);
  });
});
