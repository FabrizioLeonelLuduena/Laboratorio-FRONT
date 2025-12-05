// patients-reports.component.ts
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
  ViewChild,
  computed
} from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { Chart, registerables } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DatePicker } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { OverlayPanel } from 'primeng/overlaypanel';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { forkJoin, finalize } from 'rxjs';

import { GenericAlertComponent, AlertType } from '../../../../shared/components/generic-alert/generic-alert.component';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { InsurerService } from '../../../coverage-administration/services/insurer.service';
import {
  MonthlyPatientsReportDto,
  AgeGenderDistributionDto,
  CoverageAgeGenderDto,
  PatientIncompleteDataDto,
  PatientReportRequestDto
} from '../../dto/patient-report.dto';
import { PatientService } from '../../services/PatientService';


/**
 * Interface for report card data
 */
interface ReportCardData {
  title: string;
  icon: string;
  description: string;
  helpText: string;
  chartType: 'bar' | 'pie' | 'line';
  tableColumns: string[];
  tableData: any[];
  chartData?: any[];
  chartColors?: string[];
  chartLabelKey?: string;
  chartValueKey?: string;
}

/**
 * Interface for metric card
 */
interface MetricCard {
  label: string;
  value: string | number;
  subtext: string;
  icon: string;
  description: string;
}

/**
 * Component for patient reports - integrated version
 */
