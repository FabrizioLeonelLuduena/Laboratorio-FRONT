import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, ChangeDetectorRef, inject, OnDestroy, AfterViewInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { JoyrideModule, JoyrideService } from 'ngx-joyride';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { MenuModule } from 'primeng/menu';
import { Subscription } from 'rxjs';

import { GenericAlertComponent } from '../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../shared/components/generic-button/generic-button.component';
import { ConfirmationModalComponent } from '../../../shared/components/generic-confirmation/confirmation-modal.component';
import {
  GenericDynamicFormComponent,
  DynamicFormField
} from '../../../shared/components/generic-dynamic-form/generic-dynamic-form.component';
import { GenericTableComponent } from '../../../shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from '../../../shared/components/generic-tutorial/generic-tutorial.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { Filter, FilterChangeEvent } from '../../../shared/models/filter.model';
import { TutorialConfig } from '../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../shared/services/breadcrumb.service';
import { ExcelExportService, PdfExportService } from '../../../shared/services/export';
import { HelperStateService } from '../../../shared/services/helper-state.service';
import { TutorialService } from '../../../shared/services/tutorial.service';
import { DoctorResponse, DoctorRequest, Gender } from '../models/doctors.model';
import { DoctorFilter, DoctorService } from '../services/doctor.service';

import { DOCTOR_EXPORT_COLUMNS, DOCTOR_PDF_COLUMNS } from './doctor-export-config';

/**
 * @class DoctorHomeComponent
 * @description Manages the display and actions for doctors.
 */
@Component({
  selector: 'app-doctor-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmationModalComponent,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericDynamicFormComponent,
    GenericTableComponent,
    JoyrideModule,
    MenuModule,
    GenericBadgeComponent,
    TutorialOverlayComponent,
    SpinnerComponent
  ],
  templateUrl: './doctor-home.component.html',
  styleUrls: ['./doctor-home.component.css'],
  providers: []
})
export class DoctorHomeComponent implements OnInit, OnDestroy, AfterViewInit {

  private breadcrumbService = inject(BreadcrumbService);
  private tutorialSubscription: Subscription | undefined;
  private tourSubscription: Subscription | undefined;
  flash?: { type: 'success' | 'error' | 'warning' | 'info'; text: string; title?: string };

  /**
   * TemplateRef for rendering the "Name" column with Dr./Dra. prefix.
   */
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;
  @ViewChild('nameTpl') nameTpl!: TemplateRef<any>;
  @ViewChild('menu') menu!: Menu;
  @ViewChild('genericTable') genericTable!: GenericTableComponent;
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;

