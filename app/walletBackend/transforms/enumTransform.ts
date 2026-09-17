/**
 * Maps the generated enums to the string enums the screens render.
 */
import {
  AddressScope,
  Chain,
  MixnetIndicator,
  PerformanceLevel,
  Pool,
  TransferKind,
  TransferStatus,
} from 'zingo-ffi';
import { ChainNameEnum, PoolEnum, ValueTransferKindEnum } from '@app/AppState';
import { PoolNameType } from '@app/AppState/types/ProposalPoolsType';
import { RPCAddressScopeEnum } from '@app/walletBackend/enums/RPCAddressScopeEnum';
import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';

export function chainName(chain: Chain): ChainNameEnum {
  switch (chain) {
    case Chain.Main:
      return ChainNameEnum.mainChainName;
    case Chain.Test:
      return ChainNameEnum.testChainName;
    case Chain.Regtest:
      return ChainNameEnum.regtestChainName;
  }
}

/** The app's chain enum for a server-reported chain name, or undefined for an unknown one. */
export function chainNameOf(name: string): ChainNameEnum | undefined {
  switch (name) {
    case ChainNameEnum.mainChainName:
    case ChainNameEnum.testChainName:
    case ChainNameEnum.regtestChainName:
      return name;
    default:
      return undefined;
  }
}

/** Reads a chain hint such as `regtest:<schedule>` into its chain and schedule. */
export function chainOf(hint: string): {
  chain: Chain;
  regtestSchedule: string | undefined;
} {
  const [name, ...schedule] = hint.split(':');
  const regtestSchedule =
    schedule.length > 0 ? schedule.join(':') : undefined;
  switch (name) {
    case ChainNameEnum.testChainName:
      return { chain: Chain.Test, regtestSchedule };
    case ChainNameEnum.regtestChainName:
      return { chain: Chain.Regtest, regtestSchedule };
    default:
      return { chain: Chain.Main, regtestSchedule };
  }
}

export function performanceLevel(
  level: RPCPerformanceLevelEnum,
): PerformanceLevel {
  switch (level) {
    case RPCPerformanceLevelEnum.Low:
      return PerformanceLevel.Low;
    case RPCPerformanceLevelEnum.Medium:
      return PerformanceLevel.Medium;
    case RPCPerformanceLevelEnum.High:
      return PerformanceLevel.High;
    case RPCPerformanceLevelEnum.Maximum:
      return PerformanceLevel.Maximum;
  }
}

export function performanceLevelName(
  level: PerformanceLevel,
): RPCPerformanceLevelEnum {
  switch (level) {
    case PerformanceLevel.Low:
      return RPCPerformanceLevelEnum.Low;
    case PerformanceLevel.Medium:
      return RPCPerformanceLevelEnum.Medium;
    case PerformanceLevel.High:
      return RPCPerformanceLevelEnum.High;
    case PerformanceLevel.Maximum:
      return RPCPerformanceLevelEnum.Maximum;
  }
}

export function poolName(pool: Pool): PoolEnum {
  switch (pool) {
    case Pool.Transparent:
      return PoolEnum.TransparentPool;
    case Pool.Sapling:
      return PoolEnum.SaplingPool;
    case Pool.Orchard:
      return PoolEnum.OrchardPool;
    case Pool.Ironwood:
      return PoolEnum.IronwoodPool;
  }
}

export function proposalPool(pool: Pool): PoolNameType {
  switch (pool) {
    case Pool.Transparent:
      return 'transparent';
    case Pool.Sapling:
      return 'sapling';
    case Pool.Orchard:
      return 'orchard';
    case Pool.Ironwood:
      return 'ironwood';
  }
}

export function addressScope(scope: AddressScope): RPCAddressScopeEnum {
  switch (scope) {
    case AddressScope.External:
      return RPCAddressScopeEnum.external;
    case AddressScope.Internal:
      return RPCAddressScopeEnum.internal;
    case AddressScope.Refund:
      return RPCAddressScopeEnum.refund;
  }
}

export function mixnetIndicator(
  indicator: MixnetIndicator,
): RPCMixnetIndicatorEnum {
  switch (indicator) {
    case MixnetIndicator.Off:
      return RPCMixnetIndicatorEnum.off;
    case MixnetIndicator.Bootstrapping:
      return RPCMixnetIndicatorEnum.bootstrapping;
    case MixnetIndicator.Ready:
      return RPCMixnetIndicatorEnum.ready;
    case MixnetIndicator.Died:
      return RPCMixnetIndicatorEnum.died;
  }
}

export function transferStatus(
  status: TransferStatus,
): RPCValueTransfersStatusEnum {
  switch (status) {
    case TransferStatus.Calculated:
      return RPCValueTransfersStatusEnum.calculated;
    case TransferStatus.Transmitted:
      return RPCValueTransfersStatusEnum.transmitted;
    case TransferStatus.Mempool:
      return RPCValueTransfersStatusEnum.mempool;
    case TransferStatus.Confirmed:
      return RPCValueTransfersStatusEnum.confirmed;
    case TransferStatus.Failed:
      return RPCValueTransfersStatusEnum.failed;
  }
}

export function transferKind(kind: TransferKind): ValueTransferKindEnum {
  switch (kind) {
    case TransferKind.Sent:
      return ValueTransferKindEnum.Sent;
    case TransferKind.Received:
      return ValueTransferKindEnum.Received;
    case TransferKind.SendToSelf:
      return ValueTransferKindEnum.SendToSelf;
    case TransferKind.Shield:
      return ValueTransferKindEnum.Shield;
    case TransferKind.MemoToSelf:
      return ValueTransferKindEnum.MemoToSelf;
    case TransferKind.Refund:
      return ValueTransferKindEnum.Rejection;
    case TransferKind.Migration:
      return ValueTransferKindEnum.Migration;
  }
}
