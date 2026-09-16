import { narrationTextForTest, parseTranslatedCopyForTest } from './exhibit-localize.service';

describe('exhibit localize helpers', () => {
  it('builds narration from title, short and body', () => {
    expect(
      narrationTextForTest({
        title: 'Cham statue',
        shortDescription: 'Stone sculpture',
        description: 'A 10th century work.',
      }),
    ).toBe('Cham statue. Stone sculpture. A 10th century work.');
  });

  it('skips empty parts', () => {
    expect(
      narrationTextForTest({ title: 'Cham statue', shortDescription: null, description: '  ' }),
    ).toBe('Cham statue');
  });

  it('falls back to source title when the model omits it', () => {
    expect(parseTranslatedCopyForTest('{"shortDescription":"Hello"}', 'Statue')).toEqual({
      title: 'Statue',
      shortDescription: 'Hello',
      description: null,
    });
  });
});
