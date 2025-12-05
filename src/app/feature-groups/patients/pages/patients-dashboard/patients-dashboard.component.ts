import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { ChartData, ChartOptions } from 'chart.js';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { forkJoin } from 'rxjs';
import {
  DashboardChartCard,
  DashboardChartCardComponent
} from 'src/app/shared/components/dashboard-chart-card/dashboard-chart-card.component';
import {
  DashboardMetric,
  DashboardMetricCardComponent
} from 'src/app/shared/components/dashboard-metric-card/dashboard-metric-card.component';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';

import { AgeGenderDistributionDto, CoverageAgeGenderDto, MonthlyPatientsReportDto, PatientIncompleteDataDto, PatientDashboardDto } from '../../dto/patient-report.dto';
import {
  PatientsDashboardService
} from '../../services/patients-dashboard.service';
import { PatientService } from '../../services/PatientService';



/**
 * CoverageType
 *
 * Represents the distribution of patients by coverage type
 * (e.g. public, private, prepaid) with count and percentage.
 */
interface CoverageType {
  type: string;
  count: number;
  percentage: number;
}

/**
 * PatientsDashboardComponent
 *
 * Dashboard view for Patients KPIs and trend charts.
 * Uses the generic dashboard metric and chart card components
 * to keep a consistent UI across different domains.
 */
@Component({
  selector: 'app-patients-dashboard',
  templateUrl: './patients-dashboard.component.html',
  standalone: true,
  imports: [
    CommonModule,
    SkeletonModule,
    TableModule,
    CardModule,
    TooltipModule,
    DashboardMetricCardComponent,
    DashboardChartCardComponent,
    GenericAlertComponent
  ],
  styleUrl: './patients-dashboard.component.css'
})
export class PatientsDashboardComponent implements OnInit {
  /**
   * High-level KPI metrics displayed at the top of the dashboard.
   * In a real implementation these values should be loaded from the backend.
   */
  metrics: DashboardMetric[] = [];

  alertType: 'success' | 'error' | 'warning' | 'info' | null = null;
  alertTitle = '';
  alertText = '';


  /**
   * Coverage types and their distribution across the patient base.
   */
  coverageTypes: CoverageType[] = [
    { type: 'Obra Social', count: 850, percentage: 68.1 },
    { type: 'Particular', count: 250, percentage: 20.0 },
    { type: 'Prepaga', count: 148, percentage: 11.9 }
  ];

  /**
   * Empty chart data structure that can be used as a fallback
   * when no data is available from the backend.
   */
  private readonly emptyChartData: ChartData = { labels: [], datasets: [] };
  // Pastel palettes aligned with billing dashboard look & feel
  private readonly mainPalette = ['#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#26A69A', '#EF5350', '#5C6BC0', '#BDBDBD'];
  private readonly tealPalette = ['#008c8a', '#00a3a1', '#35cdcb', '#6fdfdd'];
  private readonly piePalette = ['#6a5acd', '#2196f3', '#26a69a', '#ab47bc', '#ffa726', '#42a5f5'];

