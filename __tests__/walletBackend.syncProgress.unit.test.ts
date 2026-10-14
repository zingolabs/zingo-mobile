import {
  rescanStep,
  scanInProgress,
} from '@app/walletBackend/utils/syncProgress';
import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';

const status = (s: Partial<RPCSyncStatusType>) => s as RPCSyncStatusType;

describe('scanInProgress', () => {
  test('empty status reads as not scanning', () => {
    expect(scanInProgress(status({}))).toBe(false);
  });

  test('no open scan ranges reads as not scanning', () => {
    expect(
      scanInProgress(
        status({ scan_ranges: [], percentage_total_outputs_scanned: 40 }),
      ),
    ).toBe(false);
  });

  test('scanning short of the tip is in progress', () => {
    expect(
      scanInProgress(
        status({
          scan_ranges: [{}] as RPCSyncStatusType['scan_ranges'],
          percentage_total_outputs_scanned: 40,
        }),
      ),
    ).toBe(true);
  });

  test('scan at the tip is done', () => {
    expect(
      scanInProgress(
        status({
          scan_ranges: [{}] as RPCSyncStatusType['scan_ranges'],
          percentage_total_outputs_scanned: 100,
        }),
      ),
    ).toBe(false);
  });

  test('falls back to block percentage when outputs are absent', () => {
    expect(
      scanInProgress(
        status({
          scan_ranges: [{}] as RPCSyncStatusType['scan_ranges'],
          percentage_total_blocks_scanned: 100,
        }),
      ),
    ).toBe(false);
  });

  test('open ranges with no percentage yet is in progress', () => {
    expect(
      scanInProgress(
        status({ scan_ranges: [{}] as RPCSyncStatusType['scan_ranges'] }),
      ),
    ).toBe(true);
  });
});

describe('rescanStep', () => {
  const ranges = [{}] as RPCSyncStatusType['scan_ranges'];
  const running = status({
    scan_ranges: ranges,
    percentage_total_outputs_scanned: 40,
  });
  const done = status({
    scan_ranges: ranges,
    percentage_total_outputs_scanned: 100,
  });

  test('Tests that a started rescan keeps going when a finished status of the previous sync arrives', () => {
    expect(rescanStep('started', done)).toBe('started');
  });

  test('Tests that a started rescan turns scanning when its sync shows running', () => {
    expect(rescanStep('started', running)).toBe('scanning');
  });

  test('Tests that a scanning rescan ends when its sync reaches the tip', () => {
    expect(rescanStep('scanning', done)).toBe('none');
  });

  test('Tests that a scanning rescan keeps going when the status is empty', () => {
    expect(rescanStep('scanning', status({}))).toBe('scanning');
  });

  test('Tests that no rescan stays none when a sync runs', () => {
    expect(rescanStep('none', running)).toBe('none');
  });
});
