import { Analysis } from '../../domain/analysis.model';
import { AnalysisDTO } from '../dto/analysis.dto';

import { DeterminationMapper } from './determination.mapper';
import { NbuMapper } from './nbu.mapper';
import { SampleTypeMapper } from './sample-type.mapper';
import { WorksheetSettingMapper } from './worksheet-setting.mapper';

/**
 * Mapper para transformar entre Analysis (domain) y AnalysisDTO (infrastructure).
 * Ya que caseConverterInterceptor convierte automáticamente snake_case → camelCase,
 * ahora DTO y Domain Model usan ambos camelCase, por lo que el mapper solo necesita
 * aplicar las transformaciones de nested objects.
 */
export class AnalysisMapper {
  /**
   * Convierte AnalysisDTO (camelCase después del interceptor) a Analysis (camelCase)
   */
  static fromDTO(dto: AnalysisDTO): Analysis {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      code: dto.code,
      nbu: dto.nbu ? NbuMapper.fromDTO(dto.nbu) : undefined,
      ub: dto.ub,
      determinations: dto.determinations?.map(DeterminationMapper.fromDTO),
      entityVersion: dto.entityVersion,
      createdDatetime: dto.createdDatetime,
      lastUpdatedDatetime: dto.lastUpdatedDatetime,
      createdUser: dto.createdUser,
      lastUpdatedUser: dto.lastUpdatedUser,
      shortCode: dto.shortCode,
      familyName: dto.familyName,
      sampleType: dto.sampleType ? SampleTypeMapper.fromDTO(dto.sampleType) : undefined,
      worksheetSetting: dto.worksheetSetting ? WorksheetSettingMapper.fromDTO(dto.worksheetSetting) : undefined
    };
  }

  /**
   * Convierte Analysis (camelCase) a AnalysisDTO (camelCase).
   * El interceptor se encargará de convertir a snake_case antes de enviar al backend.
   */
  static toDTO(model: Analysis): AnalysisDTO {
    return {
      id: model.id,
      name: model.name,
      description: model.description,
      code: model.code,
      nbu: model.nbu ? NbuMapper.toDTO(model.nbu) : undefined,
      ub: model.ub,
      determinations: model.determinations?.map(DeterminationMapper.toDTO),
      entityVersion: model.entityVersion,
      createdDatetime: model.createdDatetime,
      lastUpdatedDatetime: model.lastUpdatedDatetime,
      createdUser: model.createdUser,
      lastUpdatedUser: model.lastUpdatedUser,
      shortCode: model.shortCode,
      familyName: model.familyName,
      sampleType: model.sampleType ? SampleTypeMapper.toDTO(model.sampleType) : undefined,
      worksheetSetting: model.worksheetSetting ? WorksheetSettingMapper.toDTO(model.worksheetSetting) : undefined
    };
  }

  /**
   * Convierte un objeto parcial de Analysis a AnalysisDTO (para PATCH).
   * El interceptor se encargará de convertir a snake_case antes de enviar al backend.
   * 
   * IMPORTANTE: Según la especificación del backend PATCH /api/v1/analysis/{id},
   * las entidades relacionadas (nbu, determinations, sampleType, worksheetSetting)
   * incluidas en el body serán IGNORADAS. Para actualizar relaciones, usar endpoints específicos:
   * - PATCH /api/v1/analysis/{id}/nbu para cambiar NBU
   * - Otros endpoints específicos para determinations, sampleType, worksheetSetting
   * 
   * Por lo tanto, este mapper solo incluye campos "propios" del analysis.
   */
  static partialToDTO(partial: Partial<Analysis>): Partial<AnalysisDTO> {
    const dto: Partial<AnalysisDTO> = {};

    // Campos básicos de identificación
    if (partial.id !== undefined) dto.id = partial.id;
    if (partial.name !== undefined) dto.name = partial.name;
    if (partial.description !== undefined) dto.description = partial.description;
    if (partial.code !== undefined) dto.code = partial.code;
    
    // Campos numéricos propios
    if (partial.ub !== undefined) dto.ub = partial.ub;
    if (partial.shortCode !== undefined) dto.shortCode = partial.shortCode;
    
    // Campo de texto propio
    if (partial.familyName !== undefined) dto.familyName = partial.familyName;
    
    // Campos de auditoría (normalmente no se editan, pero se incluyen por completitud)
    if (partial.entityVersion !== undefined) dto.entityVersion = partial.entityVersion;
    if (partial.createdDatetime !== undefined) dto.createdDatetime = partial.createdDatetime;
    if (partial.lastUpdatedDatetime !== undefined) dto.lastUpdatedDatetime = partial.lastUpdatedDatetime;
    if (partial.createdUser !== undefined) dto.createdUser = partial.createdUser;
    if (partial.lastUpdatedUser !== undefined) dto.lastUpdatedUser = partial.lastUpdatedUser;

    // NOTA: NO se incluyen nbu, determinations, sampleType, worksheetSetting
    // Usar endpoints específicos para actualizar estas relaciones

    return dto;
  }
}
