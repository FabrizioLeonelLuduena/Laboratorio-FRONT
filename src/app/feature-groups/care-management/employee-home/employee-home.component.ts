import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, ViewChild, inject, OnDestroy, TemplateRef, AfterViewInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { JoyrideModule, JoyrideService } from 'ngx-joyride';
import { MenuItem } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { Menu } from 'primeng/menu';
import { MenuModule } from 'primeng/menu';
import { Panel } from 'primeng/panel';
import { StepperModule } from 'primeng/stepper';
import { TableModule } from 'primeng/table';
import { combineLatest, startWith, Subject, Subscription, takeUntil } from 'rxjs';
import { TutorialService } from 'src/app/shared/services/tutorial.service';

import { debounceTime } from 'rxjs/operators';

import {
  CollapsableFormField
} from '../../../shared/components/collapsable-form/collapsable-form.component';
import { GenericAlertComponent } from '../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../shared/components/generic-button/generic-button.component';
import {
  ConfirmationModalComponent
} from '../../../shared/components/generic-confirmation/confirmation-modal.component';
import { GenericFormComponent, GenericFormField } from '../../../shared/components/generic-form/generic-form.component';
import { GenericTableComponent } from '../../../shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent } from '../../../shared/components/generic-tutorial/generic-tutorial.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { Filter, FilterChangeEvent } from '../../../shared/models/filter.model';
import { TutorialConfig } from '../../../shared/models/generic-tutorial';
import { ContactsForEmployeesPipe } from '../../../shared/pipes/contacts-for-employees.pipe';
import { ZoneNamePipe } from '../../../shared/pipes/zone-name.pipe';
import { BreadcrumbService } from '../../../shared/services/breadcrumb.service';
import { ExcelExportService, PdfExportService } from '../../../shared/services/export';
import { HelperStateService } from '../../../shared/services/helper-state.service';
import { BranchResponseDTO } from '../models/branches';
import { ContactEmployeeRequest, EmployeeRequest, EmployeeResponse, RoleResponse, PersonalData, SalaryData } from '../models/employees.models';
import { BranchService } from '../services/branch.service';
import { EmployeeService } from '../services/employee.service';
import { RolesService } from '../services/roles.service';

import { EMPLOYEE_EXPORT_COLUMNS, EMPLOYEE_PDF_COLUMNS } from './employee-export-config';
import { UploadSignatureComponent } from './upload-signature/upload-signature.component';

// Maximum number of branches to load for the employment select dropdown
const MAX_BRANCHES_FOR_SELECT = 1000;

/**
 * Component to create, update, delete and list employees.
 */
