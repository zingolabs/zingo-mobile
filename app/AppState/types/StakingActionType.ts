import { StakingActionKindEnum } from "../enums/StakingActionKindEnum";

export default interface StakingActionType {
  kind: StakingActionKindEnum;
  val: number;
  target: string;
  unique_public_key: string;
}