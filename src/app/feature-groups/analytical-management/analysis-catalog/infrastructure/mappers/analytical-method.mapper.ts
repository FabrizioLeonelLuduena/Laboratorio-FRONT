import { AnalyticalMethod } from '../../domain/analytical-method.model';
import { AnalyticalMethodDTO } from '../dto/analytical-method.dto';

import { MeasurementUnitMapper } from './measurement-unit.mapper';

/**
 * Mapper para AnalyticalMethod
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class AnalyticalMethodMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: AnalyticalMethodDTO): AnalyticalMethod {
    return {
      id: dto.id,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser,
      analyticalType: dto.analyticalType,
      canBringSample: dto.canBringSample,
      measurementUnit: dto.measurementUnit ? MeasurementUnitMapper.fromDTO(dto.measurementUnit) : undefined
    };
  }

  /**
   * Converts domain model to DTO
   */
  static toDTO(model: AnalyticalMethod): AnalyticalMethodDTO {
    return {
      id: model.id,
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser,
      analyticalType: model.analyticalType,
      canBringSample: model.canBringSample,
      measurementUnit: model.measurementUnit ? MeasurementUnitMapper.toDTO(model.measurementUnit) : undefined
    };
  }
}
