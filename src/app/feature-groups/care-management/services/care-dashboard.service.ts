import { Injectable } from '@angular/core';

import { ChartData, ChartOptions, ChartType } from 'chart.js';
import { Observable, of } from 'rxjs';

import { DashboardMetric } from '../../../shared/components/dashboard-metric-card/dashboard-metric-card.component';
import { CareReportingFilters } from '../reporting/components/care-reporting-filters/care-reporting-filters.component';

/**
 * Model of a CareChartCard
 */
export interface CareChartCard {
  title: string;
  description?: string;
  icon?: string;
  chartType: ChartType | 'table'; // Allow custom types
  data: ChartData | any[]; // Allow array for tables
  helpText?: string;
  options?: ChartOptions;
}

/**
 * Care Dashboard Service
 */
@Injectable({ providedIn: 'root' })
export class CareDashboardService {
  /**
   * Retrieves dashboard metrics based on applied filters.
   */
  getMetrics(_filters: CareReportingFilters): Observable<DashboardMetric[]> {
    return of([
      { label: 'Atenciones activas', value: '14', subtext: 'últimos 30 días', icon: 'pi pi-inbox', helpText: 'Atenciones con estado no terminal', accent: 'primary' },
      { label: 'Finalizadas', value: '320', subtext: 'últimos 30 días', icon: 'pi pi-check-circle', helpText: 'Atenciones con estado FINISHED', accent: 'success' },
      { label: 'Canceladas', value: '12', subtext: 'últimos 30 días', icon: 'pi pi-times-circle', helpText: 'Atenciones con estado CANCELLED', accent: 'danger' },
      { label: 'Demoradas', value: '3', subtext: 'Más de 10 min en estado', icon: 'pi pi-bell', helpText: 'Atenciones demoradas', accent: 'warning' }
    ]);
  }

