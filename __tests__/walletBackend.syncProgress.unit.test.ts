import { scanInProgress } from '@app/walletBackend/utils/syncProgress';
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
