import {
  findLanguageOption,
  languageOptionsFrom,
  optionsForCodes,
  parseStoredLanguageOptions,
} from './language-options';

describe('languageOptionsFrom', () => {
  it('uses the names the server sends', () => {
    const languages = [
      { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
      { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ' },
    ];
    expect(languageOptionsFrom({ default: 'vi', supported: ['vi', 'km'], languages })).toBe(
      languages,
    );
  });

  it('builds options from codes for servers that only send codes', () => {
    expect(languageOptionsFrom({ default: 'vi', supported: ['vi', 'ja'] })).toEqual([
      { code: 'vi', name: 'vi', nativeName: 'Tiếng Việt' },
      { code: 'ja', name: 'ja', nativeName: '日本語' },
    ]);
  });
});

describe('parseStoredLanguageOptions', () => {
  it('restores a cached list', () => {
    const options = optionsForCodes(['vi', 'en']);
    expect(parseStoredLanguageOptions(JSON.stringify(options))).toEqual(options);
  });

  it('ignores missing, empty or malformed values', () => {
    expect(parseStoredLanguageOptions(null)).toBeNull();
    expect(parseStoredLanguageOptions('[]')).toBeNull();
    expect(parseStoredLanguageOptions('{"code":"vi"}')).toBeNull();
    expect(parseStoredLanguageOptions('[{"code":"vi"}]')).toBeNull();
    expect(parseStoredLanguageOptions('not json')).toBeNull();
  });
});

describe('findLanguageOption', () => {
  it('matches codes case-insensitively', () => {
    expect(findLanguageOption(optionsForCodes(['zh-hant']), 'ZH-Hant')?.code).toBe('zh-hant');
    expect(findLanguageOption(optionsForCodes(['vi']), 'en')).toBeUndefined();
  });
});
