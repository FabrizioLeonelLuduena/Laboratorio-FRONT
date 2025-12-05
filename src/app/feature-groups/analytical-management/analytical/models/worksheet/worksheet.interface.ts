/**
 * Represents a worksheet template containing multiple analyses in a specific order.
 * This DTO is used for displaying and managing worksheet templates in the application.
 * Based on GET /api/v1/worksheets/templates response
 */
export interface WorkSheetTemplateViewDTO {
  /**
   * The unique identifier of the worksheet template
   * @example 1
   */
  analysisId: number;

  /**
   * Compatible id field (alias) used by table components that expect `id`.
   */
  id?: number;

  /**
   * The unique identifier of the worksheet (alternative to analysisId)
   * @example 1
   */
  worksheetId?: number;

  /**
   * The display name of the worksheet template
   * @example 'Plantilla Hematología'
   */
  name: string;

  /**
   * The worksheet name from backend (alternative to name)
   * @example 'Plantilla Hematología'
   */
  worksheetName?: string;

  /**
   * The section/area identifier this worksheet belongs to
   * @example 5
   */
  sectionId?: number;

  /**
   * Number of analyses included in this template
   * @example 5
   */
  analysisCount?: number;

  /**
   * When the template was created (ISO 8601 format)
   * @example '2025-10-15T10:00:00'
   */
  createdAt?: string;

  /**
   * Array of analyses included in this worksheet template
   */
  analyses?: WorkSheetTemplateAnalysisViewDTO[];
}

/**
 * Represents an analysis included in a worksheet template with its display order.
 * This DTO defines how an analysis appears and is ordered within a worksheet template.
 * Based on the backend response structure.
 */
export interface WorkSheetTemplateAnalysisViewDTO {
  /**
   * The unique identifier of this template-analysis relationship
   * @example 10
   */
  id: number;

  /**
   * The ID of the analysis from the NBU catalog
   * @example 172
   */
  analysisId: number;

  /**
   * The display order of this analysis in the worksheet template
   * @example 1
   */
  displayOrder: number;

  /**
   * Optional: The display name of the analysis
   * @example 'Hemograma Completo'
   */
  analysisName?: string;

  /**
   * Optional: Reference back to the template
   */
  template?: {
    id: number;
    name: string;
  };
}

/**
 * Map backend response to frontend WorkSheetTemplateViewDTO.
 * Note: With the caseConverterInterceptor, this function is mostly a pass-through.
 * Kept for backward compatibility and potential future normalization logic.
 */
export function mapWorkSheetTemplateFromBackend(backendData: any): WorkSheetTemplateViewDTO {
  if (!backendData) {
    return {
      analysisId: 0,
      name: '',
      analyses: []
    };
  }

  // Interceptor already converted to camelCase, just return the data
  return {
    ...backendData,
    id: backendData.id || backendData.analysisId
  };
}
