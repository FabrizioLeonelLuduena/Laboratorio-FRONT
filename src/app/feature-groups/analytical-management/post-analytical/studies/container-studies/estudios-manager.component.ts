import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { Subscription } from 'rxjs';

import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { TutorialOverlayComponent } from '../../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner.component';
import { VALIDATION_POST_HELP } from '../../../../../shared/constants/VALIDATION_POST_HELP';
import { FilterChangeEvent } from '../../../../../shared/models/filter.model';
import { TutorialConfig, TutorialStep } from '../../../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../../../shared/services/breadcrumb.service';
import { HelpCenterService } from '../../../../../shared/services/help-center.service';
import { PageTitleService } from '../../../../../shared/services/page-title.service';
import { TutorialService } from '../../../../../shared/services/tutorial.service';
import {
  StudyListItemDto,
  StudyDetailDto,
  PagedResponseDto,
  StudyFilterRequestDto
} from '../../models/models';
import { EstudiosService } from '../../services/estudios.service';
import { EstudioDetalleComponent } from '../details/estudio-detalle.component';
import { StudiesListComponent } from '../list-studies/estudios-listado.component';

/**
 * Default page size for paginated study list
 */
const DEFAULT_PAGE_SIZE = 20;

/**
 * Minimum search text length required to trigger search
 */
const MIN_SEARCH_LENGTH = 3;

/**
 * Component for managing studies
 */
@Component({
  selector: 'app-studies-manager',
  standalone: true,
  imports: [CommonModule, StudiesListComponent, EstudioDetalleComponent, ButtonModule, GenericAlertComponent, TutorialOverlayComponent,
    SpinnerComponent],
  templateUrl: './estudios-manager.component.html',
  styleUrls: ['./estudios-manager.component.css']
})
/**
 * StudiesManagerComponent manages the studies list and details
 */
export class StudiesManagerComponent implements OnInit, OnDestroy {

  private helpCenterService = inject(HelpCenterService);
  private pageTitleService = inject(PageTitleService);
  private breadcrumbService = inject(BreadcrumbService);
  private route = inject(ActivatedRoute);
  private tutorialService = inject(TutorialService);

  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;
  tutorialConfig = signal<TutorialConfig>({ steps: [] });
  private tutorialSub?: Subscription;

  studies: StudyListItemDto[] = [];
  selectedStudy?: StudyDetailDto;
  showDetail: boolean = false;
  loading = signal<boolean>(false);
  error: string | null = null;

  currentPage: number = 0;
  pageSize: number = DEFAULT_PAGE_SIZE;
  totalElements: number = 0;
  totalPages: number = 0;

  signatureStatus: string | null = null;
  dateFrom: Date | null = new Date();
  dateTo: Date | null = new Date();
  searchText: string = '';

  /**
   * Constructor
   * @param studiesService - Studies service
   * @param destroyRef - Dependency injection for lifecycle management
   */
  constructor(
    private studiesService: EstudiosService,
    private destroyRef: DestroyRef
  ) {}

  /**
   * Initializes the component
   */
  ngOnInit() {
    this.loadStudies();
    this.helpCenterService.show(VALIDATION_POST_HELP);
    // Configurar breadcrumbs: Gestión de Analítica > Post-Analítica > Estudios Pendientes
    this.pageTitleService.setTitle('Estudios Pendientes');
    this.breadcrumbService.buildFromRoute(this.route);
    this.breadcrumbService.setItems([
      { label: 'Gestión de Analítica', routerLink: '/analytical-management' },
      { label: 'Post-Analítica' },
      { label: 'Estudios Pendientes' }
    ]);
    this.setupTutorial();
  }

  /**
   * Cleans up component resources upon destruction.
   * Unregisters the page from the help center.
   */
  ngOnDestroy(): void {
    this.helpCenterService.clear();
    this.tutorialSub?.unsubscribe();
  }