  /**
   * Chart card configuration used by the generic DashboardChartCardComponent.
   * Each entry defines a chart, its type, data, options and help text.
   * Initial data is static and will be overridden by real API data.
   */
  chartCards: DashboardChartCard[] = [
    // Line Chart - Patient Evolution Over Time
    {
      title: 'Evolución de pacientes',
      description: 'Total de pacientes activos',
      icon: 'pi pi-chart-line',
      chartType: 'line',
      data: this.emptyChartData,
      options: this.getLineChartOptions('Mes', 'Cantidad de pacientes'),
      helpText: 'Evolución del total de pacientes activos a lo largo del tiempo'
    },
    // Bar Chart - New Patients by Month
    {
      title: 'Nuevos pacientes',
      description: 'Registros por mes',
      icon: 'pi pi-chart-bar',
      chartType: 'bar',
      data: this.emptyChartData,
      options: this.getBarChartOptions('Mes', 'Nuevos pacientes'),
      helpText: 'Número de nuevos pacientes registrados por mes'
    },
    // Pie Chart - Age Distribution
    {
      title: 'Distribución por edad',
      description: 'Porcentaje por grupo etario',
      icon: 'pi pi-chart-pie',
      chartType: 'pie',
      data: this.emptyChartData,
      options: this.getPieChartOptions(),
      helpText: 'Distribución porcentual de pacientes por grupos de edad'
    },
    // Stacked Bar Chart - Age and Gender Distribution
    {
      title: 'Distribución por edad y género',
      description: 'Combinación de grupos etarios y género',
      icon: 'pi pi-chart-bar',
      chartType: 'bar',
      data: this.emptyChartData,
      options: this.getStackedBarOptions('Edad', 'Porcentaje de pacientes (%)', true),
      helpText: 'Distribución de pacientes por grupo de edad y género'
    },
    // Pie Chart - Coverage Distribution
    {
      title: 'Distribución por cobertura',
      description: 'Porcentaje por cobertura',
      icon: 'pi pi-chart-pie',
      chartType: 'pie',
      data: this.emptyChartData,
      options: this.getPieChartOptions(),
      helpText: 'Distribución porcentual de pacientes por cobertura'
    },
    // Stacked Bar Chart - Age and Coverage Distribution
    {
      title: 'Distribución por edad y cobertura',
      description: 'Combinación de grupos etarios y cobertura',
      icon: 'pi pi-chart-bar',
      chartType: 'bar',
      data: this.emptyChartData,
      options: this.getStackedBarOptions('Edad', 'Porcentaje de pacientes (%)', true),
      helpText: 'Distribución de pacientes por grupo de edad y cobertura'
    }
  ];

  /**
   * Loads and builds the datasets for patient distribution by age bucket and
   * medical coverage, calling `patientService.getCoverageDistribution` for each
   * age bucket and updating the "Distribución por edad y cobertura" chart card.
   */
  private loadCoverageDistributionBuckets(): void {
    const calls = this.ageBuckets.map(b =>
      this.patientService.getCoverageDistribution({ minAge: b.min, maxAge: b.max })
    );

    forkJoin(calls).subscribe({
      next: (results: CoverageAgeGenderDto[][]) => {
        const labels = this.ageBuckets.map(b => b.label);
        const totalsByBucket = results.map(items =>
          items.reduce((sum, it) => sum + (it.total || 0), 0)
        );

        // Collect all coverage names across buckets
        const coverageSet = new Set<string>();
        results.forEach(items => items.forEach(it => coverageSet.add(it.coverageName)));
        const coverages = Array.from(coverageSet);

        const ageCoverageCard = this.chartCards.find(
          (card) => card.title === 'Distribución por edad y cobertura'
        );
        if (ageCoverageCard) {
          const colors = this.getChartColors();
          ageCoverageCard.data = {
            labels,
            datasets: coverages.map((name, idx) => ({
              label: name,
              data: results.map((items, bucketIndex) => {
                const bucketTotal = totalsByBucket[bucketIndex] || 0;
                const coverageTotal = items
                  .filter(it => it.coverageName === name)
                  .reduce((sum, it) => sum + (it.total || 0), 0);
                return bucketTotal > 0 ? Number(((coverageTotal / bucketTotal) * 100).toFixed(1)) : 0;
              }),
              backgroundColor: colors[idx % colors.length]
            }))
          };
        }
      },
      error: () => this.showAlert('error', 'No se pudo cargar la distribución por edad y cobertura', 'Intente nuevamente más tarde.')
    });
  }

  /**
   * Loading flag used to show skeletons while data is being fetched.
   */
  isLoading = false;

  private readonly ageBuckets = [
    { label: '0-11', min: 0, max: 11 },
    { label: '12-17', min: 12, max: 17 },
    { label: '18-35', min: 18, max: 35 },
    { label: '36-55', min: 36, max: 55 },
    { label: '56-70', min: 56, max: 70 },
    { label: '71+', min: 71, max: 120 }
  ];

  /**
   * Raw monthly patient report data returned by the API.
   */
  monthlyReports: MonthlyPatientsReportDto[] = [];


  /**
   * Raw coverage distribution returned by the API.
   */
  coverageDistribution: CoverageAgeGenderDto[] = [];

