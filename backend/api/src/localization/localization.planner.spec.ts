import { planLocalization, requestedLanguages, sourceHashOf } from './localization.planner';

describe('sourceHashOf', () => {
  const copy = {
    languageCode: 'vi',
    title: 'Trống đồng Đông Sơn',
    shortDescription: 'Hiện vật thời đại đồ đồng',
    description: null,
  };

  it('ignores surrounding whitespace and empty optional fields', () => {
    expect(sourceHashOf({ ...copy, title: `  ${copy.title} `, description: '   ' })).toBe(
      sourceHashOf(copy),
    );
  });

  it('changes when the copy or the language changes', () => {
    expect(sourceHashOf({ ...copy, title: 'Tượng Chăm' })).not.toBe(sourceHashOf(copy));
    expect(sourceHashOf({ ...copy, languageCode: 'en' })).not.toBe(sourceHashOf(copy));
  });
});

describe('requestedLanguages', () => {
  it('puts the source first, lower-cases and removes duplicates', () => {
    expect(requestedLanguages('vi', ['en', 'VI', 'ja', 'en', 'zh-Hant'])).toEqual([
      'vi',
      'en',
      'ja',
      'zh-hant',
    ]);
  });
});

describe('planLocalization', () => {
  const hash = 'current-hash';

  it('enqueues languages that were never generated', () => {
    expect(
      planLocalization({
        languages: ['vi', 'en'],
        sourceHash: hash,
        force: [],
        translations: [],
        activeTasks: [],
      }),
    ).toEqual({ enqueue: ['vi', 'en'], skipped: [], supersedeTaskIds: [] });
  });

  it('skips languages generated from the same source copy', () => {
    const plan = planLocalization({
      languages: ['vi', 'en'],
      sourceHash: hash,
      force: [],
      translations: [
        { languageCode: 'vi', audioUrl: '/uploads/audio/vi.mp3', sourceHash: hash },
        { languageCode: 'en', audioUrl: '/uploads/audio/en.mp3', sourceHash: hash },
      ],
      activeTasks: [],
    });
    expect(plan.enqueue).toEqual([]);
    expect(plan.skipped).toEqual([
      { languageCode: 'vi', reason: 'up_to_date' },
      { languageCode: 'en', reason: 'up_to_date' },
    ]);
  });

  it('regenerates outdated, audio-less and seeded copy', () => {
    const plan = planLocalization({
      languages: ['vi', 'en', 'ja'],
      sourceHash: hash,
      force: [],
      translations: [
        { languageCode: 'vi', audioUrl: '/uploads/audio/vi.wav', sourceHash: null },
        { languageCode: 'en', audioUrl: '/uploads/audio/en.mp3', sourceHash: 'old-hash' },
        { languageCode: 'ja', audioUrl: null, sourceHash: hash },
      ],
      activeTasks: [],
    });
    expect(plan.enqueue).toEqual(['vi', 'en', 'ja']);
  });

  it('does not duplicate a task already working from the same copy', () => {
    const plan = planLocalization({
      languages: ['en'],
      sourceHash: hash,
      force: [],
      translations: [],
      activeTasks: [{ id: 'task-1', languageCode: 'en', sourceHash: hash }],
    });
    expect(plan).toEqual({
      enqueue: [],
      skipped: [{ languageCode: 'en', reason: 'in_progress' }],
      supersedeTaskIds: [],
    });
  });

  it('supersedes in-flight tasks working from older copy', () => {
    const plan = planLocalization({
      languages: ['en'],
      sourceHash: hash,
      force: [],
      translations: [],
      activeTasks: [{ id: 'task-old', languageCode: 'en', sourceHash: 'old-hash' }],
    });
    expect(plan).toEqual({ enqueue: ['en'], skipped: [], supersedeTaskIds: ['task-old'] });
  });

  it('supersedes a stale in-flight task when the language is already up to date', () => {
    const plan = planLocalization({
      languages: ['en'],
      sourceHash: hash,
      force: [],
      translations: [{ languageCode: 'en', audioUrl: '/uploads/audio/en.mp3', sourceHash: hash }],
      activeTasks: [{ id: 'task-old', languageCode: 'en', sourceHash: 'old-hash' }],
    });
    expect(plan).toEqual({
      enqueue: [],
      skipped: [{ languageCode: 'en', reason: 'up_to_date' }],
      supersedeTaskIds: ['task-old'],
    });
  });

  it('force regenerates up-to-date and in-flight languages', () => {
    const plan = planLocalization({
      languages: ['vi', 'en'],
      sourceHash: hash,
      force: ['vi', 'en'],
      translations: [{ languageCode: 'vi', audioUrl: '/uploads/audio/vi.mp3', sourceHash: hash }],
      activeTasks: [{ id: 'task-1', languageCode: 'en', sourceHash: hash }],
    });
    expect(plan).toEqual({ enqueue: ['vi', 'en'], skipped: [], supersedeTaskIds: ['task-1'] });
  });

  it('only forces the languages it names', () => {
    const plan = planLocalization({
      languages: ['vi', 'en'],
      sourceHash: hash,
      force: ['en'],
      translations: [
        { languageCode: 'vi', audioUrl: '/uploads/audio/vi.mp3', sourceHash: hash },
        { languageCode: 'en', audioUrl: '/uploads/audio/en.mp3', sourceHash: hash },
      ],
      activeTasks: [],
    });
    expect(plan).toEqual({
      enqueue: ['en'],
      skipped: [{ languageCode: 'vi', reason: 'up_to_date' }],
      supersedeTaskIds: [],
    });
  });
});