  /**
   *  Setup the tutorial
   */
  private setupTutorial(): void {
    const steps: TutorialStep[] = [
      {
        target: 'app-studies-list app-generic-table:table-intro',
        title: 'Listado de estudios',
        message: 'Aquí se muestran los estudios pendientes de validación y firma.',
        position: 'bottom'
      },
      {
        target: 'app-studies-list app-generic-table button:has(.pi-filter)',
        title: 'Filtros avanzados',
        message: 'Usa este botón para filtrar usuarios por estado de firma y fecha.',
        position: 'right',
        highlightPadding: 10
      },
      {
        target: 'app-generic-table span',
        title: 'Búsqueda rápida',
        message: 'Escribe aquí para realizar una busqueda rapida de estudios.',
        position: 'bottom',
        highlightPadding: 10
      },
      {
        target: 'app-studies-list app-generic-table button:has(.pi-download)',
        title: 'Exportar tabla',
        message: 'Usa este botón para exportar los datos de la tabla en formato pdf o excel.',
        position: 'left',
        highlightPadding: 10
      },
      {
        target: 'app-studies-list app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de Acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada estudio.',
        position: 'left',
        highlightPadding: 10
      },
      {
        target: '.p-popover-content',
        title: 'Seleccionar un estudio',
        message: 'Desde este menú puedes ver el detalle del estudio y comenzar el proceso de validación.',
        position: 'left',
        onEnter: () => {
          // Ensure the detail view is hidden
          if (this.showDetail) {
            this.backToList();
          }
          if(!document.querySelector('.p-popover-content')){
            const firstMenuButton = document.querySelector('app-generic-table tbody tr:first-child button:has(.pi-ellipsis-v)') as HTMLElement;
            if (firstMenuButton) {
              firstMenuButton.click();
            }
          }
        }
      },
      {
        target: 'app-estudio-detalle app-estudio-info-card',
        title: 'Información del estudio',
        message: 'En esta sección, encontrarás los datos del paciente y del estudio. Los botones de firma se activarán cuando todos los resultados estén validados.',
        position: 'bottom',
        onEnter: () => {
          // Ensure the detail view is visible
          if (!this.showDetail && this.studies.length > 0) {
            this.viewDetail(this.studies[0]);
          }
        }
      },
      {
        target: 'app-estudio-detalle .results-accordion-container',
        title: 'Validación de resultados',
        message: 'Aquí puedes ver y validar cada uno de los resultados del estudio. Usa el botón "Validar" para confirmar un resultado pendiente.',
        position: 'top'
      },
      {
        target: 'app-estudio-detalle app-estudio-info-card button:has(.pi-check)',
        title: 'Firmar el estudio',
        message: 'Una vez que todos los resultados han sido validados, este botón se habilitará para que puedas firmar el estudio completo.',
        position: 'bottom'
      },
      {
        target: 'app-estudio-detalle app-estudio-info-card button:has(.pi-check-circle)',
        title: 'Confirmación de firma',
        message: 'Este es el último paso. Al confirmar, se aplicará tu firma electrónica al estudio y el proceso habrá finalizado.',
        position: 'bottom'
      }
    ];

    this.tutorialSub = this.tutorialService.trigger$.subscribe(route => {
      if (!route.includes('post-analytical')) return;
      this.tutorialConfig.set({ steps });
      setTimeout(() => this.tutorialOverlay?.start(), 100);
    });
  }

  /**
   * Handles filter changes from the generic table
   */
  onFilterChange(event: FilterChangeEvent) {
    this.signatureStatus = null;
    this.dateFrom = null;
    this.dateTo = null;

    event.filters.forEach(filter => {
      if (filter.id === 'estadoFirma') {
        this.signatureStatus = filter.value as string;
      } else if (filter.id === 'fechaRango') {
        this.dateFrom = filter.dateFrom || null;
        this.dateTo = filter.dateTo || null;
      }
    });

    this.currentPage = 0;
    this.loadStudies();
  }