  /**
   * Retrieves chart cards data for the dashboard based on applied filters.
   */
  getChartCards(_filters: CareReportingFilters): Observable<CareChartCard[]> {

    const flowByState: ChartData<'bar'> = {
      labels: ['Registro', 'Administrativo', 'Extracción', 'Finalizadas', 'Canceladas', 'Demoradas'],
      datasets: [{ label: 'Atenciones', data: [24, 18, 10, 320, 12, 3], backgroundColor: '#008c8a', borderRadius: 8 }]
    };

    const evolution: ChartData<'line'> = {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
      datasets: [{ label: 'Atenciones', data: [80, 95, 88, 110, 120, 105], borderColor: '#00a3a1', backgroundColor: '#00a3a1', fill: false, tension: 0.2 }]
    };

    const byBranch: ChartData<'bar'> = {
      labels: ['Sanagec', 'Morra', 'Villa Allende'],
      datasets: [{ label: 'Atenciones', data: [220, 145, 87], backgroundColor: '#35cdcb', borderRadius: 8 }]
    };

    const byExtractor: ChartData<'bar'> = {
      labels: ['Extractor 1', 'Extractor 2', 'Extractor 3', 'Extractor 4'],
      datasets: [{ label: 'Finalizadas', data: [120, 98, 86, 72], backgroundColor: '#6fdfdd', borderRadius: 8 }]
    };

    const byPlan: ChartData<'pie'> = {
      labels: ['OSDE', 'Swiss Medical', 'PAMI', 'Particular'],
      datasets: [{ data: [210, 120, 80, 60], backgroundColor: ['#008c8a', '#00a3a1', '#00bab8', '#35cdcb'] }]
    };

    const topAnalysis: ChartData<'bar'> = {
      labels: ['Hemograma', 'Glucemia', 'Colesterol', 'Urea', 'TSH'],
      datasets: [{ label: 'Solicitudes', data: [180, 162, 140, 115, 95], backgroundColor: '#00bab8', borderRadius: 8 }]
    };

    const delayedAttentions: any[] = [
      { state: 'ADMIN', time: '15 min', responsible: 'Juan Pérez' },
      { state: 'EXTRACTION', time: '12 min', responsible: 'Ana Gómez' },
      { state: 'ADMIN', time: '11 min', responsible: 'Pedro Rodríguez' }
    ];

    const extractionWaitTime: ChartData<'bar'> = {
      labels: ['Sanagec', 'Morra', 'Villa Allende'],
      datasets: [
        { label: 'Promedio (min)', data: [8, 12, 10], backgroundColor: '#42A5F5' },
        { label: 'Máximo (min)', data: [25, 30, 28], backgroundColor: '#FFA726' }
      ]
    };

    const durationByStage: ChartData<'bar'> = {
      labels: ['Registro', 'Administrativo', 'Espera Extracción', 'Extracción', 'Finalizado'],
      datasets: [{ label: 'Tiempo promedio (min)', data: [5, 15, 10, 8, 2], backgroundColor: '#66BB6A', borderRadius: 8 }]
    };

    const temporalHeatmapData: ChartData<'bubble'> = {
      datasets: [
        {
          label: 'Admisión',
          data: [
            { x: 8, y: 1, r: 25 }, { x: 9, y: 1, r: 35 }, { x: 10, y: 1, r: 30 }
          ],
          backgroundColor: 'rgba(255, 99, 132, 0.7)'
        },
        {
          label: 'Extracción',
          data: [
            { x: 9, y: 2, r: 20 }, { x: 10, y: 2, r: 40 }, { x: 11, y: 2, r: 25 }
          ],
          backgroundColor: 'rgba(54, 162, 235, 0.7)'
        }
      ]
    };

    const temporalHeatmapOptions: ChartOptions = {
      scales: {
        x: { title: { display: true, text: 'Hora del Día' }, min: 7, max: 13 },
        y: { display: false }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context: any) {
              return `${context.dataset.label}: ${context.raw.r} atenciones`;
            }
          }
        }
      }
    };

    return of([
      { title: 'Flujo por estados', description: 'Este gráfico de barras muestra la cantidad total de atenciones agrupadas por cada estado del proceso (Registro, Administrativo, Extracción, etc.). Es una herramienta clave para identificar cuellos de botella y entender dónde se concentra la mayor carga de trabajo.', icon: 'pi pi-chart-bar', chartType: 'bar', data: flowByState },
      { title: 'Evolución temporal', description: 'Visualiza el volumen de atenciones a lo largo del tiempo. Esta línea de tendencia permite identificar patrones estacionales, picos de demanda y el crecimiento o decrecimiento general del servicio en el período seleccionado.', icon: 'pi pi-chart-line', chartType: 'line', data: evolution },
      { title: 'Atenciones por sucursal', description: 'Compara el número de atenciones realizadas en cada sucursal. Este gráfico es fundamental para la gestión de recursos, permitiendo balancear la carga de trabajo y planificar la asignación de personal.', icon: 'pi pi-building', chartType: 'bar', data: byBranch },
      { title: 'Productividad por extractor', description: 'Mide el rendimiento individual del personal de extracción, mostrando la cantidad de atenciones finalizadas por cada uno. Ayuda a identificar a los miembros más productivos y a detectar necesidades de capacitación.', icon: 'pi pi-users', chartType: 'bar', data: byExtractor },
      { title: 'Distribución por plan médico', description: 'Este gráfico de torta desglosa las atenciones según el plan de salud de los pacientes. Es vital para entender la cartera de clientes y la dependencia de cada aseguradora.', icon: 'pi pi-chart-pie', chartType: 'pie', data: byPlan },
      { title: 'Top 5 Análisis solicitados', description: 'Presenta los 5 tipos de análisis clínicos más solicitados. Esta información es crucial para la gestión de inventario, la compra de reactivos y la planificación de la capacidad del laboratorio.', icon: 'pi pi-sliders-h', chartType: 'bar', data: topAnalysis },
      { title: 'Atenciones demoradas', description: 'Esta tabla muestra en tiempo real las atenciones que han permanecido en un mismo estado por más de 10 minutos, señalando el estado, el tiempo acumulado y el responsable asignado para una acción inmediata.', icon: 'pi pi-clock', chartType: 'table', data: delayedAttentions },
      { title: 'Tiempos de espera para extracción', description: 'Compara los tiempos de espera promedio y máximo en la cola de extracción para cada sucursal. Es un indicador directo de la calidad del servicio y la experiencia del paciente.', icon: 'pi pi-hourglass', chartType: 'bar', data: extractionWaitTime },
      { title: 'Duración promedio por etapa', description: 'Desglosa el ciclo de vida de una atención, mostrando cuánto tiempo pasa en promedio en cada etapa del proceso. Permite identificar las fases más largas y optimizar el flujo de trabajo.', icon: 'pi pi-history', chartType: 'bar', data: durationByStage },
      { title: 'Horas pico (Admisión vs. Extracción)', description: 'Este mapa de calor simulado con burbujas muestra las franjas horarias con mayor volumen de actividad. El tamaño de la burbuja representa la cantidad de atenciones, permitiendo identificar fácilmente los momentos de mayor carga.', icon: 'pi pi-th-large', chartType: 'bubble', data: temporalHeatmapData, options: temporalHeatmapOptions }
    ]);
  }
}
