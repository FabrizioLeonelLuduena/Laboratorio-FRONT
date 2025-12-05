import { ReferenceValue } from '../../domain/reference-value.model';
import { ReferenceValueDTO } from '../dto/reference-value.dto';

import { AgeRangeMapper } from './age-range.mapper';
import { MeasurementUnitMapper } from './measurement-unit.mapper';

/**
 * Mapper para ReferenceValue
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class ReferenceValueMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: ReferenceValueDTO): ReferenceValue {
    return {
      id: dto.id,
      gender: dto.gender,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser,
      minValue: dto.minValue,
      maxValue: dto.maxValue,
      criticalMinValue: dto.criticalMinValue,
      criticalMaxValue: dto.criticalMaxValue,
      ageRange: dto.ageRange ? AgeRangeMapper.fromDTO(dto.ageRange) : undefined,
      measurementUnit: dto.measurementUnit ? MeasurementUnitMapper.fromDTO(dto.measurementUnit) : undefined,
      referenceTemplate: dto.referenceTemplate
    };
  }

  /**
   * Converts domain model to DTO
   */
  static toDTO(model: ReferenceValue): ReferenceValueDTO {
    return {
      id: model.id,
      gender: model.gender,
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser,
      minValue: model.minValue,
      maxValue: model.maxValue,
      criticalMinValue: model.criticalMinValue,
      criticalMaxValue: model.criticalMaxValue,
      ageRange: model.ageRange ? AgeRangeMapper.toDTO(model.ageRange) : undefined,
      measurementUnit: model.measurementUnit ? MeasurementUnitMapper.toDTO(model.measurementUnit) : undefined,
      referenceTemplate: model.referenceTemplate
    };
  }
}
