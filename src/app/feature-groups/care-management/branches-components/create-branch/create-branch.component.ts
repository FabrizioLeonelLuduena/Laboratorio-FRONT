import { HttpResponse } from '@angular/common/http';
import { Component, ViewChild, OnDestroy, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { StepperModule } from 'primeng/stepper';
import { Subscription, forkJoin } from 'rxjs';
import { AreaSectionManagerComponent, AreaSectionOutput } from 'src/app/feature-groups/care-management/branches-components/area-section-manager/area-section-manager.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField, GenericSelectOption } from '../../../../shared/components/generic-form/generic-form.component';
import { BranchService as BillingBranchService } from '../../../billing-collections/cash-management/application/branch.service';
import { LocationsService } from '../../../procurement-inventory/services/locations.service';
import { InternalUser } from '../../../user-management/models/InternalUser';
import { UserService } from '../../../user-management/services/user.service';
import { AreaResponse } from '../../models/area.models';
import { BranchRequest } from '../../models/branch-request';
import { AreaService } from '../../services/area.service';
import { BranchService } from '../../services/branch.service';
import { SupportService } from '../../services/support.service';

/**
 * @Component
 * @description Component for creating a new branch through a multi-step wizard.
 * It handles data collection for branch details, address, schedules, contacts, and area/section associations.
 * Upon successful branch creation, it also triggers the creation of associated cash registers.
 */
@Component({
  selector: 'app-create-branch',
  standalone: true,
  imports: [
    GenericFormComponent,
    StepperModule,
    GenericAlertComponent,
    FormsModule,
    AreaSectionManagerComponent,
    GenericButtonComponent
  ],
  templateUrl: './create-branch.component.html',
  styleUrls: ['./create-branch.component.css']
})
export class CreateBranchComponent implements OnInit, AfterViewInit, OnDestroy {
  /** A reference to the main branch data form component. */
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
    { label: 'Sucursal y dirección', icon: 'pi pi-building' },
    { label: 'Horarios', icon: 'pi pi-clock' },
    { label: 'Contactos', icon: 'pi pi-phone' },
    { label: 'Áreas y secciones', icon: 'pi pi-sitemap' },
    { label: 'Confirmar', icon: 'pi pi-check' }
  ];

  /** Options for the contact type dropdown. */
  contactTypes: GenericSelectOption[] = [
    { label: 'Telefono', value: 'PHONE' },
    { label: 'Whatsapp', value: 'WHATSAPP' },
    { label: 'Email', value: 'EMAIL' }
  ];
  /** Options for the schedule type dropdown. */
  scheduleTypes: GenericSelectOption[] = [
    { label: 'Atención', value: 'ATTENTION' },
    { label: 'Extracción', value: 'EXTRACTION' },
    { label: 'Regular', value: 'REGULAR' },
    { label: 'Urgencias', value: 'URGENCIES' }
  ];
  /** Options for the day of the week dropdowns. */
  days: GenericSelectOption[] = [
    { label: 'Lunes', value: 'Monday' },
    { label: 'Martes', value: 'Tuesday' },
    { label: 'Miercoles', value: 'Wednesday' },
    { label: 'Jueves', value: 'Thursday' },
    { label: 'Viernes', value: 'Friday' },
    { label: 'Sábado', value: 'Saturday' },
    { label: 'Domingo', value: 'Sunday' }
  ];
  /** Options for the area type dropdown. */
  areaTypes: GenericSelectOption[] = [
    { label: 'Química clínica', value: 'Quimica_Clinica' },
    { label: 'Hematología hemostasia', value: 'Hematologia_Hemostasia' },
    { label: 'Nefrología', value: 'Nefrologia' },
    { label: 'Medio Interno', value: 'Medio_Interno' },
    { label: 'Endocrinología/virología', value: 'Endocrinologia_Virologia' },
    { label: 'Microbiología', value: 'Microbiologia' },
    { label: 'Inmunología/serología', value: 'Inmunologia_Serologia' },
    { label: 'Lace', value: 'Lace' },
    { label: 'Sanatorio Allende', value: 'Sanatorio_Allende' },
    { label: 'Fundación para el progreso de la medicina', value: 'Fundacion_para_el_progreso_de_la_medicina' },
    { label: 'Manlab', value: 'Manlab' },
    { label: 'Otro', value: 'Otro' }
  ];

  /** Options for the province dropdown, loaded from the API. */
  provinces: GenericSelectOption[] = [];
  /** Flag to indicate when province data has been loaded, used to delay form rendering. */
  provincesLoaded = false;
  /** Options for the city dropdown, loaded dynamically based on province selection. */
  cities: GenericSelectOption[] = [];
  /** Options for the neighborhood dropdown, loaded dynamically based on city selection. */
  neighborhoods: GenericSelectOption[] = [];
  /** Options for the responsible dropdown, loaded from the API. */
  responsibles: GenericSelectOption[] = [];

  /** Form field definitions for the main branch form. */
  branchFields: GenericFormField[] = [];
  /** Form field definitions for the address form. */
  addressFields: GenericFormField[] = [];
  /** Combined form fields for step 0 (branch + address). */
  step0Fields: GenericFormField[] = [];
  /** Form field definitions for the schedule item form. */
  scheduleItemFields: GenericFormField[] = [];
  /** Form field definitions for the contact item form. */
  contactItemFields: GenericFormField[] = [];

  /** The list of schedules added by the user. */
  schedulesList: any[] = [];
  /** The list of contacts added by the user. */
  contactsList: any[] = [];

  /** The current data from the area/section manager component. */
  areaSectionData: AreaSectionOutput | null = null;
  /** A draft of the area/section data, saved when navigating between steps. */
  areaSectionDraft: AreaSectionOutput | null = null;

  /** A cache of available areas to avoid re-fetching data. */
  private availableAreasCache: any[] = [];

  /** A list of internal users to populate the 'responsible' dropdown. */
  private users: InternalUser[] = [];

  /** State for the floating alert message. */
  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;

  /** A snapshot of the main branch data for the confirmation step. */
  branchData: any = {};
  /** A snapshot of the address data for the confirmation step. */
  addressData: any = {};
  /** A draft of the schedule item form, saved when navigating away. */
  scheduleDraft: any = {};
  /** A draft of the contact item form, saved when navigating away. */
  contactDraft: any = {};

  /** Delay in milliseconds before redirecting after a successful submission. */
  private REDIRECT_DELAY_MS = 800;
  /** A collection of general subscriptions to be cleaned up on destroy. */
  private subs: Subscription[] = [];
  /** A collection of address-related subscriptions to be cleaned up on destroy. */
  private addressSubs: Subscription[] = [];
  private initialLocationSet = false;
  /** Subscriptions for time coersion watchers (schedule form). */
  private scheduleSubs: Subscription[] = [];

  /**
   * Dependencies injection
   * @constructor
   * @param {SupportService} supportService - Service for fetching support data (provinces, cities).
   * @param {BranchService} branchService - Service for branch-related operations in the care-management context.
   * @param {AreaService} areaService - Service for area-related operations.
   * @param {Router} router - Angular's router for navigation.
   * @param {BreadcrumbService} breadcrumbService - Service for managing breadcrumbs.
   * @param {ChangeDetectorRef} cdr - Angular's change detector for manual UI updates.
   * @param {BillingBranchService} billingBranchService - Service for branch-related operations in the billing context.
   * @param {UserService} userService - Service for user-related operations.
   */
  constructor(
    private supportService: SupportService,
    private branchService: BranchService,
    private areaService: AreaService,
    private router: Router,
    private breadcrumbService: BreadcrumbService,
    private cdr: ChangeDetectorRef,
    private billingBranchService: BillingBranchService,
    private userService: UserService,
    private locationsService: LocationsService
  ) {
    this.buildFields();
    // Use time pickers for schedule times in stepper
    this.scheduleItemFields = (this.scheduleItemFields || []).map(f =>
      (f.name === 'scheduleFromTime' || f.name === 'scheduleToTime')
        ? { ...f, type: 'date', showTime: true, hideDate: true, placeholder: undefined, pattern: undefined }
        : f
    );
    this.addressData = {};
    this.loadProvinces();
    this.loadResponsibles();
  }

  /**
   * This method executes when the component initialize
   * @method ngOnInit
   * @description Angular lifecycle hook that runs once on component initialization.
   * Sets the breadcrumb for the page.
   */
  ngOnInit(): void {
    this.breadcrumbService.setFromString('Gestión interna > Sucursales > Crear', '/care-management/branches');
  }

  /**
   * Angular lifecycle hook that runs after view initialization.
   * Initializes form watchers for step 0 when the form is ready.
   * @method ngAfterViewInit
   */
  ngAfterViewInit(): void {
    // Initialize watchers after the view is initialized
    setTimeout(() => {
      if (this.activeStep === 0) {
        this.initStep0FormWatchers();
        this.initAddressWatchers();
      }
    }, 0);
  }

  /**
   * Angular lifecycle hook that runs when the component is destroyed.
   * Unsubscribes from all active subscriptions to prevent memory leaks.
   * @method ngOnDestroy
   */
  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.addressSubs.forEach(s => s.unsubscribe());
    this.scheduleSubs.forEach(s => s.unsubscribe());
  }

  /**
   * Initializes the form field configurations for all steps.
   * @private
   * @method buildFields
   */
  private buildFields() {
    this.branchFields = [
      { name: 'code', label: 'Código', type: 'text', required: true },
      { name: 'description', label: 'Descripción', type: 'text', required: true },
      { name: 'responsibleId', label: 'Responsable', type: 'select', required: true, options: this.responsibles },
      { name: 'boxCount', label: 'Cantidad de boxes de extraccion', type: 'number', min: 0, max: 10, required: true, pattern: /^[0-9]\d*$/, messages: { max: 'El máximo de boxes de extracion permitido es 10.' } },
      { name: 'assistantDesk', label: 'Cantidad de boxes de atención', type: 'number', min: 1, max: 10, required: true, pattern: /^[1-9]\d*$/, messages: { max: 'El máximo de boxes de atención permitido es 10.' } },
      { name: 'registerCount', label: 'Cantidad de cajas', type: 'number', min: 0, max: 10, required: true, pattern: /^[0-9]\d*$/, messages: { max: 'El máximo de cajas permitido es 10.' } }
    ];
    this.addressFields = [
      { name: 'streetName', label: 'Calle', type: 'text', required: true },
      { name: 'streetNumber', label: 'Número', type: 'text', required: true, pattern: /^(0|[1-9]\d*)$/ },
      { name: 'postalCode', label: 'Código Postal', type: 'text', required: true },
      { name: 'provinceId', label: 'Provincia', type: 'select', required: true, options: this.provinces },
      { name: 'cityId', label: 'Ciudad', type: 'select', required: true, options: this.cities },
      { name: 'neighborhoodId', label: 'Barrio', type: 'select', required: true, options: this.neighborhoods }
    ];

    // Combine both forms into one for step 0
    this.step0Fields = [...this.branchFields, ...this.addressFields];
    this.scheduleItemFields = [
      { name: 'scheduleType', label: 'Tipo de atención', type: 'select', options: this.scheduleTypes, required: true },
      { name: 'dayFrom', label: 'Primer día', type: 'select', options: this.days, required: true },
      { name: 'dayTo', label: 'Último día', type: 'select', options: this.days, required: true },
      { name: 'scheduleFromTime', label: 'Hora de inicio', type: 'text', placeholder: 'HH:mm', required: true, pattern: /^([01]\d|2[0-3]):([0-5]\d)$/ },
      { name: 'scheduleToTime', label: 'Hora de fin', type: 'text', placeholder: 'HH:mm', required: true, pattern: /^([01]\d|2[0-3]):([0-5]\d)$/ }
    ];
    this.contactItemFields = [
      { name: 'contactType', label: 'Tipo', type: 'select', options: this.contactTypes, required: true },
      { name: 'contact', label: 'Contacto', type: 'text', required: true }
    ];
  }


  /**
   * Fetches the list of internal users to be assigned as responsible for the branch.
   * Populates the 'responsible' dropdown in the branch form.
   * @private
   * @method loadResponsibles
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
      },
      error: (_err) => {
        this.showAlert('error', 'Error al cargar los responsables.');
      }
    });
  }
  /**
   * Sets the options for a specific dropdown in the address form.
   * @method setAddressFieldOptions
   * @param {string} name - The name of the form field.
   * @param {GenericSelectOption[]} options - The array of options to set.
   * @private
   */
  private setAddressFieldOptions(name: string, options: GenericSelectOption[]) {
    const addressField = this.addressFields.find(f => f.name === name);
    if (addressField) addressField.options = options;

    // Also update in step0Fields (combined array)
    const step0Field = this.step0Fields.find(f => f.name === name);
    if (step0Field) step0Field.options = options;
  }

  /**
   * Fetches the list of provinces from the API and initializes the address form watchers.
   * @method loadProvinces
   * @private
   */
  private loadProvinces() {
    this.supportService.getAllProvinces().subscribe({
      next: (result) => {
        this.provinces = (result || []).map((p: any) => ({ label: p.provinceName, value: p.provinceId }));
        this.setAddressFieldOptions('provinceId', this.provinces);
        this.provincesLoaded = true;
        this.cdr.detectChanges();
        this.initStep0FormWatchers();
        this.initAddressWatchers();

        if (!this.initialLocationSet) {
          const cordobaProvince = this.provinces.find(p => p.label.toLowerCase() === 'córdoba');
          if (cordobaProvince) {
            const cordobaProvinceId = cordobaProvince.value;
            this.addressData.provinceId = cordobaProvinceId;
            this.fetchCities(cordobaProvinceId, () => {
              const cordobaCity = this.cities.find(c => c.label.toLowerCase() === 'córdoba');
              if (cordobaCity) {
                const cordobaCityId = cordobaCity.value;
                this.addressData.cityId = cordobaCityId;
                this.branchForm?.control('provinceId')?.setValue(cordobaProvinceId, { emitEvent: true });
                this.branchForm?.control('cityId')?.setValue(cordobaCityId, { emitEvent: true });
                this.fetchNeighborhoods(cordobaCityId);
              }
            });
            this.initialLocationSet = true;
          }
        } else if (this.addressData.provinceId) {
          this.fetchCities(this.addressData.provinceId, () => {
            if (this.branchForm) this.branchForm.control('cityId')?.setValue(this.addressData.cityId, { emitEvent: false });
            if (this.addressData.cityId) {
              this.fetchNeighborhoods(this.addressData.cityId, () => {
                if (this.branchForm) this.branchForm.control('neighborhoodId')?.setValue(this.addressData.neighborhoodId, { emitEvent: false });
              });
            }
          });
        }
      },
      error: () => {
        // Mostrar igualmente el formulario de dirección aun sin datos cargados
        this.provincesLoaded = true;
        this.cdr.detectChanges();
        // Inicializar watchers básicos para que el form reaccione cuando se carguen datos luego
        this.initStep0FormWatchers();
        this.initAddressWatchers();
        // El usuario verá selects vacíos; seguirá sin poder avanzar hasta completar
      }
    });
  }

  /**
   * Fetches cities for a given province ID.
   * @method fetchCities
   * @param {number} provinceId - The ID of the province.
   * @param {() => void} [onComplete] - Optional callback to run after fetching is complete.
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
   * @method fetchNeighborhoods
   * @param {number} cityId - The ID of the city.
   * @param {() => void} [onComplete] - Optional callback to run after fetching is complete.
   * @private
   */
  private fetchNeighborhoods(cityId: number, onComplete?: () => void) {
    this.branchForm?.control('neighborhoodId')?.disable({ emitEvent: false });
    this.supportService.getNeighborhoodByCityId(cityId).subscribe({
      next: (result) => {
        this.neighborhoods = (result || []).map((n: any) => ({ label: n.neighborhoodName, value: n.neighborhoodId }));
        this.setAddressFieldOptions('neighborhoodId', this.neighborhoods);
        this.branchForm?.control('neighborhoodId')?.enable({ emitEvent: false });
        if (onComplete) onComplete();
      }
    });
  }

  /**
   * Navigates to a specific step in the stepper.
   * @method goTo
   * @param {number} step - The index of the step to navigate to.
   */
  goTo(step: number) {
    this.saveStepDraft(this.activeStep);
    this.activeStep = step;
    if (step === 0) {
      setTimeout(() => {
        this.initAddressWatchers();
        this.initStep0FormWatchers();
      });
    }
    setTimeout(() => this.restoreStepDraft(step));
  }

  /**
   * Handles the step change event from the stepper component.
   * @method onStepChange
   * @param {number} nextIndex - The index of the next step.
   */
  onStepChange(nextIndex: number) {
    this.saveStepDraft(this.activeStep);
    this.activeStep = nextIndex;
    if (nextIndex === 0) {
      setTimeout(() => {
        this.initAddressWatchers();
        this.initStep0FormWatchers();
      });
    }
    setTimeout(() => this.restoreStepDraft(nextIndex));
  }

  /**
   * Saves the current form data into a draft object before navigating to another step.
   * @method saveStepDraft
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
        this.areaSectionDraft = {
          workspaces: this.areaSectionManager.selectedWorkspaces(),
          newAreas: this.areaSectionManager.newAreas()
        };
      }
    }
  }

  /**
   * Restores form data from a draft object when returning to a step.
   * @method restoreStepDraft
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
      // Set up keyboard time coercion after form exists
      this.initScheduleTimeCoercion();
    } else if (stepIndex === 2 && this.contactForm?.form) {
      if (this.contactDraft && Object.keys(this.contactDraft).length) {
        this.contactForm.form.patchValue(this.contactDraft, { emitEvent: false });
      }
    } else if (stepIndex === 3) {
      if (this.areaSectionDraft) this.areaSectionData = this.areaSectionDraft;
    }
  }

  /**
   * Validates the current step and advances to the next one.
   * @method nextStep
   */
  nextStep() {
    if (this.isNextDisabled) {
      this.showStepValidationAlert();
      this.markCurrentStepTouched();
      return;
    }
    const nextStepIndex = Math.min(this.activeStep + 1, this.steps.length - 1);
    if (nextStepIndex === 4 && this.areaSectionManager) {
      this.availableAreasCache = this.areaSectionManager.availableAreas();
      this.areaSectionData = {
        workspaces: this.areaSectionManager.selectedWorkspaces(),
        newAreas: this.areaSectionManager.newAreas()
      };
    }
    this.maxStepReached = Math.max(this.maxStepReached, nextStepIndex);
    this.goTo(nextStepIndex);
  }

  /**
   * A getter that determines if the "Next" button should be disabled based on the current step's validity.
   * @property isNextDisabled
   * @returns {boolean} - True if the button should be disabled, false otherwise.
   */
  get isNextDisabled(): boolean {
    switch (this.activeStep) {
    case 0: return !this.branchForm?.form?.valid;
    case 1: if (!this.schedulesList.length) return true; return this.isDraftInvalid(this.scheduleForm);
    case 2: if (!this.contactsList.length) return true; return this.isDraftInvalid(this.contactForm);
    case 3: return !this.areaSectionManager?.isValid();
    default: return false;
    }
  }

  /**
   * Checks if a form has user input but is currently invalid.
   * @method isDraftInvalid
   * @param {GenericFormComponent} [formRef] - A reference to the form component.
   * @returns {boolean} - True if the draft is invalid, false otherwise.
   * @private
   */
  private isDraftInvalid(formRef?: GenericFormComponent): boolean {
    const form = formRef?.form;
    if (!form) return false;
    const raw = form.getRawValue?.() ?? {};
    if (!this.hasAnyValue(raw)) return false;
    return form.invalid;
  }

  /**
   * Recursively checks if an object has any non-empty, non-null, non-undefined values.
   * @method hasAnyValue
   * @param {any} obj - The object to check.
   * @returns {boolean} - True if any value is found, false otherwise.
   * @private
   */
  private hasAnyValue(obj: any): boolean {
    if (obj == null) return false;
    if (typeof obj !== 'object') return obj !== '' && obj !== undefined && obj !== null;
    return Object.values(obj).some(v => {
      if (v === false || v === 0) return true;
      if (Array.isArray(v)) return v.length > 0;
      if (v && typeof v === 'object') return this.hasAnyValue(v);
      return v !== '' && v !== undefined && v !== null;
    });
  }

  /**
   * Marks all form controls in the current step as "touched" to trigger validation messages.
   * @method markCurrentStepTouched
   * @private
   */
  private markCurrentStepTouched() {
    if (this.activeStep === 0) {
      if (this.branchForm?.form) {
        Object.keys(this.branchForm.form.controls).forEach(k => this.branchForm!.form!.controls[k].markAsTouched());
      }
      return;
    }
    const form = this.getFormByStep(this.activeStep);
    if (!form?.form) return;
    Object.keys(form.form.controls).forEach(k => form.form.controls[k].markAsTouched());
  }

  /**
   * Retrieves the form component reference for a given step index.
   * @method getFormByStep
   * @param {number} step - The index of the step.
   * @returns {GenericFormComponent | undefined} - The form component, or undefined if not applicable.
   * @private
   */
  private getFormByStep(step: number): GenericFormComponent | undefined {
    switch (step) {
    case 1: return this.scheduleForm;
    case 2: return this.contactForm;
    default: return undefined;
    }
  }

  /**
   * Displays a validation alert with a message relevant to the current step.
   * @method showStepValidationAlert
   * @private
   */
  private showStepValidationAlert() {
    let detail = 'Completá los campos requeridos o corregí el formato.';
    if (this.activeStep === 1) detail = this.schedulesList.length ? 'Corregí el horario. Formato de hora: HH:mm' : 'Agregá al menos un horario para continuar.';
    if (this.activeStep === 2) detail = this.contactsList.length ? 'Corregí el contacto.' : 'Agregá al menos un contacto para continuar.';
    if (this.activeStep === 3) detail = 'Seleccioná al menos una sección en alguna área.';
    this.showAlert('warning', detail);
  }

  /**
   * Initializes subscriptions to the address form's dropdowns to dynamically load dependent data.
   * @method initAddressWatchers
   * @private
   */
  private initAddressWatchers() {
    if (!this.branchForm) return;
    this.addressSubs.forEach(s => s.unsubscribe());
    this.addressSubs = [];
    if (!this.branchForm.control('cityId')?.value) this.branchForm.control('cityId')?.disable({ emitEvent: false });
    if (!this.branchForm.control('neighborhoodId')?.value) this.branchForm.control('neighborhoodId')?.disable({ emitEvent: false });
    const pSub = this.branchForm.control('provinceId')?.valueChanges.subscribe((provinceId: number) => {
      this.branchForm?.control('cityId')?.reset(null, { emitEvent: false });
      this.branchForm?.control('neighborhoodId')?.reset(null, { emitEvent: false });
      this.setAddressFieldOptions('cityId', []);
      this.setAddressFieldOptions('neighborhoodId', []);
      this.branchForm?.control('neighborhoodId')?.disable({ emitEvent: false });
      if (provinceId) this.fetchCities(provinceId);
      else this.branchForm?.control('cityId')?.disable({ emitEvent: false });
    });
    if (pSub) this.addressSubs.push(pSub);
    const cSub = this.branchForm.control('cityId')?.valueChanges.subscribe((cityId: number) => {
      this.branchForm?.control('neighborhoodId')?.reset(null, { emitEvent: false });
      this.setAddressFieldOptions('neighborhoodId', []);
      if (cityId) this.fetchNeighborhoods(cityId);
      else this.branchForm?.control('neighborhoodId')?.disable({ emitEvent: false });
    });
    if (cSub) this.addressSubs.push(cSub);
  }

  /**
   * Initializes subscriptions to the forms in the first step to trigger change detection.
   * @method initStep0FormWatchers
   * @private
   */
  private initStep0FormWatchers(): void {
    const branchFormSub = this.branchForm?.form?.valueChanges.subscribe(() => this.cdr.detectChanges());
    if (branchFormSub) this.subs.push(branchFormSub);
  }

  /**
   * Validates and adds a new schedule to the `schedulesList`.
   * @method addSchedule
   */
  addSchedule() {
    const form = this.scheduleForm?.form;
    if (!form || !form.valid) {
      form?.markAllAsTouched();
      this.showAlert('warning', 'Completá los campos requeridos del horario.');
      return;
    }
    const val = form.getRawValue();
    if (this.schedulesList.some(s => s.scheduleType === val.scheduleType)) {
      this.showAlert('warning', `El tipo de horario '${this.getScheduleTypeLabel(val.scheduleType)}' ya fue agregado.`);
      return;
    }
    const toMinutes = (t: any) => { const s = this.formatTime(t); if (!s) return NaN; const [h, m] = s.split(':').map(Number); return h * 60 + m; };
    if (toMinutes(val.scheduleFromTime) >= toMinutes(val.scheduleToTime)) {
      this.showAlert('warning', 'La hora de inicio debe ser menor que la hora de fin.');
      return;
    }
    if (!this.isValidDayRange(val.dayFrom, val.dayTo)) {
      this.showAlert('warning', 'Rango de días inválido. El primer día no puede ser posterior al último.');
      return;
    }
    const normalized = {
      ...val,
      scheduleFromTime: this.formatTime(val.scheduleFromTime),
      scheduleToTime: this.formatTime(val.scheduleToTime)
    };
    this.schedulesList = [...this.schedulesList, normalized];
    form.reset();
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
   * Removes a schedule from the list at the specified index.
   * @method removeScheduleAt
   * @param {number} index - The index of the schedule to remove.
   */
  removeScheduleAt(index: number) {
    this.schedulesList = this.schedulesList.filter((_, i) => i !== index);
  }

  /**
   * Validates and adds a new contact to the `contactsList`.
   * @method addContact
   */
  addContact() {
    const form = this.contactForm?.form;
    if (!form || !form.valid) {
      form?.markAllAsTouched();
      this.showAlert('warning', 'Seleccioná un tipo e ingresá el contacto.');
      return;
    }
    const val = form.getRawValue();
    const value = (val.contact || '').toString().trim();
    if (val.contactType === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      this.showAlert('warning', 'Ingresá un email válido (ej: usuario@ejemplo.com).');
      return;
    }
    if ((val.contactType === 'PHONE' || val.contactType === 'WHATSAPP')) {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15 || !/^[+]?[-()\d\s]{7,20}$/.test(value)) {
        this.showAlert('warning', 'Ingresá un teléfono válido (7-15 dígitos, puede incluir +, espacios, guiones).');
        return;
      }
    }
    this.contactsList = [...this.contactsList, val];
    form.reset();
  }

  /**
   * Removes a contact from the list at the specified index.
   * @method removeContactAt
   * @param {number} index - The index of the contact to remove.
   */
  removeContactAt(index: number) {
    this.contactsList = this.contactsList.filter((_, i) => i !== index);
  }

  /**
   * Handles the selection change event from the area/section manager.
   * @method onAreaSectionChange
   * @param {AreaSectionOutput} data - The data emitted from the manager component.
   */
  onAreaSectionChange(data: AreaSectionOutput): void {
    this.areaSectionData = data;
  }

  /**
   * Gathers all data, validates it, and submits it to create the new branch and associated entities.
   * @method onSubmitFinal
   * This method orchestrates multiple service calls in sequence.
   */
  onSubmitFinal() {
    if (this.areaSectionManager) {
      this.areaSectionData = {
        workspaces: this.areaSectionManager.selectedWorkspaces(),
        newAreas: this.areaSectionManager.newAreas()
      };
    }
    if (!this.schedulesList.length) { this.showAlert('warning', 'Agregá al menos un horario antes de guardar.'); this.activeStep = 1; return; }
    if (!this.contactsList.length) { this.showAlert('warning', 'Agregá al menos un contacto antes de guardar.'); this.activeStep = 2; return; }
    const hasValidWorkspace = this.areaSectionData?.workspaces?.some(w => w.sectionIds?.length > 0);
    const hasValidNewArea = this.areaSectionData?.newAreas?.some(a => a.sections?.length > 0);
    if (!this.areaSectionData || !(hasValidWorkspace || hasValidNewArea)) {
      this.showAlert('warning', 'Seleccioná al menos una sección en alguna área.');
      this.activeStep = 3;
      return;
    }

    const formValue = this.branchForm?.form?.getRawValue?.() ?? {};
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

    const branchPayload = { ...this.branchData, ...branchValues };
    const addressPayload = { ...this.addressData, ...addressValues };

    const responsibleUser = this.users.find(u => u.id === branchPayload.responsibleId);
    const responsibleName = responsibleUser ? `${responsibleUser.firstName} ${responsibleUser.lastName}` : '';

    const postBranchWithWorkspaces = (workspacesFinal: any[]) => {
      const branchRequest: BranchRequest = {
        code: branchPayload.code,
        description: branchPayload.description,
        schedules: (this.schedulesList || []).map((s: any) => ({ dayFrom: s.dayFrom, dayTo: s.dayTo, scheduleFromTime: this.formatTime(s.scheduleFromTime), scheduleToTime: this.formatTime(s.scheduleToTime), scheduleType: s.scheduleType })),
        responsible: { name: responsibleName, userId: branchPayload.responsibleId },
        address: { streetName: addressPayload.streetName, streetNumber: addressPayload.streetNumber, neighborhoodId: addressPayload.neighborhoodId, postalCode: addressPayload.postalCode, latitude: addressPayload.latitude, longitude: addressPayload.longitude },
        contacts: (this.contactsList || []).map((c: any) => ({ contactType: c.contactType, contact: c.contact })),
        workspaces: workspacesFinal,
        boxCount: branchPayload.boxCount,
        registerCount: branchPayload.registerCount,
        assistantDesk: branchPayload.assistantDesk
      };

      this.branchService.postBranch(branchRequest).subscribe({
        next: (response: HttpResponse<any>) => {
          this.showAlert('success', 'Sucursal creada correctamente.');

          let branchId: number | null = null;
          const locationHeader = response.headers.get('Location');

          if (locationHeader) {
            const urlParts = locationHeader.split('/');
            branchId = Number(urlParts[urlParts.length - 1]);
          } else if (response.body && typeof response.body === 'number') {
            branchId = response.body;
          } else if (response.body && response.body.id) {
            branchId = response.body.id;
          }

          if (branchId && branchPayload.registerCount > 0) {
            this.billingBranchService.createCashRegisters({
              branch_id: branchId,
              quantity: branchPayload.registerCount
            }).subscribe({
              next: () => {
                this.createBranchLocationAndRedirect(branchId, branchPayload.code);
              },
              error: () => {
                // No mostrar alerta por fallo de bulk/sync; sólo redirigir
                this.createBranchLocationAndRedirect(branchId, branchPayload.code);
              }
            });
          } else {
            this.createBranchLocationAndRedirect(branchId, branchPayload.code);
          }
        },
        error: (err) => this.handleError(err, 'Error al crear la sucursal.')
      });
    };

    const newAreas = this.areaSectionData.newAreas || [];
    if (newAreas.length > 0) {
      const postCalls = newAreas.map(a => this.areaService.postArea(a));
      forkJoin(postCalls).subscribe({
        next: (createdAreas: AreaResponse[]) => {
          const newWorkspaces = (createdAreas || []).map(ar => ({ areaId: ar.id, sectionIds: (ar.sections || []).map(s => s.id) }));
          const existingWorkspaces = (this.areaSectionData?.workspaces || []).filter(w => w && w.areaId != null && (w.sectionIds?.length || 0) > 0).map(w => ({ areaId: w.areaId, sectionIds: w.sectionIds }));
          postBranchWithWorkspaces([...existingWorkspaces, ...newWorkspaces]);
        },
        error: (err) => this.handleError(err, 'Error al crear las áreas.')
      });
    } else {
      const existingWorkspaces = (this.areaSectionData.workspaces || []).filter(w => w && w.areaId != null && (w.sectionIds?.length || 0) > 0).map(w => ({ areaId: w.areaId, sectionIds: w.sectionIds }));
      postBranchWithWorkspaces(existingWorkspaces);
    }
  }

  /**
   * Method to create a location to the created branch.
   * @param branchId
   * @param branchCode
   * @private
   */
  private createBranchLocationAndRedirect(branchId: number | null, branchCode: string) {
    if (branchId) {
      this.locationsService.createBranchLocation(branchId, branchCode).subscribe({
        next: () => {
          this.redirectAfterSuccess();},
        error: (err) => {
          this.handleError(err, 'Error al crear la ubicación de la sucursal en el sistema de inventario.');
          this.redirectAfterSuccess();
        }
      });
    } else {
      this.redirectAfterSuccess();
    }
  }

  /**
   * Navigates the user back to the branches list after a delay.
   * @method redirectAfterSuccess
   * @private
   */
  private redirectAfterSuccess() {
    setTimeout(() => this.router.navigate(['/care-management/branches']), this.REDIRECT_DELAY_MS);
  }

  /**
   * Displays an error alert with a specific message.
   * @method handleError
   * @param {any} err - The error object.
   * @param {string} fallbackMsg - A fallback message to display if the error object has no message.
   * @private
   */
  private handleError(err: any, fallbackMsg: string) {
    const detail = err?.error?.errorMessage || err?.message || fallbackMsg;
    this.showAlert('error', detail);
  }

  /**
   * Navigates the user back to the main branches list.
   * @method onCancel
   */
  onCancel() {
    this.router.navigate(['/care-management/branches']);
  }

  /**
   * Formats a time value into a "HH:mm" string.
   * @method formatTime
   * @param {any} value - The time value to format.
   * @returns {string} - The formatted time string.
   * @private
   */
  private formatTime(value: any): string {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  /**
   * Gets the display label for a given value from an array of options.
   * @method getOptionLabel
   * @param {GenericSelectOption[]} [options=[]] - The array of options to search.
   * @param {any} value - The value to find the label for.
   * @returns {string} - The corresponding label, or the value as a string if not found.
   */
  getOptionLabel(options: GenericSelectOption[] = [], value: any): string {
    const found = options?.find(o => o.value === value);
    return found?.label ?? String(value ?? '');
  }


  /**
   * Gets the name of the responsible user from the user list.
   * @method getResponsibleName
   * @param {number} id - The ID of the responsible user.
   * @returns {string} - The full name of the user, or the ID if not found.
   */
  getResponsibleName(id: number): string {
    if (!id) return '-';
    const user = this.users.find(u => u.id === id);
    return user ? `${user.firstName} ${user.lastName}` : String(id);
  }

  /**
   * Gets the display label for a schedule type.
   * @method getScheduleTypeLabel
   * @param {any} value - The schedule type value.
   * @returns {string} - The display label.
   */
  getScheduleTypeLabel(value: any): string {
    return this.getOptionLabel(this.scheduleTypes, value);
  }

  /**
   * Gets the display label for a contact type.
   * @method getContactTypeLabel
   * @param {any} value - The contact type value.
   * @returns {string} - The display label.
   */
  getContactTypeLabel(value: any): string {
    return this.getOptionLabel(this.contactTypes, value);
  }

  /**
   * Gets the translated display label for a day of the week.
   * @method getTranslatedDay
   * @param {string} dayValue - The day value (e.g., 'Monday').
   * @returns {string} - The translated day name.
   */
  getTranslatedDay(dayValue: string): string {
    const found = this.days.find(d => d.value === dayValue);
    return found?.label ?? dayValue;
  }

  /** A map to define the order of the days of the week. */
  private dayOrder: Record<string, number> = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7 };

  /**
   * Checks if a given day range is valid (e.g., 'Monday' to 'Friday').
   * @method isValidDayRange
   * @param {string} [from] - The starting day.
   * @param {string} [to] - The ending day.
   * @returns {boolean} - True if the range is valid, false otherwise.
   * @private
   */
  private isValidDayRange(from?: string, to?: string): boolean {
    if (!from || !to) return false;
    const a = this.dayOrder[from] ?? Number.POSITIVE_INFINITY;
    const b = this.dayOrder[to] ?? Number.POSITIVE_INFINITY;
    return a <= b;
  }

  /**
   * Gets the name of a section from the cached area data.
   * @method getSectionName
   * @param {number} areaId - The ID of the area.
   * @param {number} sectionId - The ID of the section.
   * @returns {string} - The section name, or a fallback string if not found.
   */
  getSectionName(areaId: number, sectionId: number): string {
    const area = this.availableAreasCache.find((a: any) => a.id === areaId);
    const section = area?.sections.find((s: any) => s.id === sectionId);
    return section?.name || `Sección ${sectionId}`;
  }

  /**
   * Gets the display label for an area type.
   * @method getAreaTypeLabel
   * @param {string} type - The area type value.
   * @returns {string} - The display label.
   */
  getAreaTypeLabel(type: string): string {
    const areaType = this.areaTypes.find(t => t.value === type);
    return areaType ? areaType.label : type;
  }

  /**
   * Displays a floating alert message for a fixed duration.
   * @method showAlert
   * @param {'success' | 'error' | 'warning'} type - The type of alert.
   * @param {string} text - The message to display.
   * @private
   */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), type === 'error' ? 7000 : 3000);
  }
}