  /**
   * List of patients with incomplete data returned by the API.
   */
  incompleteData: PatientIncompleteDataDto[] = [];

  /**
   * Creates an instance of PatientsDashboardComponent.
   * It initializes chart structures and injects required services.
   */
  constructor(
    private readonly patientsDashboardService: PatientsDashboardService,
    private readonly patientService: PatientService
  ) {
    this.initializeChartData();
  }

  /**
   * Angular lifecycle hook executed after component initialization.
   * Triggers the initial data loading from backend services.
   */
  ngOnInit(): void {
    this.loadDashboardData();
    this.loadPatientReports();
  }

  /**
   * Loads high-level dashboard metrics from PatientsDashboardService.
   * This is the place to handle GetDashboardPayload/GetDashboardResponse.
   * Currently left as a placeholder so the component compiles.
   */
  private loadDashboardData(): void {
    this.isLoading = true;

    // Build a wide date range: last 12 months (DD-MM-YYYY)
    const format = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    };
    const end = new Date();
    const start = new Date(end);
    start.setMonth(end.getMonth() - 12);
    const startDate = format(start);
    const endDate = format(end);

    // Last 24 hours range (approx by calendar days in local TZ)
    const end24 = new Date();
    const start24 = new Date(end24);
    start24.setDate(end24.getDate() - 1);
    const startDate24 = format(start24);
    const endDate24 = format(end24);

