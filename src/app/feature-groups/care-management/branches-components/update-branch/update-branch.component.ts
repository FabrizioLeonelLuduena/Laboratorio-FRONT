import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup,ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { DropdownModule } from 'primeng/dropdown';
import { StepperModule } from 'primeng/stepper';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField, GenericSelectOption } from '../../../../shared/components/generic-form/generic-form.component';
import { translateDetail } from '../../../../shared/components/i18n/error-i18n';
import { BranchService as BillingBranchService } from '../../../billing-collections/cash-management/application/branch.service';
import { InternalUser } from '../../../user-management/models/InternalUser';
import { UserService } from '../../../user-management/services/user.service';
import { Address, AddressRequest } from '../../models/address';
import { AreaRequest, AreaResponse } from '../../models/area.models';
import { BranchResponse } from '../../models/branch';
import { BranchUpdateRequest } from '../../models/branch-request';
import { Contact, ContactRequest } from '../../models/contact';
import { ScheduleRequest } from '../../models/schedule';
import { AddressService } from '../../services/address.service';
import { AreaService } from '../../services/area.service';
import { BranchService } from '../../services/branch.service';
import { ContactService } from '../../services/contact.service';
import { SupportService } from '../../services/support.service';
import { AreaSectionManagerComponent, AreaSectionOutput, Workspace } from '../area-section-manager/area-section-manager.component';

/**
 * @Component
 * Component for editing an existing branch. It loads the branch details,
 * populates the form fields, and handles the update process through a multi-step wizard.
 * It also manages related entities like schedules, contacts, and area associations.
 */
@Component({
  selector: 'app-update-branch',
  standalone: true,
  imports: [
    GenericFormComponent,
    GenericAlertComponent,
    StepperModule,
    ReactiveFormsModule,
    DropdownModule,
    GenericButtonComponent,
    AreaSectionManagerComponent
  ],
  templateUrl: './update-branch.component.html',
  styleUrl: './update-branch.component.css'
})
export class UpdateBranchComponent implements OnInit, AfterViewInit, OnDestroy {
  /** A reference to the main branch data form component (unified form for step 0). */
  @ViewChild('branchForm') branchForm?: GenericFormComponent;
  /** A reference to the schedule item form component. */
  @ViewChild('scheduleForm') scheduleForm?: GenericFormComponent;
  /** A reference to the contact item form component. */
  @ViewChild('contactForm') contactForm?: GenericFormComponent;
  /** A reference to the area and section manager component. */
  @ViewChild('areaSectionManager') areaSectionManager?: AreaSectionManagerComponent;

  /** The currently active step in the stepper (0-indexed). */
  activeStep = 0;
  /** The highest step index the user has reached, used to control navigation. */
  maxStepReached = 0;
  /** Configuration for the stepper UI. */
  steps = [
    { label: 'Sucursal y Dirección', icon: 'pi pi-building' },
    { label: 'Horarios', icon: 'pi pi-clock' },
    { label: 'Contactos', icon: 'pi pi-phone' },
    { label: 'Áreas y secciones', icon: 'pi pi-sitemap' },
    { label: 'Confirmar', icon: 'pi pi-check' }
  ];

  /** The branch data loaded from the API to be edited. */
  branch: BranchResponse | null = null;

  /** Main area active form for the branch. */
  formBranch!: FormGroup;

  /** Options for the contact type dropdown. */
  contactTypes = [
    { label: 'Teléfono', value: 'PHONE' },
    { label: 'Whatsapp', value: 'WHATSAPP' },
    { label: 'Email', value: 'EMAIL' }
  ];

  /** Options for the schedule type dropdown. */
  scheduleTypes = [
    { label: 'Atención', value: 'ATTENTION' },
    { label: 'Extracción', value: 'EXTRACTION' },
    { label: 'Regular', value: 'REGULAR' },
    { label: 'Urgencias', value: 'URGENCIES' }
  ];

  /** Options for the status dropdown. */
  statusOptions = [
    { label: 'Activo', value: 'ACTIVE' },
    { label: 'Inactivo', value: 'INACTIVE' },
    { label: 'Mantenimiento', value: 'MAINTENANCE' }
  ];

  /** Options for the day of the week dropdowns. */
  days = [
    { label: 'Lunes', value: 'Monday' },
    { label: 'Martes', value: 'Tuesday' },
    { label: 'Miércoles', value: 'Wednesday' },
    { label: 'Jueves', value: 'Thursday' },
    { label: 'Viernes', value: 'Friday' },
    { label: 'Sábado', value: 'Saturday' },
    { label: 'Domingo', value: 'Sunday' }
  ];

  /** IDs of pre-existing schedules. */
  createdSchedules: number[] = [];
  /** IDs of pre-existing contacts. */
  createdContacts: number[] = [];
  /** ID of the pre-existing address. */
  createdAddress?: number;

  /** Cached lists for dropdowns and autoCompletás. */
  responsibles: GenericSelectOption[] = [];
  /** List of all contacts. */
  contacts: Contact[] = [];
  /** List of all addresses. */
  addresses: Address[] = [];

  /** Geographical lists for address form fields. */
  provinces: GenericSelectOption[] = [];
  /** List of cities for the selected province. */
  cities: GenericSelectOption[] = [];
  /** List of neighborhoods for the selected city. */
  neighborhoods: GenericSelectOption[] = [];

  /** Form field definitions for the main branch form. */
  branchFields: GenericFormField[] = [];
  /** Form field definitions for the address form. */
  addressFields: GenericFormField[] = [];
  /** Combined form fields for step 0 (branch + address). */
  step0Fields: GenericFormField[] = [];
  /** Initial value for step 0 form (set once when branch data loads). */
  step0InitialValue: Record<string, any> | null = null;
  /** Form field definitions for the schedule item form. */
  scheduleItemFields: GenericFormField[] = [];
  /** Form field definitions for the contact item form. */
  contactItemFields: GenericFormField[] = [];

  /** The list of schedules for the branch. */
  schedulesList: any[] = [];
  /** The list of contacts for the branch. */
  contactsList: any[] = [];
  /** Workspaces for the area/section manager. */
  areaWorkspaces: Workspace[] = [];
  /** A draft of the area/section data. */
  areaSectionDraft: AreaSectionOutput | null = null;
  /** The current data from the area/section manager. */
  areaSectionData: AreaSectionOutput | null = null;
  /** A cache of available areas. */
  areasCache: AreaResponse[] = [];

  /** State for the floating alert message. */
  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;

  /** A snapshot of the main branch data for the confirmation step. */
  branchData: any = {};
  /** A snapshot of the address data for the confirmation step. */
  addressData: any = {};
  /** A draft of the schedule item form. */
  scheduleDraft: any = {};
  /** A draft of the contact item form. */
  contactDraft: any = {};

