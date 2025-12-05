import { HandlingTime } from '../../domain/handling-time.model';
import { HandlingTimeDTO } from '../dto/handling-time.dto';

/**
 * Mapper para transformar entre HandlingTime (domain) y HandlingTimeDTO (infrastructure).
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class HandlingTimeMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: HandlingTimeDTO): HandlingTime {
    return {
      id: dto.id,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser,
      timeValue: dto.timeValue,
      timeUnit: dto.timeUnit
    };
  }

  /**
   * Converts domain model to DTO
   */
  static toDTO(model: HandlingTime): HandlingTimeDTO {
    return {
      id: model.id,
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser,
      timeValue: model.timeValue,
      timeUnit: model.timeUnit
    };
  }
}