    forkJoin({
      twelveMo: this.patientsDashboardService.getDashboard({
        minAge: 0,
        maxAge: 200,
        startDate: startDate,
        endDate: endDate
      }),
      last24h: this.patientsDashboardService.getDashboard({
        minAge: 0,
        maxAge: 200,
        startDate: startDate24,
        endDate: endDate24
      })
    }).subscribe({
      next: ({ twelveMo, last24h }: { twelveMo: PatientDashboardDto, last24h: PatientDashboardDto }) => {
        const monthly = twelveMo.newPatientsPerMonth ?? [];
        const totalNew12m = monthly.reduce(
          (sum: number, m: MonthlyPatientsReportDto) => sum + (m.newPatients ?? 0),
          0
        );
        const newLast24 = last24h.totalPatients ?? 0;

        const incompletePctRaw = twelveMo.incompleteDataPercent ?? 0;
        const incompletePctDisplay = `${(((incompletePctRaw <= 1 ? incompletePctRaw * 100 : incompletePctRaw)).toFixed(1))}%`;

        const growthRaw = twelveMo.growthRate ?? 0;
        const growthDisplay = `${(((growthRaw <= 1 ? growthRaw * 100 : growthRaw)).toFixed(1))}%`;

        this.metrics = [
          {
            label: 'Nuevos (últimas 24h)',
            value: newLast24.toString(),
            icon: 'pi pi-bolt',
            helpText: 'Pacientes registrados en las últimas 24 horas',
            subtext: '',
            accent: 'primary'
          },
          {
            label: 'Nuevos (últimos 12 meses)',
            value: totalNew12m.toString(),
            icon: 'pi pi-user-plus',
            helpText: 'Nuevos pacientes en los últimos 12 meses',
            subtext: '',
            accent: 'primary'
          },
          {
            label: 'Datos incompletos',
            value: incompletePctDisplay,
            icon: 'pi pi-exclamation-triangle',
            helpText: 'Porcentaje de pacientes con datos incompletos',
            subtext: '',
            accent: 'primary'
          },
          {
            label: 'Tasa de crecimiento',
            value: growthDisplay,
            icon: 'pi pi-chart-line',
            helpText: 'Qué tanto varió la cantidad total de pacientes activos en el período actual respecto al período anterior.',
            subtext: '',
            accent: 'primary'
          }
        ];
      },
      error: () => {
        this.showAlert('error', 'No se pudieron cargar los datos del dashboard', 'Intente nuevamente más tarde.');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Loads and builds the datasets for patient distribution by age and, additionally,
   * by age and gender, calling `patientService.getAgeGenderDistribution` for each
   * age bucket and updating the corresponding dashboard chart cards.
   */
  private loadAgeDistributionBuckets(): void {
    const calls = this.ageBuckets.map(b =>
      this.patientService.getAgeGenderDistribution({ minAge: b.min, maxAge: b.max })
    );

    forkJoin(calls).subscribe({
      next: (results: AgeGenderDistributionDto[][]) => {
        const labels = this.ageBuckets.map(b => b.label);
        const totals = results.map(items =>
          items.reduce((sum, curr) => sum + (curr.total || 0), 0)
        );

        const agePieCard = this.chartCards.find(
          (card) => card.title === 'Distribución por edad'
        );
        if (agePieCard) {
          agePieCard.data = {
            labels,
            datasets: [
              {
                label: 'Pacientes',
                data: totals,
                backgroundColor: this.getChartColors()
              }
            ]
          };
        }

        // Build stacked Age + Gender using the same buckets
        const ageGenderCard = this.chartCards.find(
          (card) => card.title === 'Distribución por edad y género'
        );
        if (ageGenderCard) {
          const genderKeysSet = new Set<string>();
          results.forEach(items => items.forEach(it => {
            genderKeysSet.add((it.gender ?? it.sexAtBirth ?? 'UNKNOWN'));
          }));
          const genderKeys = Array.from(genderKeysSet);
          const colors = this.getChartColors();
          ageGenderCard.data = {
            labels,
            datasets: genderKeys.map((gKey, idx) => ({
              label: this.translateGender(gKey),
              data: results.map((items, bucketIndex) => {
                const bucketTotal = totals[bucketIndex] || 0;
                const bucketGenderTotal = items
                  .filter(it => (it.gender ?? it.sexAtBirth ?? 'UNKNOWN') === gKey)
                  .reduce((sum, it) => sum + (it.total || 0), 0);
                return bucketTotal > 0 ? Number(((bucketGenderTotal / bucketTotal) * 100).toFixed(1)) : 0;
              }),
              backgroundColor: colors[idx % colors.length]
            }))
          };
        }
      },
      error: () => this.showAlert('error', 'No se pudo cargar la distribución por edad', 'Intente nuevamente más tarde.')
    });
  }


  /**
   * Loads all detailed patient-related reports used in the dashboard
   * (monthly registrations, age/gender distribution, coverage distribution
   * and incomplete data).
   */
  private loadPatientReports(): void {
    this.loadAgeDistributionBuckets();
    this.loadCoverageDistributionBuckets();

    const reports$ = {
      monthly: this.patientService.getMonthlyRegistrations(),
      coverage: this.patientService.getCoverageDistribution({}),
      incomplete: this.patientService.getPatientsWithIncompleteData()
    };

    forkJoin(reports$).subscribe({
      next: ({ monthly, coverage, incomplete }) => {
        this.monthlyReports = monthly;
        this.updateChartsWithRealData({ monthlyReports: monthly });

        this.coverageDistribution = coverage;
        this.updateChartsWithRealData({ coverageDistribution: coverage });

        this.incompleteData = incomplete;
        this.updateChartsWithRealData({ incompleteData: incomplete });
      },
      error: () => {
        this.showAlert('error', 'No se pudieron cargar los reportes detallados', 'Intente nuevamente más tarde.');
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Displays an alert message in the dashboard by setting the alert type, title and text.
   *
   * @param type Alert type to display (success | error | warning | info).
   * @param title Alert message title.
   * @param text Descriptive alert message text.
   */
  private showAlert(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    text: string
  ): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
  }

  /**
   * Initializes chart-related data structures.
   * Currently chart data is generated by helper methods and later
   * overridden by real data from the backend.
   */
  private initializeChartData(): void {
    // Data is initialized via chart data generator methods.
  }

  /**
   * Central method that updates chart data according to which
   * dataset has been loaded from the API.
   *
   * @param data Partial data object containing any subset of
   *             the supported report collections.
   */
  private updateChartsWithRealData(data: {
    monthlyReports?: MonthlyPatientsReportDto[];
    ageGenderDistribution?: AgeGenderDistributionDto[];
    coverageDistribution?: CoverageAgeGenderDto[];
    incompleteData?: PatientIncompleteDataDto[];
  }): void {
    if (data.monthlyReports) {
      this.updatePatientEvolutionChart(data.monthlyReports);
      this.updateNewPatientsChart(data.monthlyReports);
    }

    if (data.ageGenderDistribution) {
      // Age charts are populated via bucketed requests in loadAgeDistributionBuckets()
    }

    if (data.coverageDistribution) {
      this.updateCoverageDistribution(data.coverageDistribution);
    }

    if (data.incompleteData) {
      this.updateIncompleteDataMetrics(data.incompleteData);
    }
  }

  /**
   * Updates the "patient evolution" line chart with real monthly reports.
   *
   * @param reports Array of monthly patient reports.
   */
  private updatePatientEvolutionChart(reports: MonthlyPatientsReportDto[]): void {
    const evolutionCard = this.chartCards.find(
      (card) => card.title === 'Evolución de pacientes'
    );
    if (evolutionCard) {
      const now = new Date();
      const months: { date: Date; label: string }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          date: d,
          label: d.toLocaleDateString('es-AR', { month: 'short' })
        });
      }

      const monthlyCounts = months.map(({ date }) => {
        const match = reports.find(
          (r) => r.year === date.getFullYear() && r.month === date.getMonth() + 1
        );
        return match?.newPatients ?? 0;
      });

      const cumulative = monthlyCounts.reduce<number[]>((acc, val, idx) => {
        acc[idx] = (acc[idx - 1] ?? 0) + val;
        return acc;
      }, []);

      const primary = this.mainPalette[0];
      evolutionCard.data = {
        labels: months.map((m) => m.label),
        datasets: [
          {
            label: 'Pacientes activos',
            data: cumulative,
            borderColor: primary,
            backgroundColor: `${primary}1A`, // Add alpha for background
            tension: 0.4,
            fill: true
          }
        ]
      };
    }
  }

  /**
   * Updates the "new patients" bar chart with real monthly reports.
   *
   * @param reports Array of monthly patient reports.
   */
  private updateNewPatientsChart(reports: MonthlyPatientsReportDto[]): void {
    const newPatientsCard = this.chartCards.find(
      (card) => card.title === 'Nuevos pacientes'
    );
    if (newPatientsCard) {
      const now = new Date();
      const months: { date: Date; label: string }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          date: d,
          label: d.toLocaleDateString('es-AR', { month: 'short' })
        });
      }

      const values = months.map(({ date }) => {
        const match = reports.find(
          (r) => r.year === date.getFullYear() && r.month === date.getMonth() + 1
        );
        return match?.newPatients ?? 0;
      });

      const accent = this.mainPalette[1];
      newPatientsCard.data = {
        labels: months.map((m) => m.label),
        datasets: [
          {
            label: 'Nuevos pacientes',
            data: values,
            backgroundColor: accent,
            borderRadius: 4
          }
        ]
      };
    }
  }

