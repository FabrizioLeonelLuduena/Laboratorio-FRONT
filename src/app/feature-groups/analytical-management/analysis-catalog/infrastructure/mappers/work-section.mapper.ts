import { WorkSection } from '../../domain/work-section.model';
import { WorkSectionDTO } from '../dto/work-section.dto';

/**
 * Mapper para transformar entre WorkSection (domain) y WorkSectionDTO (infrastructure).
 */
export class WorkSectionMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: WorkSectionDTO): WorkSection {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description
    };
  }

  /**
   * Converts domain model to DTO
   */
  static toDTO(model: WorkSection): WorkSectionDTO {
    return {
      id: model.id,
      name: model.name,
      description: model.description
    };
  }
}
