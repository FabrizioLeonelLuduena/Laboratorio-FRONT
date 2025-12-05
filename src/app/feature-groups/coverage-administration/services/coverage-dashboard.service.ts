import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { ChartData, ChartOptions } from 'chart.js';
import { Observable, of } from 'rxjs';

import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { CoverageMappers } from '../mappers/mappers';
import {
  AnalisisRankingDTO,
  CoverageRankingDTO, CoveragesKPIsDTO,
  MonthlyServiceCountDTO,
  ServicesByTypeAndPayerDTO
} from '../models/report.model';

// --- INTERFACES ---
/**
 *
 */
export interface MultiLineSeries {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

/**
 *
 */
export interface StackedByTypePayer {
  labels: string[];
  stacks: { label: string; data: number[] }[];
}

/**
 *
 */
export interface CompositionByType {
  labels: string[];
  data: number[];
}

/** Aggregated KPIs for the dashboard. */
export interface CoverageKpis {
  totalBilled: number;
  liquidated: number;
  prestations: number;
  debitPct: number;
  avgPerPractice: number;
}

/**
 *
 */
export interface HeatmapCell {
  coverage: string;
  practice: string;
  value: number;
}

/**
 *
 */
export interface DebitsByInsurer {
  insurer: string;
  debitPct: number;
}

/**
 *
 */
export interface CoverageFilters {
  insurerType?: 'Obra Social' | 'Prepaga' | 'Particular';
  startDate?: Date;
  endDate?: Date;
  branchId?: number;
  insurerId?: number
  limit?: number
}

/**
 *
 */
export interface HeatmapData {
  data: ChartData<'bubble'>;
  options: ChartOptions<'bubble'>;
}

/**
 *
 */
@Injectable({ providedIn: 'root' })
export class CoverageDashboardService {

  private readonly baseApiUrl = `${environment.apiUrl}/v1`;
  private readonly API_URL = `${this.baseApiUrl}/coverages/reports`;

  /** DI constructor. */
  constructor(private http: HttpClient) { }

  /**
   * Converts a Date object to YYYY-MM-DD format string.
   * @param date - Date object to format
   * @returns Formatted date string (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Returns revenue series by type (OS/Prepaga/Particular) over months. */
  getMonthlyRevenueByType(_f: CoverageFilters): Observable<MultiLineSeries> {
    let url = `${this.API_URL}/monthly-count?startDate=${this.formatDate(_f.startDate!)}&endDate=${this.formatDate(_f.endDate!)}`;

    if (_f.branchId !== undefined && _f.branchId !== null) {
      url += `&branchId=${_f.branchId}`;
    }

    if (_f.insurerId !== undefined && _f.insurerId !== null) {
      url += `&insurerId=${_f.insurerId}`;
    }

    return this.http.get<MonthlyServiceCountDTO[]>(url)
      .pipe(map(dto => CoverageMappers.mapMonthlyServiceCountToLabel(dto)));
  }

  /** Returns stacked revenue by coverage type and payer. */
  getStackedRevenueByTypeAndPayer(_f: CoverageFilters): Observable<StackedByTypePayer> {
    let url = `${this.API_URL}/by-type-payer?startDate=${this.formatDate(_f.startDate!)}&endDate=${this.formatDate(_f.endDate!)}`;

    if (_f.branchId !== undefined && _f.branchId !== null) {
      url += `&branchId=${_f.branchId}`;
    }

    if (_f.insurerType !== undefined && _f.insurerType !== null) {
      url += `&coverageType=${_f.insurerType}`;
    }

    return this.http.get<ServicesByTypeAndPayerDTO[]>(url)
      .pipe(map(dto => CoverageMappers.mapServiceByTypeAndPayerToLabel(dto)));
  }

