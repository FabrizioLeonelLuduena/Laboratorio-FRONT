/**
 * ============================
 * Branch Models and DTOs
 * ============================
 */

import { AreaResponse } from './area.models';

/** Schedule type enum (matches backend ScheduleType) */
export enum ScheduleType {
  ATTENTION = 'ATTENTION',
  EXTRACTION = 'EXTRACTION',
  REGULAR = 'REGULAR',
  URGENCIES = 'URGENCIES'
}

/**
 * Schedule DTO
 */
export interface ScheduleDTO {
  /** First day of the schedule (e.g., Monday). */
  dayFrom: string;

  /** Last day of the schedule (e.g., Friday). */
  dayTo: string;

  /** Starting time of the schedule (HH:mm). */
  scheduleFromTime: string;

  /** Ending time of the schedule (HH:mm). */
  scheduleToTime: string;

  /** Type of schedule (matches backend enum ScheduleType). */
  scheduleType: ScheduleType;
}

/** Contact type enum (matches backend ContactType) */
export enum ContactType {
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  OTHER = 'OTHER'
}

/**
 * Contact DTO
 */
export interface ContactDTO {
  /** Contact value (e.g., phone number, email, etc.) */
  contact: string;

  /** Type of contact (matches backend enum ContactType) */
  contactType: ContactType;
}

/** Possible branch statuses (matches backend BranchStatus enum) */
export enum BranchStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
}

/**
 * Branch response DTO (structure returned by backend)
 */
export interface BranchResponseDTO {
  id: number;
  code: string;
  description: string;
  status: BranchStatus | string;
  responsibleName: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  lastUpdatedDate: string;
  lastUpdatedUser: string;
  contacts: ContactDTO[];
  schedules: ScheduleDTO[];
}

/**
 * Domain model for the frontend (camelCase naming)
 */
export interface Branch {
  id: number;
  code: string;
  description: string;
  status: BranchStatus | string;
  responsibleName: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  lastUpdatedDate: string;
  lastUpdatedUser: string;
  contacts: ContactDTO[];
  schedules: ScheduleDTO[];
}

/**
 * Branch option (simplified representation)
 */
export interface BranchOption {
  id: number;
  description: string;
}

/**
 * Branch option DTO (used in some endpoints)
 */
export interface BranchOptionDTO {
  branchId: number;
  branchName: string;
}

/**
 * Sorting metadata used in pageable responses
 */
export interface SortDTO {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
}

/**
 * Pageable metadata (pagination configuration)
 */
export interface PageableDTO {
  offset: number;
  sort: SortDTO;
  pageNumber: number;
  unpaged: boolean;
  paged: boolean;
  pageSize: number;
}

/**
 * Generic Page interface for paginated backend responses
 */
export interface Page<T> {
  totalPages: number;
  totalElements: number;
  size: number;
  content: T[];
  number: number;
  sort: SortDTO;
  last: boolean;
  first: boolean;
  numberOfElements: number;
  pageable: PageableDTO;
  empty: boolean;
}

/**
 *
 */
export interface BranchDetailResponseDTO {
  id: number;
  code: string;
  description: string;
  status: BranchStatus | string;
  responsibleName: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  boxCount: number;
  registerCount: number;
  contacts: ContactDTO[];
  schedules: ScheduleDTO[];
  areas: AreaResponse[];
}

/**
 * Specific page response for branches
 */
export type PaginatedBranchResponseDTO = Page<BranchResponseDTO>;
