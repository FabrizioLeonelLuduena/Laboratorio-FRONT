import { SpecificStandardInterpretation } from '../../domain/specific-standard-interpretation.model';
import { SpecificStandardInterpretationDTO } from '../dto/specific-standard-interpretation.dto';

/**
 * Mapper para transformar entre SpecificStandardInterpretation (domain) y SpecificStandardInterpretationDTO (infrastructure).
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class SpecificStandardInterpretationMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: SpecificStandardInterpretationDTO): SpecificStandardInterpretation {
    return {
      id: dto.id,
      interpretation: dto.interpretation,
      minimumWorkStandard: dto.minimumWorkStandard
    };
  }

  /**
   * Converts domain model to DTO
   */
  static toDTO(model: SpecificStandardInterpretation): SpecificStandardInterpretationDTO {
    return {
      id: model.id,
      interpretation: model.interpretation,
      minimumWorkStandard: model.minimumWorkStandard
    };
  }
}
