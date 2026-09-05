import { zoneCodeFromQr } from './qr';

describe('zoneCodeFromQr', () => {
  it('extracts the zone code from a full QR url', () => {
    expect(zoneCodeFromQr('https://museum.example.com/q/ZONE_A01')).toBe('ZONE_A01');
  });

  it('accepts a url with query parameters', () => {
    expect(zoneCodeFromQr('http://192.168.1.10:5173/q/zone_b01?lang=en')).toBe('ZONE_B01');
  });

  it('accepts a bare code typed by hand', () => {
    expect(zoneCodeFromQr('  zone_a02 ')).toBe('ZONE_A02');
  });

  it('rejects unrelated content', () => {
    expect(zoneCodeFromQr('')).toBeNull();
    expect(zoneCodeFromQr('https://example.com/about us')).toBeNull();
  });
});
