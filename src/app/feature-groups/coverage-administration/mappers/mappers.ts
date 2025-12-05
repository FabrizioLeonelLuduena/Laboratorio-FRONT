import { PlanResponseDTO } from '../models/plan.model';
import { AnalisisRankingDTO,
  MonthlyServiceCountDTO,
  ServicesByTypeAndPayerDTO
} from '../models/report.model';
import { HeatmapCell, MultiLineSeries, StackedByTypePayer } from '../services/coverage-dashboard.service';

/**
 * This class contains all the necessaries mappers to the backend.
 */
export class CoverageMappers {

  /**
   * Mapea un payload camelCase del front a snake_case para el endpoint wizard.
   * Se asegura de traducir insurer, plans y agreements correctamente.
   */
  static mapWizardPayload(request: any): any {
    return {
      insurer: {
        code: request.insurer.code,
        name: request.insurer.name,
        acronym: request.insurer.acronym,
        insurer_type: request.insurer.insurerType,
        description: request.insurer.description,
        autorization_url: request.insurer.autorizationUrl,
        specific_data: request.insurer.specificData
      },
      plans: (request.plans || []).map((p: any) => ({
        plan: {
          insurer_id: p.plan.insurerId ?? 0,
          code: p.plan.code,
          acronym: p.plan.acronym,
          name: p.plan.name,
          description: p.plan.description,
          iva: p.plan.iva
        },
        agreement: {
          insurer_plan_id: p.agreement.insurerPlanId ?? 0,
          version_nbu: p.agreement.versionNbu,
          requires_copayment: p.agreement.requiresCopayment,
          coverage_percentage: p.agreement.coveragePercentage,
          ub_value: p.agreement.ubValue,
          valid_from_date: p.agreement.validFromDate
        }
      }))
    };
  }

  /**
   * Maps raw plan JSON (snake_case) into PlanResponseDTO (camelCase).
   */
  static mapPlanResponse = (raw: any): PlanResponseDTO => {
    return {
      id: raw.id,
      insurerId: raw.insurer_id,
      insurerName: raw.insurer_name,
      code: raw.code,
      acronym: raw.acronym,
      name: raw.name,
      description: raw.description,
      isActive: raw.active ?? raw.is_active ?? true,
      iva: raw.iva
    };
  };


