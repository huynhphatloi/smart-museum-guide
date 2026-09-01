import { ExhibitStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExhibitResolverService, selectActiveAssignment } from './exhibit-resolver.service';

const at = (value: string): Date => new Date(value);

interface Row {
  id: string;
  zoneId: string;
  exhibitId: string;
  activeFrom: Date;
  activeTo: Date | null;
  exhibit: { id: string; code: string; defaultTitle: string; status: ExhibitStatus };
}

const row = (
  id: string,
  from: string,
  to: string | null,
  status: ExhibitStatus = ExhibitStatus.PUBLISHED,
): Row => ({
  id,
  zoneId: 'zone-a',
  exhibitId: `exhibit-${id}`,
  activeFrom: at(from),
  activeTo: to === null ? null : at(to),
  exhibit: { id: `exhibit-${id}`, code: `EX_${id.toUpperCase()}`, defaultTitle: id, status },
});

describe('selectActiveAssignment (pure rule)', () => {
  const statue = row('statue', '2026-01-01T00:00:00Z', '2026-04-01T00:00:00Z');
  const painting = row('painting', '2026-04-01T00:00:00Z', '2026-07-01T00:00:00Z');
  const openEnded = row('artifact', '2026-07-01T00:00:00Z', null);
  const all = [statue, painting, openEnded];

  it('returns the assignment covering the timestamp', () => {
    expect(selectActiveAssignment(all, at('2026-02-15T10:00:00Z'))?.id).toBe('statue');
    expect(selectActiveAssignment(all, at('2026-05-15T10:00:00Z'))?.id).toBe('painting');
  });

  it('ignores assignments that have not started yet', () => {
    expect(selectActiveAssignment([painting], at('2026-03-31T23:59:59Z'))).toBeNull();
  });

  it('ignores assignments that already expired', () => {
    expect(selectActiveAssignment([statue], at('2026-06-01T00:00:00Z'))).toBeNull();
  });

  it('treats the interval as half open: activeTo itself is no longer active', () => {
    expect(selectActiveAssignment([statue], at('2026-04-01T00:00:00Z'))).toBeNull();
    expect(selectActiveAssignment(all, at('2026-04-01T00:00:00Z'))?.id).toBe('painting');
  });

  it('includes the exact activeFrom instant', () => {
    expect(selectActiveAssignment([statue], at('2026-01-01T00:00:00Z'))?.id).toBe('statue');
  });

  it('supports open ended assignments (activeTo === null)', () => {
    expect(selectActiveAssignment([openEnded], at('2099-01-01T00:00:00Z'))?.id).toBe('artifact');
  });

  it('returns null when the zone has no assignments at all', () => {
    expect(selectActiveAssignment([], at('2026-05-01T00:00:00Z'))).toBeNull();
  });

  it('is deterministic if the data contains several matches', () => {
    const overlapping = [
      row('older', '2026-01-01T00:00:00Z', null),
      row('newer', '2026-02-01T00:00:00Z', null),
    ];
    expect(selectActiveAssignment(overlapping, at('2026-03-01T00:00:00Z'))?.id).toBe('newer');
  });
});

describe('ExhibitResolverService', () => {
  const findMany = jest.fn();
  const prisma = { exhibitAssignment: { findMany } } as unknown as PrismaService;
  const service = new ExhibitResolverService(prisma);

  beforeEach(() => findMany.mockReset());

  it('resolves the published exhibit currently on display', async () => {
    findMany.mockResolvedValue([row('statue', '2026-01-01T00:00:00Z', '2026-04-01T00:00:00Z')]);

    const result = await service.resolveActiveExhibit('zone-a', at('2026-02-01T00:00:00Z'));

    expect(result.reason).toBe('RESOLVED');
    expect(result.assignment?.exhibit.code).toBe('EX_STATUE');
  });

  it('reports NO_ASSIGNMENT when nothing is scheduled', async () => {
    findMany.mockResolvedValue([]);

    const result = await service.resolveActiveExhibit('zone-a', at('2026-02-01T00:00:00Z'));

    expect(result).toEqual({ reason: 'NO_ASSIGNMENT', assignment: null });
  });

  it('hides a DRAFT exhibit from visitors', async () => {
    findMany.mockResolvedValue([row('draft', '2026-01-01T00:00:00Z', null, ExhibitStatus.DRAFT)]);

    const result = await service.resolveActiveExhibit('zone-a', at('2026-02-01T00:00:00Z'));

    expect(result.reason).toBe('EXHIBIT_NOT_PUBLISHED');
  });

  it('hides an ARCHIVED exhibit from visitors', async () => {
    findMany.mockResolvedValue([
      row('archived', '2026-01-01T00:00:00Z', null, ExhibitStatus.ARCHIVED),
    ]);

    expect((await service.resolveActiveExhibit('zone-a', at('2026-02-01T00:00:00Z'))).reason).toBe(
      'EXHIBIT_NOT_PUBLISHED',
    );
  });

  it('still returns unpublished exhibits for the admin CMS', async () => {
    findMany.mockResolvedValue([row('draft', '2026-01-01T00:00:00Z', null, ExhibitStatus.DRAFT)]);

    const result = await service.resolveActiveExhibit('zone-a', at('2026-02-01T00:00:00Z'), {
      requirePublished: false,
    });

    expect(result.reason).toBe('RESOLVED');
    expect(result.assignment?.exhibit.status).toBe(ExhibitStatus.DRAFT);
  });

  it('pushes the interval predicate into the database query', async () => {
    findMany.mockResolvedValue([]);
    const timestamp = at('2026-02-01T00:00:00Z');

    await service.resolveActiveExhibit('zone-a', timestamp);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          zoneId: 'zone-a',
          activeFrom: { lte: timestamp },
          OR: [{ activeTo: null }, { activeTo: { gt: timestamp } }],
        },
      }),
    );
  });
});
