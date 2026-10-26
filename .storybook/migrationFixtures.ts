// Backend payloads for the migration screen stories. Values in zatoshis,
// mirroring what zingolib returns through the bridge.
import { RPCDrainPlanType } from '@app/walletBackend/types/RPCDrainPlanType';
import { RPCDrainStatusType } from '@app/walletBackend/types/RPCDrainStatusType';

const ZEC = 100_000_000;

export const drainPlan: RPCDrainPlanType = {
  transactions: [
    { inputs: [1.2 * ZEC, 0.3 * ZEC], output: 1.5 * ZEC - 10_000, fee: 10_000 },
    { inputs: [0.75 * ZEC], output: 0.75 * ZEC - 10_000, fee: 10_000 },
  ],
  migrated: 2.25 * ZEC - 20_000,
  fee: 20_000,
  residual: 5_000,
};

export const emptyDrainPlan: RPCDrainPlanType = {
  transactions: [],
  migrated: 0,
  fee: 0,
  residual: 3_000,
};

export const pendingDrainPlan: RPCDrainPlanType = {
  ...emptyDrainPlan,
  residual: 0,
};

export const drainBuilding: RPCDrainStatusType = {
  total: 2,
  built: 1,
  sent: 0,
  phase: 'building',
};
