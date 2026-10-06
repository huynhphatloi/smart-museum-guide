import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

// Execute the same pure parser used by the UI, without a browser or API/database.
const source = await readFile(
  new URL('../src/features/floor-plans/model/dxf-import.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
});
const { importDxf, dxfSvg } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputText + '\n//# sourceURL=dxf-import.js').toString('base64')}`
);
const drawing = (entities, unit = 5, extra = '') =>
  `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n${unit}\n0\nENDSEC\n${extra}0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`;
const wall = (extra = '') =>
  `0\nLWPOLYLINE\n8\nWALLS\n70\n0\n90\n5\n10\n-100\n20\n-200\n10\n300\n20\n-200\n10\n300\n20\n100\n10\n-100\n20\n100\n10\n-100\n20\n-200\n${extra}`;
const error = (code) => (caught) => caught.code === code;

test('centimetres become metres, negative origin normalizes and CAD y flips', () => {
  const plan = importDxf(drawing(wall()));
  assert.equal(plan.widthMeters, 4);
  assert.equal(plan.heightMeters, 3);
  assert.deepEqual(plan.paths[0].points[0], [0, 3]);
  assert.deepEqual(plan.paths[0].points[2], [4, 0]);
  assert.equal(plan.paths[0].closed, true); // OpenPlan repeats its first point, flags=0.
});
test('unitless input needs an explicit unit; imperial and millimetres scale correctly', () => {
  assert.throws(() => importDxf(drawing(wall(), 0)), error('units'));
  assert.equal(importDxf(drawing(wall(), 0), 5).widthMeters, 4);
  assert.equal(importDxf(drawing(wall(), 1)).widthMeters, 10.16);
  assert.throws(() => importDxf(drawing(wall(), 4)), error('size'));
  const millimetreWall = wall()
    .replace(/-100\n/g, '-1000\n')
    .replace(/-200\n/g, '-2000\n')
    .replace(/300\n/g, '3000\n')
    .replace(/100\n/g, '1000\n');
  assert.equal(importDxf(drawing(millimetreWall, 4)).widthMeters, 4);
  assert.equal(importDxf(drawing(wall(), 6)).widthMeters, 400);
});
test('dimension labels and title positions do not change the drawing bounds or inject markup', () => {
  const annotations =
    '0\nTEXT\n8\nDIMENSIONS\n10\n999999\n20\n999999\n1\n<script>alert(1)</script>\n';
  const plan = importDxf(drawing(wall() + annotations));
  assert.equal(plan.widthMeters, 4);
  assert.equal(dxfSvg(plan).includes('script'), false);
});
test('gaps between separate walls remain open', () => {
  const segment = (x1, y1, x2, y2) =>
    `0\nLINE\n8\nWALLS\n10\n${x1}\n20\n${y1}\n11\n${x2}\n21\n${y2}\n`;
  const plan = importDxf(drawing(segment(0, 0, 500, 0) + segment(500, 0, 500, 400)));
  assert.equal(plan.paths.length, 2);
  assert.equal(
    plan.paths.every((path) => !path.closed),
    true,
  );
  assert.equal(dxfSvg(plan).includes('polygon'), false);
});
test('quadratic splines render the curve, not the control polygon; furniture can be hidden', () => {
  const curve =
    '0\nSPLINE\n8\nFURNITURE\n71\n2\n40\n0\n40\n0\n40\n0\n40\n1\n40\n1\n40\n1\n10\n0\n20\n0\n10\n100\n20\n100\n10\n200\n20\n0\n';
  const plan = importDxf(drawing(wall() + curve));
  const points = plan.paths[1].points;
  assert.deepEqual(points[0], [1, 1]);
  assert.deepEqual(points.at(-1), [3, 1]);
  assert.ok(Math.abs(points[12][1] - 0.5) < 1e-9);
  assert.equal(dxfSvg(plan, false).includes('#a77c42'), false);
});
test('unsupported blocks, unknown geometry layers, bulges and 3D elevations fail visibly', () => {
  for (const extra of [
    '0\nINSERT\n8\n0\n2\nroom\n',
    '0\nCIRCLE\n8\nWALLS\n',
    '0\nLINE\n8\nUNKNOWN\n',
  ]) {
    assert.throws(() => importDxf(drawing(wall() + extra)), error('unsupported'));
  }
  assert.throws(() => importDxf(drawing(wall('42\n1\n'))), error('unsupported'));
  assert.throws(() => importDxf(drawing(wall('38\n5\n'))), error('unsupported'));
  assert.throws(
    () => importDxf(drawing(wall() + '0\nLINE\n8\nWALLS\n10\n0\n20\n0\n11\n100\n21\n100\n31\n5\n')),
    error('unsupported'),
  );
});

test('rational splines preserve circular arcs and raster dimensions are bounded', () => {
  const arc =
    '0\nSPLINE\n8\nFURNITURE\n71\n2\n40\n0\n40\n0\n40\n0\n40\n1\n40\n1\n40\n1\n41\n1\n41\n0.7071067811865476\n41\n1\n10\n100\n20\n0\n10\n100\n20\n100\n10\n0\n20\n100\n';
  const plan = importDxf(drawing(wall() + arc));
  const middle = plan.paths[1].points[12];
  assert.ok(Math.abs(middle[0] - (1 + Math.SQRT1_2)) < 1e-9);
  assert.ok(Math.abs(middle[1] - (1 - Math.SQRT1_2)) < 1e-9);
  const large = importDxf(drawing(wall(), 6));
  assert.match(dxfSvg(large), /width="2400" height="1800"/);
});
test('invalid pairs, missing walls and oversized input are rejected', () => {
  assert.throws(() => importDxf('not a DXF'), error('invalid'));
  assert.throws(() => importDxf(drawing('')), error('walls'));
  assert.throws(() => importDxf('x'.repeat(5 * 1024 * 1024 + 1)), error('size'));
  assert.throws(() => importDxf(drawing(wall()).replace('300', 'NaN')), error('invalid'));
});

// Optional integration fixture: keep the user's private room capture outside the repo.
if (process.argv[2]) {
  const contents = await readFile(process.argv[2], 'utf8');
  test('the supplied OpenPlan3D room capture imports all visual layers at its measured scale', () => {
    const plan = importDxf(contents);
    assert.equal(plan.unit, 5);
    assert.equal(plan.widthMeters, 10.49);
    assert.equal(plan.heightMeters, 7.99);
    assert.deepEqual(plan.counts, { WALLS: 11, WINDOWS: 6, DOORS: 0, FURNITURE: 393 });
    assert.ok(
      plan.paths.every((path) =>
        path.points.every(
          ([x, y]) =>
            Number.isFinite(x) &&
            Number.isFinite(y) &&
            x >= 0 &&
            y >= 0 &&
            x <= plan.widthMeters &&
            y <= plan.heightMeters,
        ),
      ),
    );
    assert.ok(dxfSvg(plan).length > 1000);
  });
}
