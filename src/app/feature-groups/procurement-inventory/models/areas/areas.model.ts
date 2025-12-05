import { ActivableEntity } from '../common.models';

/**
 * Area model
 */
export interface Area extends ActivableEntity {
  id: string;
  name: string;
  description: string;
  createdDateTime: Date;
  lastUpdatedDateTime: Date;
}

/**
 * Request area DTO
 */
export interface RequestAreaDTO {
  name: string;
  description: string;
  warehouseId: string;
}

/**
 * Response area DTO
 */
export interface ResponseAreaDTO extends ActivableEntity {
  id: string;
  name: string;
  description: string;
  warehouseId: string;
}
