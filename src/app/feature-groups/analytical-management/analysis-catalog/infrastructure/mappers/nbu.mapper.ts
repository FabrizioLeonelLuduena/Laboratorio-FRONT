import { Nbu } from '../../domain/nbu.model';
import { NbuDTO } from '../dto/nbu.dto';

import { NbuVersionDetailMapper } from './nbu-version-detail.mapper';
import { SpecificStandardInterpretationMapper } from './specific-standard-interpretation.mapper';

/**
 * Mapper para transformar entre Nbu (domain) y NbuDTO (infrastructure).
 * El interceptor ya convierte snake_case ↔ camelCase, por lo que ambos usan camelCase.
 */
export class NbuMapper {
  /**
   * Convierte NbuDTO (camelCase) a Nbu (camelCase)
   */
  static fromDTO(dto: NbuDTO): Nbu {
    return {
      id: dto.id,
      abbreviations: dto.abbreviations,
      synonyms: dto.synonyms,
      determination: dto.determination,
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser,
      nbuCode: dto.nbuCode,
      nbuType: dto.nbuType,
      nbuVersionDetails: dto.nbuVersionDetails?.map(NbuVersionDetailMapper.fromDTO),
      isUrgency: dto.isUrgency,
      isByReference: dto.isByReference,
      isInfrequent: dto.isInfrequent,
      specificStandardInterpretation: dto.specificStandardInterpretation
        ? SpecificStandardInterpretationMapper.fromDTO(dto.specificStandardInterpretation)
        : undefined
    };
  }

  /**
   * Convierte Nbu (camelCase) a NbuDTO (camelCase)
   */
  static toDTO(model: Nbu): NbuDTO {
    return {
      id: model.id,
      abbreviations: model.abbreviations,
      synonyms: model.synonyms,
      determination: model.determination,
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser,
      nbuCode: model.nbuCode,
      nbuType: model.nbuType,
      nbuVersionDetails: model.nbuVersionDetails?.map(NbuVersionDetailMapper.toDTO),
      isUrgency: model.isUrgency,
      isByReference: model.isByReference,
      isInfrequent: model.isInfrequent,
      specificStandardInterpretation: model.specificStandardInterpretation
        ? SpecificStandardInterpretationMapper.toDTO(model.specificStandardInterpretation)
        : undefined
    };
  }

  /**
   * Convierte un objeto parcial de Nbu a NbuDTO (para PATCH)
   */
  static partialToDTO(partial: Partial<Nbu>): Partial<NbuDTO> {
    const dto: Partial<NbuDTO> = {};

    if (partial.id !== undefined) dto.id = partial.id;
    if (partial.abbreviations !== undefined) dto.abbreviations = partial.abbreviations;
    if (partial.synonyms !== undefined) dto.synonyms = partial.synonyms;
    if (partial.determination !== undefined) dto.determination = partial.determination;
    if (partial.entityVersion !== undefined) dto.entityVersion = partial.entityVersion;
    if (partial.createdDatetime !== undefined) dto.createdDatetime = partial.createdDatetime;
    if (partial.lastUpdatedDatetime !== undefined) dto.lastUpdatedDatetime = partial.lastUpdatedDatetime;
    if (partial.createdUser !== undefined) dto.createdUser = partial.createdUser;
    if (partial.lastUpdatedUser !== undefined) dto.lastUpdatedUser = partial.lastUpdatedUser;
    if (partial.nbuCode !== undefined) dto.nbuCode = partial.nbuCode;
    if (partial.nbuType !== undefined) dto.nbuType = partial.nbuType;
    if (partial.nbuVersionDetails !== undefined) {
      dto.nbuVersionDetails = partial.nbuVersionDetails.map(NbuVersionDetailMapper.toDTO);
    }
    if (partial.isUrgency !== undefined) dto.isUrgency = partial.isUrgency;
    if (partial.isByReference !== undefined) dto.isByReference = partial.isByReference;
    if (partial.isInfrequent !== undefined) dto.isInfrequent = partial.isInfrequent;
    if (partial.specificStandardInterpretation !== undefined) {
      dto.specificStandardInterpretation = SpecificStandardInterpretationMapper.toDTO(
        partial.specificStandardInterpretation
      );
    }

    return dto;
  }
}