  private tutorialSub?: Subscription;

  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: 'app-generic-table:table-intro',
        title: 'Gestión de médicos',
        message: 'Aquí puedes gestionar todos los médicos del sistema. Visualiza el nombre, matrícula, email y estado de cada médico.',
        position: 'top'
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros de búsqueda',
        message: 'Utiliza los filtros para buscar médicos por estado (Activo/Inactivo) y refinar tu búsqueda.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table .search-box',
        title: 'Búsqueda rápida',
        message: 'Utiliza la barra de búsqueda para encontrar médicos de forma rápida.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: '.download-menu-container button',
        title: 'Exportar datos',
        message: 'Exporta el listado de médicos a formato Excel o PDF para análisis externo o reportes.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table button:has(.pi-plus)',
        title: 'Crear nuevo médico',
        message: 'Haz clic aquí para registrar un nuevo médico.',
        position: 'left'
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada médico.',
        position: 'left',
        highlightPadding: 4
      },
      {
        target: '.p-popover-content',
        title: 'Acciones disponibles',
        message: 'Desde el menú de acciones puedes editar la información del médico o desactivarlo del sistema.',
        position: 'left',
        onEnter: () => {
          // Auto-open the actions menu
          if (!document.querySelector('.p-popover-content')) {
            const firstMenuButton = document.querySelector('app-generic-table tbody tr:first-child button:has(.pi-ellipsis-v)') as HTMLElement;
            if (firstMenuButton) {
              firstMenuButton.click();
            }
          }
        }
      }
    ],
    onComplete: () => {
      // Close the actions popover if it's open
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }

      this.showFlashMessage('success', 'Tutorial completado! Ya conoces todas las funcionalidades de gestión de médicos.', 'Tutorial Completado');
      this.cdr.markForCheck();
    },
    onSkip: () => {
      // Close the actions popover if it's open
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }
      this.cdr.markForCheck();
    }
  });
  @ViewChild('menuTrigger') menuTrigger!: any; // Reference to the button that triggers the menu

  /**
   * List of doctors to display in the table.
   */
  doctors: DoctorResponse[] = [];

  loading = signal<boolean>(false);
  totalRecords = 0;

  /**
   * Pagination.
   */
  currentPage = 0;
  pageSize = 5;

  /**
   * Filters.
   */
  filters: { status: 'ACTIVE' | 'INACTIVE' | null } = { status: 'ACTIVE' };
  searchTerm = '';
  sortField = 'id';
  sortOrder : 1 | -1 | undefined = -1;

  /**
   * Columns configuration for the generic table.
   */
  tableColumns: any[] = [];
  columnTemplates: Map<string, TemplateRef<any>> = new Map();

  /**
   * Filters configuration for the table.
   */
  tableFilters: Filter[] = [
    {
      id: 'status',
      label: 'Estado',
      type: 'radio',
      options: [
        { label: 'Todos', value: null },
        { label: 'Activos', value: 'ACTIVE', active: true },
        { label: 'Inactivos', value: 'INACTIVE' }
      ]
    }
  ];

  /** Options for registration/tuition types loaded from API */
  registrationTypeOptions: Array<{ label: string; value: string }> = [];

  /**
   * Converts uppercase code to a Spanish label with a capital
   * letter at the beginning. Maintains the original value for the POST statement.
   */
  private toDisplayLabel(code: string): string {
    if (!code) return '';
    const map: Record<string, string> = {
      PROVINCE: 'provincia',
      PROVINCIAL: 'provincial',
      SPECIALIST: 'especialista',
      NATIONAL: 'nacional',
      PUBLIC: 'pública',
      PRIVATE: 'privada',
      FEDERAL: 'federal',
      STATE: 'estatal',
      MUNICIPAL: 'municipal'
    };
    const normalized = code.replace(/[_-]+/g, ' ').trim().toUpperCase();
    const direct = map[normalized];
    const base = direct ?? normalized.toLowerCase();
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  /**
   * Function to get row actions for each doctor.
   * @param row
   */
  getRowActions = (row: DoctorResponse): MenuItem[] => { // Changed return type to MenuItem[]
    const actions: MenuItem[] = [
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => this.onEdit(row)
      }
    ];

    const isActive = row.status === 'ACTIVE';

    actions.push({
      label: isActive ? 'Cambiar a inactivo' : 'Cambiar a activo',
      icon: 'pi pi-refresh',
      command: () => this.confirmStatusChange(row)
    });

    return actions;
  };

  /**
   * Dynamic form state.
   */
  showForm = false;
  formMode: 'create' | 'edit' = 'create';
  selectedDoctor?: DoctorResponse;
  formTitle = 'Nuevo médico';
  saving = false;

  /**
   * Fields configuration for the dynamic form.
   */
  formFields: DynamicFormField[] = [
    { name: 'lastName', label: 'Apellido', type: 'text', required: true, colSpan: 1, pattern: '^.{2,100}$', placeholder: 'Apellido' },
    { name: 'name', label: 'Nombre', type: 'text', required: true, colSpan: 1, pattern: '^.{2,100}$', placeholder: 'Nombre' },
    { name: 'tuitionType', label: 'Tipo de Matrícula', type: 'select', required: true, colSpan: 1, options: [] },
    { name: 'tuitionNumber', label: 'Matrícula', type: 'text', required: true, colSpan: 1, pattern: '^\\d{4,12}$', placeholder: 'Número de matrícula' },
    { name: 'email', label: 'Correo', type: 'email', required: false, colSpan: 1, placeholder: 'ejemplo@correo.com' },
    { name: 'gender', label: 'Género', type: 'radio', required: true, colSpan: 1, options: [{ label: 'Masculino', value: 'MALE' }, { label: 'Femenino', value: 'FEMALE' }] },
    { name: 'observations', label: 'Observaciones', type: 'textarea', required: false, colSpan: 2, placeholder: 'Observaciones adicionales' }
  ];

  initialValue: Record<string, any> = {
    name: '',
    lastName: '',
    email: '',
    gender: 'MALE' as Gender,
    tuitionType: '',
    tuitionNumber: '',
    observations: ''
  };

  /**
   * Confirmation modal state.
   */
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  doctorForStatusChange?: DoctorResponse;

  /**
   * Component constructor.
   * Inject necessary dependencies.
   *
   * @param doctorService - Service for crud operations on doctors
   * @param cdr - Reference to change detector
   * @param helperStateService - Service to manage helper state
   */
  constructor(
    private doctorService: DoctorService,
    private cdr: ChangeDetectorRef,
    private helperStateService: HelperStateService,
    private readonly joyrideService: JoyrideService,
    private readonly tutorialService: TutorialService,
    private excelExportService: ExcelExportService,
    private pdfExportService: PdfExportService
  ) {}

  /**
   * Configures table columns and loads initial list of doctors.
   */
  ngOnInit(): void {
    this.breadcrumbService.setItems([
      { label: 'Gestión interna', routerLink: '/care-management' },
      { label: 'Médicos', routerLink: '/care-management/doctors' }
    ]);

    // Configure columns with a template for the name
    this.tableColumns = [
      {
        field: 'name',
        header: 'Nombre',
        sortable: true
      },
      { field: 'tuition', header: 'Matrícula', sortable: true },
      { field: 'email', header: 'Correo Electrónico', sortable: true },
      { field: 'status', header: 'Estado', sortable: false }
    ];

    // Load registration types for the form select
    this.loadRegistrationTypes();

    this.loadDoctors();

    this.tutorialSubscription = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('doctors')) return;

      this.startDoctorTutorial();
    });
  }

  /**
   * Starts the doctor tutorial.
   */
  startDoctorTutorial() {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      if (this.tutorialOverlay) {
        this.tutorialOverlay.start();
      }
    }, 500);
  }

  /**
   * Sets up column templates after the view has been initialized.
   */
  ngAfterViewInit(): void {
    this.columnTemplates.set('name', this.nameTpl);
    this.columnTemplates.set('status', this.statusTemplate);
    this.columnTemplates.set('actions', this.actionsTemplate);
    this.cdr.detectChanges();
  }

  /**
   * Unsubscribes from all subscriptions on component destruction.
   */
  ngOnDestroy(): void {
    this.tutorialSubscription?.unsubscribe();
    this.tourSubscription?.unsubscribe();
    this.tutorialSub?.unsubscribe();
  }

  /**
   * Displays a flash message for a short duration.
   * @param type - The type of the message.
   * @param text - The main text of the message.
   * @param title - An optional title for the message.
   */
  private showFlashMessage(type: 'success' | 'error' | 'warning' | 'info', text: string, title?: string) {
    this.flash = { type, text, title };
    setTimeout(() => {
      this.flash = undefined;
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Load doctors list with pagination and filters
   * */
  loadDoctors(): void {
    this.loading.set(true);

    const filter: DoctorFilter = {
      search: this.searchTerm || undefined,
      status: this.filters.status ?? undefined,
      sortField: this.sortField,
      sortOrder: this.sortOrder,
      page: this.currentPage,
      size: this.pageSize
    };

    this.doctorService.list(filter).subscribe({
      next: (res) => {
        const content = res?.content ?? [];
        this.doctors = content;
        this.totalRecords = res?.totalElements ?? content.length;
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.showFlashMessage('error', 'No se pudo cargar la lista de médicos.', 'Error');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Loads registration types for the "Tipo de Matrícula" select
   */
  private loadRegistrationTypes(): void {
    this.doctorService.getRegistrationTypes().subscribe({
      next: (types) => {
        this.registrationTypeOptions = (types || []).map(t => ({ label: this.toDisplayLabel(t), value: t }));
        const tuitionField = this.formFields.find(f => f.name === 'tuitionType');
        if (tuitionField) {
          tuitionField.options = this.registrationTypeOptions;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.showFlashMessage('warning', 'No se pudieron cargar los tipos de matrícula.', 'Aviso');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Manages filter changes
   * @param event
   */
  onFilterChange(event: FilterChangeEvent): void {
    const statusFilter = event.filters.find(f => f.id === 'status');
    this.filters.status = statusFilter ? (statusFilter.value as 'ACTIVE' | 'INACTIVE' | null) : null;

    this.currentPage = 0;
    this.loadDoctors();
  }

  /**
   * Manages page changes
   * */
  onPageChange(event: { first: number; rows: number }): void {
    this.currentPage = Math.floor(event.first / event.rows);
    this.pageSize = event.rows;
    this.loadDoctors();
  }

  /**
   * Export to Excel
   * @param filteredData - Datos filtrados de la tabla
   */
  async onExportExcel(filteredData: any[]): Promise<void> {
    this.loading.set(true);
    this.cdr.markForCheck();

    try {
      const result = await this.excelExportService.exportToExcel({
        data: filteredData,
        columns: DOCTOR_EXPORT_COLUMNS,
        fileName: 'medicos',
        sheetName: 'Médicos',
        includeTimestamp: true
      });

      if (result.success) {
        this.showFlashMessage('success', 'Los médicos se exportaron correctamente.', 'Exportación exitosa');
      } else {
        this.showFlashMessage('error', result.error || 'No se pudo generar el archivo de exportación.', 'Error al exportar');
      }
    } catch {
      this.showFlashMessage('error', 'No se pudo generar el archivo de exportación.', 'Error al exportar');
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Exportar to PDF
   * @param filteredData - Datos filtrados de la tabla
   */
  async onExportPdf(filteredData: any[]): Promise<void> {
    this.loading.set(true);
    this.cdr.markForCheck();

    try {
      const result = await this.pdfExportService.exportToPdf({
        data: filteredData,
        columns: DOCTOR_PDF_COLUMNS,
        fileName: 'medicos',
        title: 'Listado de Médicos',
        orientation: 'landscape',
        includeDate: true,
        includeTimestamp: true,
        logo: {
          path: '/lcc_negativo.png',
          width: 48,
          height: 14.4,
          x: 230,
          y: 8
        }
      });

      if (result.success) {
        this.showFlashMessage('success', 'Los médicos se exportaron correctamente.', 'Exportación exitosa');
      } else {
        this.showFlashMessage('error', result.error || 'No se pudo generar el archivo de exportación.', 'Error al exportar');
      }
    } catch {
      this.showFlashMessage('error', 'No se pudo generar el archivo de exportación.', 'Error al exportar');
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Open form in create mode
   * */
  onAdd(): void {
    this.formMode = 'create';
    this.selectedDoctor = undefined;
    this.formTitle = 'Nuevo médico';
    this.initialValue = {
      name: '',
      lastName: '',
      email: '',
      gender: 'MALE' as Gender,
      tuitionType: '',
      tuitionNumber: '',
      observations: ''
    };
    this.showForm = true;
    this.helperStateService.setFormState(true, 'doctor');

    this.breadcrumbService.setItems([
      { label: 'Gestión interna', routerLink: '/care-management' },
      { label: 'Médicos', routerLink: '/care-management/doctors' },
      { label: 'Nuevo médico' }
    ]);
  }

  /**
   * Parse tuition in format "TYPE-NUMBER"
   * */
  private parseTuition(tuition?: string): { type: string | null; number: string } {
    if (!tuition) return { type: null, number: '' };
    const m = tuition.match(/^\s*([A-Z]{2,}\w*)\s*-\s*(.+)\s*$/);
    return m ? { type: m[1], number: m[2] } : { type: null, number: tuition };
  }

  /**
   * Open form in edit mode with doctor data
   * */
  onEdit(doctor: DoctorResponse): void {
    this.formMode = 'edit';
    this.selectedDoctor = doctor;
    this.formTitle = 'Editar médico';

    const parsed = this.parseTuition(doctor.tuition);
    const tuitionType = (doctor.registration || doctor.registrationType || parsed.type || '') as string;
    const tuitionNumber = parsed.type ? parsed.number : (doctor.tuition || '');

    this.initialValue = {
      name: doctor.name,
      lastName: doctor.lastName || '',
      email: doctor.email || '',
      gender: (doctor.gender ?? 'MALE') as Gender,
      tuitionType,
      tuitionNumber,
      observations: (doctor as any).observations || ''
    };

    this.showForm = true;
    this.helperStateService.setFormState(true, 'doctor');

    this.breadcrumbService.setItems([
      { label: 'Gestión interna', routerLink: '/care-management' },
      { label: 'Médicos', routerLink: '/care-management/doctors' },
      { label: 'Editar médico' }
    ]);
  }

  /**
   * Sends the form (create or update)
   * */
  onDynamicSubmit = (formValue: Record<string, any>): void => {
    if (this.saving) return;
    this.saving = true;

    const cleanName = (formValue['name'] ?? '').trim().replace(/^(Dr\.|Dra\.)\s*/i, '');
    const lastName = (formValue['lastName'] ?? '').trim();
    let registration = (formValue['tuitionType'] ?? '').trim();
    const number = (formValue['tuitionNumber'] ?? '').trim();
    const gender = (formValue['gender'] ?? 'MALE') as Gender;
    const observations = formValue['observations']?.trim() || undefined;

    if (this.formMode === 'edit' && !registration) {
      registration =
        this.selectedDoctor?.registration ||
        this.selectedDoctor?.registrationType ||
        this.parseTuition(this.selectedDoctor?.tuition).type ||
        '';
    }

    if (!number) {
      this.saving = false;
      this.showFlashMessage('error', 'Debes ingresar el número de matrícula.', 'Validación');
      return;
    }
    if (!registration) {
      this.saving = false;
      this.showFlashMessage('error', 'Debes seleccionar el tipo de matrícula.', 'Validación');
      return;
    }

    const body: DoctorRequest = {
      name: cleanName,
      lastName: lastName || undefined,
      tuition: number,
      registration: registration.toUpperCase(),
      email: formValue['email']?.trim() || undefined,
      gender,
      observations
    };

    if (this.formMode === 'create') {
      // createDoctor ahora devuelve number (id)
      this.doctorService.createDoctor(body).subscribe({
        next: (_id: number) => {
          this.handleDoctorSaveSuccess();
        },
        error: (err: any) => {
          this.handleDoctorSaveError(err);
        }
      });
    } else {
      // updateDoctor devuelve DoctorResponse
      this.doctorService.updateDoctor(this.selectedDoctor!.id, body).subscribe({
        next: () => {
          this.handleDoctorSaveSuccess();
        },
        error: (err: any) => {
          this.handleDoctorSaveError(err);
        }
      });
    }
  };

  /**
   * Cancel the form editing
   * */
  onDynamicCancel = (): void => {
    this.showForm = false;
    this.helperStateService.hideForm();
    this.selectedDoctor = undefined;

    this.breadcrumbService.setItems([
      { label: 'Gestión interna', routerLink: '/care-management' },
      { label: 'Médicos', routerLink: '/care-management/doctors' }
    ]);
  };

  /**
   * Open modal to confirm doctor status change
   * */
  confirmStatusChange(doctor: DoctorResponse): void {
    this.doctorForStatusChange = doctor;
    const isActive = doctor.status === 'ACTIVE';
    this.confirmTitle = isActive ? '¿Cambiar a inactivo?' : '¿Cambiar a activo?';
    this.confirmMessage = isActive
      ? `¿Está seguro que desea cambiar el estado del médico ${doctor.name} a inactivo?`
      : `¿Está seguro que desea cambiar el estado del médico ${doctor.name} a activo?`;
    this.showConfirmModal = true;
  }

  /**
   * Executes the doctor status change
   * */
  executeStatusChange(): void {
    if (!this.doctorForStatusChange || (this.doctorForStatusChange as any).id == null) {
      this.showFlashMessage('error', 'No hay médico seleccionado para cambiar el estado.', 'Error');
      this.showConfirmModal = false;
      return;
    }

    this.doctorService.updateDoctorStatus(this.doctorForStatusChange.id).subscribe({
      next: () => {
        this.showFlashMessage('success', 'Estado del médico actualizado correctamente.', 'Éxito');
        this.loadDoctors();
        this.showConfirmModal = false;
        this.doctorForStatusChange = undefined;
      },
      error: () => {
        this.showFlashMessage('error', 'No se pudo actualizar el estado del médico.', 'Error');
        this.showConfirmModal = false;
        this.doctorForStatusChange = undefined;
      }
    });
  }

  /**
   * Cancel status change
   * */
  cancelStatusChange(): void {
    this.showConfirmModal = false;
    this.doctorForStatusChange = undefined;
  }

  /**
   *Detects global filter changes and reloads the doctors list
   */
  onGlobalFilterChange(term: string): void {
    this.searchTerm = term;
    this.currentPage = 0;
    this.loadDoctors();
  }

  /**
   *Detects sort changes and reloads the doctors list
   */
  onSortChange(sortArray: { field: string; order: 'asc' | 'desc' }[]): void {
    if (sortArray.length > 0) {
      const sort = sortArray[0];
      this.sortField = sort.field;
      this.sortOrder = sort.order === 'asc' ? 1 : -1;
    } else {
      this.sortField = 'id';
      this.sortOrder = -1;
    }

    this.currentPage = 0;
    this.loadDoctors();
  }

  /**
   * Handle successful doctor save operation
   */
  private handleDoctorSaveSuccess(): void {
    this.saving = false;
    this.showForm = false;
    this.helperStateService.hideForm();
    this.selectedDoctor = undefined;
    this.sortField = 'id';
    this.sortOrder = -1;
    this.currentPage = 0;
    this.loadDoctors();

    this.breadcrumbService.setItems([
      { label: 'Gestión interna', routerLink: '/care-management' },
      { label: 'Médicos', routerLink: '/care-management/doctors' }
    ]);

    this.showFlashMessage(
      'success',
      this.formMode === 'create'
        ? 'Médico creado correctamente.'
        : 'Médico actualizado correctamente.',
      'Éxito'
    );
    this.cdr.markForCheck();
  }

  /**
   * Handle error during doctor save operation
   */
  private handleDoctorSaveError(err: any): void {
    this.saving = false;
    const backendMessage =
      err?.error?.errorMessage || err?.error?.message || 'No se pudo guardar el médico.';
    const translated = backendMessage.includes('already exists')
      ? 'Ya existe un médico con esa matrícula.'
      : backendMessage;
    this.showFlashMessage('error', translated, 'Error');
    this.cdr.markForCheck();
  }
}
