import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  TemplateRef,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription } from 'rxjs';

import { GenericAlertComponent, AlertType } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from '../../../../shared/components/generic-modal/generic-modal.component';
import { GenericTableComponent } from '../../../../shared/components/generic-table/generic-table.component';
import { TutorialOverlayComponent as GenericTutorialComponent } from '../../../../shared/components/generic-tutorial/generic-tutorial.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { Filter, FilterChangeEvent } from '../../../../shared/models/filter.model';
import { TutorialConfig } from '../../../../shared/models/generic-tutorial';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { ExcelExportService, PdfExportService } from '../../../../shared/services/export';
import { TutorialService } from '../../../../shared/services/tutorial.service';
import * as PatientDataHelpers from '../../../../shared/utils/patient-data-helpers.util';
import { UpdateUserRequestDTO } from '../../../user-management/models/UpdateUserRequestDTO';
import { ErrorHandlerService } from '../../../user-management/services/error-handler.service';
import { PasswordResetService } from '../../../user-management/services/password-reset.service';
import { UserService } from '../../../user-management/services/user.service';
import { GuardianRequestDto, PatientMin } from '../../models/PatientModel';
import { PatientService } from '../../services/PatientService';

import { extractGuardianAccount, GuardianAccountInfo } from './guardian-account.mapper';
import { PatientRow } from './patient-list.model';
import { PATIENT_EXPORT_COLUMNS, PATIENT_PDF_COLUMNS } from './patients-export-config';

/**
 * Component to list, search and manage patients.
 * Provides server-side pagination, sorting and filtering and integrates a tutorial overlay.
 */
