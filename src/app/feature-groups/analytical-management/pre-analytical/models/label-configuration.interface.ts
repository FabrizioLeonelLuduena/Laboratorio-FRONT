/**
 * DTO for creating a label configuration
 */
export interface LabelConfigurationCreateDTO {
  name: string;
  printCount: number;
  analysisIds: number[];
}

/**
 * DTO for updating a label configuration
 */
export interface LabelConfigurationUpdateDTO {
  name?: string;
  printCount?: number;
  analysisIds?: number[];
}

/**
 * Complete label configuration entity
 */
export interface LabelConfigurationDTO {
  id: number;
  name: string;
  printCount: number;
  analysisIds: number[];
  isActive: boolean;
  createdDatetime: string;
  lastUpdatedDatetime: string;
  createdUser: number;
  lastUpdatedUser: number;
  version: number;
}

/**
 * Type representing a row in the label configuration table
 */
export type LabelConfigurationRow = {
    id: number;
    name: string;
    printCount: number;
    analysisNames: string;
}