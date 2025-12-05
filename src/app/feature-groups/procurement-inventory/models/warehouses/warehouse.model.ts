import { ActivableEntity } from '../common.models';

/**
 * Warehouse model
 */
export interface Warehouse extends ActivableEntity {
  id: string;
  name: string;
  type: WarehouseType;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Warehouse type
 */
export enum WarehouseType {
  CENTRAL = 'Central',
  SECONDARY = 'Secundario',
}
    
/**
 * Warehouse request DTO
 */
export interface WarehouseRequestDTO {
  name: string;
  address: string;
  type: WarehouseType;
}

/**
 * Warehouse response DTO
 */
export interface WarehouseResponseDTO extends ActivableEntity {
  id: string;
  name: string;
  address: string;
  type: WarehouseType;
}