@Component({
  selector: 'app-employee-home',
  imports: [
    ConfirmationModalComponent,
    CommonModule,
    FormsModule,
    Panel,
    TableModule,
    ButtonDirective,
    ContactsForEmployeesPipe,
    ZoneNamePipe,
    GenericFormComponent,
    GenericButtonComponent,
    GenericTableComponent,
    InputTextModule,
    CheckboxModule,
    DropdownModule,
    UploadSignatureComponent,
    JoyrideModule,
    MenuModule,
    GenericAlertComponent,
    GenericBadgeComponent,
    TutorialOverlayComponent,
    StepperModule,
    SpinnerComponent
  ],
  providers: [],
  templateUrl: './employee-home.component.html',
  styleUrl: './employee-home.component.css'
})
export class EmployeeHomeComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly DOCTOR_ROLE_ID = 6;
  roleOptions: { label: string; value: any }[] = [];
  rolesToDisplay: RoleResponse[] = [];
  formTitle: string = '';
  searchTerm: string = '';
  sortField = 'id';
  sortOrder : 1 | -1 | undefined = -1;

  showSignatureModal: boolean = false;
  employeeForSignature?: EmployeeResponse;
  private tutorialSubscription: Subscription | undefined;
  private tourSubscription: Subscription | undefined;
  flash?: { type: 'success' | 'error' | 'warning' | 'info'; text: string ; title?: string | undefined };

  /**
   * Signature upload for BIOQUIMICO role
   */
  selectedSignatureFile: File | null = null;
  showSignatureUpload: boolean = false;

  /** Tracks if user has manually edited the username field */
  private usernameManuallyEdited: boolean = false;

  /**
   * UI state.
   */
  showDoctorFields = false;
  registration: string | null = null;
  isExternal: boolean | null = null;
  zone: string | null = null;

  zoneOptions = [
    { label: 'Centro', value: 'CENTRAL' },
    { label: 'Norte', value: 'NORTH' },
    { label: 'Sur', value: 'SOUTH' },
    { label: 'Este', value: 'EAST' },
    { label: 'Oeste', value: 'WEST' }
  ];

  formSize: 'sm' | 'md' | 'lg' = 'lg';
  showForm = false;
  formMode: 'create' | 'edit' = 'create';
  selectedEmployee?: EmployeeResponse;
  state: 'ACTIVE' | 'INACTIVE' | '' | 'SUSPENDED' = 'ACTIVE';

  // Stepper state
  activeStep = 0;
  maxStepReached = 0;
  steps = [
    { label: 'Datos personales' },
    { label: 'Datos del empleo' },
    { label: 'Contactos' },
    { label: 'Roles y datos adicionales' }
  ];

  // Opciones de sucursales para el nuevo paso "Datos del empleo"
  branchOptions: { label: string; value: number }[] = [];
  selectedBranchId: number | null = null;

  /**
   * Table data.
   */
  employees: EmployeeResponse[] = [];
  loading = signal<boolean>(false);
  totalRecords = 0;

  /**
   * Pagination
   */
  currentPage = 0;
  pageSize = 5;

  /**
   * Columns for generic-table
   */
  tableColumns: any[] = [];
  columnTemplates: Map<string, TemplateRef<any>> = new Map();

  /**
   * Table filters
   */
  tableFilters: Filter[] = [
    {
      id: 'state',
      label: 'Estado',
      type: 'radio',
      options: [
        { label: 'Todos', value: null },
        { label: 'Activos', value: 'ACTIVE', active: true },
        { label: 'Inactivos', value: 'INACTIVE' }
      ]
    }
  ];

  private destroy$ = new Subject<void>();

  /** TemplateRef for the actions column (defined in the HTML template) */
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('tutorialOverlay') tutorialOverlay!: TutorialOverlayComponent;
  @ViewChild('genericTable') genericTable!: GenericTableComponent;

  // Reference to the PrimeNG Menu component for tutorial interaction
  @ViewChild('menu') menu!: Menu;
  @ViewChild('menuTrigger') menuTrigger!: any; // Reference to the button that triggers the menu

  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: 'app-generic-table:table-intro',
        title: 'Gestión de empleados',
        message: 'Aquí puedes gestionar todos los empleados del sistema. Visualiza el nombre, apellido y documento asignados.',
        position: 'top'
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros de búsqueda',
        message: 'Utiliza los filtros para buscar empleados por estado (Activo/Inactivo/Suspendido) y refinar tu búsqueda.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table .search-box',
        title: 'Búsqueda rápida',
        message: 'Utiliza la barra de búsqueda para encontrar empleados de forma rápida.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: '.download-menu-container button',
        title: 'Exportar datos',
        message: 'Exporta el listado de empleados a formato Excel o PDF para análisis externo o reportes.',
        position: 'bottom'
      },
      {
        target: 'app-generic-table button:has(.pi-plus)',
        title: 'Crear nuevo empleado',
        message: 'Haz clic aquí para registrar un nuevo empleado.',
        position: 'left'
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada empleado.',
        position: 'left',
        highlightPadding: 4
      },
      {
        target: '.p-popover-content',
        title: 'Acciones disponibles',
        message: 'Desde el menú de acciones puedes editar la información del empleado, gestionar su firma o desactivarlo del sistema.',
        position: 'left',
        onEnter: () => {
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
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }
      this.showFlashMessage('success', 'Tutorial completado! Ya conoces todas las funcionalidades de gestión de empleados.', 'Tutorial Completado');
      this.cdr.markForCheck();
    },
    onSkip: () => {
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }
      this.cdr.markForCheck();
    }
  });

  /**
   * Loads the breadcrumbs.
   */
  private setListBreadcrumb(): void {
    this.breadcrumbService.setItems([
      { label: 'Gestión interna', routerLink: '/care-management' },
      { label: 'Empleados', routerLink: '/care-management/employees' }
    ]);
  }

  /**
   * Get actions for each row in the table.
   */
  getRowActions = (row: EmployeeResponse): MenuItem[] => { // Changed return type to MenuItem[]
    const actions: MenuItem[] = [
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => this.onEdit(row)
      }
    ];
    if (row.status === 'ACTIVE') {
      actions.push({
        label: 'Desactivar',
        icon: 'pi pi-trash',
        command: () => this.confirmDelete(row)
      });
    }

    if (row.isBiochemist) {
      actions.push({
        label: 'Gestionar Firma',
        icon: 'pi pi-file-edit',
        command: () => this.openSignatureModal(row)
      });
    }


    return actions;
  };

  /**
   * Confirmation modal.
   */
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  employeeToDelete?: EmployeeResponse;

  @ViewChild('basicGF') basicGF?: GenericFormComponent;
  @ViewChild('GFSalary') GFSalary?: GenericFormComponent;
  @ViewChild('usernameGF') usernameGF?: GenericFormComponent;
  @ViewChild('contactForm') contactForm?: GenericFormComponent;
  @ViewChild('roleForm') roleForm?: GenericFormComponent;

  /**
   * Collapsable form fields.
   */
  personalFields: GenericFormField[] = [
    { name: 'lastName', label: 'Apellido', type: 'text', placeholder: 'Ej: Martínez', required: true },
    { name: 'name', label: 'Nombre', type: 'text', placeholder: 'Ej: Jesús', required: true },
    { name: 'document', label: 'Documento', type: 'text', placeholder: 'Ej: 46000000', required: true, minLength: 7, maxLength: 8 },
    { name: 'dateOfBirth', label: 'Fecha de nacimiento', type: 'date', placeholder: 'Ej: 20-05-2010', required: true }
  ];

  salaryFields: GenericFormField[] = [
    { name: 'grossSalary', label: 'Salario bruto', type: 'number', placeholder: 'Ej: 150000', required: true },
    { name: 'netSalary', label: 'Salario neto', type: 'number', placeholder: 'Ej: 120000', required: true }
  ];

  usernameFields: GenericFormField[] = [
    { name: 'username', label: 'Usuario', type: 'text', placeholder: 'Ej: JPEREZ', required: true }
  ];

  contactFields: CollapsableFormField[] = [
    {
      name: 'contactType',
      label: 'Tipo de contacto',
      type: 'select',
      required: true,
      options: [
        { label: 'Teléfono', value: 'PHONE' },
        { label: 'Email', value: 'EMAIL' },
        { label: 'WhatsApp', value: 'WHATSAPP' }
      ],
      placeholder: 'Seleccionar tipo'
    },
    { name: 'contact', label: 'Contacto', type: 'text', placeholder: 'Ej: 3515555555', required: true }
  ];

  roleFields: CollapsableFormField[] = [
    {
      name: 'id',
      label: 'Permiso',
      type: 'select',
      options: this.roleOptions,
      placeholder: 'Ej: Secretaria',
      required: true
    }
  ];

  /**
   * Data from forms.
   */
  personalData: Partial<PersonalData> = {};
  salaryData: Partial<SalaryData> = {};
  jobData: Record<string, any> = {};
  contacts: ContactEmployeeRequest[] = [];
  roles: RoleResponse[] = [];

  saving = false;

  /**
   * Services injection.
   */
  private employeeService = inject(EmployeeService);
  private cdr = inject(ChangeDetectorRef);
  private rolesService = inject(RolesService);
  private helperStateService = inject(HelperStateService);
  private breadcrumbService = inject(BreadcrumbService);
  private branchService = inject(BranchService);
  private readonly joyrideService: JoyrideService;
  private readonly tutorialService: TutorialService;

  /**
   * Constructor.
   */
  constructor(
    joyrideService: JoyrideService,
    tutorialService: TutorialService,
    private excelExportService: ExcelExportService,
    private pdfExportService: PdfExportService
  ) {
    this.joyrideService = joyrideService;
    this.tutorialService = tutorialService;
  }

  /**
   * Initialization with employees list and roles to create an employee.
   */
  ngOnInit(): void {
    this.setListBreadcrumb();

    this.state = 'ACTIVE';

    this.tableColumns = [
      { field: 'lastName', header: 'Apellido', sortable: true },
      { field: 'name', header: 'Nombre', sortable: true },
      { field: 'document', header: 'Documento', sortable: true },
      { field: 'status', header: 'Estado', sortable: false }
    ];

    this.loadEmployees();
    this.loadRoles();
    this.loadBranchesForSelect();

    // @ts-ignore
    const width = window.innerWidth;
    if (width < 640) this.formSize = 'sm';
    else if (width < 1024) this.formSize = 'md';
    else this.formSize = 'lg';

    this.tutorialSubscription = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('employees')) return;

      this.startEmployeeTutorial();
    });
  }

  /**
   * Sets up column templates after the view has been initialized.
   */
  ngAfterViewInit(): void {
    this.columnTemplates.set('status', this.statusTemplate);
    this.columnTemplates.set('actions', this.actionsTemplate);
    this.cdr.detectChanges();
  }

  /**
   * Unsubscribes from all subscriptions on component destruction.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.tutorialSubscription?.unsubscribe();
    this.tourSubscription?.unsubscribe();
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
   * Starts the employee tutorial.
   */
  startEmployeeTutorial() {
    setTimeout(() => {
      if (this.tutorialOverlay) {
        this.tutorialOverlay.start();
      }
    }, 500);
  }

  /** Load employees */
  loadEmployees(): void {
    this.loading.set(true);

    if(this.sortField === 'last_name') {
      this.sortField = 'lastName';
    }

    const sort = `${this.sortField},${this.sortOrder === 1 ? 'asc' : 'desc'}`;

    this.employeeService
      .getEmployees(this.currentPage, this.pageSize, sort, this.searchTerm, undefined, this.state)
      .subscribe({
        next: (response) => {
          this.employees = response.content;
          this.totalRecords = response.totalElements;
          this.loading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading.set(false);
          this.showFlashMessage('error', 'No se pudo cargar la lista de empleados.', 'Error');
          this.cdr.markForCheck();
        }
      });
  }

  /** Loads branches for the 'Job Data' step select input. */
  loadBranchesForSelect(): void {
    this.branchService.getAllBranches({}, 0, MAX_BRANCHES_FOR_SELECT, 'description,asc').subscribe({
      next: (res) => {
        const branches = (res.content || []) as BranchResponseDTO[];
        this.branchOptions = branches.map((b) => ({
          label: b.description ?? String(b.code ?? b.id),
          value: Number(b.id)
        }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.branchOptions = [];
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Control changes in filters
   */
  onFilterChange(event: FilterChangeEvent): void {
    const stateFilter = event.filters.find(f => f.id === 'state');
    this.state = stateFilter ? (stateFilter.value as 'ACTIVE' | 'INACTIVE' | '' | 'SUSPENDED') : '';

    this.currentPage = 0;
    this.loadEmployees();
  }

  /**
   * Control pagination changes
   */
  onPageChange(event: { first: number; rows: number }): void {
    this.currentPage = Math.floor(event.first / event.rows);
    this.pageSize = event.rows;
    this.loadEmployees();
  }

  /**
   *Detects global filter changes and reloads the employees list
   */
  onGlobalFilterChange(term: string): void {
    this.searchTerm = term;
    this.currentPage = 0;
    this.loadEmployees();
  }

  /**
   *Detects sort changes and reloads the employees list
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
    this.loadEmployees();
  }

  /**
   * Export to Excel
   */
  async onExportExcel(): Promise<void> {
    this.loading.set(true);
    this.cdr.markForCheck();

    try {
      const result = await this.excelExportService.exportToExcel({
        data: this.employees,
        columns: EMPLOYEE_EXPORT_COLUMNS,
        fileName: 'empleados',
        sheetName: 'Empleados',
        includeTimestamp: true
      });

      if (result.success) {
        this.showFlashMessage('success', 'Los empleados se exportaron correctamente.', 'Exportación exitosa');
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
   * Export to PDF
   */
  async onExportPdf(): Promise<void> {
    this.loading.set(true);
    this.cdr.markForCheck();

    try {
      const result = await this.pdfExportService.exportToPdf({
        data: this.employees,
        columns: EMPLOYEE_PDF_COLUMNS,
        fileName: 'empleados',
        title: 'Listado de Empleados',
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
        this.showFlashMessage('success', 'Los empleados se exportaron correctamente.', 'Exportación exitosa');
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
   * Fetch roles to show in the select box.
   */
  loadRoles(): void {
    this.rolesService.getAllRoles().subscribe({
      next: (response) => {
        this.rolesToDisplay = response;

        this.roleOptions = this.rolesToDisplay.map(role => ({
          label: this.formatRoleLabel(role.description),
          value: role.id
        }));

        this.roleFields = [
          {
            ...this.roleFields[0],
            options: this.roleOptions
          }
        ];
      }
    });
  }

  /**
   * Formats a role description string for display.
   * It converts the string to lowercase, replaces underscores with spaces, and capitalizes the first letter.
   * @param raw The raw role description string (e.g., 'ROLE_NAME').
   */
  private formatRoleLabel(raw: string): string {
    if (!raw) {
      return '';
    }
    const formatted = raw.toLowerCase().replace(/_/g, ' ');

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  /**
   * Create new employee.
   */
  onAdd(): void {
    this.formTitle = 'Crear empleado';
    this.formMode = 'create';
    this.selectedEmployee = undefined;
    this.personalData = {};
    this.salaryData = {};
    this.jobData = {};
    this.contacts = [];
    this.roles = [];
    this.selectedBranchId = null;
    this.showDoctorFields = false;
    this.registration = null;
    this.isExternal = false;
    this.zone = null;
    this.showForm = true;
    // reset stepper
    this.activeStep = 0;
    this.maxStepReached = 0;
    this.showSignatureUpload = false;
    this.selectedSignatureFile = null;

    this.roleOptions = [];
    this.rolesToDisplay.forEach(role => {
      this.roleOptions.push({ label: role.description, value: role.id });
    });

    setTimeout(() => {
      this.setupUsernameAutoGeneration();
    }, 100);

    this.breadcrumbService.setItems([
      { label: 'Gestión interna', routerLink: '/care-management' },
      { label: 'Empleados', routerLink: '/care-management/employees' },
      { label: 'Nuevo empleado' }
    ]);
  }

  /**
   * Set visibility of additional fields based on registration value.
   */
  private setAdditionalFieldsVisibilityFromRegistration(): void {
    const hasRegistration = this.registration != null && this.registration.trim() !== '';
    this.showDoctorFields = hasRegistration;
    if (!hasRegistration) {
      this.isExternal = null;
      this.zone = null;
    }
  }

  /**
   * Edit employee.
   */
  onEdit(employee: EmployeeResponse): void {
    this.formTitle = 'Modificar empleado';
    this.formMode = 'edit';
    this.selectedEmployee = employee;
    this.showForm = true;
    // reset stepper
    this.activeStep = 0;
    this.maxStepReached = 1;

    let dateValue: any = null;
    if (employee.dateOfBirth) {
      const [year, month, day] = employee.dateOfBirth.split('-');
      dateValue = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    this.personalData = {
      name: employee.name,
      lastName: employee.lastName,
      document: employee.document,
      dateOfBirth: dateValue
    };

    this.salaryData = {
      grossSalary: employee.grossSalary,
      netSalary: employee.netSalary
    };

    this.selectedBranchId = null;

    const contacts = (employee.contacts || []).map((c: any) => ({
      contactType: c.type,
      contact: c.value
    }));

    this.contacts = contacts;

    this.registration = employee.registration ?? null;
    this.isExternal = employee.isExternal ?? null;
    this.zone = employee.zone ?? null;
    this.roles = employee.permissions ?? [];

    this.setAdditionalFieldsVisibilityFromRegistration();

    this.breadcrumbService.setItems([
      { label: 'Gestión interna', routerLink: '/care-management' },
      { label: 'Empleados', routerLink: '/care-management/employees' },
      { label: 'Modificar empleado' }
    ]);
  }

  /**
   * Save personal data from collapsable forms.
   */
  onPersonalSave(data: any): void {
    this.personalData = data;
  }

  /**
   * Save salary data from collapsable forms.
   */
  onSalarySave(data: any): void {
    this.salaryData = data;
  }

  /**
   * Save contact data from collapsable forms.
   */
  onContactSave(contact: any): void {
    if (contact.contactType === 'EMAIL') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact.contact)) {
        this.showFlashMessage('warning', 'Ingrese un correo electrónico válido.', 'Correo inválido');
        return;
      }
    }
    if (contact.contactType === 'PHONE' || contact.contactType === 'WHATSAPP') {
      const phoneRegex = /^[0-9]+$/;
      if (!phoneRegex.test(contact.contact)) {
        this.showFlashMessage('warning', 'Ingrese solo números para el contacto.', 'Número inválido');
        return;
      }
    }
    const newContact: ContactEmployeeRequest = {
      contactType: contact.contactType,
      contact: contact.contact
    };

    let contactType;

    switch (contact.contactType) {
    case 'PHONE':
      contactType = 'Teléfono';
      break;

    case 'EMAIL':
      contactType = 'E-mail';
      break;

    case 'WHATSAPP':
      contactType = 'Whatsapp';
      break;

    default:
      contactType = contact.contactType ?? '';
      break;
    }
    this.contacts.push(newContact);

    this.showFlashMessage('success', `${contactType}: ${newContact.contact}`, 'Contacto agregado');
  }

  /**
   * Add contact from generic form in stepper.
   */
  addContactFromForm(): void {
    const form = this.contactForm?.form;
    if (!form) return;
    if (!form.valid) {
      form.markAllAsTouched();
      this.showFlashMessage('warning', 'Completá los datos del contacto antes de agregarlo.', 'Contacto incompleto');
      return;
    }
    const value = form.getRawValue();
    this.onContactSave(value);
    if (form.valid) {
      form.reset();
    }
  }

  /**
   * Delete contact data from collapsable forms.
   */
  deleteContact(index: number): void {
    this.contacts.splice(index, 1);
    this.showFlashMessage('info', 'El contacto fue eliminado.', 'Contacto eliminado');
  }

  /**
   * Save role data from collapsable forms.
   */
  onRoleSave(role: any): void {
    const selectedRole = this.rolesToDisplay.find(r => r.id === role.id);

    if (!selectedRole) {
      this.showFlashMessage('error', 'No se encontró el rol seleccionado.', 'Error');
      return;
    }

    const newRole: RoleResponse = {
      id: selectedRole.id,
      description: selectedRole.description
    };

    this.roles.push(newRole);

    this.checkDoctorRole();


    this.checkBioquimicoRole();
    this.showFlashMessage('success', `Rol: ${newRole.description}`, 'Rol agregado');

    if (newRole.description === 'BIOQUIMICO') {
      this.basicGF?.form.get('tuition')?.enable();
    }
  }

  /**
   * Add role from generic form in stepper.
   */
  addRoleFromForm(): void {
    const form = this.roleForm?.form;
    if (!form) return;
    if (!form.valid) {
      form.markAllAsTouched();
      this.showFlashMessage('warning', 'Seleccioná un permiso antes de agregar el rol.', 'Rol incompleto');
      return;
    }
    const value = form.getRawValue();
    this.onRoleSave(value);
    if (form.valid) {
      form.reset();
    }
  }

  /**
   * Delete role data from collapsable forms.
   */
  deleteRole(index: number): void {
    this.roles.splice(index, 1);

    this.checkDoctorRole();


    this.checkBioquimicoRole();
    this.showFlashMessage('info', 'El rol fue eliminado.', 'Rol eliminado');
    const hasBioquimico = this.roles.some(r => r.description === 'BIOQUIMICO');
    if (!hasBioquimico) {
      this.basicGF?.form.get('tuition')?.disable();
    }
  }

  /**
   * Check if BIOQUIMICO role is selected and show/hide signature upload
   */
  checkBioquimicoRole(): void {
    const hasBioquimico = this.roles.some(role =>
      role.description.toUpperCase().includes('BIOQUIMICO') ||
      role.description.toUpperCase().includes('BIOQUÍMICO')
    );

    this.showSignatureUpload = hasBioquimico && this.formMode === 'create';

    // Clear selected file if hiding upload
    if (!this.showSignatureUpload) {
      this.selectedSignatureFile = null;
    }
  }

  /**
   * Handle signature file selection
   */
  onSignatureFileSelected(event: Event): void {
    // @ts-ignore
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];

      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        this.showFlashMessage('warning', 'Por favor, seleccione un archivo PNG o JPG válido.', 'Archivo inválido');
        this.selectedSignatureFile = null;
        input.value = '';
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.showFlashMessage('warning', 'El archivo es demasiado grande. Máximo 5MB.', 'Archivo muy grande');
        this.selectedSignatureFile = null;
        input.value = '';
        return;
      }

      this.selectedSignatureFile = file;
      this.showFlashMessage('success', `${file.name} listo para cargar`, 'Archivo seleccionado');
    }
  }

  /**
   * Check if the doctor role is assigned
   */
  checkDoctorRole(): void {
    const hasDoctorRole = this.roles.some(r => r.id === this.DOCTOR_ROLE_ID);
    this.showDoctorFields = hasDoctorRole;

    if (!hasDoctorRole) {
      this.registration = null;
      this.isExternal = null;
      this.zone = null;
    }
  }

  /**
   * Registration change
   */
  onRegistrationChange(value: string): void {
    this.registration = value || null;
  }

  /**
   * Is external change
   */
  onIsExternalChange(value: boolean): void {
    this.isExternal = value;
    if (!value) {
      this.zone = null;
    }
  }

  /**
   * Zone change
   */
  onZoneChange(value: string): void {
    this.zone = value || null;
  }

  /** Submit employee */
  onSubmitEmployee(): void {
    const personal = this.personalData;
    const salary = this.salaryData;

    if (!personal || !personal.name || !personal.lastName || !personal.document || !personal.dateOfBirth || !salary.grossSalary || !salary.netSalary || (this.formMode === 'create' && !this.selectedBranchId)) {
      const msg = this.formMode === 'create'
        ? 'Complete los datos personales, del empleo y la sucursal antes de guardar.'
        : 'Complete los datos personales y del empleo antes de guardar.';
      this.showFlashMessage('error', msg, 'Datos incompletos');
      this.goTo(0);
      return;
    }

    this.saving = true;
    const rawDate = personal.dateOfBirth;
    const formattedDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : '';

    let username = this.selectedEmployee?.username ?? '';
    if (this.formMode === 'create') {
      const usernameFromForm = this.usernameGF?.form?.get('username')?.value as string | undefined;
      username = usernameFromForm ?? personal.username ?? username ?? '';
    }

    const body: EmployeeRequest = {
      name: personal.name ?? '',
      lastName: personal.lastName ?? '',
      document: personal.document ?? '',
      username,
      registration: this.showDoctorFields ? this.registration : undefined,
      isExternal: this.showDoctorFields ? this.isExternal : undefined,
      zone: this.showDoctorFields ? this.zone : undefined,
      dateOfBirth: formattedDate,
      contacts: this.contacts,
      permissions: this.roles,
      branchId: this.formMode === 'create' ? (this.selectedBranchId ?? undefined) : undefined,
      grossSalary: salary.grossSalary ?? 0,
      netSalary: salary.netSalary ?? 0
    };

    if (body.contacts.length === 0) {
      this.showFlashMessage('warning', 'Debe agregar al menos un contacto.', 'Contacto requerido');
      this.saving = false;
      this.goTo(2);
      return;
    }

    if (this.showDoctorFields && !this.registration) {
      this.showFlashMessage('warning', 'Complete la matrícula del médico.', 'Datos incompletos');
      this.saving = false;
      this.goTo(3);
      return;
    }

    const req$ =
      this.formMode === 'create'
        ? this.employeeService.createEmployee(body)
        : this.employeeService.updateEmployee(this.selectedEmployee!.id, body);

    req$.subscribe({
      next: (response) => {
        if (this.formMode === 'create' && this.selectedSignatureFile && response.id) {
          this.employeeService.uploadSignature(response.id, this.selectedSignatureFile).subscribe({
            next: () => this.finishEmployeeSave('Empleado creado y firma cargada correctamente.'),
            error: () => this.finishEmployeeSave('Empleado creado, pero hubo un error al cargar la firma.')
          });
        } else {
          const msg = this.formMode === 'create'
            ? 'Empleado creado correctamente.'
            : 'Empleado actualizado correctamente.';
          this.finishEmployeeSave(msg);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.showFlashMessage('error', 'No se pudo guardar el empleado.', 'Error');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Finish employee save operation and reset form
   */
  finishEmployeeSave(successMessage: string): void {
    this.saving = false;
    this.showForm = false;
    this.helperStateService.hideForm();
    this.selectedEmployee = undefined;
    this.selectedSignatureFile = null;
    this.showSignatureUpload = false;
    this.sortField = 'id';
    this.sortOrder = -1;
    this.currentPage = 0;
    this.loadEmployees();
    this.showFlashMessage('success', successMessage, 'Éxito');
    this.cdr.markForCheck();

    this.setListBreadcrumb();
  }

  /**
   * Show employees list and hide form to create.
   */
  onCancel(): void {
    this.showForm = false;
    this.helperStateService.hideForm();
    this.selectedEmployee = undefined;
    this.selectedSignatureFile = null;
    this.showSignatureUpload = false;

    this.setListBreadcrumb();
  }

  /**
   * Show confirmation message to delete an employee.
   */
  confirmDelete(employee: EmployeeResponse): void {
    this.employeeToDelete = employee;
    this.confirmTitle = '¿Eliminar empleado?';
    this.confirmMessage = `¿Seguro que desea eliminar a ${employee.name}?`;
    this.showConfirmModal = true;
  }

  /**
   * Delete employee.
   */
  executeDelete(): void {
    if (!this.employeeToDelete) return;
    if (this.employeeToDelete.status === 'INACTIVE' || this.employeeToDelete.status === 'SUSPENDED') {
      this.showFlashMessage('error', 'El empleado ya se encuentra inactivo.', 'Error');
      this.showConfirmModal = false;
      this.employeeToDelete = undefined;
      return;
    }

    this.employeeService.deleteEmployee(this.employeeToDelete.id).subscribe({
      next: () => {
        this.showFlashMessage('success', 'Empleado eliminado correctamente.', 'Éxito');
        this.loadEmployees();
        this.showConfirmModal = false;
        this.employeeToDelete = undefined;
      },
      error: () => {
        this.showFlashMessage('error', 'No se pudo eliminar el empleado.', 'Error');
        this.showConfirmModal = false;
        this.employeeToDelete = undefined;
      }
    });
  }

  /**
   * Cancel delete action for an employee.
   */
  cancelDelete(): void {
    this.showConfirmModal = false;
    this.employeeToDelete = undefined;
  }

  /**
   * Open signature management modal for an employee.
   */
  openSignatureModal(employee: EmployeeResponse): void {
    this.employeeForSignature = employee;
    this.showSignatureModal = true;
  }

  /**
   * Close signature management modal.
   */
  closeSignatureModal(): void {
    this.showSignatureModal = false;
    this.employeeForSignature = undefined;
  }


  /**
   * Sets up automatic username generation based on firstName and lastName changes.
   */
  private setupUsernameAutoGeneration(): void {
    if (!this.basicGF?.form || !this.usernameGF?.form) {
      return;
    }

    const personalForm = this.basicGF.form;
    const userForm = this.usernameGF.form;

    const firstNameControl = personalForm.get('name');
    const lastNameControl = personalForm.get('lastName');
    const usernameControl = userForm.get('username');

    if (!firstNameControl || !lastNameControl || !usernameControl) {
      return;
    }

    combineLatest([
      firstNameControl.valueChanges.pipe(startWith(firstNameControl.value)),
      lastNameControl.valueChanges.pipe(startWith(lastNameControl.value))
    ]).pipe(
      debounceTime(100),
      takeUntil(this.destroy$)
    ).subscribe(([firstName, lastName]) => {
      if (!this.usernameManuallyEdited) {
        const suggested = this.generateUsername(firstName?.trim() || '', lastName?.trim() || '');
        if (suggested) {
          usernameControl.setValue(suggested, { emitEvent: false });
          this.cdr.detectChanges();
        }
      }
    });


    usernameControl.valueChanges.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe((value) => {
      const firstName = firstNameControl.value?.trim() || '';
      const lastName = lastNameControl.value?.trim() || '';
      const expectedUsername = this.generateUsername(firstName, lastName);


      if (value && value !== expectedUsername) {
        this.usernameManuallyEdited = true;
      }
    });
  }

  /**
   * Generates a username from firstName and lastName.
   * @param firstName - The user's first name
   * @param lastName - The user's last name
   * @returns The generated username
   */
  private generateUsername(firstName: string, lastName: string): string {
    if (!firstName || !lastName) return '';
    const firstLetter = firstName.charAt(0).toUpperCase();
    const lastNameLower = lastName.toUpperCase().replace(/\s+/g, '');
    return firstLetter + lastNameLower;
  }

  /**
   * Go to specific step in the stepper.
   */
  goTo(step: number) {
    if (step > this.maxStepReached) return;
    this.activeStep = step;

    // Si navegamos explícitamente al paso 0, restaurar username si existe
    if (this.activeStep === 0 && this.formMode === 'create' && this.usernameGF?.form && this.personalData.username) {
      this.usernameGF.form.patchValue({
        username: this.personalData.username
      });
    }
  }

  /**
   * Next step
   */
  nextStep() {
    if (this.isNextDisabled) {
      this.showStepValidationAlert();
      return;
    }

    if (this.activeStep === 0) {
      if (!this.basicGF || !this.basicGF.form) return;
      const personalValue = this.basicGF.form.getRawValue();
      if (!personalValue['name'] || !personalValue['lastName'] || !personalValue['document'] || !personalValue['dateOfBirth']) {
        this.basicGF.form.markAllAsTouched();
        this.showFlashMessage('warning', 'Complete todos los campos requeridos.', 'Formulario incompleto');
        return;
      }
      this.personalData = {
        name: personalValue['name'],
        lastName: personalValue['lastName'],
        document: personalValue['document'],
        dateOfBirth: personalValue['dateOfBirth']
      };
      if (this.formMode === 'create' && this.usernameGF?.form) {
        const usernameValue = this.usernameGF.form.getRawValue();
        this.personalData = {
          ...this.personalData,
          username: usernameValue['username']
        };
      }
    }

    if (this.activeStep === 1) {
      if (!this.GFSalary || !this.GFSalary.form) return;
      const salaryValue = this.GFSalary.form.getRawValue();

      if (this.formMode === 'create') {
        if (!salaryValue['grossSalary'] || !salaryValue['netSalary'] || !this.selectedBranchId) {
          this.GFSalary.form.markAllAsTouched();
          this.showFlashMessage('warning', 'Complete salario y sucursal antes de continuar.', 'Formulario incompleto');
          return;
        }
        this.salaryData = {
          grossSalary: salaryValue['grossSalary'],
          netSalary: salaryValue['netSalary']
        };
        this.jobData = {
          ...this.jobData,
          branchId: this.selectedBranchId
        };
      } else {
        if (!salaryValue['grossSalary'] || !salaryValue['netSalary']) {
          this.GFSalary.form.markAllAsTouched();
          this.showFlashMessage('warning', 'Complete salario antes de continuar.', 'Formulario incompleto');
          return;
        }
        this.salaryData = {
          grossSalary: salaryValue['grossSalary'],
          netSalary: salaryValue['netSalary']
        };
      }
    }

    const next = Math.min(this.activeStep + 1, this.steps.length - 1);
    this.maxStepReached = Math.max(this.maxStepReached, next);
    this.activeStep = next;
  }

  /** Previous step */
  prevStep() {
    this.activeStep = Math.max(this.activeStep - 1, 0);

    if (this.activeStep === 0 && this.formMode === 'create' && this.usernameGF?.form && this.personalData.username) {
      this.usernameGF.form.patchValue({
        username: this.personalData.username
      });
    }
  }

  /** Enabling the Next button according to step */
  get isNextDisabled(): boolean {
    if (this.formMode === 'edit') {
      return false;
    }

    switch (this.activeStep) {
    case 0:
      if (this.formMode === 'create') {
        const basicValid = !!this.basicGF?.form?.valid;
        const hasUsernameForm = !!this.usernameGF?.form;
        if (!hasUsernameForm) return !basicValid;
        const usernameValid = !!this.usernameGF?.form?.valid;
        return !(basicValid && usernameValid);
      }
      return !this.basicGF?.form?.valid;
    case 1:
      if (this.formMode === 'create') {
        const salaryValidCreate = !!this.GFSalary?.form?.valid;
        const branchValid = !!this.selectedBranchId;
        return !(salaryValidCreate && branchValid);
      }
      return false;
    case 2:
      return this.contacts.length === 0;
    default:
      return false;
    }
  }

  /** Step-by-step validation messages */
  private showStepValidationAlert() {
    if (this.formMode === 'edit') {
      return;
    }

    if (this.activeStep === 1) {
      if (this.formMode === 'create') {
        this.showFlashMessage('warning', 'Complete salario y sucursal antes de continuar.', 'Validación');
      }
      return;
    }
    if (this.activeStep === 2 && this.contacts.length === 0) {
      this.showFlashMessage('warning', 'Agregá al menos un contacto para continuar.', 'Validación');
      return;
    }
    this.showFlashMessage('warning', 'Completá los campos requeridos.', 'Validación');
  }

  /** Normalize permissions to show in the select box. */
  normalizePermissions(perms: any): RoleResponse[] {
    if (!perms) return [];
    if (Array.isArray(perms)) {
      return (perms.filter(p => p && typeof p === 'object') as RoleResponse[]) || [];
    }
    if (typeof perms === 'object') {
      try {
        const values = Object.values(perms).filter(v => v != null);
        const allValid = values.every(v => v && typeof v === 'object' && 'id' in (v as any) && 'description' in (v as any));
        return allValid ? (values as RoleResponse[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}
