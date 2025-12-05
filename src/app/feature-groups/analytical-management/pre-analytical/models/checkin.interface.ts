import { LabelStatus } from './label.interface';

/**
 * Contains basic information about a sample.
 * @interface SampleInfo
 */
export interface SampleInfo {
  id: number;
  protocolNumber: string;
  areaId: number;
  areaName: string;
  sampleType: string;
  status: LabelStatus;
  patientFullName?: string;
  originBranch?: string;
  isUrgent?: boolean;
  atHome?: boolean;
}

/**
 * Event that represents the reception of a sample
 * @interface SampleReceptionEvent
 */
export interface SampleReceptionEvent {
  /** Protocol related */
  protocol: string;
  /** Sample's list */
  samples: SampleInfo[];
  /** event Date */
  timestamp: Date;
}
