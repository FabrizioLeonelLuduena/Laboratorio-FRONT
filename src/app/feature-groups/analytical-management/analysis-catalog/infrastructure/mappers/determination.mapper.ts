import { Determination } from '../../domain/determination.model';
import { DeterminationDTO } from '../dto/determination.dto';

import { HandlingTimeMapper } from './handling-time.mapper';
import { PreAnalyticalPhaseSettingMapper, AnalyticalPhaseSettingMapper, PostAnalyticalPhaseSettingMapper } from './phase-settings.mapper';
import { ResultSettingMapper } from './result-setting.mapper';

/**
 * Mapper para transformar entre Determination (domain) y DeterminationDTO (infrastructure).
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class DeterminationMapper {
  /**
   * Convierte DeterminationDTO (camelCase) a Determination (camelCase)
   */
  static fromDTO(dto: DeterminationDTO): Determination {
    return {
      id: dto.id,
      name: dto.name,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser,
      percentageVariationTolerated: dto.percentageVariationTolerated,
      preAnalyticalPhaseSetting: dto.preAnalyticalPhaseSetting
        ? PreAnalyticalPhaseSettingMapper.fromDTO(dto.preAnalyticalPhaseSetting)
        : undefined,
      analyticalPhaseSetting: dto.analyticalPhaseSetting
        ? AnalyticalPhaseSettingMapper.fromDTO(dto.analyticalPhaseSetting)
        : undefined,
      postAnalyticalPhaseSetting: dto.postAnalyticalPhaseSetting
        ? PostAnalyticalPhaseSettingMapper.fromDTO(dto.postAnalyticalPhaseSetting)
        : undefined,
      resultSetting: dto.resultSetting ? ResultSettingMapper.fromDTO(dto.resultSetting) : undefined,
      handlingTime: dto.handlingTime ? HandlingTimeMapper.fromDTO(dto.handlingTime) : undefined
    };
  }

  /**
   * Convierte Determination (camelCase) a DeterminationDTO (camelCase)
   */
  static toDTO(model: Determination): DeterminationDTO {
    return {
      id: model.id,
      name: model.name,
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser,
      percentageVariationTolerated: model.percentageVariationTolerated,
      preAnalyticalPhaseSetting: model.preAnalyticalPhaseSetting
        ? PreAnalyticalPhaseSettingMapper.toDTO(model.preAnalyticalPhaseSetting)
        : undefined,
      analyticalPhaseSetting: model.analyticalPhaseSetting
        ? AnalyticalPhaseSettingMapper.toDTO(model.analyticalPhaseSetting)
        : undefined,
      postAnalyticalPhaseSetting: model.postAnalyticalPhaseSetting
        ? PostAnalyticalPhaseSettingMapper.toDTO(model.postAnalyticalPhaseSetting)
        : undefined,
      resultSetting: model.resultSetting ? ResultSettingMapper.toDTO(model.resultSetting) : undefined,
      handlingTime: model.handlingTime ? HandlingTimeMapper.toDTO(model.handlingTime) : undefined
    };
  }

  /**
   * Convierte un objeto parcial de Determination a DeterminationDTO (para PATCH)
   */
  static partialToDTO(partial: Partial<Determination>): Partial<DeterminationDTO> {
    const dto: Partial<DeterminationDTO> = {};

    if (partial.id !== undefined) dto.id = partial.id;
    if (partial.name !== undefined) dto.name = partial.name;
    if (partial.entityVersion !== undefined) dto.entityVersion = partial.entityVersion;
    if (partial.createdDatetime !== undefined) dto.createdDatetime = partial.createdDatetime;
    if (partial.lastUpdatedDatetime !== undefined) dto.lastUpdatedDatetime = partial.lastUpdatedDatetime;
    if (partial.createdUser !== undefined) dto.createdUser = partial.createdUser;
    if (partial.lastUpdatedUser !== undefined) dto.lastUpdatedUser = partial.lastUpdatedUser;
    if (partial.percentageVariationTolerated !== undefined) {
      dto.percentageVariationTolerated = partial.percentageVariationTolerated;
    }
    if (partial.preAnalyticalPhaseSetting !== undefined) {
      dto.preAnalyticalPhaseSetting = PreAnalyticalPhaseSettingMapper.toDTO(
        partial.preAnalyticalPhaseSetting
      );
    }
    if (partial.analyticalPhaseSetting !== undefined) {
      dto.analyticalPhaseSetting = AnalyticalPhaseSettingMapper.toDTO(partial.analyticalPhaseSetting);
    }
    if (partial.postAnalyticalPhaseSetting !== undefined) {
      dto.postAnalyticalPhaseSetting = PostAnalyticalPhaseSettingMapper.toDTO(
        partial.postAnalyticalPhaseSetting
      );
    }
    if (partial.resultSetting !== undefined) {
      dto.resultSetting = ResultSettingMapper.toDTO(partial.resultSetting);
    }
    if (partial.handlingTime !== undefined) {
      dto.handlingTime = HandlingTimeMapper.toDTO(partial.handlingTime);
    }

    return dto;
  }
}
