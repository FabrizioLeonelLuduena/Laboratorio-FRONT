import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, forkJoin, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { OperationalReportDto, PerformanceReportDto, TrafficReportDto } from '../models/care-reports.model';
import { CareReportingCardData } from '../reporting/components/care-reporting-card/care-reporting-card.component';
import { CareReportingFilters } from '../reporting/components/care-reporting-filters/care-reporting-filters.component';

/**
 * Service for care management reporting functionality.
 */
@Injectable({ providedIn: 'root' })
export class CareReportingService {
  private readonly baseUrl = `${environment.apiUrl}/v1/attentions/reports`;

  /**
   * Component constructor that injects required services.
   */
  constructor(private http: HttpClient) {}

  /**
   * Retrieves traffic report data based on applied filters.
   */
  private getTrafficReport(filters: CareReportingFilters): Observable<TrafficReportDto> {
    const params = this.buildParams(filters);
    return this.http.get<TrafficReportDto>(`${this.baseUrl}/traffic`, { params });
  }

  /**
   * Retrieves performance report data based on applied filters.
   */
  private getPerformanceReport(filters: CareReportingFilters): Observable<PerformanceReportDto> {
    const params = this.buildParams(filters);
    return this.http.get<PerformanceReportDto>(`${this.baseUrl}/performance`, { params });
  }

  /**
   * Retrieves operational report data based on applied filters.
   */
  private getOperationalReport(filters: CareReportingFilters): Observable<OperationalReportDto> {
    const params = this.buildParams(filters);
    return this.http.get<OperationalReportDto>(`${this.baseUrl}/operational`, { params });
  }

  /**
   * Fetches all report data and transforms it into card format for display.
   */
  getCardsData(filters: CareReportingFilters): Observable<CareReportingCardData[]> {
    return forkJoin({
      traffic: this.getTrafficReport(filters),
      performance: this.getPerformanceReport(filters),
      operational: this.getOperationalReport(filters)
    }).pipe(
      map(({ traffic, performance, operational }) => {
        const cards: CareReportingCardData[] = [];

        // --- Performance Reports ---
        cards.push({
          title: 'Promedio de Duración Total',
          icon: 'pi-stopwatch',
          description: 'Tiempo promedio desde la admisión hasta la finalización de una atención.',
          tableColumns: ['Métrica', 'Valor'],
          tableData: [{ metrica: 'Tiempo Promedio', valor: `${performance.average_completion_time_minutes.toFixed(2)} min` }]
        });

        cards.push({
          title: 'Tiempos Promedio por Etapa',
          icon: 'pi-history',
          description: 'Tiempo medio que una atención permanece en cada fase del proceso.',
          chartType: 'bar',
          tableColumns: ['Etapa', 'Tiempo Promedio (min)'],
          tableData: performance.average_time_per_stage.map(s => ({ etapa: s.stage, tiempo: s.average_time_minutes.toFixed(2) })),
          chartData: performance.average_time_per_stage.map(s => ({ label: s.stage, value: s.average_time_minutes }))
        });

        // --- Traffic Reports ---
        cards.push({
          title: 'Atenciones por Sucursal',
          icon: 'pi-building',
          description: 'Distribución del volumen de atenciones entre las diferentes sucursales.',
          chartType: 'pie',
          tableColumns: ['Sucursal', 'Cantidad', '%'],
          tableData: traffic.attentions_by_branch.map(b => ({ sucursal: `Sede ${b.branch_id}`, cantidad: b.attention_count, porcentaje: `${b.percentage.toFixed(1)}%` })),
          chartData: traffic.attentions_by_branch.map(b => ({ label: `Sede ${b.branch_id}`, value: b.attention_count }))
        });

        // --- Operational Reports ---
        cards.push({
          title: 'Productividad por Extractor',
          icon: 'pi-users',
          description: 'Rendimiento del personal de extracción basado en atenciones manejadas y tiempo promedio.',
          chartType: 'bar',
          tableColumns: ['Extractor', 'Atenciones', 'Tiempo Promedio (min)'],
          tableData: operational.extractor_performance.map(e => ({ extractor: `ID ${e.extractor_id}`, atenciones: e.attentions_handled, tiempo: e.average_extraction_time_minutes.toFixed(2) })),
          chartData: operational.extractor_performance.map(e => ({ label: `ID ${e.extractor_id}`, value: e.attentions_handled }))
        });

        cards.push({
          title: 'Análisis Más Solicitados',
          icon: 'pi-flask',
          description: 'Ranking de los análisis clínicos más frecuentes en las atenciones.',
          chartType: 'bar',
          tableColumns: ['Análisis ID', 'Cantidad'],
          tableData: operational.most_requested_analyses.map(a => ({ analisis_id: a.analysis_id, cantidad: a.request_count })),
          chartData: operational.most_requested_analyses.map(a => ({ label: `ID ${a.analysis_id}`, value: a.request_count }))
        });

        cards.push({
          title: 'Cancelaciones por Estado',
          icon: 'pi-times-circle',
          description: 'Identifica en qué etapa del proceso ocurren más cancelaciones.',
          chartType: 'pie',
          tableColumns: ['Estado', 'Cantidad'],
          tableData: operational.cancellations_by_state.map(c => ({ estado: c.cancelled_at_state, cantidad: c.cancellation_count })),
          chartData: operational.cancellations_by_state.map(c => ({ label: c.cancelled_at_state, value: c.cancellation_count }))
        });

        return cards;
      })
    );
  }

  /**
   * Builds HTTP query parameters from filter object.
   */
  private buildParams(filters: CareReportingFilters): HttpParams {
    let params = new HttpParams();
    if (filters.dateFrom) {
      params = params.append('startDate', filters.dateFrom.toISOString());
    }
    if (filters.dateTo) {
      params = params.append('endDate', filters.dateTo.toISOString());
    }
    if (filters.siteId) {
      params = params.append('branchId', filters.siteId.toString());
    }
    // TODO: The API does not seem to support insurerId or coverageType; enable when the backend is updated.
    return params;
  }
}
