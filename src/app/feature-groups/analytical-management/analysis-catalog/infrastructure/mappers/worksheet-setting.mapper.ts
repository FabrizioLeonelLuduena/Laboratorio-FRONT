import { WorksheetSetting } from '../../domain/worksheet-setting.model';
import { WorksheetSettingDTO } from '../dto/worksheet-setting.dto';

/**
 * Mapper to transform between WorksheetSetting (domain) and WorksheetSettingDTO (infrastructure).
 * The interceptor already converts snake_case ↔ camelCase, so both use camelCase.
 */
export class WorksheetSettingMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: WorksheetSettingDTO): WorksheetSetting {
    return {
      id: dto.id ?? 0,
      name: dto.name,
      description: dto.description,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser,
      workSectionId: dto.workSectionId
    };
  }

  /**
   * Converts domain model to DTO
   * @param model - The domain model to convert
   * Note: Never sends createdDatetime, lastUpdatedDatetime, createdUser, or lastUpdatedUser
   */
  static toDTO(model: WorksheetSetting): WorksheetSettingDTO {
    const dto: WorksheetSettingDTO = {
      name: model.name,
      description: model.description
    };

    // Include id if it exists and is greater than 0
    if (model.id && model.id > 0) {
      dto.id = model.id;
    }

    // Include entityVersion if it exists
    if (model.entityVersion !== undefined) {
      dto.entityVersion = model.entityVersion;
    }

    // workSectionId is always included if defined
    if (model.workSectionId !== undefined) {
      dto.workSectionId = model.workSectionId;
    }

    // Never include audit fields (createdDatetime, lastUpdatedDatetime, createdUser, lastUpdatedUser)

    return dto;
  }
}
