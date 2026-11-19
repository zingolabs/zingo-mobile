import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RoomNote from '@screens/AddWallet/RoomNote';
import { isDiskFull } from '@app/services/diskFull';

test('Tests that the note names the megabytes a wallet needs when the storage is full', () => {
  render(
    <RoomNote
      room={{ kind: 'full', mb: 250 }}
      translate={(key: string) =>
        key === 'disk.full-note' ? 'needs {mb} MB' : key
      }
    />,
  );
  expect(screen.getByText('needs 250 MB')).toBeOnTheScreen();
});

test('Tests that the note is absent when the storage has room', () => {
  render(<RoomNote room={{ kind: 'room' }} translate={(key: string) => key} />);
  expect(screen.queryByText('disk.full-note')).toBeNull();
});

test('Tests that only a DiskFull rejection reads as a full disk when a save fails', () => {
  expect(
    isDiskFull({ ok: false, error: { code: 'DiskFull', message: '' } }),
  ).toBe(true);
  expect(
    isDiskFull({ ok: false, error: { code: 'Unknown', message: '' } }),
  ).toBe(false);
  expect(isDiskFull({ ok: true, value: '' })).toBe(false);
});
