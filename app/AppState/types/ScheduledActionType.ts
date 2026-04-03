import { StakingActionKindEnum } from '../enums/StakingActionKindEnum';

export default interface ScheduledActionType {
  id: number;
  kind: StakingActionKindEnum;
  amount: number;
  finalizer: string;
  finalizerTo: string;
  txid: string;
  bondKey: string; // for redelegating only
}
