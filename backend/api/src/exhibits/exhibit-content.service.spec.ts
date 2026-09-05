import { pickTranslation } from './exhibit-content.service';

const translation = (languageCode: string) => ({
  languageCode,
  title: `title-${languageCode}`,
  shortDescription: null,
  description: null,
  audioUrl: null,
});

describe('pickTranslation (language fallback rule)', () => {
  const available = [translation('vi'), translation('en'), translation('ja')];

  it('returns the exact requested language', () => {
    expect(pickTranslation(available, 'en', 'vi')?.languageCode).toBe('en');
  });

  it('is case insensitive', () => {
    expect(pickTranslation(available, 'EN', 'vi')?.languageCode).toBe('en');
  });

  it('matches the base language of a regional code', () => {
    expect(pickTranslation([translation('pt')], 'pt-BR', 'vi')?.languageCode).toBe('pt');
  });

  it('falls back to the configured default language', () => {
    expect(pickTranslation(available, 'ko', 'vi')?.languageCode).toBe('vi');
  });

  it('falls back to the first available translation when even the default is missing', () => {
    expect(pickTranslation([translation('ja')], 'ko', 'vi')?.languageCode).toBe('ja');
  });

  it('returns null when the exhibit has no translation at all', () => {
    expect(pickTranslation([], 'en', 'vi')).toBeNull();
  });
});
