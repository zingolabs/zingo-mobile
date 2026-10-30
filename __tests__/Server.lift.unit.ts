import { liftFor } from '@screens/Server/ServerRow';

const CARD_TOP = 98.5 / 874;

test('Tests that the content stays where the prototype puts it when the screen stands alone', () => {
  expect(liftFor('screen', CARD_TOP, 874)).toBe(0);
});

test('Tests that the first block sits 10 under the shared header title when that header is above', () => {
  expect(CARD_TOP * 700 - liftFor('belowHeader', CARD_TOP, 700)).toBeCloseTo(
    10,
  );
});

test('Tests that nothing moves down when the screen is too short to have the gap', () => {
  expect(liftFor('belowHeader', CARD_TOP, 80)).toBe(0);
});
