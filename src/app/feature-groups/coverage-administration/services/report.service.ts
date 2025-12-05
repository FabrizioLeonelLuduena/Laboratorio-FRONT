import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';

/** Resumen de cards */
export interface ReportSummary {
  totalAmount: number;
  lastSettlementDate: string;
  variation: number;
}

/** Reporte por aseguradora (para la comparativa) */
export interface InsuranceReport {
  insurerName: string;
  totalPlans: number;
}

/** Filtros */
export interface ReportFilters {
  insurerId?: number;
  dateStart?: string;  // ISO yyyy-MM-dd o ISO completa (nos quedamos con la fecha)
  dateEnd?: string;
}

/** Serie temporal agregada + desglose por aseguradora */
export interface TimeDistributionResponse {
  labels: string[];                         // Eje X (meses/semanas/años)
  totals: number[];                         // Totales por label
  byInsurer: Record<string, number[]>;      // mismo largo que labels por aseguradora
}

/**
 * Report Service
 * Handles retrieval of summary and comparative reports for coverages.
 * All comments and documentation are in English as requested.
 */
@Injectable({ providedIn: 'root' })
export class ReportService {

  private readonly baseApiUrl = `${environment.apiUrl}/v1`;
  private readonly API_URL = `${this.baseApiUrl}/coverages/reports`;

  /**
   * constructor
   */
  constructor(private http: HttpClient) {}

  // ------------------ SUMMARY ------------------
  /**
   * Get an overview of coverages.
   * Includes total amount, last settlement date, and percentage change.
   */
  getReportSummary(_filters?: ReportFilters): Observable<ReportSummary> {
    // Mocked list; replace with real HTTP when backend is ready
    return of({ totalAmount: 1820000, lastSettlementDate: new Date().toISOString(), variation: 6.5 });
  }

  // ------------------ COMPARATIVA POR ASEGURADORA ------------------
  /**
   * Obtains the distribution of coverages by insurer
   */
  getInsuranceReports(_filters?: ReportFilters): Observable<InsuranceReport[]> {
    // Mocked list; replace with real HTTP when backend is ready
    return of([
      { insurerName: 'OSDE', totalPlans: 320 },
      { insurerName: 'PAMI', totalPlans: 280 },
      { insurerName: 'Swiss Medical', totalPlans: 190 },
      { insurerName: 'OSECAC', totalPlans: 160 }
    ]);
  }

  // ------------------ SERIE TEMPORAL + DRILL-DOWN ------------------
  /**
   * Devuelve la serie temporal agregada y el desglose por aseguradora.
   * - granularity: 'month' | 'week' | 'year'
   * - filters: opcionales
   */
  getTimeDistribution(
    granularity: 'month'|'week'|'year',
    filters?: ReportFilters
  ): Observable<TimeDistributionResponse> {
    const params: any = { granularity };
    if (filters?.insurerId) params.insurerId = filters.insurerId;
    if (filters?.dateStart) params.dateStart = filters.dateStart.split('T')[0];
    if (filters?.dateEnd)   params.dateEnd   = filters.dateEnd.split('T')[0];

    // === Llamado real al backend (descomentar cuando esté disponible) ===
    // return this.http.get<TimeDistributionResponse>(`${this.API_URL}/time-distribution`, { params });

    // === MOCK local para poder ver el front ya mismo ===
    const labels =
      granularity === 'year'
        ? ['2022', '2023', '2024', '2025']
        : granularity === 'week'
          ? ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4']
          : ['Enero 2025', 'Febrero 2025', 'Marzo 2025', 'Abril 2025'];

    const insurers = ['OSDE', 'Swiss Medical', 'Medifé', 'Federada', 'Atención Particular'];

    const byInsurer: Record<string, number[]> = {};
    insurers.forEach((name, i) => {
      byInsurer[name] = labels.map((_, j) => 10 + ((i + 1) * 5) + (j * 3)); // números fake
    });

    const totals = labels.map((_, idx) => insurers.reduce((sum, k) => sum + byInsurer[k][idx], 0));

    return of({ labels, totals, byInsurer });
  }
}