  /**
   * Initializes the component and its dependencies.
   * @constructor
   * @param {ActivatedRoute} route - Service to access route parameters.
   * @param {FormBuilder} formBuilder - Service to build forms.
   * @param {ContactService} contactService - Service for contact-related operations.
   * @param {AddressService} addressService - Service for address-related operations.
   * @param {SupportService} supportService - Service for fetching support data.
   * @param {BranchService} branchService - Service for branch-related operations.
   * @param areaService
   * @param {Router} router - Angular's router for navigation.
   * @param {BreadcrumbService} BreadcrumbService - Service for managing breadcrumbs.
   * @param {BillingBranchService} billingBranchService - Service for billing-related branch operations.
   * @param {UserService} userService - Service for user-related operations.
   */
  constructor(
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private contactService: ContactService,
    private addressService: AddressService,
    private supportService: SupportService,
    private branchService: BranchService,
    private areaService: AreaService,
    private router: Router,
    private BreadcrumbService: BreadcrumbService,
    private billingBranchService: BillingBranchService,
    private userService: UserService
  ) {
    this.buildFields();
    // Ensure boxCount field exists and is placed before status so status wraps if needed
    const hasBox = this.branchFields.some(f => f.name === 'boxCount');
    if (!hasBox) {
      const boxField: GenericFormField = {
        name: 'boxCount',
        label: 'Cantidad de boxes',
        type: 'number',
        required: true,
        min: 0,
        max: 10,
        pattern: /^(0|[1-9]\d*)$/,
        messages: { max: 'El máximo de boxes permitido es 10.' }
      };
      const next: GenericFormField[] = [];
      for (const f of this.branchFields) {
        next.push(f);
        if (f.name === 'responsibleId') next.push(boxField);
      }
      this.branchFields = next;
    }
    this.loadProvinces();
    this.loadResponsibles();
    // Use time pickers for schedule times in stepper
    this.scheduleItemFields = (this.scheduleItemFields || []).map(f =>
      (f.name === 'scheduleFromTime' || f.name === 'scheduleToTime')
        ? { ...f, type: 'date', showTime: true, hideDate: true, placeholder: undefined, pattern: undefined }
        : f
    );

    // Ensure assistantDesk field exists and is placed before registerCount
    if (!this.branchFields.some(f => f.name === 'assistantDesk')) {
      const assistantField: GenericFormField = {
        name: 'assistantDesk',
        label: 'Cantidad de boxes de Atención',
        type: 'number',
        min: 1,
        max: 10,
        required: true,
        pattern: /^[1-9]\d*$/,
        messages: { max: 'El máximo de boxes de Atención permitido es 10.' }
      };
      const idx = this.branchFields.findIndex(f => f.name === 'registerCount');
      this.branchFields = idx >= 0
        ? [...this.branchFields.slice(0, idx), assistantField, ...this.branchFields.slice(idx)]
        : [...this.branchFields, assistantField];
    }

    // Rebuild step0Fields after all branchFields modifications
    this.step0Fields = [...this.branchFields, ...this.addressFields];
  }

  /** A list of internal users to populate the 'responsible' dropdown. */
  private users: InternalUser[] = [];
  /** Subject for managing component destruction. */
  private destroy$ = new Subject<void>();
  /** Delay in milliseconds before redirecting after a successful submission. */
  private REDIRECT_DELAY_MS = 900;
  /** A collection of general subscriptions to be cleaned up on destroy. */
  private subs: Subscription[] = [];
  /** A collection of address-related subscriptions to be cleaned up on destroy. */
  private addressSubs: Subscription[] = [];
  /** Subscriptions for time coersion watchers (schedule form). */
  private scheduleSubs: Subscription[] = [];

  /**
   * Angular lifecycle hook that runs once on component initialization.
   * Loads the branch data by ID from the route, builds the form, and populates contacts and schedules.
   */
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (id) {
      this.branchService.getByIdDetail(id).subscribe((data: BranchResponse) => {
        this.branch = data;
        this.BreadcrumbService.setBreadcrumbs(
          [
            { label: 'Gestión interna', route: '/care-management/care-home' },
            { label: 'Sucursales', route: '/care-management/branches' },
            { label: `Editar: ${data.description}` }
          ]
        );

        const responsibleUser = this.users.find(u => `${u.firstName} ${u.lastName}` === data.responsible?.name);

        // Build initial values for generic forms
        this.branchData = {
          code: data.code,
          description: data.description,
          responsibleId: responsibleUser ? responsibleUser.id : null,
          status: data.status,
          boxCount: this.toNumberOrNull(data.boxCount),
          registerCount: (data as any)?.registerCount ?? null,
          assistantDesk: (data as any)?.assistantDesk ?? (data as any)?.asistantDesk ?? null
        };

        // Preload structured address fields if present
        const a = data.address;
        this.addressData = a
          ? {
            streetName: a.streetName,
            streetNumber: a.streetNumber,
            postalCode: a.postalCode,
            provinceId: a.provinceId,
            cityId: a.cityId,
            neighborhoodId: a.neighborhoodId,
            latitude: a.latitude,
            longitude: a.longitude
          }
          : {};

        // Set initial value for step 0 form (only once)
        this.step0InitialValue = { ...this.branchData, ...this.addressData };

        // Hydrate lists for schedules/contacts used by the stepper UI
        this.schedulesList = (data.schedules || []).map(s => ({
          scheduleType: s.scheduleType,
          dayFrom: s.dayFrom,
          dayTo: s.dayTo,
          scheduleFromTime: this.formatTime(this.parseTimeToDate(s.scheduleFromTime)),
          scheduleToTime: this.formatTime(this.parseTimeToDate(s.scheduleToTime))
        }));
        this.contactsList = (data.contacts || []).map(c => ({
          contactType: c.contactType,
          contact: c.contact
        }));

        // Load areas to initialize areas step with current relations
        this.branchService.getBranchDetailById(id).subscribe({
          next: (detail) => {
            this.areasCache = detail.areas || [];
            this.areaWorkspaces = (detail.areas || []).map(a => ({
              areaId: a.id,
              areaName: a.name,
              sectionIds: (a.sections || []).map(s => s.id)
            }));
            this.areaSectionData = { workspaces: [...this.areaWorkspaces], newAreas: [] };
          }
        });

        // Ensure address cascading selects are hydrated like in create
        setTimeout(() => {
          this.initAddressWatchers();
          this.restoreStepDraft(0);
        }, 0);
      });
    }