  /**
   * Handles global search changes from the generic table
   */
  onGlobalFilterChange(searchText: string) {
    this.searchText = searchText;
    this.currentPage = 0; // Reset to first page when search changes
    this.loadStudies();
  }

  /**
   * Loads studies from backend service
   */
  loadStudies() {
    this.loading.set(true);
    this.error = null;

    const searchText = this.searchText?.trim();

    // If there is text but it has less than minimum characters, don't make the request
    if (searchText && searchText.length > 0 && searchText.length < MIN_SEARCH_LENGTH) {
      this.loading.set(false);
      return;
    }

    // Determine if the text is a DNI (numbers only) or a name (contains letters)
    let patientName: string | undefined = undefined;
    let patientDni: string | undefined = undefined;

    if (searchText && searchText.length >= MIN_SEARCH_LENGTH) {
      const isNumeric = /^\d+$/.test(searchText);
      if (isNumeric) {
        // If it's only numbers, it's a DNI
        patientDni = searchText;
      } else {
        // If it contains letters, it's a name
        patientName = searchText;
      }
    }

    const filterRequest: StudyFilterRequestDto = {
      status: this.studiesService.convertStatusFilter(this.signatureStatus || 'Cualquiera'),
      dateFrom: this.convertDateToISO(this.dateFrom),
      dateTo: this.convertDateToISO(this.dateTo),
      patientName: patientName,
      patientDni: patientDni,
      page: this.currentPage,
      size: this.pageSize,
      sortBy: 'createdDatetime',
      sortDirection: 'DESC'
    };

    this.studiesService.getStudies(filterRequest).subscribe({
      next: (response: PagedResponseDto<StudyListItemDto>) => {
        this.studies = response.content || [];
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.showAlert('error', 'Error al cargar estudios.'); }
    });
  }

  /**
   * Displays a temporary alert on screen
   */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), 3000);
  }

  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;


  /**
   * Shows study details
   * @param study - Study to view
   */
  viewDetail(study: StudyListItemDto) {
    this.loading.set(true);
    this.error = null;

    this.studiesService.getStudyDetail(study.id).subscribe({
      next: (detail: StudyDetailDto) => {
        this.selectedStudy = detail;
        this.showDetail = true;
        this.loading.set(false);
        // Actualizar breadcrumbs al mostrar detalle: Gestión de Analítica > Post-Analítica > Estudios Pendientes > Validar Y Firmar
        // Solo "Estudios Pendientes" es clickeable para volver a la lista
        this.breadcrumbService.setItems([
          { label: 'Gestión de Analítica' },
          { label: 'Post-Analítica' },
          { label: 'Estudios Pendientes', command: () => this.backToList() },
          { label: 'Validar Y Firmar' }
        ]);
      },
      error: () => {
        this.error = 'Error al cargar el detalle del estudio. Por favor, intente nuevamente.';
        this.loading.set(false);
      }
    });
  }

  /**
   * Returns to the studies list
   */
  backToList() {
    this.showDetail = false;
    this.selectedStudy = undefined;
    // Restaurar breadcrumbs al volver a la lista: Gestión de Analítica > Post-Analítica > Estudios Pendientes
    this.breadcrumbService.setItems([
      { label: 'Gestión de Analítica' },
      { label: 'Post-Analítica' },
      { label: 'Estudios Pendientes' }
    ]);
    // Reload studies to get any updates
    this.loadStudies();
  }

  /**
   * Converts a Date object to ISO format string (yyyy-MM-dd) for backend
   * @param date - Date object, string, or null
   * @returns ISO formatted date string or undefined
   */
  private convertDateToISO(date: Date | string | null): string | undefined {
    if (!date) {
      return undefined;
    }

    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // If it's a string, verify if it's in ISO format
    if (date.length > 0) {
      // If it already has yyyy-MM-dd format, return it as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      // If it's another format, try to convert it
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    return undefined;
  }
}
