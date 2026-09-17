import { languageOption, resolveOfferedLanguages } from './language-catalog';

describe('resolveOfferedLanguages', () => {
  it('uses the languages the AI service reported, in catalog order', () => {
    expect(
      resolveOfferedLanguages({
        reported: ['km', 'en', 'da', 'vi', 'zh-hant'],
        configured: ['vi', 'en', 'ja'],
        defaultLanguage: 'vi',
      }),
    ).toEqual({ source: 'ai-service', codes: ['vi', 'en', 'zh-hant', 'km', 'da'] });
  });

  it('falls back to SUPPORTED_LANGUAGES until the AI service has reported', () => {
    expect(
      resolveOfferedLanguages({ reported: null, configured: ['en', 'vi'], defaultLanguage: 'vi' }),
    ).toEqual({ source: 'config', codes: ['vi', 'en'] });
    expect(
      resolveOfferedLanguages({ reported: [], configured: ['en'], defaultLanguage: 'vi' }).source,
    ).toBe('config');
  });

  it('always offers the default language and keeps unknown codes last', () => {
    expect(
      resolveOfferedLanguages({ reported: ['xx', 'EN'], configured: [], defaultLanguage: 'vi' }),
    ).toEqual({ source: 'ai-service', codes: ['vi', 'en', 'xx'] });
  });
});

describe('languageOption', () => {
  it('returns native names, and the code itself for unknown languages', () => {
    expect(languageOption('km')).toEqual({ code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ' });
    expect(languageOption('xx')).toEqual({ code: 'xx', name: 'xx', nativeName: 'xx' });
  });
});
