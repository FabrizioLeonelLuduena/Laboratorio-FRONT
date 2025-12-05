import { NbuVersionDetail } from '../../domain/nbu-version-detail.model';
import { NbuVersionDetailDTO } from '../dto/nbu-version-detail.dto';

import { NbuVersionMapper } from './nbu-version.mapper';

/**
 * Mapper para transformar entre NbuVersionDetail (domain) y NbuVersionDetailDTO (infrastructure).
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class NbuVersionDetailMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: NbuVersionDetailDTO): NbuVersionDetail {
    return {
      id: dto.id,
      nbu: dto.nbu,
      nbuVersion: dto.nbuVersion ? NbuVersionMapper.fromDTO(dto.nbuVersion) : undefined,
      ub: dto.ub,
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
  static toDTO(model: NbuVersionDetail): NbuVersionDetailDTO {
    return {
      id: model.id,
      nbu: model.nbu,
      nbuVersion: model.nbuVersion ? NbuVersionMapper.toDTO(model.nbuVersion) : undefined,
      ub: model.ub,
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser
    };
  }
}