  /** Returns composition of amounts by coverage type. */
  getCompositionByType(_f: CoverageFilters): Observable<CompositionByType> {
    let url = `${this.API_URL}/by-type-payer?startDate=${this.formatDate(_f.startDate!)}&endDate=${this.formatDate(_f.endDate!)}`;

    if (_f.branchId !== undefined && _f.branchId !== null) {
      url += `&branchId=${_f.branchId}`;
    }

    if (_f.insurerId !== undefined && _f.insurerId !== null) {
      url += `&insurerId=${_f.insurerId}`;
    }

    return this.http.get<ServicesByTypeAndPayerDTO[]>(url)
      .pipe(
        map(dtoArray => {
          // Group by coverage type and sum amounts
          const typeMap = new Map<string, number>();
          dtoArray.forEach(item => {
            const current = typeMap.get(item.coverageType) || 0;
            typeMap.set(item.coverageType, current + item.totalAmount);
          });

          // Convert to labels and data arrays
          const labels: string[] = [];
          const data: number[] = [];

          typeMap.forEach((value, key) => {
            labels.push(key);
            data.push(value);
          });

          return { labels, data };
        })
      );
  }

  /** Returns ranking of coverages by billed amount. */
  getRanking(_f: CoverageFilters): Observable<CoverageRankingDTO[]> {
    let url = `${this.API_URL}/ranking?startDate=${this.formatDate(_f.startDate!)}&endDate=${this.formatDate(_f.endDate!)}`;

    if (_f.branchId !== undefined && _f.branchId !== null) {
      url += `&branchId=${_f.branchId}`;
    }

    if (_f.limit !== undefined) {
      url += `&limit=${_f.limit}`;
    }

    return this.http.get<CoverageRankingDTO[]>(url);
  }

  /** Returns top-level KPIs. */
  getKpis(_f: CoverageFilters): Observable<CoveragesKPIsDTO> {
    let url = `${this.API_URL}/kpis?startDate=${this.formatDate(_f.startDate!)}&endDate=${this.formatDate(_f.endDate!)}`;

    if (_f.insurerId !== undefined && _f.insurerId !== null) {
      url += `&insurerId=${_f.insurerId}`;
    }

    return this.http.get<CoveragesKPIsDTO>(url);
  }