    this.contactService.getAllContacts().subscribe({ next: (data) => { this.contacts = data; } });
    this.addressService.getAllAddresses().subscribe({ next: (data) => { this.addresses = data; } });
  }

  /**
   * Angular lifecycle hook that runs when the component is destroyed.
   * Unsubscribes from all active subscriptions to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this.addressSubs.forEach(s => s.unsubscribe());
    this.addressSubs = [];
    this.scheduleSubs.forEach(s => s.unsubscribe());
    this.scheduleSubs = [];
  }

  /**
   * Angular lifecycle hook that runs after the component's view has been initialized.
   * Initializes address watchers if on the first step.
   */
  ngAfterViewInit(): void {
    if (this.activeStep === 0) {
      setTimeout(() => this.initAddressWatchers(), 0);
    }
  }

  /**
   * Ensures the time-only pickers accept keyboard input (HH:mm), coercing strings to Date.
   * Subscribes to schedule time controls and converts typed strings into Date objects.
   */
  private initScheduleTimeCoercion(): void {
    const form: any = this.scheduleForm?.form;
    if (!form) return;
    // Clean previous
    this.scheduleSubs.forEach(s => s.unsubscribe());
    this.scheduleSubs = [];
    const coerce = (ctrlName: string) => {
      const ctrl = form.get(ctrlName);
      if (!ctrl) return;
      const sub = ctrl.valueChanges.subscribe((val: any) => {
        if (val && !(val instanceof Date)) {
          let next: Date | null = null;
          if (typeof val === 'string') {
            const m = val.match(/^(\d{1,2}):(\d{2})$/);
            if (m) {
              next = new Date();
              next.setHours(Number(m[1]), Number(m[2]), 0, 0);
            } else {
              const parsed = new Date(val);
              if (!isNaN(parsed.getTime())) next = parsed;
            }
          }
          if (next) ctrl.setValue(next, { emitEvent: false });
        }
      });
      this.scheduleSubs.push(sub);
    };
    coerce('scheduleFromTime');
    coerce('scheduleToTime');
  }

  /**
   * Builds a form group for a contact.
   * @returns {FormGroup} The contact form group.
   */
  createContact(): FormGroup {
    return this.formBuilder.group({
      contactType: ['Phone', [Validators.required]],
      contact: ['', [Validators.required]]
    });
  }

  /**
   * Returns the contacts FormArray from the main form.
   * @returns {FormArray} The contacts FormArray.
   */
  get contactos(): FormArray {
    return this.formBranch.get('contactos') as FormArray;
  }

  /**
   * Adds a new contact row to the form.
   */
  addContact(): void {
    this.contactos.push(this.createContact());
  }

  /**
   * Removes a contact row from the form at the specified index.
   * @param {number} index - The index of the contact to remove.
   */
  deleteContact(index: number): void {
    this.contactos.removeAt(index);
  }

  /**
   * Builds a form group for a schedule.
   * @returns {FormGroup} The schedule form group.
   */
  createSchedule(): FormGroup {
    return this.formBuilder.group({
      dayFrom: ['', [Validators.required]],
      dayTo: ['', [Validators.required]],
      scheduleFromTime: ['', [Validators.required]],
      scheduleToTime: ['', [Validators.required]],
      scheduleType: ['Atención', [Validators.required]]
    });
  }

  /**
   * Returns the schedules FormArray from the main form.
   * @returns {FormArray} The schedules FormArray.
   */
  get schedules(): FormArray {
    return this.formBranch.get('schedules') as FormArray;
  }

  /**
   * Adds a new schedule row to the form.
   */
  addSchedule(): void {
    this.schedules.push(this.createSchedule());
  }

  /**
   * Removes a schedule row from the form at the specified index.
   * @param {number} index - The index of the schedule to remove.
   */
  deleteSchedule(index: number): void {
    this.schedules.removeAt(index);
  }

  /**
   * Populates the schedules FormArray from the branch data, converting time strings to Date objects.
   */
  getSchedules(): void {
    if (this.branch?.schedules) {
      for (const s of this.branch.schedules) {
        this.schedules.push(
          this.formBuilder.group({
            dayFrom: [s.dayFrom, [Validators.required]],
            dayTo: [s.dayTo, [Validators.required]],
            scheduleFromTime: [this.parseTimeToDate(s.scheduleFromTime), [Validators.required]],
            scheduleToTime: [this.parseTimeToDate(s.scheduleToTime), [Validators.required]],
            scheduleType: [s.scheduleType, [Validators.required]]
          })
        );
      }
    }
  }

  /**
   * Populates the contacts FormArray from the branch data.
   */
  getContacts(): void {
    if (this.branch?.contacts) {
      for (const c of this.branch.contacts) {
        this.contactos.push(
          this.formBuilder.group({
            contactType: [c.contactType, [Validators.required]],
            contact: [c.contact, [Validators.required]]
          })
        );
      }
    }
  }

  /**
   * Fetches cities for a given province ID.
   * @param {number} provinceId - The ID of the province.
   * @param {() => void} [onComplete] - Optional callback to run after fetching is Completá.
   * @private
   */
  private fetchCities(provinceId: number, onComplete?: () => void) {
    this.branchForm?.control('cityId')?.disable({ emitEvent: false });
    this.supportService.getCitiesByProvinceId(provinceId).subscribe({
      next: (result) => {
        this.cities = (result || []).map((c: any) => ({ label: c.cityName, value: c.cityId }));
        this.setAddressFieldOptions('cityId', this.cities);
        this.branchForm?.control('cityId')?.enable({ emitEvent: false });
        if (onComplete) onComplete();
      }
    });
  }

  /**
   * Fetches neighborhoods for a given city ID.
   * @param {number} cityId - The ID of the city.
   * @param {() => void} [onComplete] - Optional callback to run after fetching is Completá.
   * @private
   */
  private fetchNeighborhoods(cityId: number, onComplete?: () => void) {
    this.branchForm?.control('neighborhoodId')?.disable({ emitEvent: false });
    this.supportService.getNeighborhoodByCityId(cityId).subscribe({
      next: (result) => {
        this.neighborhoods = (result || []).map((n: any) => ({
          label: n.neighborhoodName,
          value: n.neighborhoodId
        }));
        this.setAddressFieldOptions('neighborhoodId', this.neighborhoods);
        this.branchForm?.control('neighborhoodId')?.enable({ emitEvent: false });
        if (onComplete) onComplete();
      }
    });
  }

  /**
   * Parses a time string ("HH:mm" or "HH:mm:ss") into a Date object for the current day.
   * @param {string | null | undefined} value - The time string to parse.
   * @returns {Date | null} The parsed Date object, or null if the input is invalid.
   * @private
   */
  private parseTimeToDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const [hh, mm, ss] = value.split(':').map(Number);
    const d = new Date();
    d.setHours(hh || 0, mm || 0, ss || 0, 0);
    return d;
  }

  /**
   * Checks if a value is defined and not an empty string.
   * @param {any} v - The value to check.
   * @returns {boolean} True if the value is present, false otherwise.
   * @private
   */
  private hasValue(v: any): boolean { return !(v === null || v === undefined || v === ''); }

  /**
   * Validates the first step of the form (Branch and Address).
   * @returns {boolean} True if the step is valid, false otherwise.
   */
  get isStep0Valid(): boolean {
    const formValue = this.branchForm?.form?.getRawValue?.() ?? {};
    const combined = { ...(this.branchData || {}), ...(this.addressData || {}), ...formValue };
    return (
      this.hasValue(combined.description) &&
      this.hasValue(combined.responsibleId) &&
      this.hasValue(combined.status) &&
      this.hasValue(combined.boxCount) &&
      this.hasValue(combined.assistantDesk) &&
      this.hasValue(combined.registerCount) &&
      this.hasValue(combined.streetName) &&
      this.hasValue(combined.streetNumber) &&
      this.hasValue(combined.postalCode) &&
      this.hasValue(combined.provinceId) &&
      this.hasValue(combined.cityId) &&
      this.hasValue(combined.neighborhoodId)
    );
  }

  /**
   * Validates the second step of the form (Schedules).
   * @returns {boolean} True if the step is valid, false otherwise.
   */
  get isStep1Valid(): boolean { return this.schedulesList.length > 0; }

  /**
   * Validates the third step of the form (Contacts).
   * @returns {boolean} True if the step is valid, false otherwise.
   */
  get isStep2Valid(): boolean { return this.contactsList.length > 0; }

  /**
   * Determines if the "Next" button should be disabled.
   * @returns {boolean} False, as navigation is not restricted in the edit flow.
   */
  get isNextDisabled(): boolean {
    if (this.activeStep === 0) {
      return !this.isStep0Valid;
    }
    return false;
  }

  /**
   * Converts a value to a number, or null if it's not a finite number.
   * @param {any} v - The value to convert.
   * @returns {number | null} The converted number or null.
   * @private
   */
  private toNumberOrNull(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Formats a date-like value into a "HH:mm:ss" string for backend compatibility.
   * @param {any} value - The date or parsable value.
   * @returns {string | null} The formatted time string, or null if the input is invalid.
   * @private
   */
  private toTimeString(value: any): string | null {
    if (!value) return null;
    const d = new Date(value);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = '00';
    return `${hh}:${mm}:${ss}`;
  }

  /**
   * Extracts a concise error summary and details from various backend error formats.
   * @param {HttpErrorResponse} err - The raw error object.
   * @returns {{ summary: string; details: string[] }} An object with the error summary and details.
   * @private
   */
  private extractErrorDetails(err: HttpErrorResponse): { summary: string; details: string[] } {
    const http = err as HttpErrorResponse;

    let payload: any = http?.error ?? err;

    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { }
    }

    const rawStatus = http?.status ?? payload?.statusCode ?? payload?.status;
    const statusNum = Number(rawStatus);
    const human =
      Number.isFinite(statusNum)
        ? (statusNum >= 500 ? 'Server error' : statusNum >= 400 ? 'Validation/Client error' : 'Error')
        : 'Error';
    const summary = Number.isFinite(statusNum) ? `${human} (${statusNum})` : human;

    if (payload && typeof payload === 'object' && (payload.errorMessage || payload.uri || payload.timestamp)) {
      const parts: string[] = [];
      if (payload.errorMessage) parts.push(payload.errorMessage);
      if (payload.uri) parts.push(`Endpoint: ${payload.uri}`);
      if (payload.timestamp) {
        const ts = Array.isArray(payload.timestamp)
          ? new Date(
            payload.timestamp[0],
            (payload.timestamp[1] ?? 1) - 1,
            payload.timestamp[2] ?? 1,
            payload.timestamp[3] ?? 0,
            payload.timestamp[4] ?? 0,
            payload.timestamp[5] ?? 0
          ).toISOString()
          : (typeof payload.timestamp === 'string' ? payload.timestamp : undefined);
        if (ts) parts.push(`Timestamp: ${ts}`);
      }
      return { summary, details: parts.length ? parts : ['Validation failed.'] };
    }

    const aggregate = (arr: any[], fieldKey: string, msgKey: string) =>
      arr
        .map(e => {
          const field = e?.[fieldKey] ?? e?.field ?? e?.propertyPath ?? '';
          const msg = e?.[msgKey] ?? e?.defaultMessage ?? e?.message ?? 'Invalid value';
          return field ? `${field}: ${msg}` : msg;
        })
        .filter(Boolean);

    if (payload?.errors && Array.isArray(payload.errors)) {
      const lines = aggregate(payload.errors, 'field', 'message');
      if (lines.length) return { summary: 'Validation errors', details: lines };
    }
    if (payload?.fieldErrors && Array.isArray(payload.fieldErrors)) {
      const lines = aggregate(payload.fieldErrors, 'field', 'message');
      if (lines.length) return { summary: 'Validation errors', details: lines };
    }
    if (payload?.violations && Array.isArray(payload.violations)) {
      const lines = aggregate(payload.violations, 'fieldName', 'message');
      if (lines.length) return { summary: 'Validation errors', details: lines };
    }

    if (typeof payload === 'string') {
      return { summary, details: [payload] };
    }

    const msg = http?.message ?? 'An unexpected error occurred.';
    return { summary, details: [msg] };
  }

  /**
   * Cleans and translates backend error messages to Spanish for display.
   * @param {string[]} details - The raw error lines.
   * @returns {string} The normalized error message.
   * @private
   */
  private normalizeValidationDetails(details: string[]): string {
    const noise = [/^Timestamp:/i, /^Endpoint:/i, /^Error\s*\d{3}/i, /^\s*$/];

    const cleaned = details
      .filter(d => !noise.some(rx => rx.test(d)))
      .map(translateDetail);

    const list = cleaned.length ? cleaned : ['OcurriÃ³ un error de validaciÃ³n.'];
    return list.join('\n');
  }

  /**
   * Validates and submits the update request. Displays toast messages for success or error,
   * and redirects to the branch list on success.
   */
  onSubmit(): void {
    this.formBranch.markAllAsTouched();

    if (this.formBranch.invalid) {
      return;
    }

    const addressRequest: AddressRequest = {
      streetName: this.formBranch.get('address.streetName')?.value,
      streetNumber: this.formBranch.get('address.streetNumber')?.value,
      neighborhoodId: Number(this.formBranch.get('address.neighborhoodId')?.value),
      postalCode: this.formBranch.get('address.postalCode')?.value,
      latitude: this.toNumberOrNull(this.formBranch.get('address.latitude')?.value),
      longitude: this.toNumberOrNull(this.formBranch.get('address.longitude')?.value)
    };

    const contacts: ContactRequest[] = this.contactos.controls.map((ctrl): ContactRequest => {
      const v = ctrl.value;
      return { contactType: v.contactType, contact: v.contact };
    });

    const schedules: ScheduleRequest[] = this.schedules.controls.map((ctrl): ScheduleRequest => {
      const v = ctrl.value;
      return {
        dayFrom: v.dayFrom,
        dayTo: v.dayTo,
        scheduleFromTime: this.toTimeString(v.scheduleFromTime)!,
        scheduleToTime: this.toTimeString(v.scheduleToTime)!,
        scheduleType: v.scheduleType
      };
    });

    const responsibleUser = this.users.find(u => u.id === this.formBranch.get('responsibleId')?.value);
    const responsibleName = responsibleUser ? `${responsibleUser.firstName} ${responsibleUser.lastName}` : '';

    const currentnewAreas: AreaRequest[] = this.areaSectionManager
      ? this.areaSectionManager.newAreas()
      : (this.areaSectionData?.newAreas || []);

    const performUpdate = (workspacesFinal: { areaId: number; sectionIds: number[] }[]) => {
      const branchRequest: BranchUpdateRequest = {
        description: this.formBranch.get('description')?.value,
        schedules: schedules,
        responsible: { name: responsibleName, userId: Number(this.formBranch.get('responsibleId')?.value ?? 0) },
        address: addressRequest,
        contacts: contacts,
        status: this.formBranch.get('status')?.value,
        workspaces: workspacesFinal,
        boxCount: this.formBranch.get('boxCount')?.value,
        registerCount: this.formBranch.get('registerCount')?.value,
        assistantDesk: this.formBranch.get('assistantDesk')?.value
      };

      if (this.branch) {
        this.branchService.updateBranch(this.branch.id, branchRequest).subscribe({
          next: () => {
            setTimeout(() => this.router.navigate(['care-management/branches']), this.REDIRECT_DELAY_MS);
          },
          error: () => {
          }
        });
      }
    };

    if ((currentnewAreas || []).length > 0) {
      const calls = currentnewAreas.map(a => this.areaService.postArea(a));
      forkJoin(calls).subscribe({
        next: (createdAreas: AreaResponse[]) => {
          const newWorkspaces = (createdAreas || []).map(ar => ({
            areaId: ar.id,
            sectionIds: (ar.sections || []).map(s => s.id)
          }));
          const existing = this.buildWorkspacesFinal();
          // Merge and dedupe by areaId (new areas shouldn't collide with existing ids)
          const byId = new Map<number, { areaId: number; sectionIds: number[] }>();
          [...existing, ...newWorkspaces].forEach(w => byId.set(w.areaId, w));
          performUpdate(Array.from(byId.values()));
        },
        error: () => performUpdate(this.buildWorkspacesFinal())
      });
    } else {
      performUpdate(this.buildWorkspacesFinal());
    }
  }

  /**
   * Formats a date-like value to a "HH:mm" string for display.
   * @param {any} date - The date or parsable value.
   * @returns {string} The formatted time string.
   */
  formatTime(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Initializes the form field configurations for each step.
   * @private
   */
  private buildFields() {
    this.branchFields = [
      { name: 'code', label: 'Código', type: 'text', required: true, disabled: true },
      { name: 'description', label: 'Descripción', type: 'text', required: true },
      { name: 'responsibleId', label: 'Responsable', type: 'select', required: true, options: this.responsibles },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: this.statusOptions },
      { name: 'registerCount', label: 'Cantidad de cajas', type: 'number', min: 1, max: 10, required: true, messages: { max: 'El mÃ¡ximo de cajas permitido es 10.' } }
    ];

    this.addressFields = [
      { name: 'streetName', label: 'Calle', type: 'text', required: true },
      { name: 'streetNumber', label: 'Número', type: 'text', required: true, pattern: /^(0|[1-9]\d*)$/ },
      { name: 'postalCode', label: 'Código Postal', type: 'text', required: true },
      { name: 'provinceId', label: 'Provincia', type: 'select', required: true, options: this.provinces },
      { name: 'cityId', label: 'Ciudad', type: 'select', required: true, options: this.cities },
      { name: 'neighborhoodId', label: 'Barrio', type: 'select', required: true, options: this.neighborhoods }
    ];

    this.scheduleItemFields = [
      { name: 'scheduleType', label: 'Tipo de Atención', type: 'select', options: this.scheduleTypes, required: true },
      { name: 'dayFrom', label: 'Primer día', type: 'select', options: this.days, required: true },
      { name: 'dayTo', label: 'Último día', type: 'select', options: this.days, required: true },
      { name: 'scheduleFromTime', label: 'Hora de inicio', type: 'text', placeholder: 'HH:mm', required: true, pattern: /^([01]\d|2[0-3]):([0-5]\d)$/ },
      { name: 'scheduleToTime', label: 'Hora de fin', type: 'text', placeholder: 'HH:mm', required: true, pattern: /^([01]\d|2[0-3]):([0-5]\d)$/ }
    ];

    this.contactItemFields = [
      { name: 'contactType', label: 'Tipo', type: 'select', options: this.contactTypes, required: true },
      { name: 'contact', label: 'Contacto', type: 'text', required: true }
    ];

    // Combine both forms into one for step 0
    this.step0Fields = [...this.branchFields, ...this.addressFields];
  }

  /**
   * Fetches the list of internal users to be assigned as responsible for the branch.
   * @private
   */
  private loadResponsibles() {
    this.userService.searchUsers({
      page: 0,
      size: 100,
      sortBy: 'lastName',
      sortDirection: 'ASC',
      search: '',
      isActive: true,
      isExternal: false,
      roleId: null
    }).subscribe({
      next: (response) => {
        this.users = response.content;
        this.responsibles = this.users.map(user => ({
          label: `${user.firstName} ${user.lastName}`,
          value: user.id
        }));
        const responsibleField = this.branchFields.find(f => f.name === 'responsibleId');
        if (responsibleField) {
          responsibleField.options = this.responsibles;
        }
        // Also update in step0Fields (combined array)
        const step0ResponsibleField = this.step0Fields.find(f => f.name === 'responsibleId');
        if (step0ResponsibleField) {
          step0ResponsibleField.options = this.responsibles;
        }
      },
      error: (_err) => {
        this.showAlert('error', 'Error al cargar los responsables.');
      }
    });
  }

  /**
   * Sets the options for a specific dropdown in the address form.
   * @param {string} name - The name of the form field.
   * @param {GenericSelectOption[]} options - The array of options to set.
   * @private
   */
  private setAddressFieldOptions(name: string, options: GenericSelectOption[]) {
    const field = this.addressFields.find(f => f.name === name);
    if (field) field.options = options;

    // Also update in step0Fields (combined array)
    const step0Field = this.step0Fields.find(f => f.name === name);
    if (step0Field) step0Field.options = options;
  }

  /**
   * Fetches the list of provinces from the API.
   * @private
   */
  private loadProvinces() {
    this.supportService.getAllProvinces().subscribe({
      next: (result) => {
        this.provinces = (result || []).map((p: any) => ({ label: p.provinceName, value: p.provinceId }));
        this.setAddressFieldOptions('provinceId', this.provinces);
      }
    });
  }

  /**
   * Initializes subscriptions to the address form's dropdowns to dynamically load dependent data.
   * @private
   */
  private initAddressWatchers() {
    if (!this.branchForm) return;

    this.addressSubs.forEach(s => s.unsubscribe());
    this.addressSubs = [];

    if (!this.branchForm.control('cityId')?.value) {
      this.branchForm.control('cityId')?.disable({ emitEvent: false });
    }
    if (!this.branchForm.control('neighborhoodId')?.value) {
      this.branchForm.control('neighborhoodId')?.disable({ emitEvent: false });
    }

    const pSub = this.branchForm.control('provinceId')?.valueChanges.subscribe((provinceId: number) => {
      // Keep draft in sync with province changes
      this.addressData = { ...(this.addressData || {}), provinceId };
      this.branchForm?.control('cityId')?.reset(null, { emitEvent: false });
      this.branchForm?.control('neighborhoodId')?.reset(null, { emitEvent: false });
      this.setAddressFieldOptions('cityId', []);
      this.setAddressFieldOptions('neighborhoodId', []);
      this.branchForm?.control('neighborhoodId')?.disable({ emitEvent: false });

      if (provinceId) {
        this.fetchCities(provinceId);
      } else {
        this.branchForm?.control('cityId')?.disable({ emitEvent: false });
      }
    });
    if (pSub) this.addressSubs.push(pSub);

    const cSub = this.branchForm.control('cityId')?.valueChanges.subscribe((cityId: number) => {
      // Keep draft in sync with city changes
      this.addressData = { ...(this.addressData || {}), cityId };
      this.branchForm?.control('neighborhoodId')?.reset(null, { emitEvent: false });
      this.setAddressFieldOptions('neighborhoodId', []);

      if (cityId) {
        this.fetchNeighborhoods(cityId);
      } else {
        this.branchForm?.control('neighborhoodId')?.disable({ emitEvent: false });
      }
    });
    if (cSub) this.addressSubs.push(cSub);

    // Neighborhood watcher to keep draft in sync
    const nSub = this.branchForm.control('neighborhoodId')?.valueChanges.subscribe((neighborhoodId: number) => {
      this.addressData = { ...(this.addressData || {}), neighborhoodId };
    });
    if (nSub) this.addressSubs.push(nSub);

    // Keep basic address text/number fields in sync with draft
    const basicAddressFields = ['streetName', 'streetNumber', 'postalCode', 'latitude', 'longitude'];
    for (const field of basicAddressFields) {
      const sub = this.branchForm.control(field)?.valueChanges.subscribe((val: any) => {
        this.addressData = { ...(this.addressData || {}), [field]: val };
      });
      if (sub) this.addressSubs.push(sub);
    }
  }

  /**
   * Handles the step change event from the stepper component.
   * @param {number} nextIndex - The index of the next step.
   */
  onStepChange(nextIndex: number) {
    this.saveStepDraft(this.activeStep);
    if (this.activeStep === 3 && this.areaSectionManager) {
      this.areasCache = this.areaSectionManager.availableAreas();
      this.areaSectionData = {
        workspaces: this.areaSectionManager.selectedWorkspaces(),
        newAreas: this.areaSectionManager.newAreas()
      };
    }
    this.goTo(nextIndex);
  }

  /**
   * Navigates to a specific step in the stepper.
   * @param {number} step - The index of the step to navigate to.
   */
  goTo(step: number) {
    this.saveStepDraft(this.activeStep);
    this.activeStep = step;
    if (step === 0) setTimeout(() => this.initAddressWatchers());
    setTimeout(() => { this.restoreStepDraft(step); if (step === 1) this.initScheduleTimeCoercion(); });
  }

  /**
   * Validates the current step and advances to the next one.
   */
  nextStep() {
    if (this.activeStep === 0 && !this.isStep0Valid) {
      this.markCurrentStepTouched();
      this.showStepValidationAlert();
      return;
    }
    this.saveStepDraft(this.activeStep);
    const nextStepIndex = Math.min(this.activeStep + 1, this.steps.length - 1);
    this.maxStepReached = Math.max(this.maxStepReached, nextStepIndex);
    this.activeStep = nextStepIndex;
    setTimeout(() => this.restoreStepDraft(this.activeStep));
  }

  /**
   * Navigates to the previous step.
   */
  prevStep() {
    this.saveStepDraft(this.activeStep);
    this.activeStep = Math.max(this.activeStep - 1, 0);
    setTimeout(() => this.restoreStepDraft(this.activeStep));
  }

  /**
   * Navigates the user back to the main branches list.
   */
  onCancel(): void {
    this.router.navigate(['care-management/branches']);
  }

  /**
   * Saves the current form data into a draft object before navigating to another step.
   * @param {number} stepIndex - The index of the current step.
   * @private
   */
  private saveStepDraft(stepIndex: number) {
    if (stepIndex === 0) {
      const formValue = this.branchForm?.form?.getRawValue?.();
      if (formValue) {
        // Separate branch and address fields
        const branchFieldNames = this.branchFields.map(f => f.name);
        const addressFieldNames = this.addressFields.map(f => f.name);

        const branchValues: any = {};
        const addressValues: any = {};

        Object.keys(formValue).forEach(key => {
          if (branchFieldNames.includes(key)) {
            branchValues[key] = formValue[key];
          } else if (addressFieldNames.includes(key)) {
            addressValues[key] = formValue[key];
          }
        });

        this.branchData = { ...this.branchData, ...branchValues };
        this.addressData = { ...this.addressData, ...addressValues };
      }
    } else if (stepIndex === 1) {
      const v = this.scheduleForm?.form?.getRawValue?.();
      if (v) this.scheduleDraft = { ...v };
    } else if (stepIndex === 2) {
      const v = this.contactForm?.form?.getRawValue?.();
      if (v) this.contactDraft = { ...v };
    } else if (stepIndex === 3) {
      if (this.areaSectionManager) {
        this.areasCache = this.areaSectionManager.availableAreas();
        this.areaSectionData = {
          workspaces: this.areaSectionManager.selectedWorkspaces(),
          newAreas: this.areaSectionManager.newAreas()
        };
        this.areaSectionDraft = { ...this.areaSectionData };
      }
    }
  }

  /**
   * Restores form data from a draft object when returning to a step.
   * @param {number} stepIndex - The index of the step to restore.
   * @private
   */
  private restoreStepDraft(stepIndex: number) {
    if (stepIndex === 0) {
      if (this.branchForm?.form) {
        // Combine branch and address data
        const combinedData = { ...this.branchData, ...this.addressData };
        if (Object.keys(combinedData).length) {
          this.branchForm.form.patchValue(combinedData, { emitEvent: false });
        }

        // Restore cascading dropdowns
        const { provinceId, cityId, neighborhoodId } = this.addressData;
        if (provinceId) {
          this.fetchCities(provinceId, () => {
            if (cityId) {
              this.branchForm?.control('cityId')?.setValue(cityId, { emitEvent: false });
              this.fetchNeighborhoods(cityId, () => {
                if (neighborhoodId) this.branchForm?.control('neighborhoodId')?.setValue(neighborhoodId, { emitEvent: false });
              });
            }
          });
        }
      }
    } else if (stepIndex === 1 && this.scheduleForm?.form) {
      if (this.scheduleDraft && Object.keys(this.scheduleDraft).length) {
        this.scheduleForm.form.patchValue(this.scheduleDraft, { emitEvent: false });
      }
    } else if (stepIndex === 2 && this.contactForm?.form) {
      if (this.contactDraft && Object.keys(this.contactDraft).length) {
        this.contactForm.form.patchValue(this.contactDraft, { emitEvent: false });
      }
    } else if (stepIndex === 3) {
      if (this.areaSectionDraft) {
        this.areaSectionData = this.areaSectionDraft;
      }
    }
  }

  /**
   * Marks all form controls in the current step as "touched" to trigger validation messages.
   * @private
   */
  private markCurrentStepTouched() {
    if (this.activeStep === 0) {
      // Mark all fields in the unified form (branch + address)
      this.step0Fields.forEach(f => this.branchForm?.markTouched(f.name));
    } else if (this.activeStep === 1) {
      this.scheduleItemFields.forEach(f => this.scheduleForm?.markTouched(f.name));
    } else if (this.activeStep === 2) {
      this.contactItemFields.forEach(f => this.contactForm?.markTouched(f.name));
    }
  }

  /**
   * Displays a validation alert with a message relevant to the current step.
   * @private
   */
  private showStepValidationAlert() {
    let detail = 'Completá los campos requeridos para continuar.';
    if (this.activeStep === 1 && !this.schedulesList.length) detail = 'Agregá al menos un horario para continuar.';
    if (this.activeStep === 2 && !this.contactsList.length) detail = 'Agregá al menos un contacto para continuar.';
    if (this.activeStep === 3 && !this.hasAnySelectedSection()) detail = 'Seleccioná al menos una sección en alguna área.';
    this.showAlert('warning', detail);
  }

  /**
   * Validates and adds a new schedule to the `schedulesList`.
   */
  addScheduleFromForm() {
    const form = this.scheduleForm?.form;
    if (!form) return;
    const v = form.getRawValue?.();
    if (!v) return;
    const isValidTime = (t?: string) => typeof t === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);
    if (!v.scheduleType || !v.dayFrom || !v.dayTo || !isValidTime(v.scheduleFromTime) || !isValidTime(v.scheduleToTime)) {
      form.markAllAsTouched();
      this.showAlert('warning', 'Completá los campos requeridos del horario.');
      return;
    }
    const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    if (toMinutes(v.scheduleFromTime) >= toMinutes(v.scheduleToTime)) {
      this.showAlert('warning', 'La hora de inicio debe ser menor que la hora de fin.');
      return;
    }
    this.schedulesList = [...this.schedulesList, v];
    form.reset();
  }

  /**
   * Removes a schedule from the list at the specified index.
   * @param {number} index - The index of the schedule to remove.
   */
  /**
   * Wrapper to support time pickers: normalizes times and adds the schedule.
   */
  addScheduleFromFormCompat() {
    const form = this.scheduleForm?.form;
    if (!form) return;
    const v = form.getRawValue?.();
    if (!v) return;
    const toMinutes = (t: any) => { const s = this.formatTime(t); if (!s) return NaN; const [h, m] = s.split(':').map(Number); return h * 60 + m; };
    if (!v.scheduleType || !v.dayFrom || !v.dayTo) {
      form.markAllAsTouched();
      this.showAlert('warning', 'Completá los campos requeridos del horario.');
      return;
    }
    if (toMinutes(v.scheduleFromTime) >= toMinutes(v.scheduleToTime)) {
      this.showAlert('warning', 'La hora de inicio debe ser menor que la hora de fin.');
      return;
    }
    const normalized = {
      ...v,
      scheduleFromTime: this.formatTime(v.scheduleFromTime),
      scheduleToTime: this.formatTime(v.scheduleToTime)
    };
    this.schedulesList = [...this.schedulesList, normalized];
    form.reset();
  }

  /**
   * Method that removes a schedule from the list of aggregated schedules.
   */
  removeScheduleAt(index: number) { this.schedulesList = this.schedulesList.filter((_, i) => i !== index); }

  /**
   * Validates and adds a new contact to the `contactsList`.
   */
  addContactFromForm() {
    const form = this.contactForm?.form;
    if (!form) {
      this.showAlert('warning', 'Error: formulario no disponible.');
      return;
    }
    if (!form.valid) {
      form.markAllAsTouched();
      this.showAlert('warning', 'Seleccioná un tipo e ingresá el contacto.');
      return;
    }
    const val = form.getRawValue();
    const type = val.contactType;
    const value: string = (val.contact || '').toString().trim();
    if (!type || !value) {
      this.showAlert('warning', 'Seleccioná un tipo e ingresá el contacto.');
      return;
    }
    if (type === 'EMAIL') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        this.showAlert('warning', 'Ingresá un email válido (ej: usuario@ejemplo.com).');
        return;
      }
    } else if (type === 'PHONE' || type === 'WHATSAPP') {
      const digits = value.replace(/\D/g, '');
      const formatRegex = /^[+]?[-()\d\s]{7,20}$/;
      if (digits.length < 7 || digits.length > 15 || !formatRegex.test(value)) {
        this.showAlert('warning', 'Ingresá un teléfono válido (7-15 dígitos, puede incluir +, espacios, guiones).');
        return;
      }
    }
    this.contactsList = [...this.contactsList, { contactType: type, contact: value }];
    form.reset();
  }

  /**
   * Removes a contact from the list at the specified index.
   * @param {number} index - The index of the contact to remove.
   */
  removeContactAt(index: number) { this.contactsList = this.contactsList.filter((_, i) => i !== index); }

  /**
   * Displays a floating alert message for a fixed duration.
   * @param {'success' | 'error' | 'warning'} type - The type of alert.
   * @param {string} text - The message to display.
   * @private
   */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), type === 'error' ? 7000 : 3000);
  }

  /**
   * Gathers all data, validates it, and submits it to update the branch and associated entities.
   */
  onSubmitFinal(): void {
    // Persist latest edits prior to validation (keeps drafts fresh)
    this.saveStepDraft(this.activeStep);
    this.saveStepDraft(0);
    if (!this.isStep0Valid) {
      this.activeStep = 0;
      this.markCurrentStepTouched();
      this.showAlert('warning', 'Hay campos obligatorios vacíos en Sucursal y Dirección.');
      setTimeout(() => this.restoreStepDraft(0));
      return;
    }
    if (!this.isStep1Valid) {
      this.activeStep = 1;
      this.showAlert('warning', 'Agregá al menos un horario.');
      setTimeout(() => { this.restoreStepDraft(1); this.initScheduleTimeCoercion(); });
      return;
    }
    if (!this.isStep2Valid) {
      this.activeStep = 2;
      this.showAlert('warning', 'Agregá al menos un contacto.');
      setTimeout(() => this.restoreStepDraft(2));
      return;
    }

    const current = this.areaSectionManager
      ? { workspaces: this.areaSectionManager.selectedWorkspaces(), newAreas: this.areaSectionManager.newAreas() }
      : (this.areaSectionData || { workspaces: [], newAreas: [] });
    const selected = current.workspaces || [];
    const hasAnySection = selected.some(w => (w.sectionIds?.length || 0) > 0);
    const initialIds = new Set((this.areaWorkspaces || []).map(w => w.areaId));
    const currentIds = new Set(selected.map(w => w.areaId));
    const hasRemovals = Array.from(initialIds).some(id => !currentIds.has(id));
    const hasNew = (current.newAreas || []).length > 0;
    if (!(hasAnySection || hasRemovals || hasNew)) { this.activeStep = 3; this.showAlert('warning', 'Agregá o quitá áreas/secciones para continuar.'); return; }

    const formValue = this.branchForm?.form?.getRawValue?.() ?? {};
    const branchFieldNames = this.branchFields.map(f => f.name);
    const addressFieldNames = this.addressFields.map(f => f.name);

    const branchFormValues: any = {};
    const addressFormValues: any = {};
    Object.keys(formValue).forEach(key => {
      if (branchFieldNames.includes(key)) branchFormValues[key] = formValue[key];
      else if (addressFieldNames.includes(key)) addressFormValues[key] = formValue[key];
    });

    const branchPayload = { ...(this.branchData || {}), ...branchFormValues };
    const addressPayload = { ...(this.addressData || {}), ...addressFormValues };

    const responsibleUser = this.users.find(u => u.id === branchPayload.responsibleId);
    const responsibleName = responsibleUser ? `${responsibleUser.firstName} ${responsibleUser.lastName}` : '';

    const addressRequest: AddressRequest = {
      streetName: addressPayload.streetName,
      streetNumber: addressPayload.streetNumber,
      neighborhoodId: Number(addressPayload.neighborhoodId),
      postalCode: addressPayload.postalCode,
      latitude: this.toNumberOrNull(addressPayload.latitude),
      longitude: this.toNumberOrNull(addressPayload.longitude)
    };

    const contacts: ContactRequest[] = (this.contactsList || []).map((c: any) => ({ contactType: c.contactType, contact: c.contact }));
    const schedules: ScheduleRequest[] = (this.schedulesList || []).map((s: any) => ({
      dayFrom: s.dayFrom,
      dayTo: s.dayTo,
      scheduleFromTime: s.scheduleFromTime,
      scheduleToTime: s.scheduleToTime,
      scheduleType: s.scheduleType
    }));

    const currentnewAreas: AreaRequest[] = this.areaSectionManager
      ? this.areaSectionManager.newAreas()
      : (this.areaSectionData?.newAreas || []);

    const performUpdate = (workspacesFinal: { areaId: number; sectionIds: number[] }[]) => {
      const branchRequest: BranchUpdateRequest = {
        description: branchPayload.description,
        schedules,
        responsible: { name: responsibleName, userId: branchPayload.responsibleId },
        address: addressRequest,
        contacts: contacts,
        status: branchPayload.status,
        workspaces: workspacesFinal,
        boxCount: branchPayload.boxCount,
        registerCount: branchPayload.registerCount,
        assistantDesk: branchPayload.assistantDesk
      };

      if (this.branch) {
        this.branchService.updateBranch(this.branch.id, branchRequest).subscribe({
          next: () => {
            const qty = Number(branchRequest.registerCount ?? 0);
            if (!isNaN(qty) && qty >= 0) {
              this.billingBranchService
                .syncRegisters({ branch_id: this.branch!.id, quantity: qty })
                .subscribe({
                  next: () => {
                    // Sync OK → show success for branch update
                    this.showAlert('success', 'Sucursal actualizada correctamente.');
                    setTimeout(() => this.router.navigate(['care-management/branches']), this.REDIRECT_DELAY_MS);
                  },
                  error: () => {
                    // Do not surface sync/bulk errors as alerts.
                    // Branch update already succeeded, so show success and continue.
                    this.showAlert('success', 'Sucursal actualizada correctamente.');
                    setTimeout(() => this.router.navigate(['care-management/branches']), this.REDIRECT_DELAY_MS);
                  }
                });
            } else {
              this.showAlert('success', 'Sucursal actualizada correctamente.');
              setTimeout(() => this.router.navigate(['care-management/branches']), this.REDIRECT_DELAY_MS);
            }
          },
          error: (e) => {
            const details = this.extractErrorDetails(e)?.details ?? [e?.message || 'No se pudo actualizar la sucursal.'];
            this.showAlert('error', this.normalizeValidationDetails(details));
          }
        });
      }
    };

    if ((currentnewAreas || []).length > 0) {
      const calls = currentnewAreas.map(a => this.areaService.postArea(a));
      forkJoin(calls).subscribe({
        next: (createdAreas: AreaResponse[]) => {
          const newWorkspaces = (createdAreas || []).map(ar => ({
            areaId: ar.id,
            sectionIds: (ar.sections || []).map(s => s.id)
          }));
          const existing = this.buildWorkspacesFinal();
          const byId = new Map<number, { areaId: number; sectionIds: number[] }>();
          [...existing, ...newWorkspaces].forEach(w => byId.set(w.areaId, w));
          performUpdate(Array.from(byId.values()));
        },
        error: () => performUpdate(this.buildWorkspacesFinal())
      });
    } else {
      performUpdate(this.buildWorkspacesFinal());
    }

  }

  /**
   * Checks if at least one section is selected across all workspaces.
   * @returns {boolean} True if at least one section is selected, false otherwise.
   * @private
   */
  private hasAnySelectedSection(): boolean {
    const current = this.areaSectionManager
      ? { workspaces: this.areaSectionManager.selectedWorkspaces(), newAreas: [] }
      : (this.areaSectionData || { workspaces: [], newAreas: [] });
    return (current.workspaces || []).some(w => (w.sectionIds?.length || 0) > 0);
  }

  /**
   * Builds the final workspaces payload including current selections and removals.
   * For areas removed by the user, sends an empty sections list to deactivate all relations.
   */
  private buildWorkspacesFinal(): { areaId: number; sectionIds: number[] }[] {
    const current = this.areaSectionManager
      ? this.areaSectionManager.selectedWorkspaces()
      : (this.areaSectionData?.workspaces || []);

    const payloadMap = new Map<number, number[]>();
    for (const w of current) {
      if (!w) continue;
      payloadMap.set(w.areaId, [...(w.sectionIds || [])]);
    }
    const initialIds = new Set((this.areaWorkspaces || []).map(w => w.areaId));
    for (const id of initialIds) {
      if (!payloadMap.has(id)) payloadMap.set(id, []);
    }
    return Array.from(payloadMap.entries()).map(([areaId, sectionIds]) => ({ areaId, sectionIds }));
  }

  /**
   * Finds the label for a given value in a list of options.
   * @param {{ label: string; value: any }[]} options - The list of options.
   * @param {any} value - The value to find the label for.
   * @returns {string} The corresponding label, or the value as a string if not found.
   * @private
   */
  private findLabel(options: { label: string; value: any }[], value: any): string {
    const item = options.find(o => o.value === value);
    return item?.label ?? String(value ?? '');
  }

  /**
   * Gets the display label for a schedule type.
   * @param {any} v - The schedule type value.
   * @returns {string} The display label.
   */
  getScheduleTypeLabel(v: any): string { return this.findLabel(this.scheduleTypes as any, v); }

  /**
   * Gets the display label for a contact type.
   * @param {any} v - The contact type value.
   * @returns {string} The display label.
   */
  getContactTypeLabel(v: any): string { return this.findLabel(this.contactTypes as any, v); }

  /**
   * Gets the display label for a day of the week.
   * @param {any} v - The day value.
   * @returns {string} The display label.
   */
  getDayLabel(v: any): string { return this.findLabel(this.days as any, v); }

  /**
   * Gets the name of a province from its ID.
   * @param {number | null | undefined} id - The province ID.
   * @returns {string} The province name.
   */
  getProvinceName(id: number | null | undefined): string {
    const p = (this.provinces || []).find((x: any) => x.value === id);
    return p?.label ?? '';
  }

  /**
   * Gets the name of a city from its ID.
   * @param {number | null | undefined} id - The city ID.
   * @returns {string} The city name.
   */
  getCityName(id: number | null | undefined): string {
    const c = (this.cities || []).find((x: any) => x.value === id);
    return c?.label ?? '';
  }

  /**
   * Gets the name of a neighborhood from its ID.
   * @param {number | null | undefined} id - The neighborhood ID.
   * @returns {string} The neighborhood name.
   */
  getNeighborhoodName(id: number | null | undefined): string {
    const n = (this.neighborhoods || []).find((x: any) => x.value === id);
    return n?.label ?? '';
  }

  /**
   * Gets the name of a section from the cached área data.
   * @param {number} areaId - The ID of the área.
   * @param {number} sectionId - The ID of the section.
   * @returns {string} The section name, or a fallback string if not found.
   */
  getSectionName(areaId: number, sectionId: number): string {
    const area = (this.areasCache || []).find(a => a.id === areaId);
    const section = area?.sections?.find(s => s.id === sectionId);
    return section?.name || `ID: ${sectionId}`;
  }

  /**
   * Gets the name of the responsible user from the user list.
   * @param {number} id - The ID of the responsible user.
   * @returns {string} The full name of the user, or the ID if not found.
   */
  getResponsibleName(id: number): string {
    if (!id) return '-';
    const user = this.users.find(u => u.id === id);
    return user ? `${user.firstName} ${user.lastName}` : String(id);
  }
}
