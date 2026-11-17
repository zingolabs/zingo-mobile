export enum RPCPerformanceLevelEnum {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Maximum = 'Maximum',
}

/** The level every wallet syncs at; the app no longer offers a choice. */
export const DEFAULT_PERFORMANCE_LEVEL = RPCPerformanceLevelEnum.Medium;