  /**
   * Updates the stacked bar chart that shows age and gender distribution.
   *
   * @param distribution Array of age and gender distribution entries.
   */
  private updateAgeGenderDistribution(
    distribution: AgeGenderDistributionDto[]
  ): void {
    const ageGenderCard = this.chartCards.find(
      (card) => card.title === 'Distribución por edad y género'
    );
    if (ageGenderCard) {
      const ageRanges = [
        ...new Set(distribution.map((d) => `${d.minAge}-${d.maxAge}`))
      ];
      const genderKeys = [
        ...new Set(distribution.map((d) => (d.gender ?? d.sexAtBirth ?? 'UNKNOWN')))
      ];
      const colors = this.getChartColors();
      const totalsByRange = ageRanges.map(range => {
        const [min, max] = (range as string).split('-').map(Number);
        return distribution
          .filter(d => d.minAge === min && d.maxAge === max)
          .reduce((sum, curr) => sum + (curr.total || 0), 0);
      });
      ageGenderCard.data = {
        labels: ageRanges,
        datasets: genderKeys.map((gKey, idx) => ({
          label: this.translateGender(gKey),
          data: ageRanges.map((range, rangeIndex) => {
            const [min, max] = (range as string).split('-').map(Number);
            const item = distribution.find(
              (d) =>
                (d.gender ?? d.sexAtBirth ?? 'UNKNOWN') === gKey && d.minAge === min && d.maxAge === max
            );
            const totalInRange = totalsByRange[rangeIndex] || 0;
            const raw = item?.total || 0;
            return totalInRange > 0 ? Number(((raw / totalInRange) * 100).toFixed(1)) : 0;
          }),
          backgroundColor: colors[idx % colors.length]
        }))
      };
    }
  }

