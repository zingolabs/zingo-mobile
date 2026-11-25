import { menuDotTone } from '@ui/widgets/Header/menuDot';

test('Tests that the menu dot is red when the server is down, also when the seed is unsaved', () => {
  expect(menuDotTone('down', false)).toBe('danger');
  expect(menuDotTone('down', true)).toBe('danger');
  expect(menuDotTone('unusable', true)).toBe('danger');
});

test('Tests that the menu dot is amber when the server is slow or the seed is unsaved', () => {
  expect(menuDotTone('slow', false)).toBe('warning');
  expect(menuDotTone('ok', true)).toBe('warning');
});

test('Tests that there is no menu dot when the server is fine and the seed is saved', () => {
  expect(menuDotTone('ok', false)).toBe('none');
});