@Component({
  selector: 'app-patients-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    GenericAlertComponent,
    TableModule,
    ButtonModule,
    ChartModule,
    CalendarModule,
    CardModule,
    DropdownModule,
    InputNumberModule,
    TagModule,
    DialogModule,
    TooltipModule,
    DatePicker,
    OverlayPanelModule
  ],
  templateUrl: './patients-reports.component.html',
  styleUrl: './patients-reports.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientsReportsComponent implements OnInit {
  /** Services */
  private breadcrumbService = inject(BreadcrumbService);
  private pageTitleService = inject(PageTitleService);
  private patientService = inject(PatientService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private insurerService = inject(InsurerService);

  /** Overlay panel for filters */
  @ViewChild('filterPanel') filterPanel!: OverlayPanel;

  /** Data & State */
  loading = false;
  private static chartJsRegistered = false;

  /** Maximum date (today) */
  readonly maxDate = new Date();

  /** Date filters */
  dateFrom = signal<Date | null>(null);
  dateTo = signal<Date | null>(null);

  /** Additional filters */
  minAge = signal<number | null>(null);
  maxAge = signal<number | null>(null);
  selectedGender = signal<string | null>(null);
  selectedSexAtBirth = signal<string | null>(null);
  selectedPlanId = signal<number | null>(null);

  /** Filter options */
  genderOptions = [
    { label: 'Todos', value: null },
    { label: 'Masculino', value: 'MALE' },
    { label: 'Femenino', value: 'FEMALE' },
    { label: 'Otro', value: 'OTHER' }
  ];

  sexAtBirthOptions = [
    { label: 'Todos', value: null },
    { label: 'Masculino', value: 'MALE' },
    { label: 'Femenino', value: 'FEMALE' }
  ];

  /** Plan options loaded dynamically */
  planOptions = signal<{ label: string; value: number | null }[]>([
    { label: 'Todos', value: null }
  ]);

  /** Active filters count */
  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.minAge() !== null) count++;
    if (this.maxAge() !== null) count++;
    if (this.selectedGender() !== null) count++;
    if (this.selectedSexAtBirth() !== null) count++;
    if (this.selectedPlanId() !== null) count++;
    return count;
  });

  /** Age buckets for distribution queries (same as dashboard) */
  private readonly ageBuckets = [
    { label: '0-11', min: 0, max: 11 },
    { label: '12-17', min: 12, max: 17 },
    { label: '18-35', min: 18, max: 35 },
    { label: '36-55', min: 36, max: 55 },
    { label: '56-70', min: 56, max: 70 },
    { label: '71+', min: 71, max: 120 }
  ];

  /**
   * Filter age buckets based on user's min/max age filters
   */
  private getFilteredAgeBuckets(minAge?: number, maxAge?: number): typeof this.ageBuckets {
    if (minAge === undefined && maxAge === undefined) {
      return this.ageBuckets;
    }

    const userMin = minAge ?? 0;
    const userMax = maxAge ?? 120;

    return this.ageBuckets
      .filter(bucket => {
        return bucket.max >= userMin && bucket.min <= userMax;
      })
      .map(bucket => ({
        ...bucket,
        min: Math.max(bucket.min, userMin),
        max: Math.min(bucket.max, userMax)
      }));
  }

  /** Report data */
  monthlyReports = signal<MonthlyPatientsReportDto[]>([]);
  ageGenderReports = signal<AgeGenderDistributionDto[]>([]);
  coverageReports = signal<CoverageAgeGenderDto[]>([]);
  incompleteReports = signal<PatientIncompleteDataDto[]>([]);

  /** KPIs */
  totalPatients = signal(0);
  newPatientsThisMonth = signal(0);
  growthRate = signal(0);
  incompleteDataPercent = signal(0);

  /** Chart expanded states */
  monthlyChartExpanded = signal(false);
  ageGenderChartExpanded = signal(false);
  coverageChartExpanded = signal(false);

  /** Charts */
  monthlyChart: any;
  ageGenderChart: any;
  coverageChart: any;

  monthlyChartOptions: any;
  ageGenderChartOptions: any;
  coverageChartOptions: any;

  /** Alert */
  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  /** Computed metric cards */
  metricCards = computed<MetricCard[]>(() => [
    {
      label: 'Total de pacientes registrados',
      value: this.totalPatients(),
      subtext: 'Pacientes activos',
      icon: 'pi pi-users',
      description: 'Cantidad total de pacientes en el sistema'
    },
    {
      label: 'Altas nuevas del mes',
      value: this.newPatientsThisMonth(),
      subtext: 'Este mes',
      icon: 'pi pi-calendar-plus',
      description: 'Pacientes registrados en el mes actual'
    },
    {
      label: 'Tasa de crecimiento mensual',
      value: `${this.growthRate() >= 0 ? '+' : ''}${this.growthRate().toFixed(1)}%`,
      subtext: 'Variación mensual',
      icon: 'pi pi-chart-line',
      description: 'Porcentaje de crecimiento respecto al mes anterior'
    },
    {
      label: 'Registros con datos incompletos',
      value: `${this.incompleteDataPercent().toFixed(1)}%`,
      subtext: 'Requieren atención',
      icon: 'pi pi-exclamation-triangle',
      description: 'Porcentaje de pacientes con información faltante'
    }
  ]);

  /** Computed report cards */
  reportCards = computed<ReportCardData[]>(() => [
    {
      title: 'Altas de pacientes por mes',
      icon: 'pi-calendar',
      description: 'Nuevos pacientes registrados mensualmente',
      helpText: 'Muestra la cantidad de pacientes nuevos registrados en cada mes del período seleccionado.',
      chartType: 'line',
      tableColumns: ['Año', 'Mes', 'Nuevos pacientes'],
      tableData: this.monthlyReports().slice(0, 4),
      chartData: this.monthlyReports(),
      chartLabelKey: 'monthLabel',
      chartValueKey: 'newPatients'
    },
    {
      title: 'Distribución por edad y género',
      icon: 'pi-users',
      description: 'Distribución de pacientes por rango etario',
      helpText: 'Visualiza cómo se distribuyen los pacientes según su género en diferentes rangos de edad.',
      chartType: 'pie',
      tableColumns: ['Rango edad', 'Género', 'Total'],
      tableData: this.ageGenderReports().slice(0, 4),
      chartData: this.processAgeGenderForChart(),
      chartLabelKey: 'gender',
      chartValueKey: 'total'
    },
    {
      title: 'Distribución por cobertura',
      icon: 'pi-id-card',
      description: 'Pacientes agrupados por cobertura médica',
      helpText: 'Muestra la cantidad de pacientes agrupados por su cobertura de salud.',
      chartType: 'bar',
      tableColumns: ['Cobertura', 'Edad prom.', 'Total'],
      tableData: this.getGroupedCoverageData(),
      chartData: this.processCoverageForChart(),
      chartLabelKey: 'coverageName',
      chartValueKey: 'total'
    },
    {
      title: 'Pacientes con datos incompletos',
      icon: 'pi-exclamation-circle',
      description: 'Registros que requieren completar información',
      helpText: 'Lista de pacientes que tienen campos obligatorios sin completar.',
      chartType: 'bar',
      tableColumns: ['DNI', 'Nombre', 'Campos faltantes'],
      tableData: this.incompleteReports().slice(0, 4),
      chartData: []
    }
  ]);

  /**
   * Constructor
   */
  constructor() {
    this.ensureChartJsRegistered();
  }

  /**
   * Initialize component
   */
  ngOnInit(): void {
    this.breadcrumbService.buildFromRoute(this.route);
    this.pageTitleService.setTitle('Reportes de Pacientes');

    this.initDefaultDates();
    this.loadPlans();



    // Load reports after a small delay to ensure dates are set
    setTimeout(() => {
      this.loadAllReports();
    }, 0);
  }
  /**
   * Load available plans from insurer service
   */
  private loadPlans(): void {
    this.insurerService.getAllInsurersComplete().subscribe({
      next: (insurers) => {
        // Extract all plans from all insurers
        const allPlans = insurers.flatMap(insurer =>
          (insurer.plans || []).map(plan => ({
            label: `${insurer.name} - ${plan.name}`,
            value: plan.id
          }))
        );

        // Sort alphabetically
        allPlans.sort((a, b) => a.label.localeCompare(b.label));

        // Add "All" option at the beginning
        this.planOptions.set([
          { label: 'Todos', value: null },
          ...allPlans
        ]);

        this.cdr.markForCheck();
      },
      error: (_err) => {
        // Keep only "All" on failure
        this.planOptions.set([{ label: 'Todos', value: null }]);
      }
    });
  }


  /** Initialize default dates */
  private initDefaultDates(): void {


    // Set default dates
    this.dateFrom.set(null);
    this.dateTo.set(null);

    // Trigger change detection to update UI
    this.cdr.markForCheck();
  }

  /** Handle date from change */
  onDateFromChange(value: Date | null): void {
    this.dateFrom.set(value);
    this.applyFilters();
  }

  /** Handle date to change */
  onDateToChange(value: Date | null): void {
    this.dateTo.set(value);
    this.applyFilters();
  }

  /** Toggle filter panel */
  toggleFilterPanel(event: Event): void {
    this.filterPanel.toggle(event);
  }

  /** Apply additional filters */
  applyAdditionalFilters(): void {
    this.filterPanel.hide();
    this.applyFilters();
  }

  /** Clear additional filters */
  clearAdditionalFilters(): void {
    this.minAge.set(null);
    this.maxAge.set(null);
    this.selectedGender.set(null);
    this.selectedSexAtBirth.set(null);
    this.selectedPlanId.set(null);
    this.filterPanel.hide();
    this.applyFilters();
  }

  /** Apply all filters */
  private applyFilters(): void {
    this.loadAllReports();
  }

  /** Build request DTO from current filters */
  private buildRequestDto(): PatientReportRequestDto {
    let adjustedDateTo: Date | null = null;
    if (this.dateTo()) {

      // Add one day to the end date to make the range inclusive for backend queries.
      adjustedDateTo = new Date(this.dateTo()!);
      adjustedDateTo.setDate(adjustedDateTo.getDate() + 1);
    }

    const dto = {
      startDate: this.dateFrom() ? this.formatDate(this.dateFrom()!) : undefined,
      endDate: adjustedDateTo ? this.formatDate(adjustedDateTo) : undefined,
      minAge: this.minAge() ?? undefined,
      maxAge: this.maxAge() ?? undefined,
      gender: this.selectedGender() ?? undefined,
      sexAtBirth: this.selectedSexAtBirth() ?? undefined,
      planId: this.selectedPlanId() ?? undefined
    };



    return dto;
  }

  /** Format date to dd-MM-yyyy */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /** Load all reports in parallel using bucketed strategy like dashboard */
  private loadAllReports(): void {
    this.loading = true;
    const request = this.buildRequestDto();

    // Load monthly reports (works with dates)
    this.patientService.getMonthlyRegistrations(request)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (data) => {
          this.monthlyReports.set(data ?? []);

          this.calculateKPIs();
          this.buildAllCharts();
          this.clearAlert();
        },
        error: () => {
          this.showAlert('error', 'Error', 'No se pudieron cargar los reportes.');
        }
      });

    // Load age/gender distribution using buckets (like dashboard)
    this.loadAgeGenderDistributionBuckets();

    // Load coverage distribution using buckets (like dashboard)
    this.loadCoverageDistributionBuckets();

    // Load incomplete data
    this.loadIncompleteData();
  }

  /**
   * Load age/gender distribution using age buckets (same strategy as dashboard)
   */
  private loadAgeGenderDistributionBuckets(): void {
    const request = this.buildRequestDto();

    // Filtrar buckets según los filtros de edad del usuario
    const filteredBuckets = this.getFilteredAgeBuckets(request.minAge, request.maxAge);

    // Apply filters to each bucket
    const calls = filteredBuckets.map(bucket => {
      const bucketRequest = {
        minAge: bucket.min,
        maxAge: bucket.max,
        gender: request.gender,
        sexAtBirth: request.sexAtBirth,
        startDate: request.startDate,
        endDate: request.endDate
      };

      return this.patientService.getAgeGenderDistribution(bucketRequest);
    });

    forkJoin(calls).subscribe({
      next: (results: AgeGenderDistributionDto[][]) => {
        // Flatten all results into a single array
        let allResults = results.flat();



        this.ageGenderReports.set(allResults);

        this.buildAgeGenderChart();
        this.cdr.markForCheck();
      },
      error: () => {
        this.showAlert('error', 'Error', 'No se pudo cargar la distribución por edad y género.');
        this.ageGenderReports.set([]);
      }
    });
  }

  /**
   * Load coverage distribution using age buckets (same strategy as dashboard)
   */
  private loadCoverageDistributionBuckets(): void {
    const request = this.buildRequestDto();

    // Filtrar buckets según los filtros de edad del usuario
    const filteredBuckets = this.getFilteredAgeBuckets(request.minAge, request.maxAge);

    // Apply filters to each bucket
    const calls = filteredBuckets.map(bucket => {
      const bucketRequest = {
        minAge: bucket.min,
        maxAge: bucket.max,
        gender: request.gender,
        sexAtBirth: request.sexAtBirth,
        planId: request.planId,
        startDate: request.startDate,
        endDate: request.endDate

      };
      return this.patientService.getCoverageDistribution(bucketRequest);
    });

    forkJoin(calls).subscribe({
      next: (results: CoverageAgeGenderDto[][]) => {
        // Flatten all results into a single array
        const allResults = results.flat();


        this.coverageReports.set(allResults);

        this.buildCoverageChart();
        this.cdr.markForCheck();
      },
      error: () => {
        this.showAlert('error', 'Error', 'No se pudo cargar la distribución por cobertura.');
        this.coverageReports.set([]);
      }
    });
  }

  /**
   * Load incomplete data and apply frontend filtering
   */
  private loadIncompleteData(): void {
    this.patientService.getPatientsWithIncompleteData().subscribe({
      next: (data) => {
        const rawData = data ?? [];


        const filteredData = this.filterIncompleteData(rawData);

        this.incompleteReports.set(filteredData);
        this.calculateKPIs();
        this.cdr.markForCheck();
      },
      error: () => {
        this.showAlert('error', 'Error', 'No se pudo cargar el reporte de datos incompletos.');
        this.incompleteReports.set([]);
      }
    });
  }



  /** Calculate KPIs from loaded data */
  private calculateKPIs(): void {
    const monthlyData = this.monthlyReports();

    // Total patients
    const total = monthlyData.reduce((sum, r) => sum + Number(r.newPatients), 0);
    this.totalPatients.set(total);

    // New patients this month
    if (monthlyData.length > 0) {
      const lastMonth = monthlyData[monthlyData.length - 1];
      this.newPatientsThisMonth.set(Number(lastMonth.newPatients));
    }

    // Growth rate
    if (monthlyData.length >= 2) {
      const current = Number(monthlyData[monthlyData.length - 1].newPatients);
      const previous = Number(monthlyData[monthlyData.length - 2].newPatients);

      if (previous > 0) {
        this.growthRate.set(((current - previous) / previous) * 100);
      }
    }

    // Incomplete data percentage
    if (total > 0) {
      this.incompleteDataPercent.set((this.incompleteReports().length / total) * 100);
    }
  }

  /** Process age/gender data for chart */
  private processAgeGenderForChart(): any[] {
    const genderMap = new Map<string, number>();
    this.ageGenderReports().forEach(item => {
      const current = genderMap.get(item.gender) || 0;
      genderMap.set(item.gender, current + item.total);
    });

    return Array.from(genderMap.entries()).map(([gender, total]) => ({
      gender: this.translateGender(gender),
      total
    }));
  }

  /** Process coverage data for chart - AGREGANDO CORRECTAMENTE */
  private processCoverageForChart(): any[] {
    const coverageMap = new Map<string, { total: number; totalAge: number; count: number }>();

    this.coverageReports().forEach(item => {
      const existing = coverageMap.get(item.coverageName) || { total: 0, totalAge: 0, count: 0 };

      coverageMap.set(item.coverageName, {
        total: existing.total + item.total,
        totalAge: existing.totalAge + (item.averageAge * item.total), // Peso por cantidad
        count: existing.count + item.total
      });
    });

    return Array.from(coverageMap.entries()).map(([coverageName, data]) => ({
      coverageName,
      total: data.total,
      averageAge: data.count > 0 ? data.totalAge / data.count : 0 // Promedio ponderado
    }));
  }

  /**
   * Returns the first 4 grouped coverage entries for table display.
   * Groups coverage data by aggregating totals and calculating weighted average ages,
   * then limits the result to the first 4 entries.
   *
   * @returns Array of grouped coverage objects containing coverageName, total patients, and weighted averageAge.
   *          Limited to the first 4 entries for table preview.
   */
  getGroupedCoverageData(): any[] {
    const grouped = this.processCoverageForChart();
    return grouped.slice(0, 4); // Primeros 4 para la tabla
  }

  /**
   * Filter incomplete patients data based on current filters
   */
  private filterIncompleteData(data: PatientIncompleteDataDto[]): PatientIncompleteDataDto[] {
    if (!data || data.length === 0) return [];

    let filtered = [...data];

    // Filter by gender
    if (this.selectedGender() !== null) {
      filtered = filtered.filter(p => p.gender === this.selectedGender());

    }

    // Filter by sex at birth
    if (this.selectedSexAtBirth() !== null) {
      filtered = filtered.filter(p => p.sexAtBirth === this.selectedSexAtBirth());

    }

    // Filter by age range
    const minAge = this.minAge();
    const maxAge = this.maxAge();

    if (minAge !== null || maxAge !== null) {

      filtered = filtered.filter(p => {
        if (!p.birthDate){

          return true;}

        const patientAge = this.calculateAgeFromBirthDate(p.birthDate);


        if (minAge !== null && patientAge < minAge) return false;

        if (maxAge !== null && patientAge > maxAge) return false;



        return true;
      });

    }

    // Note: No planId filtering since DTO doesn't have it
    // Note: No date range filtering since DTO doesn't have registrationDate

    return filtered;
  }

  /**
   * Calculate age from birth date string.
   * Supports both ISO format (YYYY-MM-DD) and dd-MM-yyyy format for compatibility.
   *
   * @param birthDateStr - Birth date in ISO format (YYYY-MM-DD) or dd-MM-yyyy
   * @returns Calculated age in years
   */
  private calculateAgeFromBirthDate(birthDateStr: string): number {
    if (!birthDateStr) {

      return 0;
    }

    try {
      const parts = birthDateStr.split('-');

      if (parts.length !== 3) return 0;

      let year: number;
      let month: number;
      let day: number;

      // Detect format by checking if first part is a 4-digit year (ISO format)
      if (parts[0].length === 4) {
        // ISO format: YYYY-MM-DD
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        day = parseInt(parts[2], 10);
      } else {
        // Legacy format: dd-MM-yyyy
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        year = parseInt(parts[2], 10);
      }

      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day)) return 0;

      const birthDate = new Date(year, month, day);

      // Validate that the date is valid
      if (isNaN(birthDate.getTime())) return 0;

      const today = new Date();

      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }


      return age;
    } catch {
      return 0;
    }
  }

  /**
   * Normalize missing fields to always return an array of strings
   * Handles both string[] and comma-separated string formats
   *
   * @param row - Patient incomplete data row
   * @returns Array of missing field identifiers
   */
  /**
   * Normalize missing fields to always return an array of strings
   * Handles both string[] and comma-separated string formats
   *
   * @param row - Patient incomplete data row or partial data
   * @returns Array of missing field identifiers
   */
  getMissingFieldsArray(row: { missingFields?: string[] | string }): string[] {
    if (!row.missingFields) return [];

    if (Array.isArray(row.missingFields)) {
      return row.missingFields
        .map((f: string) => f.trim())
        .filter((f: string) => f.length > 0);
    }

    if (typeof row.missingFields === 'string') {
      return row.missingFields
        .split(',')
        .map((f: string) => f.trim())
        .filter((f: string) => f.length > 0);
    }

    return [];
  }


  /** Build all charts */
  private buildAllCharts(): void {
    this.buildMonthlyChart();
    // ageGender and coverage charts are built in their respective load methods
  }

  /** Build monthly chart */
  private buildMonthlyChart(): void {
    const data = this.monthlyReports();
    const labels = data.map(r => `${r.month}/${r.year}`);
    const values = data.map(r => Number(r.newPatients));

    this.monthlyChart = {
      labels,
      datasets: [{
        label: 'Pacientes nuevos',
        data: values,
        borderColor: '#009688',
        backgroundColor: '#00968820',
        tension: 0.4,
        fill: true
      }]
    };

    this.monthlyChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#333', font: { size: 12 } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#333', font: { size: 12 } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          bodyFont: { size: 12 },
          titleFont: { size: 12, weight: 'bold' }
        }
      }
    };
  }

  /** Build age/gender chart */
  private buildAgeGenderChart(): void {
    const data = this.processAgeGenderForChart();
    const labels = data.map(d => d.gender);
    const values = data.map(d => d.total);

    this.ageGenderChart = {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ['#2196F3', '#E91E63', '#9C27B0', '#FF9800'],
        hoverOffset: 2
      }]
    };

    this.ageGenderChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          align: 'center',
          labels: {
            color: '#333',
            font: { size: 11 },
            padding: 5,
            boxWidth: 12,
            boxHeight: 12
          }
        },
        tooltip: {
          bodyFont: { size: 11 },
          titleFont: { size: 11, weight: 'bold' }
        }
      }
    };
  }

  /** Build coverage chart */
  private buildCoverageChart(): void {
    const data = this.processCoverageForChart();
    const labels = data.map(d => d.coverageName);
    const values = data.map(d => d.total);

    this.coverageChart = {
      labels,
      datasets: [{
        label: 'Pacientes',
        data: values,
        backgroundColor: '#2196F3',
        borderRadius: 8
      }]
    };

    this.coverageChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#333', font: { size: 12 } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#333', font: { size: 12 } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          bodyFont: { size: 12 },
          titleFont: { size: 12, weight: 'bold' }
        }
      }
    };
  }

  /** Toggle chart expansion */
  toggleChart(index: number): void {
    if (index === 0) {
      this.monthlyChartExpanded.set(!this.monthlyChartExpanded());
    } else if (index === 1) {
      this.ageGenderChartExpanded.set(!this.ageGenderChartExpanded());
    } else if (index === 2) {
      this.coverageChartExpanded.set(!this.coverageChartExpanded());
    }
  }

  /** Get chart expanded state */
  isChartExpanded(index: number): boolean {
    if (index === 0) return this.monthlyChartExpanded();
    if (index === 1) return this.ageGenderChartExpanded();
    if (index === 2) return this.coverageChartExpanded();
    return false;
  }

  /** Get chart data for card */
  getChartDataForCard(index: number): any {
    if (index === 0) return this.monthlyChart;
    if (index === 1) return this.ageGenderChart;
    if (index === 2) return this.coverageChart;
    return null;
  }

  /** Get chart options for card */
  getChartOptionsForCard(index: number): any {
    if (index === 0) return this.monthlyChartOptions;
    if (index === 1) return this.ageGenderChartOptions;
    if (index === 2) return this.coverageChartOptions;
    return null;
  }

  /** Check if card has chart data */
  hasChartData(index: number): boolean {
    const card = this.reportCards()[index];
    return Array.isArray(card.chartData) && card.chartData.length > 0;
  }

  /** Get table value */
  getTableValue(row: any, column: string, cardIndex: number): any {
    if (cardIndex === 0) {
      if (column === 'Año') return row.year;
      if (column === 'Mes') return row.month;
      if (column === 'Nuevos pacientes') return row.newPatients;
    } else if (cardIndex === 1) {
      if (column === 'Rango edad') return `${row.minAge}-${row.maxAge}`;
      if (column === 'Género') return this.translateGender(row.gender);
      if (column === 'Total') return row.total;
    } else if (cardIndex === 2) {
      if (column === 'Cobertura') return row.coverageName;
      if (column === 'Edad prom.') return `${(row.averageAge || 0).toFixed(1)} años`;
      if (column === 'Total') return row.total;
    } else if (cardIndex === 3) {
      if (column === 'DNI') return row.dni;
      if (column === 'Nombre') return row.fullName;
      if (column === 'Campos faltantes') return row.missingFields;
    }
    return '-';
  }

  /** Get severity for missing field tag */
  getMissingFieldSeverity(field: string): 'danger' | 'warning' | 'info' {
    if (field.includes('contact')) return 'danger';
    if (field.includes('address')) return 'warning';
    return 'info';
  }

  /** Translate missing field */
  translateMissingField(field: string): string {
    const map: any = {
      'contact': 'Sin contacto',
      'contact_incomplete': 'Contacto incompleto',
      'address': 'Sin dirección',
      'address_incomplete': 'Dirección incompleta',
      'coverage': 'Sin cobertura',
      'coverage_incomplete': 'Cobertura incompleta'
    };
    return map[field] || field;
  }

  /** Translate gender */
  translateGender(gender: string): string {
    const map: any = {
      'MALE': 'Masculino',
      'FEMALE': 'Femenino',
      'OTHER': 'Otro'
    };
    return map[gender] || gender;
  }

  /** Get growth rate color class */
  getGrowthRateColorClass(): string {
    return this.growthRate() >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]';
  }

  /** Display alert with auto-close after 5 seconds */
  private showAlert(type: AlertType, title: string, text: string): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    this.cdr.markForCheck();

    setTimeout(() => {
      this.clearAlert();
    }, 5000);
  }

  /**
   * Clears the current alert state and triggers change detection
   * to refresh the view.
   */
  private clearAlert(): void {
    this.alertType = null;
    this.cdr.markForCheck();
  }

  /** Ensures required Chart.js elements are registered once */
  private ensureChartJsRegistered(): void {
    if (!PatientsReportsComponent.chartJsRegistered) {
      Chart.register(...registerables);
      PatientsReportsComponent.chartJsRegistered = true;
    }
  }

  /** Export placeholders */
  exportExcel(): void {
    this.patientService.exportExcel().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reportes-pacientes-${new Date().getTime()}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.showAlert('error', 'Error', 'No se pudo exportar el archivo.')
    });
  }

  /**
   * Export placeholders
   */
  exportPdf(): void {
    this.patientService.exportPdf().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reportes_pacientes_${new Date().getTime()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.showAlert('error', 'Error', 'No se pudo exportar el archivo.')
    });
  }

  /**
   * Type guard to check if a value is an array
   *
   * @param value - Value to check
   * @returns True if value is an array
   */
  isArray(value: unknown): value is any[] {
    return Array.isArray(value);
  }
}
