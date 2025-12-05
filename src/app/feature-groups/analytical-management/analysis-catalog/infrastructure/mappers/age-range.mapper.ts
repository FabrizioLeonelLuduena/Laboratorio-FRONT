import { AgeRange } from '../../domain/age-range.model';
import { AgeRangeDTO } from '../dto/age-range.dto';

/**
 * Mapper para AgeRange
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class AgeRangeMapper {
  /**
   * Converts AgeRange DTO to domain model
   */
  static fromDTO(dto: AgeRangeDTO): AgeRange {
    return {
      id: dto.id,
      name: dto.name,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser,
      minValue: dto.minValue,
      maxValue: dto.maxValue,
      timeUnit: dto.timeUnit
    };
  }

  /**
   * Converts AgeRange domain model to DTO
   */
  static toDTO(model: AgeRange): AgeRangeDTO {
    return {
      id: model.id,
      name: model.name,
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser,
      minValue: model.minValue,
      maxValue: model.maxValue,
      timeUnit: model.timeUnit
    };
  }
}