@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DividerModule,
    TooltipModule,
    GenericBadgeComponent,
    GenericTableComponent,
    GenericAlertComponent,
    GenericButtonComponent,
    GenericModalComponent,
    GenericTutorialComponent,
    SpinnerComponent
  ],
  templateUrl: './patients-list.component.html',
  styleUrls: ['./patients-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientsListComponent implements OnInit, AfterViewInit, OnDestroy {
  /**
   * Reference to the tutorial overlay child component instance.
   */
  @ViewChild('tutorialOverlay') tutorialOverlay?: GenericTutorialComponent;
  @ViewChild('statusTpl') statusTpl?: TemplateRef<any>;

  /** Map of column templates to pass to GenericTable */
  columnTemplates: Map<string, TemplateRef<any>> = new Map();

  /**
   * Signal that holds the tutorial configuration for the overlay component.
   */
  tutorialConfig = signal<TutorialConfig>({
    steps: [
      {
        target: 'app-generic-table:table-intro',
        title: 'Gestión de pacientes',
        message: 'Visualiza el documento, nombre, edad, cobertura y estado de cada paciente.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table button:has(.pi-filter)',
        title: 'Filtros de búsqueda',
        message: 'Utiliza los filtros para buscar pacientes por estado (Mínimo/Completo/Verificado) y refinar tu búsqueda.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table .search-box',
        title: 'Búsqueda rápida',
        message: 'Utiliza la barra de búsqueda para encontrar pacientes de forma rápida por nombre o documento.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: '.download-menu-container button',
        title: 'Exportar datos',
        message: 'Exporta el listado de pacientes a formato Excel o PDF para análisis externo o reportes.',
        position: 'bottom',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table button:has(.pi-plus)',
        title: 'Crear nuevo paciente',
        message: 'Haz clic aquí para registrar un nuevo paciente en el sistema.',
        position: 'left',
        highlightPadding: 8
      },
      {
        target: 'app-generic-table tbody tr:first-child .p-button.p-button-text.p-button-rounded:has(.pi-ellipsis-v)',
        title: 'Menú de acciones',
        message: 'Haz clic en este botón para ver las acciones disponibles para cada paciente.',
        position: 'left',
        highlightPadding: 4
      },
      {
        target: '.p-popover-content',
        title: 'Acciones disponibles',
        message: 'Desde el menú de acciones puedes ver los detalles del paciente o editar su información.',
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
      this.showAlert('success', 'Tutorial completado', '¡Ya conoces todas las funcionalidades de gestión de pacientes!');
    },
    onSkip: () => {
      if (document.querySelector('.p-popover-content')) {
        document.body.click();
      }
    }
  });

  /**
   * Subscription to the global TutorialService trigger stream.
   */
  private tutorialSub?: Subscription;

  /**
   * Cached complete list of patients for client-side operations.
   */
  private allPatients: PatientRow[] = [];

  /**
   * Currently visible patient rows in the table.
   */
  patients: PatientRow[] = [];

  /**
   * Flag indicating whether the list is loading.
   */
  loading = signal<boolean>(false);

  /**
   * Total number of records reported by the backend.
   */
  totalRecords = 0;

  /**
   * Current page index (zero-based).
   */
  page = 0;

  /**
   * Page size (rows per page).
   */
  size = 10;

  /**
   * Sorting configuration (field + order).
   */
  sort: { field: string; order: 'asc' | 'desc' }[] = [
    { field: 'lastName', order: 'asc' },
    { field: 'firstName', order: 'asc' }
  ];

  /**
   * Current free-text query.
   */
  q = '';

  /**
   * Current state filter.
   */
  state: 'active' | 'inactive' | 'all' = 'all';

  /**
   * Current status filter.
   */
  status: 'MIN' | 'COMPLETE' | 'VERIFIED' | null = null;

  /**
   * Column definitions for the generic table component.
   */
  columns: Array<{ field: string; header: string; sortable?: boolean }> = [];

  /**
   * Configured filters shown in the UI.
   */
  filters: Filter[] = [
    {
      id: 'status',
      label: 'Estado',
      type: 'select',
      options: [
        { label: 'Todos', value: null, active: true },
        { label: 'Mínimo', value: 'MIN' },
        { label: 'Completo', value: 'COMPLETE' },
        { label: 'Verificado', value: 'VERIFIED' }
      ]
    }
  ];

  /**
   * Human-readable labels for patient statuses.
   */
  readonly statusLabel: Record<string, string> = {
    MIN: 'MÍNIMO',
    COMPLETE: 'COMPLETO',
    VERIFIED: 'VERIFICADO',
    DEACTIVATED: 'DESACTIVADO'
  };

  /** GenericAlertComponent properties */
  alertType: AlertType | null = null;
  alertTitle = '';
  alertText = '';

  /** Password reset modal state */
  showPasswordResetModal = false;
  passwordResetTarget: PatientRow | null = null;
  passwordResetTargetName = '';
  passwordResetEmail = '';
  passwordResetOriginalEmail = '';
  passwordResetUserId: number | null = null;
  passwordResetGuardianData: Pick<
    GuardianAccountInfo,
    'document' | 'firstName' | 'lastName' | 'username' | 'roleIds' | 'branchId'
  > | null = null;
  passwordResetSubmitting = false;

  /**
   * Timer id used for debouncing search input.
   */
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Timer id used for the alert display.
   */
  private alertTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Component constructor with injected services.
   */
  constructor(
    private patientService: PatientService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private breadcrumbService: BreadcrumbService,
    private tutorialService: TutorialService,
    private excelExportService: ExcelExportService,
    private pdfExportService: PdfExportService,
    private passwordResetService: PasswordResetService,
    private errorHandler: ErrorHandlerService,
    private userService: UserService
  ) {}

  /**
   * Initialize component state, read navigation flash messages and subscribe to tutorial triggers.
   */
  ngOnInit(): void {
    // Configure breadcrumbs automatically from route data
    this.breadcrumbService.buildFromRoute(this.route);

    // Subscribe to tutorial triggers
    this.tutorialSub = this.tutorialService.trigger$.subscribe((route: string) => {
      if (!route.includes('patients')) {
        return;
      }

      setTimeout(() => {
        this.tutorialOverlay?.start();
      }, 500);
    });

    // Load the first patients page
    this.fetchPatientsPage();
  }

  /**
   * Angular lifecycle hook that runs just before the component is destroyed.
   * Clears the pending timers to avoid memory leaks.
   */
  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
    clearTimeout(this.alertTimer);
    this.tutorialSub?.unsubscribe();
  }

  /**
   * Setup columns after the view initializes and request change detection.
   */
  ngAfterViewInit(): void {
    this.columns = [
      { field: 'dni', header: 'Documento', sortable: true },
      { field: 'fullName', header: 'Nombre completo', sortable: true },
      { field: 'ageLabel', header: 'Edad', sortable: true },
      { field: 'primaryCoverage', header: 'Cobertura', sortable: false },
      { field: 'statusText', header: 'Estado', sortable: false }
    ];
    this.cdr.markForCheck();
    // Register the status template to ensure badges render using the provided template
    if (this.statusTpl) {
      this.columnTemplates.set('statusText', this.statusTpl);
    }
  }

  /**
   * Fetch a page of patients from the backend using current filters, pagination and sorting.
   */
  private fetchPatientsPage(): void {
    this.loading.set(true);
    this.cdr.markForCheck();

    this.patientService
      .searchPatients({
        q: this.q?.trim() || undefined,
        state: this.state,
        status: this.status,
        page: this.page,
        size: this.size,
        sort: this.sort
      })
      .subscribe({
        next: (page) => {
          const data = (page?.content ?? []) as PatientMin[];
          this.allPatients = data.map((patient) => this.buildPatientRow(patient));
          this.patients = [...this.allPatients];
          this.totalRecords = page?.totalElements ?? this.patients.length;
          this.loading.set(false);
          this.cdr.markForCheck();

          if ((this.totalRecords ?? 0) === 0) {
            this.showAlert('warning', 'Sin resultados', 'No se encontraron pacientes para los filtros aplicados.');
          } else {
            this.clearAlert();
          }
        },
        error: () => {
          this.loading.set(false);
          this.cdr.markForCheck();
          this.showAlert('error', 'Error al cargar pacientes', 'No se pudieron cargar los pacientes.');
        }
      });
  }

  /** Displays a temporary on-screen alert */
  private showAlert(type: AlertType, title: string, text: string): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertText = text;
    this.cdr.markForCheck();

    // Clear any existing timer
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
    }

    // Set a new timer to clear the alert after 5 seconds
    this.alertTimer = setTimeout(() => {
      this.clearAlert();
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Clear any visible alert immediately.
   */
  private clearAlert(): void {
    this.alertType = null;
    this.alertTitle = '';
    this.alertText = '';
  }

  /**
   * Build a presentation row for a PatientMin entity.
   */
  private buildPatientRow(patient: PatientMin): PatientRow {
    const row: PatientRow = {
      ...patient,
      status: (patient as any)?.status || 'MIN',
      hasGuardian: false
    } as PatientRow;

    const rawBirthDate = (patient as any)?.birthDate ?? null;
    row.birthDate = rawBirthDate;
    const ageDetail = PatientDataHelpers.computeAgeDetail(rawBirthDate);
    row.age = ageDetail.years;
    row.ageLabel = ageDetail.label;
    row.fullName = `${row.lastName}, ${row.firstName}`;
    row.statusText = this.statusLabel[row.status ?? 'MIN'] || row.status || '';
    row.primaryCoverage = PatientDataHelpers.extractPrimaryCoverage(patient);

    row.genderLabel = PatientDataHelpers.translateGender((patient as any)?.gender);
    row.sexAtBirthLabel = PatientDataHelpers.translateGender((patient as any)?.sexAtBirth);
    row.phone = PatientDataHelpers.extractPhone(patient) ?? undefined;
    row.insurerName = PatientDataHelpers.extractInsurerName(patient) ?? undefined;

    return row;
  }

  // ===== EVENT HANDLERS =====

  /**
   * Handle user input in the search box with debounce.
   * Updates the query, resets to the first page and refetches patients after a short delay.
   * @param term - The search term entered by the user.
   */
  onSearchInput(term: string): void {
    clearTimeout(this.searchTimer);
    this.q = term;
    this.searchTimer = setTimeout(() => {
      this.page = 0;
      this.fetchPatientsPage();
    }, 500);
  }


  /**
   * React to changes coming from the filter UI component.
   * Maps incoming filters to local state, resets paging and fetches the page.
   * @param event - Filter change event containing an array of filter objects.
   */
  onFilterChange(event: FilterChangeEvent): void {
    const map = Object.fromEntries(event.filters.map((f) => [f.id, f.value]));
    this.status = (map['status'] as any) ?? null;
    this.page = 0;
    this.fetchPatientsPage();
  }

  /**
   * Build the action menu for a given patient row.
   * @param row - The patient row to generate actions for.
   * @returns Array of action descriptors for the generic table.
   */
  getActionsForRow(row: PatientRow) {
    return [
      { label: 'Ver', icon: 'pi pi-eye', command: () => row.id && this.viewPatient(row.id) },
      { label: 'Editar', icon: 'pi pi-pencil', command: () => row.id && this.editPatient(row.id) },
      { label: 'Reestablecer contraseña', icon: 'pi pi-key', command: () => this.confirmPasswordReset(row) }
    ];
  }

  /**
   * Opens the confirmation modal before sending the password reset email.
   * @param row - Patient row selected from the table.
   */
  confirmPasswordReset(row: PatientRow): void {
    if (!row.id) {
      this.showAlert('error', 'Error', 'No se encontró el identificador del paciente.');
      return;
    }

    const displayName = `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || row.fullName || 'este paciente';
    this.passwordResetTarget = row;
    this.passwordResetTargetName = displayName;
    this.passwordResetSubmitting = false;

    this.patientService.getPatientById(row.id).subscribe({
      next: (patient) => {
        // Determine if minor (prefer the precomputed row age)
        const isMinor = typeof row.age === 'number'
          ? row.age < 18
          : (PatientDataHelpers.computeAgeDetail((patient as any)?.birthDate)?.years ?? 99) < 18;

        const guardianInfo = extractGuardianAccount(patient);

        // Case 1: Guardian with available email (keep original flow)
        if (guardianInfo && guardianInfo.email) {
          this.passwordResetEmail = guardianInfo.email;
          this.passwordResetOriginalEmail = guardianInfo.email;
          this.passwordResetUserId = guardianInfo.userId ?? null;
          this.passwordResetGuardianData = {
            document: guardianInfo.document,
            firstName: guardianInfo.firstName,
            lastName: guardianInfo.lastName,
            username: guardianInfo.username,
            roleIds: guardianInfo.roleIds,
            branchId: guardianInfo.branchId
          };
          this.showPasswordResetModal = true;
          this.cdr.markForCheck();
          return;
        }

        // Case 2: Adult patient → use own email (contacts) and allow editing
        if (!isMinor) {
          const ownEmail = PatientDataHelpers.extractEmail(patient as any) ?? '';
          this.passwordResetEmail = ownEmail;
          this.passwordResetOriginalEmail = ownEmail;
          // Adults: no dependency on guardian
          this.passwordResetUserId = null;
          this.passwordResetGuardianData = null;
          this.showPasswordResetModal = true;
          this.cdr.markForCheck();
          return;
        }

        // Case 3: Minor without guardian email → allow entering email and update user if userId exists
        const guardiansAny = (patient as any)?.guardians as any[] | undefined;
        if (Array.isArray(guardiansAny) && guardiansAny.length > 0) {
          // Choose primary guardian (isOwner true) or first one
          const primary =
            guardiansAny.find((g) => g?.isOwner === true || g?.is_owner === true) ??
            guardiansAny[0];

          const email = (primary?.email as string) || (primary?.contactValue as string) || '';
          const rawUserId = primary?.userId ?? primary?.user_id ?? primary?.id ?? null;
          const userId = typeof rawUserId === 'number' ? rawUserId : Number(rawUserId);

          // Normalize potential role collections
          const toNum = (v: any): number | null => {
            const n = typeof v === 'number' ? v : Number(v);
            return Number.isNaN(n) ? null : n;
          };
          const roleCandidates = primary?.roleIds ?? primary?.role_ids ?? primary?.roleId ?? primary?.role_id ?? primary?.roles;
          const roleIds: number[] | undefined = Array.isArray(roleCandidates)
            ? (roleCandidates.map(toNum).filter((n): n is number => n !== null))
            : (toNum(roleCandidates) !== null ? [toNum(roleCandidates) as number] : undefined);

          const branchIdRaw = primary?.branchId ?? primary?.branch_id ?? null;
          const branchId = typeof branchIdRaw === 'number' ? branchIdRaw : (Number(branchIdRaw) || null);

          this.passwordResetEmail = email;
          this.passwordResetOriginalEmail = email;
          this.passwordResetUserId = Number.isNaN(userId) ? null : userId;
          this.passwordResetGuardianData = {
            document: primary?.document ? String(primary.document) : undefined,
            firstName: primary?.firstName ?? primary?.first_name,
            lastName: primary?.lastName ?? primary?.last_name,
            username: primary?.username ?? primary?.userName ?? (primary?.document ? String(primary.document) : undefined),
            roleIds,
            branchId
          } as any;
          this.showPasswordResetModal = true;
          this.cdr.markForCheck();
          return;
        }

        // Case 4 (new): Minor without guardian → allow manual email entry to attempt recovery
        this.passwordResetEmail = '';
        this.passwordResetOriginalEmail = '';
        this.passwordResetUserId = null;
        this.passwordResetGuardianData = null;
        this.showPasswordResetModal = true;
        this.showAlert('warning', 'Email requerido', 'Ingresa un correo para enviar el enlace de recuperación al tutor.');
        this.cdr.markForCheck();
      },
      error: () => {
        this.showAlert('error', 'Error', 'No se pudo obtener la información del paciente.');
        this.closePasswordResetModal();
      }
    });
  }
  /** Submit the password reset request for the selected patient.
   * Updates the guardian email if it has changed before sending the reset email.
   */
  submitPasswordReset(): void {
    if (!this.passwordResetTarget) return;
    const email = this.passwordResetEmail.trim();
    if (!email) {
      this.showAlert('error', 'Correo requerido', 'Debes ingresar un correo electrónico válido.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.showAlert('error', 'Formato inválido', 'Ingresá un email válido (ej: usuario@dominio.com).');
      return;
    }

    const patientRow = this.passwordResetTarget;
    const displayName = this.passwordResetTargetName ||
      `${patientRow.firstName ?? ''} ${patientRow.lastName ?? ''}`.trim() ||
      patientRow.fullName ||
      'el paciente';

    const isAdult = typeof patientRow.age === 'number' ? patientRow.age >= 18 : true;

    const sendReset = (): void => {
      this.passwordResetService.forgotPasswordPortal(email).subscribe({
        next: () => {
          this.showAlert('success', 'Correo enviado', `Se envió un correo de recuperación para ${displayName} a ${email}.`);
          this.passwordResetSubmitting = false;
          this.closePasswordResetModal();
          this.cdr.markForCheck();
        },
        error: (err) => {
          const detail = this.errorHandler.getErrorMessage(
            err,
            'No se pudo enviar el correo de recuperación. Intenta nuevamente.'
          );
          this.showAlert('error', 'Error al enviar correo', detail);
          this.passwordResetSubmitting = false;
          this.cdr.markForCheck();
        }
      });
    };

    this.passwordResetSubmitting = true;

    // Helper to transform date dd-MM-yyyy -> yyyy-MM-dd
    const toIsoDate = (d: string): string => {
      if (!d) return d;
      const m = d.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      return d; // could already be in ISO
    };

    const updatePatientEmailIfNeeded = (next: () => void, fail: (e:any)=>void): void => {
      if (!this.hasPasswordResetEmailChanged()) { next(); return; }
      // Fetch full patient to edit contacts/guardians
      this.patientService.getPatientById(patientRow.id).subscribe({
        next: (full) => {
          // Build Patient model for PUT
          const contacts = [...(full.contacts || [])];
          if (isAdult) {
            // Find existing email
            const emailContact = contacts.find(c => c.contactType === 'EMAIL');
            if (emailContact) {
              emailContact.contactValue = email;
              emailContact.isPrimary = true;
            } else {
              contacts.push({ contactType: 'EMAIL', contactValue: email, isPrimary: true });
            }
          }
          // Minor: update primary guardian email (if exists) and optionally reflect in contacts if missing
          let guardians: GuardianRequestDto[] | undefined = undefined;
          // Response uses GuardianRequestDto; adapt to GuardianUpdateDto
          if (!isAdult && Array.isArray((full as any).guardians)) {
            guardians = (full as any).guardians.map((g: any) => ({
              userId: g.userId ?? g.user_id ?? null,
              document: g.document,
              firstName: g.firstName,
              lastName: g.lastName,
              email: g.email,
              phone: g.phone,
              bond: g.bond,
              verify: g.verify === true || g.verify === 'true' || g.status === 'VERIFIED'
            }));
            const primary = guardians && (guardians.find(g => (g as any).isOwner === true || (g as any).is_owner === true) || guardians[0]);
            if (primary) primary.email = email;
            // If patient lacks email in contacts, add one for traceability
            if (!contacts.some(c => c.contactType === 'EMAIL')) {
              contacts.push({ contactType: 'EMAIL', contactValue: email, isPrimary: true });
            }
          }

          const payloadPatient = {
            id: full.id,
            dni: full.dni,
            firstName: full.firstName,
            lastName: full.lastName,
            birthDate: toIsoDate(full.birthDate),
            gender: full.gender,
            sexAtBirth: full.sexAtBirth,
            isActive: full.isActive,
            status: full.status,
            hasGuardian: full.hasGuardian,
            guardians,
            addresses: full.addresses || [],
            contacts,
            coverages: full.coverages || []
          } as any; // Patient

          this.patientService.updatePatient(full.id, payloadPatient).subscribe({
            next: () => next(),
            error: (err) => {
              // Do not abort reset flow, but inform
              const detail = this.errorHandler.getErrorMessage(err, 'No se pudo actualizar email en el paciente.');
              this.showAlert('error', 'Error al actualizar paciente', detail);
              next();
            }
          });
        },
        error: (err) => {
          const detail = this.errorHandler.getErrorMessage(err, 'No se pudo obtener datos completos del paciente.');
          this.showAlert('error', 'Error al cargar paciente', detail);
          fail(err);
        }
      });
    };

    const updateUserIfNeeded = (next: () => void): void => {
      if (!this.hasPasswordResetEmailChanged()) { next(); return; }

      // Case guardian with known userId
      if (this.passwordResetUserId && this.passwordResetGuardianData) {
        const g = this.passwordResetGuardianData;
        const usernameBase = g.username ?? g.document ?? patientRow.dni ?? email;
        const normalizedUsername = String(usernameBase).toUpperCase();
        const documentValue = String(g.document ?? patientRow.dni ?? '');
        const roleIds = g.roleIds && g.roleIds.length > 0 ? g.roleIds : [1];
        const payload: UpdateUserRequestDTO = {
          firstName: g.firstName || '',
          lastName: g.lastName || '',
          username: normalizedUsername,
          email,
          document: documentValue,
          roleId: roleIds,
          branchId: g.branchId ?? undefined
        };
        this.userService.updateUser(this.passwordResetUserId, payload).subscribe({
          next: () => next(),
          error: (err) => {
            const detail = this.errorHandler.getErrorMessage(err, 'No se pudo actualizar el correo del usuario.');
            this.showAlert('error', 'Error al actualizar usuario', detail);
            next(); // Continue with reset even if it fails
          }
        });
        return;
      }

      // Adult without userId → search external user by document
      if (isAdult) {
        this.userService.searchUsers({
          page: 0,
          size: 1,
          sortBy: 'id',
          sortDirection: 'ASC',
          search: patientRow.dni ?? '',
          isActive: true,
          isExternal: true,
          roleId: null
        }).subscribe({
          next: (resp) => {
            const user = resp.content && resp.content[0];
            if (!user) { next(); return; }
            const payload: Partial<UpdateUserRequestDTO> = {
              firstName: user.firstName,
              lastName: user.lastName,
              username: (user.username || user.document || '').toUpperCase(),
              email,
              document: user.document,
              roleId: (user.roles || []).map(r => r.id) ?? [1],
              branchId: user.branchId
            } as any;
            this.userService.updateUser(user.id, payload).subscribe({
              next: () => next(),
              error: () => next() // Continue even if it fails
            });
          },
          error: () => next() // Continue if search fails
        });
        return;
      }
      next();
    };

    // Chain: update patient → update user → send reset
    updatePatientEmailIfNeeded(() => {
      updateUserIfNeeded(() => {
        sendReset();
      });
    }, () => {
      // Failed to fetch patient; still try to update user and send reset
      updateUserIfNeeded(() => sendReset());
    });
  }

  /** Close and reset the password reset modal state. */
  closePasswordResetModal(): void {
    this.showPasswordResetModal = false;
    this.passwordResetTarget = null;
    this.passwordResetTargetName = '';
    this.passwordResetEmail = '';
    this.passwordResetOriginalEmail = '';
    this.passwordResetUserId = null;
    this.passwordResetGuardianData = null;
    this.passwordResetSubmitting = false;
  }

  /** Check if the password reset email has been changed by the user. */
  hasPasswordResetEmailChanged(): boolean {
    return this.passwordResetEmail.trim() !== this.passwordResetOriginalEmail.trim();
  }

  /** Label used in the password reset primary button. */
  get passwordResetButtonText(): string {
    return this.passwordResetSubmitting ? 'Enviando...' : 'Aceptar';
  }


  /**
   * Handle pagination change from the table.
   * Calculates the new page index and page size then fetches data.
   * @param event - Pagination event object containing `first` and `rows`.
   */
  onPageChange(event: { first: number; rows: number }): void {
    this.page = Math.floor(event.first / event.rows);
    this.size = event.rows;
    this.fetchPatientsPage();
  }

  /**
   * Handle sorting changes coming from the table.
   * Maps UI fields to backend fields, resets paging and reloads data.
   * @param sortArray - Array of sort descriptors with `field` and `order`.
   */
  onSortChange(sortArray: { field: string; order: 'asc' | 'desc' }[]): void {
    this.sort = sortArray.map(sort => this.mapSortField(sort));
    this.page = 0;
    this.fetchPatientsPage();
  }

  /**
   * Map a UI sort field to the corresponding backend field.
   * @param sort - Sort descriptor with UI field and order.
   * @returns Mapped sort descriptor suitable for the backend.
   */
  private mapSortField(sort: { field: string; order: 'asc' | 'desc' }): { field: string; order: 'asc' | 'desc' } {
    const fieldMapping: Record<string, string> = {
      'fullName': 'lastName',
      'ageLabel': 'birthDate',
      'primaryCoverage': 'coverages',
      'statusText': 'status'
    };

    const backendField = fieldMapping[sort.field] || sort.field;
    return { field: backendField, order: sort.order };
  }

  /**
   * Navigate to the patient creation form.
   */
  goToPatientForm(): void {
    this.router.navigate(['/patients', 'form']);
  }

  /**
   * Navigate to the patient detail view.
   * @param id - Patient identifier.
   */
  viewPatient(id: number): void {
    this.router.navigate(['/patients', 'detail', id]);
  }

  /**
   * Navigate to the patient edit page.
   * @param id - Patient identifier.
   */
  editPatient(id: number): void {
    this.router.navigate(['/patients', 'edit-patient', id]);
  }

  /**
   * Deactivate (delete) a patient after user confirmation.
   * On success removes the patient from the local list and shows a success alert.
   * @param id - Patient identifier to deactivate.
   */
  deactivatePatient(id: number): void {
    if (!confirm('¿Desactivar (eliminar) este paciente?')) return;
    this.patientService.deletePatient(id).subscribe({
      next: () => {
        this.allPatients = this.allPatients.filter((p) => p.id !== id);
        this.patients = [...this.allPatients];
        this.cdr.markForCheck();
        this.showAlert('success', 'Paciente desactivado', 'El paciente se ha desactivado correctamente.');
      },
      error: () => {
        this.showAlert('error', 'Error al desactivar', 'No se pudo desactivar el paciente.');
      }
    });
  }

  /**
   * Export the current patient list to Excel or PDF using generic export services.
   * Sets loading state during export and displays an alert on success or error.
   * @param filteredData - Filtered patient data from the table
   * @param event - Export event specifying `type` as 'excel' or 'pdf'.
   * @returns Promise that resolves when export completes.
   */
  async onExport(filteredData: any[], event: { type: 'excel' | 'pdf' }): Promise<void> {
    this.loading.set(true);
    this.cdr.markForCheck();

    try {
      let result;

      if (event.type === 'excel') {
        result = await this.excelExportService.exportToExcel({
          data: filteredData,
          columns: PATIENT_EXPORT_COLUMNS,
          fileName: 'pacientes',
          sheetName: 'Pacientes',
          includeTimestamp: true
        });
      } else if (event.type === 'pdf') {
        result = await this.pdfExportService.exportToPdf({
          data: filteredData,
          columns: PATIENT_PDF_COLUMNS,
          fileName: 'pacientes',
          title: 'Listado de Pacientes',
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
      }

      if (result?.success) {
        this.showAlert('success', 'Exportación exitosa', 'Los pacientes se exportaron correctamente.');
      } else {
        this.showAlert('error', 'Error al exportar', result?.error || 'No se pudo generar el archivo de exportación.');
      }
    } catch {
      this.showAlert('error', 'Error al exportar', 'No se pudo generar el archivo de exportación.');
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }
}