  /**
   * mapPlanWizardPayload.
   */
  static mapPlanWizardPayload(request: any) {
    const R = request?.value ?? request ?? {};

    const planNode = R?.plan ?? {};
    const planSrc  = planNode?.plan ?? R?.plan ?? R?.planData ?? {};
    const covSrc   = planNode?.agreement ?? R?.agreement ?? R?.coverageData ?? {};

    const insurerIdRoot =
      R?.insurer_id ??
      R?.insurerId ??
      planSrc?.insurer_id ??
      planSrc?.insurerId ??
      0;

    const toLocalDateTime = (v: any) => {
      if (!v) return null;
      if (v instanceof Date) return v.toISOString().slice(0, 19);
      if (typeof v === 'number') return new Date(v).toISOString().slice(0,19);
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00:00`;
      return v;
    };
    const num = (v: any, or: number | null = null) =>
      v === '' || v === undefined || v === null ? or : Number(v);

    return {
      insurer_id: insurerIdRoot,

      plan: {
        plan: {
          insurer_id: planSrc?.insurerId ?? insurerIdRoot ?? 0,
          code:        planSrc?.code ?? '',
          acronym:     planSrc?.acronym ?? '',
          name:        planSrc?.name ?? '',
          description: planSrc?.description ?? ''
        },
        agreement: {
          insurer_plan_id:     num(covSrc?.insurerPlanId, 0),
          version_nbu:         num(covSrc?.versionNbu, 0),
          requires_copayment:  !!covSrc?.requiresCopayment,
          coverage_percentage: num(covSrc?.coveragePercentage, null),
          ub_value:            num(covSrc?.ubValue, null),
          valid_from_date:     toLocalDateTime(covSrc?.validFromDate)
        }
      }
    };
  }

  /**
   * Convierte un arreglo de MonthlyServiceCountDTO en la estructura
   * MultiLineSeries requerida por los gráficos de evolución mensual.
   * - labels: últimos 12 meses en orden cronológico terminando en el mes más reciente de los datos
   * - datasets: por cada coverageType un objeto { label: tipo humanizado, data: servicesCount[] }
   *             donde data está alineado con labels (12 posiciones) sumando todos los insurers por mes/tipo.
   *             Los meses sin datos se llenan con 0.
   */
  static mapMonthlyServiceCountToLabel(DTO: MonthlyServiceCountDTO[]): MultiLineSeries {
    const items = DTO || [];

    // Determinar el mes más reciente en los datos (o usar el actual si no hay datos)
    let maxYear = new Date().getFullYear();
    let maxMonth = new Date().getMonth() + 1; // 1-12

    if (items.length > 0) {
      items.forEach(i => {
        if (i.year > maxYear || (i.year === maxYear && i.month > maxMonth)) {
          maxYear = i.year;
          maxMonth = i.month;
        }
      });
    }

    // Generar los últimos 12 meses en orden cronológico terminando en maxYear/maxMonth
    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const periods: Array<{ year: number; month: number; label: string }> = [];

    for (let i = 11; i >= 0; i--) {
      let y = maxYear;
      let m = maxMonth - i;

      while (m <= 0) {
        m += 12;
        y -= 1;
      }

      periods.push({
        year: y,
        month: m,
        label: monthNames[m - 1]
      });
    }

    const labels = periods.map(p => p.label);

    // Agrupar por coverageType y generar datasets
    const typeMap = new Map<string, number[]>();

    // Inicializar data arrays con ceros (12 meses) para cada tipo que aparezca
    const coverageTypes = new Set<string>();
    items.forEach(i => coverageTypes.add(i.coverageType));

    coverageTypes.forEach(type => {
      typeMap.set(type, new Array(12).fill(0));
    });

    // Llenar los datos: sumar servicesCount de todos los insurers en cada mes/tipo
    items.forEach(i => {
      // Buscar el índice del periodo que coincida con year/month
      const periodIdx = periods.findIndex(p => p.year === i.year && p.month === i.month);
      if (periodIdx >= 0 && typeMap.has(i.coverageType)) {
        const arr = typeMap.get(i.coverageType)!;
        arr[periodIdx] += (Number(i.totalAmount) || 0);
      }
    });

    // Construir datasets con labels humanizados
    const datasets = Array.from(typeMap.entries()).map(([type, data]) => ({
      label: this.humanizeInsurerType(type),
      data
    }));

    return { labels, datasets };
  }

  /**
   * Convierte un arreglo de ServicesByTypeAndPayerDTO en la estructura
   * StackedByTypePayer requerida por los gráficos.
   * - labels: lista única (orden de aparición) de coverageType
   * - stacks: por cada payer (orden de aparición) devuelve { label: payerName, data: number[] }
   *           con montos alineados con `labels` (suma si hay duplicados).
   */
  static mapServiceByTypeAndPayerToLabel(DTO: ServicesByTypeAndPayerDTO[]): StackedByTypePayer {
    const items = DTO || [];

    // labels: unique coverage types (preserve appearance order)
    const labelSet = new Set<string>();
    items.forEach(i => labelSet.add(i.coverageType));
    // Force canonical ordering for common types so charts keep a predictable X axis
    const itemsLabels = Array.from(labelSet);



    // payers: preserve first occurrence order and keep payerId -> payerName mapping
    const payerMap = new Map<number, string>();
    items.forEach(i => {
      if (!payerMap.has(i.payerId)) payerMap.set(i.payerId, i.payerName);
    });

    // build stacks: for each payer, produce data aligned with labels (sum amounts if duplicates)
    let stacks = Array.from(payerMap.entries()).map(([payerId, payerName]) => {
      const data = itemsLabels.map(label => {
        return items
          .filter(it => it.coverageType === label && it.payerId === payerId)
          .reduce((acc, cur) => acc + (Number(cur.totalAmount) || 0), 0);
      });
      return { label: payerName, data };
    });

    // Ordenar los stacks por el monto total (suma de data) descendente
    stacks = stacks.sort((a, b) => {
      const sumA = a.data.reduce((s, n) => s + (Number(n) || 0), 0);
      const sumB = b.data.reduce((s, n) => s + (Number(n) || 0), 0);
      return sumB - sumA;
    });

    const labels=itemsLabels.map(label => this.humanizeInsurerType(label));

    return { labels, stacks };
  }
  /**
   * Maps AnalisisRankingDTO array to HeatmapCell array by flattening the hierarchical structure.
   */
  static mapAnalisisRankingToHeatMapCell(DTO: AnalisisRankingDTO[]): HeatmapCell[] {
    // Flatten the hierarchical structure: each analysis has multiple coverages
    const cells: HeatmapCell[] = [];

    DTO.forEach(analysis => {
      analysis.coverageBreakdown.forEach(coverage => {
        cells.push({
          practice: analysis.analysisName,
          coverage: coverage.insurerName,
          value: coverage.volume
        });
      });
    });

    return cells;
  }

  /**
   * Returns the human-readable label for an insurerType enum.
   * It forces the mapping to the client-required values:
   *  - PRIVATE => 'Prepaga'
   *  - SOCIAL  => 'Obra Social'
   *  - SELF_PAY => 'Particular'
   * If the code does not match, it generates a humanized version.
   */
  static humanizeInsurerType(code?: string | null): string {
    if (!code) return '';
    switch (code) {
    case 'PRIVATE':
      return 'Prepaga';
    case 'SOCIAL':
      return 'Obra Social';
    case 'SELF_PAY':
      return 'Particular';
    default:
      return code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }
}
