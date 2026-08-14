/**
 * selectWalletView / somePendingFrom — the pure render projection, driven
 * directly. Pins the four render outcomes against the exact input shapes the
 * mount test exercises (LoadedApp.mountFence), so the extraction preserves
 * behavior, plus the somePending-derived Send predicate the mount cannot reach
 * cheaply.
 */
import {
  type WalletViewSource,
  selectWalletView,
  somePendingFrom,
} from '../app/AppState/walletView';
import { ModeEnum } from '../app/AppState/enums/ModeEnum';
import { SelectServerEnum } from '../app/AppState/enums/SelectServerEnum';
import TotalBalanceClass from '../app/AppState/classes/TotalBalanceClass';
import type ValueTransferType from '../app/AppState/types/ValueTransferType';
import { ValueTransferKindEnum } from '../app/AppState/enums/ValueTransferKindEnum';
import { RPCValueTransfersStatusEnum } from '../app/walletBackend/enums/RPCValueTransfersStatusEnum';

const balance = (over: Partial<TotalBalanceClass> = {}): TotalBalanceClass =>
  Object.assign(new TotalBalanceClass(), over);

const vt = (over: Partial<ValueTransferType> = {}): ValueTransferType => ({
  txid: 'tx',
  kind: ValueTransferKindEnum.Received,
  confirmations: 10,
  blockheight: 1,
  time: 0,
  amount: 0,
  status: RPCValueTransfersStatusEnum.confirmed,
  ...over,
});

const source = (over: Partial<WalletViewSource> = {}): WalletViewSource => ({
  mode: ModeEnum.advanced,
  readOnly: false,
  selectServer: SelectServerEnum.auto,
  totalBalance: null,
  valueTransfers: null,
  valueTransfersTotal: null,
  addresses: [],
  ...over,
});

describe('selectWalletView — the four render outcomes', () => {
  it('fullWithSend: advanced, spendable, online', () => {
    expect(
      selectWalletView(
        source({
          mode: ModeEnum.advanced,
          readOnly: false,
          selectServer: SelectServerEnum.auto,
        }),
      ),
    ).toBe('fullWithSend');
  });

  it('fullWithoutSend: read-only hides Send', () => {
    expect(
      selectWalletView(source({ mode: ModeEnum.advanced, readOnly: true })),
    ).toBe('fullWithoutSend');
  });

  it('receiveOnly: basic, empty, addresses known', () => {
    expect(
      selectWalletView(
        source({
          mode: ModeEnum.basic,
          readOnly: false,
          valueTransfersTotal: null,
          totalBalance: null,
          addresses: [],
        }),
      ),
    ).toBe('receiveOnly');
  });

  it('spinner: basic, empty, addresses still null', () => {
    expect(
      selectWalletView(
        source({
          mode: ModeEnum.basic,
          readOnly: false,
          valueTransfersTotal: null,
          totalBalance: null,
          addresses: null,
        }),
      ),
    ).toBe('spinner');
  });
});

describe('selectWalletView — the full gate and the Send predicate', () => {
  it('a positive value-transfer total opens the full view; Send waits on funds', () => {
    // full via the total, but a null balance cannot satisfy the Send predicate
    expect(
      selectWalletView(source({ mode: ModeEnum.basic, valueTransfersTotal: 3 })),
    ).toBe('fullWithoutSend');
  });

  it('confirmed shielded funds open the full view in basic mode', () => {
    expect(
      selectWalletView(
        source({
          mode: ModeEnum.basic,
          totalBalance: balance({ confirmedOrchardBalance: 5 }),
        }),
      ),
    ).toBe('fullWithSend');
  });

  it('offline hides Send even in advanced mode', () => {
    expect(
      selectWalletView(
        source({
          mode: ModeEnum.advanced,
          selectServer: SelectServerEnum.offline,
        }),
      ),
    ).toBe('fullWithoutSend');
  });

  it('a fully-unconfirmed pool shows Send only while a transfer is pending', () => {
    const bal = balance({
      totalOrchardBalance: 100,
      confirmedOrchardBalance: 0,
    });
    // full via the value-transfer total; basic so mode does not force Send
    const withPending = source({
      mode: ModeEnum.basic,
      valueTransfersTotal: 1,
      totalBalance: bal,
      valueTransfers: [vt({ confirmations: 1 })],
    });
    const withoutPending = source({
      mode: ModeEnum.basic,
      valueTransfersTotal: 1,
      totalBalance: bal,
      valueTransfers: [vt({ confirmations: 10 })],
    });

    expect(selectWalletView(withPending)).toBe('fullWithSend');
    expect(selectWalletView(withoutPending)).toBe('fullWithoutSend');
  });
});

describe('somePendingFrom — pending predicate over observed data', () => {
  it('no data is not pending', () => {
    expect(somePendingFrom(null)).toBe(false);
    expect(somePendingFrom([])).toBe(false);
  });

  it('a confirmed transfer is not pending', () => {
    expect(somePendingFrom([vt({ confirmations: 3 })])).toBe(false);
  });

  it('an unconfirmed, non-failed transfer is pending', () => {
    expect(
      somePendingFrom([
        vt({
          confirmations: 1,
          status: RPCValueTransfersStatusEnum.mempool,
        }),
      ]),
    ).toBe(true);
  });

  it('a failed transfer is never pending', () => {
    expect(
      somePendingFrom([
        vt({ confirmations: 0, status: RPCValueTransfersStatusEnum.failed }),
      ]),
    ).toBe(false);
  });

  it('a negative confirmation count is not pending', () => {
    expect(somePendingFrom([vt({ confirmations: -1 })])).toBe(false);
  });
});
