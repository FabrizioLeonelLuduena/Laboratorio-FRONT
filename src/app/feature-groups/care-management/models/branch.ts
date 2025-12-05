
import { Address } from './address';
import { Contact } from './contact';
import { Responsible } from './responsible';
import { Schedule } from './schedule';

/**
 * Interface that represents the branch that will be received from the backend.
 */
export interface Branch {
  id: number;
  code: string;
  description: string;
  responsibleName: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  status: string;
  boxCount?: number;
  assistantDesk?: number;
  contacts?: Contact[];
  schedules?: Schedule[];
  contactInfo?: {
    phoneNumber?: string | null;
    email?: string | null;
  };
}

/**
 * Interface that represents the branch that will be received from the backend.
 */
export interface BranchResponse {
  id: number;
  code: string;
  description: string;
  responsible?: Responsible;
  address?: Address;
  contacts?: Contact[];
  schedules?: Schedule[];
  status: string;
  boxCount?: number;
  assistantDesk?: number;
  registerCount?: number;
}

/**
 * Interface that represents the branch resume that will be received from the backend.
 */
export interface BranchResume {
  id: number;
  code: string;
  description: string;
  latitude: number;
  longitude: number;
  /** Optional because backend may omit or return null */
  boxCount?: number;
  /** Optional because backend may omit or return null */
  registerCount?: number;
  /** Optional because backend may omit or return null */
  assistantDesk?: number;
}
