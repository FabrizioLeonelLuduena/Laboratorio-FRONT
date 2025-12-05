import { Component, inject, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';


import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import {
  GenericFormComponent, GenericFormField
} from '../../../../../shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from '../../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../../shared/services/page-title.service';
import { InsurerCompleteResponseDTO, InsurerUpdateRequestDTO } from '../../../models/insurer.model';
import { PrivateHealthDataDTO, SocialHealthDataDTO, SpecificDataDTO } from '../../../models/specific-data-model';
import { InsurerService } from '../../../services/insurer.service';


/**
 * FormMode type: possible modes for the form (view, edit, create)
 */
type FormMode = 'view' | 'edit' | 'create';

/**
 * @component InsurerInfoComponent
 *
 * Displays and edits insurer information. Handles dynamic form fields based on insurer type.
 * All comments and documentation are in English as requested.
 */
@Component({
  selector: 'app-insurer-info',
  imports: [
    GenericFormComponent,
    GenericButtonComponent,
    GenericAlertComponent
  ],
  templateUrl: './insurer-info.component.html',
  styleUrls: ['./insurer-info.component.css']
})
export class InsurerInfoComponent implements OnInit {
  private breadcrumbService = inject(BreadcrumbService);
  private pageTitleService = inject(PageTitleService);
  private route = inject(ActivatedRoute);

  @Input() insurerId!: number;
  insurer!: InsurerCompleteResponseDTO;

  edit = false;
  showDeleteModal = false;
  editMode: FormMode = 'view';
  saving = false;
  private initialValueCache: Record<string, any> | null = null;

  /** Controls component alerts */
  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;

  @ViewChild(GenericFormComponent) genericForm!: GenericFormComponent;

  /**
   * Constructor
   */
  constructor(
    private insurerService: InsurerService) {
  }

  /**
   * Currently visible fields in the insurer form.
   * Initialized with base fields and can be dynamically modified
   * according to the selected insurer type (Private, Social, Self-Pay).
   */
  insurerFields: GenericFormField[] = this.baseFields();

  /**
   * Base fields for the insurer form
   */
  private baseFields(): GenericFormField[] {
    return [
      {
        name: 'code',
        label: 'Código',
        type: 'text',
        required: true,
        pattern: '^[A-Z0-9]{2,20}$',
        colSpan: 1, maxLength: 20
      },
      { name: 'name', label: 'Nombre', type: 'text', required: true, colSpan: 1, minLength: 3, maxLength: 100 },
      { name: 'acronym', label: 'Sigla', type: 'text', required: true, colSpan: 1 },
      {
        name: 'insurerType',
        label: 'Tipo de Cobertura',
        type: 'select',
        required: true,
        colSpan: 1,
        options: [
          { label: 'Prepaga', value: 'PRIVATE' },
          { label: 'Obra Social', value: 'SOCIAL' },
          { label: 'Particular', value: 'SELF_PAY' }
        ]
      },
      {
        name: 'autorizationUrl',
        label: 'URL Autorización',
        type: 'url',
        pattern: '^(https?:\\/\\/)[^\\s]+$',
        colSpan: 2,
        maxLength: 255,
        messages: {
          pattern: 'La URL debe comenzar con http:// o https://'
        }
      },
      { name: 'description', label: 'Descripción', type: 'textarea', rows: 2, colSpan: 4, maxLength: 255 }
    ];
  }

  /**
   * Extra fields for the form according to insurer type.
   * Field names follow the backend DTO structure: specificData.[type].[field]
   */
  private extrasByTypeId: Record<string, GenericFormField[]> = {
    // === Prepaga (private_health) ===
    'PRIVATE': [
      {
        name: 'cuit',
        label: 'CUIT',
        type: 'text',
        required: true,
        colSpan: 1,
        pattern: '^(\\d{2}-?\\d{8}-?\\d{1})$',
        messages: { pattern: 'Debe tener 11 caracteres' }
      }
    ],
    // === Obra social (social_health) ===
    'SOCIAL': [
      {
        name: 'cuit',
        label: 'CUIT',
        type: 'text',
        required: true,
        colSpan: 1,
        pattern: '^(\\d{2}-?\\d{8}-?\\d{1})$',
        messages: { pattern: 'Debe tener 11 caracteres' }
      }
    ],
    // === Particular (self_pay) ===
    'SELF_PAY': [
    ]
  };

  /**
   * Returns the list of fields in the form
   */
  get fields(): GenericFormField[] {
    return this.insurerFields;
  }

  /**
   * Dynamic title for the form
   */
  get title(): string {
    return this.editMode === 'view'
      ? 'Detalle'
      : this.editMode === 'edit'
        ? 'Editar'
        : 'Nueva';
  }

  /**
   * Returns the initial values for the form
   */
  get initialValue(): Record<string, any> | null {
    return this.initialValueCache;
  }

  /**
   * Normalizes form values before sending
   */
  private normalize(v: Record<string, any>) {
    const out: Record<string, any> = { ...v };
    const toUpper = ['code', 'acronym'];
    const toTrim = ['name', 'description'];
    for (const k of toUpper) if (typeof out[k] === 'string') out[k] = out[k].trim().toUpperCase();
    for (const k of toTrim) if (typeof out[k] === 'string') out[k] = out[k].trim();
    return out;
  }

  /**
   * Lifecycle initialization logic
   */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Ver Cobertura');
    this.breadcrumbService.buildFromRoute(this.route);
    this.loadInsurer();
    // this.loadContacts();
  }

  /**
   * Handles logic for editing an insurer.
   */
  onSubmitUpdate(formValue: Record<string, any>): void {
    if (this.editMode === 'view' || !this.insurer?.id) return;

    this.saving = true;
    const normalized = this.normalize(formValue);

    const payload: InsurerUpdateRequestDTO = {
      id: this.insurer.id,
      code: normalized['code'],
      name: normalized['name'],
      acronym: normalized['acronym'],
      insurerType: normalized['insurerType'],
      description: normalized['description'],
      autorizationUrl: normalized['autorizationUrl'],
      // Re-estructuramos los datos específicos a su forma anidada
      specificData: this.structureSpecificData(normalized, normalized['insurerType'])
    };

    this.insurerService.update(payload).subscribe({
      next: () => {
        this.saving = false;
        this.toggleEdit('view');
        this.loadInsurer(); // Recargamos para tener los datos más recientes
        this.showAlert('success', 'Cobertura actualizada correctamente.');
      },
      error: () => {
        this.saving = false;
        this.showAlert('error', 'No se pudo actualizar la aseguradora.');
      }
    });
  }

  /**
   * Takes flat form data and creates the nested structure
   * `specificData` expected by the backend.
   */
  private structureSpecificData(formValue: Record<string, any>, type: string): SpecificDataDTO | null {
    const data = {} as SpecificDataDTO;

    switch (type) {
    case 'PRIVATE': // Prepaga
      data.privateHealth = {
        cuit: formValue['cuit'],
        copay_policy: formValue['copay_policy']
      } as PrivateHealthDataDTO;
      break;
    case 'SOCIAL': // Obra Social
      data.socialHealth = {
        cuit: formValue['cuit']
      } as SocialHealthDataDTO;
      break;
    case 'SELF_PAY': // Particular
      data.selfPay = {
        accepted_payment_methods: formValue['accepted_payment_methods']
      };
      break;
    default:
      return null;
    }
    return data;
  }


  /**
   * Loads complete insurer data and prepares it for the form.
   */
  loadInsurer(): void {
    this.insurerService.getCompleteById(this.insurerId).subscribe({
      next: (data) => {
        this.insurer = data;
        // Aplanamos los datos para que el formulario genérico los entienda
        this.initialValueCache = this.flattenInsurerDataForForm(data);
        this.refreshFields();
      },
      error: () => {
        // TODO: Mostrar mensaje de error al usuario
      }
    });
  }

  /**
   * Converts the nested `specificData` structure from the backend
   * into a flat object for the form.
   */
  private flattenInsurerDataForForm(data: InsurerCompleteResponseDTO): Record<string, any> {
    const flatData: Record<string, any> = {
      code: data.code,
      name: data.name,
      acronym: data.acronym,
      insurerType: data.insurerType,
      autorizationUrl: data.autorizationUrl,
      description: data.description
    };

    // Only flatten the specific data that matches the insurer type
    if (data.specificData) {
      switch (data.insurerType) {
      case 'PRIVATE':
        if (data.specificData.privateHealth) {
          Object.assign(flatData, data.specificData.privateHealth);
        }
        break;
      case 'SOCIAL':
        if (data.specificData.socialHealth) {
          Object.assign(flatData, data.specificData.socialHealth);
        }
        break;
      case 'SELF_PAY':
        if (data.specificData.selfPay) {
          Object.assign(flatData, data.specificData.selfPay);
        }
        break;
      }
    }
    return flatData;
  }

  /**
   * Changes the display or edit mode.
   */
  toggleEdit(mode: FormMode): void {
    this.editMode = mode;
    this.refreshFields();
    if (mode === 'view' && this.genericForm) {
      // Si cancelamos, reseteamos el form a sus valores iniciales
      this.genericForm.form.reset(this.initialValueCache);
    }
  }

  /**
   * Generic alert for editing
   */
  private showAlert(type: 'success' | 'error' | 'warning', text: string): void {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), 3000);
  }

  /**
   * Refreshes the visual state and enabled/disabled status of form fields.
   */
  private refreshFields(): void {
    const isView = this.editMode === 'view';
    const isEdit = this.editMode === 'edit';
    const type = this.initialValueCache ? this.initialValueCache['insurerType'] : '';

    const base = this.baseFields();
    const extras = this.extrasByTypeId[type] ?? [];

    const topFields = base.filter(f => ['code', 'name', 'acronym', 'insurerType'].includes(f.name));
    const dynamicFields = extras;
    const bottomFields = base.filter(f => ['autorizationUrl', 'description'].includes(f.name));

    const orderedFields = [...topFields, ...dynamicFields, ...bottomFields];

    this.insurerFields = orderedFields.map(f => ({
      ...f,
      disabled: isView || (isEdit && f.name === 'insurerType')
    }));
  }
}
