import { MeasurementUnit } from '../../domain/measurement-unit.model';
import { MeasurementUnitDTO } from '../dto/measurement-unit.dto';

/**
 * Mapper para MeasurementUnit
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class MeasurementUnitMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: MeasurementUnitDTO): MeasurementUnit {
    return {
      id: dto.id,
      name: dto.name,
      symbol: dto.symbol,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser
    };
  }

  /**
   * Converts domain model to DTO
   */
  static toDTO(model: MeasurementUnit): MeasurementUnitDTO {
    return {
      id: model.id,
      name: model.name,
      symbol: model.symbol,
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser
    };
  }
}
