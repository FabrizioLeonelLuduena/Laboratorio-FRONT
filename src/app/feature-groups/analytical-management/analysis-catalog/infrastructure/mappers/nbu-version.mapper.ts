import { NbuVersion } from '../../domain/nbu-version.model';
import { NbuVersionDTO } from '../dto/nbu-version.dto';

/**
 * Mapper para transformar entre NbuVersion (domain) y NbuVersionDTO (infrastructure).
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class NbuVersionMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: NbuVersionDTO): NbuVersion {
    return {
      id: dto.id,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser,
      versionCode: dto.versionCode,
      publicationYear: dto.publicationYear,
      updateYear: dto.updateYear,
      publicationDate: dto.publicationDate,
      effectivityDate: dto.effectivityDate,
      endDate: dto.endDate
    };
  }

  /**
   * Converts domain model to DTO
   */
  static toDTO(model: NbuVersion): NbuVersionDTO {
    return {
      id: model.id,
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser,
      versionCode: model.versionCode,
      publicationYear: model.publicationYear,
      updateYear: model.updateYear,
      publicationDate: model.publicationDate,
      effectivityDate: model.effectivityDate,
      endDate: model.endDate
    };
  }
}
