import { fitRing } from '@screens/Insight/components/Donut';

test('Tests that the ring keeps its base size when the middle content is small.', () => {
  const { geometry, scale } = fitRing({ width: 90, height: 50 }, 320);
  expect(geometry.size).toBe(232);
  expect(scale).toBe(1);
});

test('Tests that the ring grows and keeps the padding when the amount is wide.', () => {
  const content = { width: 190, height: 60 };
  const { geometry, scale } = fitRing(content, 400);
  const inner = geometry.r - 14;
  expect(geometry.size).toBeGreaterThan(232);
  expect(inner - Math.hypot(content.width / 2, content.height / 2)).toBeCloseTo(
    14,
  );
  expect(scale).toBe(1);
});

test('Tests that the content shrinks to fit when the ring would outgrow the card.', () => {
  const { geometry, scale } = fitRing({ width: 260, height: 60 }, 300);
  expect(geometry.size).toBeLessThanOrEqual(300);
  expect(scale).toBeLessThan(1);
});
