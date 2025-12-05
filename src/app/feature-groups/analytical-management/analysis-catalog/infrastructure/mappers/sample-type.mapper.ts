import { SampleType } from '../../domain/sample-type.model';
import { SampleTypeDTO } from '../dto/sample-type.dto';

/**
 * Mapper to transform between SampleType (domain) and SampleTypeDTO (infrastructure).
 * The interceptor already converts snake_case ↔ camelCase, so both use camelCase.
 */
export class SampleTypeMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: SampleTypeDTO): SampleType {
    return {
      id: dto.id ?? 0,
      name: dto.name,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser
    };
  }

  /**
   * Converts domain model to DTO
   * @param model - The domain model to convert
   * Note: Never sends createdDatetime, lastUpdatedDatetime, createdUser, or lastUpdatedUser
   */
  static toDTO(model: SampleType): SampleTypeDTO {
    const dto: SampleTypeDTO = {
      name: model.name
    };

    // Include id if it exists and is greater than 0
    if (model.id && model.id > 0) {
      dto.id = model.id;
    }

    // Include entityVersion if it exists
    if (model.entityVersion !== undefined) {
      dto.entityVersion = model.entityVersion;
    }

    // Never include audit fields (createdDatetime, lastUpdatedDatetime, createdUser, lastUpdatedUser)

    return dto;
  }
}