  /**
   * Updates the age distribution pie chart based on age/gender distribution.
   *
   * @param distribution Array of age and gender distribution entries.
   */
  private updateAgeDistributionPie(
    distribution: AgeGenderDistributionDto[]
  ): void {
    const agePieCard = this.chartCards.find(
      (card) => card.title === 'Distribución por edad'
    );
    if (agePieCard) {
      const ageGroupsMap = distribution.reduce(
        (acc: Record<string, number>, curr) => {
          const range = `${curr.minAge}-${curr.maxAge}`;
          acc[range] = (acc[range] || 0) + (curr.total || 0); // Changed from count to total
          return acc;
        },
        {}
      );
      agePieCard.data = {
        labels: Object.keys(ageGroupsMap),
        datasets: [
          {
            label: 'Pacientes',
            data: Object.values(ageGroupsMap),
            backgroundColor: this.getChartColors()
          }
        ]
      };
    }
  }

  /**
   * Updates the coverage types table based on coverage distribution data.
   *
   * @param coverage Array of coverage distribution entries.
   */
  private updateCoverageDistribution(
    coverage: CoverageAgeGenderDto[]
  ): void {
    const coverageByType = coverage.reduce(
      (acc: Record<string, number>, curr) => {
        if (!acc[curr.coverageName]) {
          acc[curr.coverageName] = 0;
        }
        acc[curr.coverageName] += curr.total || 0; // Changed coverageType to coverageName and count to total
        return acc;
      },
      {}
    );

    const total = Object.values(coverageByType).reduce(
      (sum, count) => sum + count,
      0
    );

    this.coverageTypes = Object.entries(coverageByType).map(
      ([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? Math.round(((count as number) / total) * 1000) / 10 : 0
      })
    );

    const coveragePieCard = this.chartCards.find(
      (card) => card.title === 'Distribución por cobertura'
    );
    if (coveragePieCard) {
      const labels = Object.keys(coverageByType);
      const values = Object.values(coverageByType) as number[];
      coveragePieCard.data = {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: this.getChartColors()
          }
        ]
      };
    }

    // Stacked Age + Coverage will be populated via bucketed requests in loadCoverageDistributionBuckets()
  }

  /**
   * Updates dashboard metrics related to incomplete patient data.
   *
   * @param incompleteData List of patients with incomplete data.
   */
  private updateIncompleteDataMetrics(
    incompleteData: PatientIncompleteDataDto[]
  ): void {
    const incompleteCount = incompleteData.length;
    const incompleteMetric = this.metrics.find(
      (m) => m.label === 'Datos incompletos'
    );
    if (incompleteMetric) {
      if (typeof incompleteMetric.value === 'string' && incompleteMetric.value.includes('%')) {
        return;
      }
      incompleteMetric.value = incompleteCount.toString();
    }
  }

  /**
   * Get all graphic colors
   */
  private getChartColors(): string[] {
    return [...this.piePalette, ...this.mainPalette, ...this.tealPalette];
  }

  /**
   * Translates a gender code into a human readable, localized label.
   *
   * @param gender Gender code from the backend.
   * @returns Localized gender label.
   */
  private translateGender(gender: string): string {
    const translations: { [key: string]: string } = {
      MALE: 'Masculino',
      FEMALE: 'Femenino',
      OTHER: 'Otro',
      UNKNOWN: 'No especificado'
    };
    return translations[gender] || gender;
  }

  // ---------------------------------------------------------------------------
  // Chart Data Generators (static fallback data)
  // ---------------------------------------------------------------------------

  /**
   * Builds the line chart data for patient evolution over time.
   * This is used as static fallback until real data is loaded.
   *
   * @returns ChartData configuration for the evolution line chart.
   */
  private getPatientEvolutionData(): ChartData {
    const primary = this.mainPalette[0];
    return {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'],
      datasets: [
        {
          label: 'Pacientes activos',
          data: [65, 59, 80, 81, 56, 55, 90],
          fill: true,
          borderColor: primary,
          backgroundColor: `${primary}1A`,
          tension: 0.4,
          borderWidth: 2
        }
      ]
    };
  }

  /**
   * Builds the bar chart data for new patients per month.
   * This is used as static fallback until real data is loaded.
   *
   * @returns ChartData configuration for the new patients bar chart.
   */
  private getNewPatientsData(): ChartData {
    const accent = this.mainPalette[1];
    return {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'],
      datasets: [
        {
          label: 'Nuevos pacientes',
          data: [12, 19, 8, 15, 12, 18, 14],
          backgroundColor: accent,
          borderRadius: 6
        }
      ]
    };
  }

  // ---------------------------------------------------------------------------
  // Chart Options Builders
  // ---------------------------------------------------------------------------

  /**
   * Returns configuration options for the patient evolution line chart.
   *
   * @returns ChartOptions for the line chart.
   */
  private getLineChartOptions(xLabel?: string, yLabel?: string): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: {
          title: xLabel ? { display: true, text: xLabel } : undefined
        },
        y: {
          beginAtZero: false,
          grid: { display: true },
          title: yLabel ? { display: true, text: yLabel } : undefined
        }
      }
    };
  }

  /**
   * Returns configuration options for the new patients bar chart.
   *
   * @returns ChartOptions for the bar chart.
   */
  private getBarChartOptions(xLabel?: string, yLabel?: string): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          title: xLabel ? { display: true, text: xLabel } : undefined
        },
        y: {
          beginAtZero: true,
          grid: { display: true },
          title: yLabel ? { display: true, text: yLabel } : undefined
        }
      }
    };
  }

  /**
   * Returns configuration options for the age distribution pie chart.
   *
   * @returns ChartOptions for the pie chart.
   */
  private getPieChartOptions(): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = Number(context.raw ?? 0);

              const dataset = context.chart?.data?.datasets?.[context.datasetIndex];
              const data = (dataset?.data as Array<number | null | undefined>) ?? [];

              const total: number = data.reduce<number>(
                (sum, v) => sum + (typeof v === 'number' ? v : Number(v) || 0),
                0
              );

              const percentage = total > 0 ? (value / total) * 100 : 0;

              return `${label}: ${value.toLocaleString('es-AR')} (${percentage.toFixed(1)}%)`;
            }
          }
        }
      }
    };
  }

  /**
   * Returns configuration options for the stacked bar chart
   * that combines age groups and gender distribution.
   *
   * @returns ChartOptions for the stacked bar chart.
   */
  private getStackedBarOptions(xLabel?: string, yLabel?: string, percentage = false): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          title: xLabel ? { display: true, text: xLabel } : undefined
        },
        y: {
          stacked: true,
          beginAtZero: true,
          max: percentage ? 100 : undefined,
          title: yLabel ? { display: true, text: yLabel } : undefined,
          ticks: percentage ? {
            callback: (value) => `${value}%`
          } : undefined
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = Number(context.raw ?? 0);
              const dataIndex = context.dataIndex;
              const datasets = context.chart?.data?.datasets ?? [];
              const total = datasets.reduce((sum, ds) => {
                const data = (ds.data as Array<number | null | undefined>) ?? [];
                const v = Number(data[dataIndex] ?? 0);
                return sum + (isNaN(v) ? 0 : v);
              }, 0);
              const percentValue = total > 0 ? (value / total) * 100 : 0;
              const label = context.dataset.label ? `${context.dataset.label}: ` : '';
              const valueLabel = percentage ? `${value.toFixed(1)}%` : value.toLocaleString('es-AR');
              return `${label}${valueLabel} (${percentValue.toFixed(1)}%)`;
            }
          }
        }
      }
    };
  }
}
