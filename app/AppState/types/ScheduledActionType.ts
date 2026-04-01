import { StakingActionKindEnum } from "../enums/StakingActionKindEnum";

export default interface ScheduledActionType {
  id: number;
  kind: StakingActionKindEnum;
  amount: number;
  finalizer: string;
  finalizerNew: string;
}
