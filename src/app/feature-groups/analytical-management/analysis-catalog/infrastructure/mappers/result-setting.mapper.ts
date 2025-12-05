import { ResultSetting } from '../../domain/result-setting.model';
import { ResultSettingDTO } from '../dto/result-setting.dto';

/**
 * Mapper para transformar entre ResultSetting (domain) y ResultSettingDTO (infrastructure).
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class ResultSettingMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: ResultSettingDTO): ResultSetting {
    return {
      id: dto.id,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser,
      isPrintable: dto.isPrintable,
      printOrder: dto.printOrder,
      printGroup: dto.printGroup,
      specialPrintName: dto.specialPrintName,
      loadingResultOrder: dto.loadingResultOrder,
      requiresLoadValue: dto.requiresLoadValue,
      requiresApproval: dto.requiresApproval,
      canSelfApprove: dto.canSelfApprove
    };
  }

  /**
   * Converts domain model to DTO
   */
  static toDTO(model: ResultSetting): ResultSettingDTO {
    return {
      id: model.id,
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser,
      isPrintable: model.isPrintable,
      printOrder: model.printOrder,
      printGroup: model.printGroup,
      specialPrintName: model.specialPrintName,
      loadingResultOrder: model.loadingResultOrder,
      requiresLoadValue: model.requiresLoadValue,
      requiresApproval: model.requiresApproval,
      canSelfApprove: model.canSelfApprove
    };
  }
}
