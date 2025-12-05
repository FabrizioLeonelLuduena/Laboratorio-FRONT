import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { catchError, forkJoin, of } from 'rxjs';

import { GenericTableComponent } from '../../../../../../shared/components/generic-table/generic-table.component';
import { SpinnerComponent } from '../../../../../../shared/components/spinner/spinner.component';
import { GenericColumn } from '../../../../../../shared/models/generic-table.models';
import { BreadcrumbService } from '../../../../../../shared/services/breadcrumb.service';
import { CareReportingCardComponent, CareReportingCardData } from '../../../../../care-management/reporting/components/care-reporting-card/care-reporting-card.component';
import {
  AgeGroupGenderReport,
  ReportingFilters,
  ScreeningResultsReport,
  ValidatedResultDetail,
  ValidatedResultsReport
} from '../../models/post-analytical-reports.model';
import { PostAnalyticalReportingService } from '../../services/post-analytical-reporting.service';
import { ReportingFiltersComponent } from '../reporting-filters/reporting-filters.component';
import { PostAnalyticalMetric, ReportingMetricCardComponent } from '../reporting-metric-card/reporting-metric-card.component';

/**
 * Main post-analytical reporting component.
 * Displays 6 cards with KPIs and a details table always visible below.
 */
@Component({
  selector: 'app-reporting-main',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    SpinnerComponent,
    ReportingMetricCardComponent,
    GenericTableComponent,
    ReportingFiltersComponent,
    CareReportingCardComponent
  ],
  providers: [MessageService],
  templateUrl: './reporting-main.component.html',
  styleUrl: './reporting-main.component.css'
})
export class ReportingMainComponent implements OnInit {
  private readonly reportingService = inject(PostAnalyticalReportingService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly messageService = inject(MessageService);

  // State
  filters = signal<ReportingFilters>({
    startDate: (() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    })(),
    endDate: (() => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return today;
    })()
  });

  isLoading = signal<boolean>(false);

  // Selected report to show details
  selectedReport = signal<string | null>(null);

  // Controls whether cards or details table are shown
  showingDetails = signal<boolean>(false);

  // Computed to get the selected report label
  readonly selectedReportLabel = computed(() => {
    const reportId = this.selectedReport();
    if (!reportId) return '';
    const metric = this.metrics().find(m => m.id === reportId);
    return metric?.label ?? '';
  });

  // Details table (always shows the last loaded report)
  detailsData = signal<any[]>([]);
  detailsColumns = signal<GenericColumn[]>([]);

  // Report cards with charts
  reportCards = signal<CareReportingCardData[]>([]);

  // Computed para las 6 métricas principales
  readonly metrics = computed<PostAnalyticalMetric[]>(() => {
    const validated = this.reportingService.validatedReport();
    const ageGender = this.reportingService.ageGenderReport();
    const screening = this.reportingService.screeningReport();

    // Safe default values
    const validatedCount = validated?.totalCount ?? 0;
    const ageGenderTotalAnalyzed = ageGender?.totalResultsAnalyzed ?? 0;
    const screeningCount = screening?.totalResults ?? 0;
    const screeningPositive = screening?.positiveCount ?? 0;
    const screeningNegative = screening?.negativeCount ?? 0;

    return [
      {
        id: 'validated',
        label: 'Resultados Validados',
        value: validatedCount.toString(),
        subtext: 'Resultados validados y emitidos',
        icon: 'pi pi-check-circle',
        description: 'Total de resultados que fueron validados y firmados por bioquímicos en el período seleccionado'
      },
      {
        id: 'ageGender',
        label: 'Reportes Poblacionales',
        value: ageGenderTotalAnalyzed.toString(),
        subtext: 'Resultados por edad y género',
        icon: 'pi pi-users',
        description: 'Resultados analizados y segmentados por grupos etarios y género para identificar patrones demográficos'
      },
      {
        id: 'screening',
        label: 'Screenings Realizados',
        value: screeningCount.toString(),
        subtext: screeningCount > 0
          ? `${screeningPositive} positivos, ${screeningNegative} negativos`
          : 'Sin screenings en el período',
        icon: 'pi pi-search',
        description: 'Total de estudios de screening/tamizaje realizados en el período'
      }
    ];
  });

  /**
   * Initializes the component, sets up breadcrumbs and loads reports.
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString(
      'Gestión de analítica > Reportes',
      '/analytical-management/post-analytical/reporting'
    );

    // Load reports initially (only cards, no details)
    this.loadAllReports();
  }

  /**
   * Handles click on "View detail" of a card
   */
  onViewDetails(reportId: string): void {
    this.selectedReport.set(reportId);
    this.showingDetails.set(true); // Show table and hide cards

    // Load details based on selected report
    switch (reportId) {
    case 'validated':
      this.loadValidatedDetails();
      break;
    case 'ageGender':
      this.loadAgeGenderDetails();
      break;
    case 'screening':
      this.loadScreeningDetails();
      break;
    }
  }

  /**
   * Returns to show cards and hides the details table
   */
  onBackToCards(): void {
    this.showingDetails.set(false);
    this.selectedReport.set(null);
    this.detailsData.set([]);
    this.detailsColumns.set([]);

    // Reload cards with current filters
    this.loadAllReports();
  }

  /**
   * Handles filter changes.
   */
  onFiltersApplied(filters: ReportingFilters): void {
    this.filters.set(filters);

    // If we are viewing details, ONLY reload the visible table
    if (this.showingDetails() && this.selectedReport()) {
      const reportId = this.selectedReport()!;

      // Reload only the specific report being viewed
      this.isLoading.set(true);

      switch (reportId) {
      case 'validated':
        this.reportingService.getValidatedResultsReport(filters).subscribe({
          next: (report) => {
            this.reportingService.validatedReport.set(report);
            this.loadValidatedDetails();
            this.isLoading.set(false);
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo cargar el reporte de resultados validados'
            });
            this.isLoading.set(false);
          }
        });
        break;

      case 'ageGender':
        this.reportingService.getAgeGroupGenderReport(filters).subscribe({
          next: (report) => {
            this.reportingService.ageGenderReport.set(report);
            this.loadAgeGenderDetails();
            this.isLoading.set(false);
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo cargar el reporte poblacional'
            });
            this.isLoading.set(false);
          }
        });
        break;

      case 'screening':
        this.reportingService.getScreeningResultsReport(filters).subscribe({
          next: (report) => {
            this.reportingService.screeningReport.set(report);
            this.loadScreeningDetails();
            this.isLoading.set(false);
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo cargar el reporte de screenings'
            });
            this.isLoading.set(false);
          }
        });
        break;
      }
    } else {
      // If we are viewing cards, reload all reports
      this.loadAllReports();
    }
  }

  /**
   * Loads all reports in parallel
   */
  private loadAllReports(): void {
    this.isLoading.set(true);
    const f = this.filters();

    // Mocks with complete types for fallbacks
    const mockValidated = { totalCount: 0, details: [], statistics: { countByDay: {}, countByPractice: {}, countByBiochemist: {} } } as unknown as ValidatedResultsReport;
    const mockAgeGender = {
      totalResultsAnalyzed: 0,
      statistics: [],
      overallSummary: {
        totalNormal: 0,
        totalCritical: 0,
        overallNormalPercentage: 0,
        overallCriticalPercentage: 0
      }
    } as unknown as AgeGroupGenderReport;
    const mockScreening = {
      totalResults: 0,
      positiveCount: 0,
      negativeCount: 0,
      positivePercentage: 0,
      negativePercentage: 0,
      details: [],
      statistics: {
        countByDate: {},
        countByAnalysis: {},
        countByGender: {},
        countByResult: {},
        countByAgeRange: {}
      }
    } as unknown as ScreeningResultsReport;

    // Load all reports in parallel with individual catchError
    forkJoin({
      validated: this.reportingService.getValidatedResultsReport(f).pipe(catchError(() => of(mockValidated))),
      ageGender: this.reportingService.getAgeGroupGenderReport(f).pipe(catchError(() => of(mockAgeGender))),
      screening: this.reportingService.getScreeningResultsReport(f).pipe(catchError(() => of(mockScreening)))
    }).subscribe({
      next: (results) => {
        this.reportingService.validatedReport.set(results.validated);
        this.reportingService.ageGenderReport.set(results.ageGender);
        this.reportingService.screeningReport.set(results.screening);
        // Build report cards with charts
        this.buildReportCards();
        // DO NOT load details initially
        this.isLoading.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los reportes' });
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Loads validated results details
   */
  private loadValidatedDetails(): void {
    const validated = this.reportingService.validatedReport();
    if (validated) {
      this.detailsColumns.set(this.getValidatedDetailsColumns());
      this.detailsData.set(this.mapValidatedDetails(validated.details));
    }
  }

  /**
   * Loads demographic details
   */
  private loadAgeGenderDetails(): void {
    const ageGender = this.reportingService.ageGenderReport();
    if (ageGender) {
      this.detailsColumns.set(this.getAgeGenderDetailsColumns());
      this.detailsData.set(this.mapAgeGenderDetails(ageGender.statistics));
    }
  }

  /**
   * Loads screening details
   */
  private loadScreeningDetails(): void {
    const screening = this.reportingService.screeningReport();
    if (screening) {
      this.detailsColumns.set(this.getScreeningDetailsColumns());
      this.detailsData.set(this.mapScreeningDetails(screening.details));
    }
  }

  /**
   * Gets columns for screening details
   */
  private getScreeningDetailsColumns(): GenericColumn[] {
    return [
      { field: 'patientDocument', header: 'Documento', sortable: true },
      { field: 'patientName', header: 'Paciente', sortable: true },
      { field: 'gender', header: 'Género', sortable: true },
      { field: 'birthDate', header: 'Fecha Nacimiento', sortable: true },
      { field: 'analysisName', header: 'Análisis', sortable: true },
      { field: 'analysisCode', header: 'Código', sortable: true },
      { field: 'resultValue', header: 'Resultado', sortable: true },
      { field: 'creationDate', header: 'Fecha Creación', sortable: true }
    ];
  }

  /**
   * Maps screening details for the table
   */
  private mapScreeningDetails(details: any[]): any[] {
    return details.map(d => ({
      patientDocument: d.patient_document || d.patientDocument,
      patientName: d.patient_name || d.patientName,
      gender: (d.patient_gender || d.patientGender) === 'MALE' ? 'Masculino' : 'Femenino',
      birthDate: this.reportingService.formatDate(d.patient_birth_date || d.patientBirthDate),
      analysisName: d.analysis_name || d.analysisName,
      analysisCode: d.analysis_code || d.analysisCode,
      resultValue: this.getResultValueBadge(d.result_value || d.resultValue),
      creationDate: this.reportingService.formatDateTime(d.result_creation_date || d.resultCreationDate)
    }));
  }

  /**
   * Returns a colored badge for the result value
   */
  private getResultValueBadge(value: string): string {
    return value === 'Positivo' ? '🔴 Positivo' : '🟢 Negativo';
  }

  /**
   * Gets columns for validated results details.
   */
  private getValidatedDetailsColumns(): GenericColumn[] {
    return [
      { field: 'patientDocument', header: 'Documento', sortable: true },
      { field: 'patientName', header: 'Paciente', sortable: true },
      { field: 'gender', header: 'Género', sortable: true },
      { field: 'practiceName', header: 'Práctica', sortable: true },
      { field: 'biochemistName', header: 'Bioquímico', sortable: true },
      { field: 'signatureDate', header: 'Fecha Firma', sortable: true },
      { field: 'emissionDate', header: 'Fecha Emisión', sortable: true }
    ];
  }

  /**
   * Maps validated results details for the table.
   */
  private mapValidatedDetails(details: ValidatedResultDetail[]): any[] {
    return details.map(d => ({
      patientDocument: d.patientDocument,
      patientName: d.patientName,
      gender: d.patientGender === 'MALE' ? 'Masculino' : 'Femenino',
      practiceName: d.practiceName,
      biochemistName: d.biochemistName,
      signatureDate: this.reportingService.formatDateTime(d.resultSignatureDateTime),
      emissionDate: this.reportingService.formatDateTime(d.emissionDateTime)
    }));
  }

  /**
   * Gets columns for demographic group details
   */
  private getAgeGenderDetailsColumns(): GenericColumn[] {
    return [
      { field: 'ageGroup', header: 'Grupo Etario', sortable: true },
      { field: 'gender', header: 'Género', sortable: true },
      { field: 'totalCount', header: 'Total Resultados', sortable: true },
      { field: 'normalCount', header: 'Normales', sortable: true },
      { field: 'criticalCount', header: 'Críticos', sortable: true },
      { field: 'normalPercentage', header: '% Normales', sortable: true },
      { field: 'criticalPercentage', header: '% Críticos', sortable: true }
    ];
  }

  /**
   * Maps demographic group details for the table
   */
  private mapAgeGenderDetails(statistics: any[]): any[] {
    return statistics.map(s => ({
      ageGroup: s.ageGroup,
      gender: s.gender === 'MALE' ? 'Masculino' : 'Femenino',
      totalCount: s.totalCount,
      normalCount: s.normalCount,
      criticalCount: s.criticalCount,
      normalPercentage: `${s.normalPercentage.toFixed(1)}%`,
      criticalPercentage: `${s.criticalPercentage.toFixed(1)}%`
    }));
  }

  /**
   * Builds report cards with charts from loaded data
   */
  private buildReportCards(): void {
    const cards: CareReportingCardData[] = [];

    // Load all reports once
    const validated = this.reportingService.validatedReport();
    const ageGender = this.reportingService.ageGenderReport();
    const screening = this.reportingService.screeningReport();

    // Card 1: Resultados Validados por Día (Line Chart)
    if (validated?.statistics?.countByDay) {
      const countByDay = validated.statistics.countByDay;
      const days = Object.keys(countByDay).sort();
      const chartData = days.map(day => ({
        label: this.reportingService.formatDate(day),
        value: countByDay[day]
      }));
      const tableData = days.slice(-4).map(day => ({
        fecha: this.reportingService.formatDate(day),
        cantidad: countByDay[day]
      }));

      cards.push({
        title: 'Resultados Validados por Día',
        icon: 'pi-calendar-check',
        description: 'Evolución temporal de resultados validados y firmados',
        helpText: 'Muestra la cantidad de resultados validados día a día en el período seleccionado',
        chartType: 'line',
        tableColumns: ['Fecha', 'Cantidad'],
        tableData,
        chartData,
        chartLabelKey: 'label',
        chartValueKey: 'value',
        chartColors: ['#3b82f6'] // Azul
      });
    }

    // Card 2: Resultados Validados por Práctica (Bar Chart)
    if (validated?.statistics?.countByPractice) {
      const countByPractice = validated.statistics.countByPractice;
      const practices = Object.entries(countByPractice)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const chartData = practices.map(([name, count]) => ({
        label: name,
        value: count
      }));
      const tableData = practices.slice(0, 4).map(([practica, cantidad]) => ({
        practica,
        cantidad
      }));

      cards.push({
        title: 'Top Prácticas Validadas',
        icon: 'pi-chart-bar',
        description: 'Prácticas con más resultados validados',
        helpText: 'Ranking de las 10 prácticas médicas con mayor cantidad de resultados validados',
        chartType: 'bar',
        tableColumns: ['Práctica', 'Cantidad'],
        tableData,
        chartData,
        chartLabelKey: 'label',
        chartValueKey: 'value',
        chartColors: ['#8b5cf6'] // Morado
      });
    }


    // Card 3: Resultados por Grupo Etario (Bar Chart)
    if (ageGender?.statistics) {
      // Agrupar por edad y sumar géneros
      const ageGroups = new Map<string, number>();
      ageGender.statistics.forEach(stat => {
        const current = ageGroups.get(stat.ageGroup) || 0;
        ageGroups.set(stat.ageGroup, current + stat.totalCount);
      });

      const chartData2 = Array.from(ageGroups.entries()).map(([label, value]) => ({
        label,
        value
      }));
      const tableData2 = Array.from(ageGroups.entries())
        .slice(0, 4)
        .map(([grupo, total]) => ({
          grupo,
          total
        }));

      cards.push({
        title: 'Resultados por Grupo Etario',
        icon: 'pi-users',
        description: 'Distribución de resultados por edad',
        helpText: 'Cantidad de resultados analizados segmentados por grupos de edad',
        chartType: 'bar',
        tableColumns: ['Grupo', 'Total'],
        tableData: tableData2,
        chartData: chartData2,
        chartLabelKey: 'label',
        chartValueKey: 'value',
        chartColors: ['#f59e0b'] // Naranja
      });
    }


    // Card 4: Screenings por Tipo de Análisis (Bar Chart)
    if (screening?.statistics?.countByAnalysis) {
      const countByAnalysis = screening.statistics.countByAnalysis;
      const analyses = Object.entries(countByAnalysis)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const chartData = analyses.map(([name, count]) => ({
        label: name,
        value: count
      }));
      const tableData = analyses.slice(0, 4).map(([analysis, count]) => ({
        analysis,
        count
      }));

      cards.push({
        title: 'Screenings por Tipo de Análisis',
        icon: 'pi-list',
        description: 'Análisis de screening más realizados',
        helpText: 'Ranking de los 10 tipos de análisis de screening más frecuentes',
        chartType: 'bar',
        tableColumns: ['Analysis', 'Count'],
        tableData,
        chartData,
        chartLabelKey: 'label',
        chartValueKey: 'value',
        chartColors: ['#ef4444'] // Rojo
      });
    }

    this.reportCards.set(cards);
  }

  /**
   * Exports details to Excel.
   */
  onExportExcel(): void {
    // Validate that there is data to export
    if (!this.detailsData() || this.detailsData().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay datos disponibles para exportar'
      });
      return;
    }

    const reportId = this.selectedReport();
    const reportLabels: Record<string, string> = {
      'validated': 'resultados_validados',
      'ageGender': 'reportes_poblacionales',
      'screening': 'screenings_realizados'
    };

    const fileName = `${reportLabels[reportId || 'reporte']}_${this.reportingService.getDateRangeString(
      this.filters().startDate,
      this.filters().endDate
    )}.xlsx`;

    // Pass both data and columns to use Spanish headers
    this.reportingService.exportToExcel(
      this.detailsData(),
      this.detailsColumns(),
      fileName
    );

    this.messageService.add({
      severity: 'success',
      summary: 'Exportado',
      detail: 'Los datos se exportaron correctamente'
    });
  }
}
