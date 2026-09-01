import {
  InvalidDateRangeException,
  ScheduleOverlapException,
} from '../common/errors/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleConflictValidator, findScheduleConflicts } from './schedule-conflict.validator';

const at = (value: string): Date => new Date(value);

const existing = (id: string, from: string, to: string | null) => ({
  id,
  activeFrom: at(from),
  activeTo: to === null ? null : at(to),
  exhibit: { id: `e-${id}`, code: `EX_${id.toUpperCase()}`, defaultTitle: id },
});

describe('findScheduleConflicts (pure rule)', () => {
  const janToMar = existing('statue', '2026-01-01T00:00:00Z', '2026-04-01T00:00:00Z');

  it('accepts a period that starts exactly when the previous one ends', () => {
    const conflicts = findScheduleConflicts([janToMar], {
      activeFrom: at('2026-04-01T00:00:00Z'),
      activeTo: at('2026-07-01T00:00:00Z'),
    });
    expect(conflicts).toHaveLength(0);
  });

  it('accepts a period entirely before the existing one', () => {
    const conflicts = findScheduleConflicts([janToMar], {
      activeFrom: at('2025-10-01T00:00:00Z'),
      activeTo: at('2026-01-01T00:00:00Z'),
    });
    expect(conflicts).toHaveLength(0);
  });

  it('rejects a partially overlapping period', () => {
    const conflicts = findScheduleConflicts([janToMar], {
      activeFrom: at('2026-03-15T00:00:00Z'),
      activeTo: at('2026-04-30T00:00:00Z'),
    });
    expect(conflicts.map((row) => row.id)).toEqual(['statue']);
  });

  it('rejects a period fully contained in the existing one', () => {
    const conflicts = findScheduleConflicts([janToMar], {
      activeFrom: at('2026-02-01T00:00:00Z'),
      activeTo: at('2026-03-01T00:00:00Z'),
    });
    expect(conflicts).toHaveLength(1);
  });

  it('rejects a period that fully contains the existing one', () => {
    const conflicts = findScheduleConflicts([janToMar], {
      activeFrom: at('2025-01-01T00:00:00Z'),
      activeTo: at('2027-01-01T00:00:00Z'),
    });
    expect(conflicts).toHaveLength(1);
  });

  it('rejects a period sharing the same start date', () => {
    const conflicts = findScheduleConflicts([janToMar], {
      activeFrom: at('2026-01-01T00:00:00Z'),
      activeTo: at('2026-02-01T00:00:00Z'),
    });
    expect(conflicts).toHaveLength(1);
  });

  it('rejects a new open ended period that swallows a future assignment', () => {
    const future = existing('future', '2026-09-01T00:00:00Z', null);
    const conflicts = findScheduleConflicts([future], {
      activeFrom: at('2026-08-01T00:00:00Z'),
      activeTo: null,
    });
    expect(conflicts).toHaveLength(1);
  });

  it('rejects anything starting after an existing open ended assignment', () => {
    const openEnded = existing('open', '2026-01-01T00:00:00Z', null);
    const conflicts = findScheduleConflicts([openEnded], {
      activeFrom: at('2030-01-01T00:00:00Z'),
      activeTo: at('2030-02-01T00:00:00Z'),
    });
    expect(conflicts).toHaveLength(1);
  });

  it('allows a new period before an existing open ended assignment starts', () => {
    const openEnded = existing('open', '2026-06-01T00:00:00Z', null);
    const conflicts = findScheduleConflicts([openEnded], {
      activeFrom: at('2026-01-01T00:00:00Z'),
      activeTo: at('2026-06-01T00:00:00Z'),
    });
    expect(conflicts).toHaveLength(0);
  });

  it('ignores the row being edited (id match)', () => {
    const conflicts = findScheduleConflicts([janToMar], {
      id: 'statue',
      activeFrom: at('2026-01-15T00:00:00Z'),
      activeTo: at('2026-05-01T00:00:00Z'),
    });
    expect(conflicts).toHaveLength(0);
  });
});

describe('ScheduleConflictValidator', () => {
  const findMany = jest.fn();
  const prisma = { exhibitAssignment: { findMany } } as unknown as PrismaService;
  const validator = new ScheduleConflictValidator(prisma);

  beforeEach(() => findMany.mockReset());

  it('passes when the zone has no conflicting assignment', async () => {
    findMany.mockResolvedValue([
      existing('statue', '2026-01-01T00:00:00Z', '2026-04-01T00:00:00Z'),
    ]);

    await expect(
      validator.assertNoConflict({
        zoneId: 'zone-a',
        activeFrom: at('2026-04-01T00:00:00Z'),
        activeTo: at('2026-07-01T00:00:00Z'),
      }),
    ).resolves.toBeUndefined();
  });

  it('throws ScheduleOverlapException with the offending exhibit', async () => {
    findMany.mockResolvedValue([
      existing('statue', '2026-01-01T00:00:00Z', '2026-04-01T00:00:00Z'),
    ]);

    await expect(
      validator.assertNoConflict({
        zoneId: 'zone-a',
        activeFrom: at('2026-03-15T00:00:00Z'),
        activeTo: at('2026-04-30T00:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(ScheduleOverlapException);
  });

  it('only inspects assignments of the same zone (different zones may overlap)', async () => {
    findMany.mockResolvedValue([]);

    await validator.assertNoConflict({
      zoneId: 'zone-b',
      activeFrom: at('2026-01-01T00:00:00Z'),
      activeTo: at('2026-04-01T00:00:00Z'),
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ zoneId: 'zone-b' }) }),
    );
  });

  it('rejects an inverted date range before querying', async () => {
    await expect(
      validator.assertNoConflict({
        zoneId: 'zone-a',
        activeFrom: at('2026-05-01T00:00:00Z'),
        activeTo: at('2026-04-01T00:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(InvalidDateRangeException);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('rejects a zero length range', () => {
    expect(() =>
      validator.assertValidRange(at('2026-05-01T00:00:00Z'), at('2026-05-01T00:00:00Z')),
    ).toThrow(InvalidDateRangeException);
  });
});
