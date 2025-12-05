import { PreAnalyticalPhaseSetting, AnalyticalPhaseSetting, PostAnalyticalPhaseSetting } from '../../domain/phase-settings.model';
import { PreAnalyticalPhaseSettingDTO, AnalyticalPhaseSettingDTO, PostAnalyticalPhaseSettingDTO } from '../dto/phase-settings.dto';

import { AnalyticalMethodMapper } from './analytical-method.mapper';
import { ReferenceValueMapper } from './reference-value.mapper';

/**
 * Mapper para PreAnalyticalPhaseSetting
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class PreAnalyticalPhaseSettingMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: PreAnalyticalPhaseSettingDTO): PreAnalyticalPhaseSetting {
    return {
      id: dto.id,
      observations: dto.observations,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser,
      preIndications: dto.preIndications
    };
  }

  /**
   * Converts domain model to DTO
   */
  static toDTO(model: PreAnalyticalPhaseSetting): PreAnalyticalPhaseSettingDTO {
    return {
      id: model.id,
      observations: model.observations,
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser,
      preIndications: model.preIndications
    };
  }
}

/**
 * Mapper para AnalyticalPhaseSetting
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class AnalyticalPhaseSettingMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: AnalyticalPhaseSettingDTO): AnalyticalPhaseSetting {
    return {
      id: dto.id,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser,
      analyticalMethod: dto.analyticalMethod ? AnalyticalMethodMapper.fromDTO(dto.analyticalMethod) : undefined
    };
  }

  /**
   * Converts domain model to DTO
   */
  static toDTO(model: AnalyticalPhaseSetting): AnalyticalPhaseSettingDTO {
    return {
      id: model.id,
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser,
      analyticalMethod: model.analyticalMethod ? AnalyticalMethodMapper.toDTO(model.analyticalMethod) : undefined
    };
  }
}

/**
 * Mapper para PostAnalyticalPhaseSetting
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class PostAnalyticalPhaseSettingMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: PostAnalyticalPhaseSettingDTO): PostAnalyticalPhaseSetting {
    return {
      id: dto.id,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser,
      referenceValues: dto.referenceValues?.map(ReferenceValueMapper.fromDTO)
    };
  }

  /**
   * Converts domain model to DTO
   */
  static toDTO(model: PostAnalyticalPhaseSetting): PostAnalyticalPhaseSettingDTO {
    return {
      id: model.id,
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser,
      referenceValues: model.referenceValues?.map(ReferenceValueMapper.toDTO)
    };
  }
}
