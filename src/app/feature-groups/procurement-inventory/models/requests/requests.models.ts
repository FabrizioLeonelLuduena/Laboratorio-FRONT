import { BaseFiltersDTO } from '../../shared/utils/pagination';

/**
 *
 */
export interface RequestResponseDTO {
  id: number;
  creationDate: string; // "yyyy-MM-dd'T'HH:mm:ss"
  originLocationId: number;
  originLocationName?: string;
  destinationLocationId: number;
  destinationLocationName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT' | 'COMPLETED';
  observations?: string;
  isActive: boolean;
  createdDatetime: string;
  lastUpdatedDatetime: string;
  createdUser: number;
  lastUpdatedUser: number;
}

/**
 *
 */
export interface RequestFiltersDTO extends BaseFiltersDTO {
  status?: string;
  originLocationId?: number;
  destinationLocationId?: number;
  fromDate?: string; // yyyy-MM-dd
  toDate?: string;   // yyyy-MM-dd
  isActive?: boolean;
}