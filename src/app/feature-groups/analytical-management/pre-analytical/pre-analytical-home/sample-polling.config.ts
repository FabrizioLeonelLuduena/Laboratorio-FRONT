import { LabelStatus } from '../models/label.interface';

/**
 * Polling configuration based on the status of the sample.
 */
export const SAMPLE_POLLING_CONFIG: Record<string, any> = {
  sample_entry: {
    status: LabelStatus.COLLECTED,
    intervalStart: 120000, // 2min start
    intervalMin: 60000, // 1min high traffic
    intervalMax: 180000, // 3min low traffic
    activityThreshold: 15,
    quietThreshold: 3
  },

  to_prepare: {
    status: LabelStatus.IN_PREPARATION,
    intervalStart: 120000,
    intervalMin: 120000,
    intervalMax: 160000,
    activityThreshold: 10,
    quietThreshold: 2
  },

  to_transport: {
    status: LabelStatus.IN_TRANSIT,
    intervalStart: 160000,
    intervalMin: 120000,
    intervalMax: 180000,
    activityThreshold: 8,
    quietThreshold: 1
  },

  to_receive: {
    status: LabelStatus.DELIVERED,
    intervalStart: 160000,
    intervalMin: 120000,
    intervalMax: 180000,
    activityThreshold: 6,
    quietThreshold: 1
  },

  to_process: {
    status: LabelStatus.PROCESSING,
    intervalStart: 160000,
    intervalMin: 120000,
    intervalMax: 180000,
    activityThreshold: 10,
    quietThreshold: 1
  },

  in_derivation: {
    status: LabelStatus.DERIVED,
    intervalStart: 160000,
    intervalMin: 130000,
    intervalMax: 180000,
    activityThreshold: 5,
    quietThreshold: 1
  },

  to_discard: {
    special: true,
    intervalStart: 160000,
    intervalMin: 130000,
    intervalMax: 180000,
    activityThreshold: 2,
    quietThreshold: 1
  }
} as const;