  /** Returns a dense grid of values for coverage/practice pairs. */
  getHeatmap(_f: CoverageFilters): Observable<HeatmapData> {
    let url = `${this.API_URL}/services-by-coverage?startDate=${this.formatDate(_f.startDate!)}&endDate=${this.formatDate(_f.endDate!)}`;

    if (_f.insurerId !== undefined && _f.insurerId !== null) {
      url += `&insurerId=${_f.insurerId}`;
    }

    if (_f.limit !== undefined) {
      url += `&limit=${_f.limit}`;
    }

    return this.http.get<AnalisisRankingDTO[]>(url)
      .pipe(
        map(dto => CoverageMappers.mapAnalisisRankingToHeatMapCell(dto)),
        map(rawData => {
          // Handle empty data case
          if (!rawData || rawData.length === 0) {
            return {
              data: { datasets: [] },
              options: this.getEmptyHeatmapOptions()
            };
          }

          // Extract unique practices and coverages (inverted axes)
          const practices = [...new Set(rawData.map(cell => cell.practice))];
          const coverages = [...new Set(rawData.map(cell => cell.coverage))];

          // Find max value for scaling with better normalization
          const maxValue = Math.max(...rawData.map(cell => cell.value));
          const minValue = Math.min(...rawData.map(cell => cell.value));

          // Normalize bubble sizes between 8 and 35 for better visibility
          const normalizeSize = (value: number): number => {
            if (maxValue === minValue) return 20;
            const normalized = ((value - minValue) / (maxValue - minValue));
            return 8 + (normalized * 27); // Range: 8-35
          };

          // Generate beautiful gradient colors based on value
          const generateColorByValue = (value: number): string => {
            const normalized = (value - minValue) / (maxValue - minValue);

            // Beautiful color palette from light to dark
            if (normalized < 0.25) {
              return 'rgba(102, 187, 106, 0.75)'; // Light green
            } else if (normalized < 0.5) {
              return 'rgba(66, 165, 245, 0.75)'; // Light blue
            } else if (normalized < 0.75) {
              return 'rgba(255, 167, 38, 0.75)'; // Orange
            } else {
              return 'rgba(239, 83, 80, 0.75)'; // Red for highest values
            }
          };

          const data: ChartData<'bubble'> = {
            datasets: [{
              label: 'Volumen de Servicios',
              data: rawData.map(cell => ({
                x: practices.indexOf(cell.practice),
                y: coverages.indexOf(cell.coverage),
                r: normalizeSize(cell.value)
              })),
              backgroundColor: rawData.map(cell => generateColorByValue(cell.value)),
              borderColor: 'rgba(255, 255, 255, 0.8)',
              borderWidth: 1
            }]
          };

          const options: ChartOptions<'bubble'> = {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
              padding: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 20
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Prácticas',
                  font: { size: 16, weight: 'bold' },
                  padding: { top: 10 }
                },
                ticks: {
                  callback: (value) => {
                    const practice = practices[value as number];
                    if (!practice) return '';
                    // Truncate intelligently at word boundaries
                    if (practice.length <= 30) return practice;
                    const truncated = practice.substring(0, 27);
                    const lastSpace = truncated.lastIndexOf(' ');
                    return (lastSpace > 15 ? truncated.substring(0, lastSpace) : truncated) + '...';
                  },
                  font: { size: 12 },
                  maxRotation: 45,
                  minRotation: 45,
                  color: '#555'
                },
                grid: {
                  display: true,
                  color: 'rgba(0,0,0,0.08)',
                  lineWidth: 1
                }
              },
              y: {
                title: {
                  display: true,
                  text: 'Coberturas',
                  font: { size: 16, weight: 'bold' },
                  padding: { bottom: 10 }
                },
                ticks: {
                  callback: (value) => {
                    const coverage = coverages[value as number];
                    if (!coverage) return '';
                    // Truncate intelligently at word boundaries
                    if (coverage.length <= 35) return coverage;
                    const truncated = coverage.substring(0, 32);
                    const lastSpace = truncated.lastIndexOf(' ');
                    return (lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated) + '...';
                  },
                  font: { size: 12 },
                  color: '#555'
                },
                grid: {
                  display: true,
                  color: 'rgba(0,0,0,0.08)',
                  lineWidth: 1
                }
              }
            },
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  font: { size: 13 },
                  padding: 15,
                  usePointStyle: true,
                  pointStyle: 'circle'
                }
              },
              tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                padding: 16,
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 },
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderWidth: 1,
                displayColors: false,
                callbacks: {
                  title: () => 'Detalle del Servicio',
                  label: (context: any) => {
                    const practice = practices[context.raw.x];
                    const coverage = coverages[context.raw.y];
                    const value = rawData.find(
                      cell => cell.practice === practice && cell.coverage === coverage
                    )?.value || 0;

                    return [
                      `Práctica: ${practice}`,
                      `Cobertura: ${coverage}`,
                      `Volumen: ${value.toLocaleString('es-AR')} servicios`
                    ];
                  }
                }
              }
            },
            interaction: {
              mode: 'point',
              intersect: true
            }
          };

          return { data, options };
        })
      );
  }

  /**
   * Generates a random RGBA color with 70% opacity.
   * @returns A random color string in RGBA format
   */
  private generateRandomColor(): string {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgba(${r}, ${g}, ${b}, 0.7)`;
  }

  /** Returns default options for empty heatmap */
  private getEmptyHeatmapOptions(): ChartOptions<'bubble'> {
    return {
      scales: {
        x: {
          title: { display: true, text: 'Coberturas' }
        },
        y: {
          title: { display: true, text: 'Prácticas' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    };
  }

  /** Returns debit percentage per insurer. */
  getDebitsByInsurer(): Observable<DebitsByInsurer[]> {
    return of([
      { insurer: 'PAMI', debitPct: 12.4 },
      { insurer: 'OSECAC', debitPct: 9.8 },
      { insurer: 'OSDE', debitPct: 6.2 },
      { insurer: 'Swiss Medical', debitPct: 5.1 },
      { insurer: 'Particular', debitPct: 2.3 }
    ]);
  }
}
