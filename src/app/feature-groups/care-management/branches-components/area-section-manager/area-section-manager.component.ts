import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { TabViewModule } from 'primeng/tabview';
import { GenericFormComponent, GenericFormField, GenericSelectOption } from 'src/app/shared/components/generic-form/generic-form.component';

import { AreaRequest, AreaResponse } from '../../models/area.models';
import { SectionRequest } from '../../models/section.models';
import { AreaService } from '../../services/area.service';


/**
 * The event type from PrimeNG for MultiSelect's onChange
 */
interface MultiSelectOnChangeEvent {
  originalEvent: Event;
  value: any[];
  itemValue?: any;
}

/**
 * Workspace represents an area with its selected sections for the branch.
 */
export interface Workspace {
  areaId: number;
  areaName: string;
  sectionIds: number[];
  isNew?: boolean;
}

/**
 * Component output: combined existing workspaces and new areas to create.
 */
export interface AreaSectionOutput {
  workspaces: Workspace[];
  newAreas: AreaRequest[];
}

/**
 * Standalone component for managing areas and sections in a branch.
 * Supports both selecting existing areas and creating new ones.
 * Can be used in create/update branch flows or as a standalone page.
 */
@Component({
  selector: 'app-area-section-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabViewModule,
    DropdownModule,
    MultiSelectModule,
    ButtonModule,
    GenericFormComponent,
    ChipModule
    // Add ChipModule here
  ],
  templateUrl: './area-section-manager.component.html',
  styleUrls: ['./area-section-manager.component.css']
})
export class AreaSectionManagerComponent implements OnInit {
  @ViewChild('newAreaForm') newAreaForm?: GenericFormComponent;
  @ViewChild('newSectionForm') newSectionForm?: GenericFormComponent;

  /**
   * Initial workspaces (for update scenarios).
   * Parent can pass existing selections to pre-populate.
   */
  @Input() initialWorkspaces: Workspace[] = [];
  /**
   * Initial new areas (drafts) created in parent flow.
   * Allows restoring user-created areas when navigating between steps.
   */
  @Input() initialNewAreas: AreaRequest[] = [];

  /**
   * Whether to show the "Apply" button (useful when embedded in a stepper).
   * If false, changes are emitted immediately.
   */
  @Input() showApplyButton = false;
  /** When true, disables selecting new existing areas to add. */
  @Input() disableAddAreas = false;
  /** When true, blocks removing existing areas (emits blocked action). */
  @Input() disableRemoveAreas = false;
  /** When true, disables creating brand new areas in this UI. */
  @Input() disableCreateAreas = false;

  /**
   * Emits whenever the selection changes (if showApplyButton = false).
   */
  @Output() selectionChange = new EventEmitter<AreaSectionOutput>();

  /**
   * Emits when user clicks Apply button (if showApplyButton = true).
   */
  @Output() apply = new EventEmitter<AreaSectionOutput>();
  /** Emitted when a blocked action is attempted (e.g., remove area while disabled). */
  @Output() blockedAction = new EventEmitter<string>();

  // Available areas from backend
  availableAreas = signal<AreaResponse[]>([]);

  // Selected workspaces (existing areas)
  selectedWorkspaces = signal<Workspace[]>([]);

  // New areas to be created
  newAreas = signal<AreaRequest[]>([]);

  // Loading state
  loading = signal(false);

  // Area selection dropdown
  selectedAreaToAdd: number | null = null;
  areaOptions: { label: string; value: number; disabled?: boolean }[] = [];

  // New area form fields
  newAreaFields: GenericFormField[] = [];

  // New section form fields (for adding sections to new areas)
  newSectionFields: GenericFormField[] = [];

  // Temporary sections list for new area being created
  tempSections: SectionRequest[] = [];

  // Track which new area is being edited for sections
  editingNewAreaIndex: number | null = null;

  // Area type options
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

  yesNoOptions: GenericSelectOption[] = [
    { label: 'Sí', value: true },
    { label: 'No', value: false }
  ];

  /**
   * Getter for a safe, filtered list of workspaces.
   */
  get safeWorkspaces(): Workspace[] {
    return this.selectedWorkspaces().filter((w): w is Workspace => !!w);
  }

  /**
   * Constructor with AreaService injection.
   */
  constructor(private areaService: AreaService) {
    this.buildFormFields();
  }

  /**
   * Finds the section id corresponding to "Sin sección" for an area.
   */
  private findSinSeccionId(areaId: number): number | null {
    const area = this.availableAreas().find(a => a.id === areaId);
    const sin = area?.sections.find(s =>
      String(s.name).toLowerCase().includes('sin sección') ||
      String(s.name).toLowerCase().includes('sin seccion')
    );
    return sin ? sin.id : null;
  }

  /**
   * Ensures default selection is "Sin sección" when none selected.
   */
  private ensureDefaultSelection(workspace: Workspace): void {
    const hasAny = Array.isArray(workspace.sectionIds) && workspace.sectionIds.length > 0;
    if (!hasAny) {
      const sinId = this.findSinSeccionId(workspace.areaId);
      if (sinId !== null) {
        // Set default to "Sin sección" to avoid empty selection state on init
        workspace.sectionIds = [sinId];
      }
    }
  }

  /**
   * OnInit lifecycle hook: loads areas and initializes selections.
   */
  ngOnInit(): void {
    this.loadAreas();

    // Initialize with passed workspaces
    if (this.initialWorkspaces?.length) {
      const cloned = this.initialWorkspaces.map(w => ({ ...w }));
      cloned.forEach(w => this.ensureDefaultSelection(w));
      this.selectedWorkspaces.set(cloned);
    }
    // Initialize with passed new areas
    if (this.initialNewAreas?.length) {
      this.newAreas.set([...this.initialNewAreas]);
    }
  }

  /**
   * Builds form field configurations.
   */
  private buildFormFields(): void {
    this.newAreaFields = [
      { name: 'name', label: 'Nombre del área', type: 'text', required: true },
      { name: 'type', label: 'Tipo', type: 'select', options: this.areaTypes, required: true },
      { name: 'isExternal', label: '¿Es externa?', type: 'select', options: this.yesNoOptions, required: true }
    ];

    this.newSectionFields = [
      { name: 'name', label: 'Nombre de la sección', type: 'text', required: true }
    ];
  }

  /**
   * Loads all available areas from the API.
   */
  private loadAreas(): void {
    this.loading.set(true);
    this.areaService.getAllAreas().subscribe({
      next: (areas) => {
        this.availableAreas.set(areas || []);
        this.rebuildAreaOptions();
        this.loading.set(false);
        // Ensure default selection for existing workspaces now that areas are available
        const updated = this.selectedWorkspaces().map(w => ({ ...w }));
        updated.forEach(w => this.ensureDefaultSelection(w));
        this.selectedWorkspaces.set(updated);
        this.emitChange();
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  /**
   * Rebuilds area dropdown options based on availability and selection.
   */
  private rebuildAreaOptions(): void {
    const selectedIds = new Set(this.selectedWorkspaces().map(w => w.areaId));
    this.areaOptions = this.availableAreas().map(a => ({
      label: a.name,
      value: a.id,
      disabled: !a.isActive || selectedIds.has(a.id)
    }));
  }

  /**
   * Handles selecting an existing area to add.
   */
  onSelectAreaToAdd(): void {
    if (this.disableAddAreas) {
      this.blockedAction.emit('Agregar áreas no está disponible en este modo.');
      this.selectedAreaToAdd = null;
      return;
    }
    if (!this.selectedAreaToAdd) return;

    const areaId = this.selectedAreaToAdd;
    const area = this.availableAreas().find(a => a.id === areaId);

    if (!area) {
      this.selectedAreaToAdd = null;
      return;
    }

    // Check if already selected
    if (this.selectedWorkspaces().some(w => w.areaId === areaId)) {
      this.selectedAreaToAdd = null;
      return;
    }

    // Add to workspaces
    const newWorkspace: Workspace = {
      areaId,
      areaName: area.name,
      sectionIds: []
    };
    this.ensureDefaultSelection(newWorkspace);
    this.selectedWorkspaces.set([...this.selectedWorkspaces(), newWorkspace]);
    this.rebuildAreaOptions();
    this.selectedAreaToAdd = null;
    this.emitChange();
  }

  /**
   * Removes a workspace (existing area selection).
   */
  removeWorkspace(areaId: number): void {
    if (this.disableRemoveAreas) {
      this.blockedAction.emit('Eliminar áreas no está implementado en este menú.');
      return;
    }
    this.selectedWorkspaces.set(
      this.selectedWorkspaces().filter(w => w.areaId !== areaId)
    );
    this.rebuildAreaOptions();
    this.emitChange();
  }

  /**
   * Gets section options for a specific area, filtering out already selected sections.
   */
  getSectionOptionsForArea(workspace: Workspace): { label: string; value: number; disabled?: boolean }[] {
    const area = this.availableAreas().find(a => a.id === workspace.areaId);
    if (!area) return [];

    return area.sections
      .map(s => {
        const isSinSeccion = String(s.name).toLowerCase().includes('sin sección') || String(s.name).toLowerCase().includes('sin seccion');
        return {
          label: s.name,
          value: s.id,
          disabled: isSinSeccion ? true : !s.isActive
        };
      });
  }

  /**
   * Gets the name of a section for a given area.
   */
  getSectionName(areaId: number, sectionId: number): string {
    const area = this.availableAreas().find(a => a.id === areaId);
    const section = area?.sections.find(s => s.id === sectionId);
    return section?.name || `ID: ${sectionId}`;
  }

  /**
   * Handles section selection changes for existing areas.
   * Requirements:
   * - If user selects "Sin sección", clear all selections.
   * - If user toggles "Seleccionar todas", select all except "Sin sección".
   */
  onSectionChange(event: MultiSelectOnChangeEvent, workspace: Workspace): void {
    const applySelection = (ids: number[]) => {
      setTimeout(() => {
        workspace.sectionIds = ids;
        this.emitChange();
      }, 0);
    };

    const sinId = this.findSinSeccionId(workspace.areaId);
    const nextValues: number[] = Array.isArray(event?.value) ? event.value.map((v: any) => Number(v)) : [];
    const clickedValue = (event as any)?.itemValue;
    const prev: number[] = Array.isArray(workspace.sectionIds) ? workspace.sectionIds.map((v: any) => Number(v)) : [];

    // Si clickean "Sin sección" o fue activada en esta interacción → sólo "Sin sección"
    if (
      sinId !== null &&
      (clickedValue === sinId || (!prev.includes(sinId) && nextValues.includes(sinId)) || (nextValues.length === 1 && nextValues[0] === sinId))
    ) {
      applySelection([sinId]);
      return;
    }

    // Caso general: quitar "Sin sección" si aparece mezclado
    const cleaned = sinId !== null ? nextValues.filter(v => v !== sinId) : nextValues;

    // Si queda vacío (usuario desmarca la última) → activar "Sin sección" como default
    applySelection((cleaned.length === 0 && sinId !== null) ? [sinId] : cleaned);
  }

  /**
   * Enforces selection rules on ngModel change to avoid timing issues with PrimeNG.
   */
  onSectionModelChange(nextValuesRaw: any[], workspace: Workspace): void {
    const sinId = this.findSinSeccionId(workspace.areaId);
    const nextValues: number[] = Array.isArray(nextValuesRaw) ? nextValuesRaw.map((v: any) => Number(v)) : [];

    if (sinId !== null) {
      const withoutSin = nextValues.filter(v => v !== sinId);
      workspace.sectionIds = withoutSin.length === 0 ? [sinId] : withoutSin;
      this.emitChange();
      return;
    }

    workspace.sectionIds = nextValues;
    this.emitChange();
  }

  /**
   * Adds a new area to the list (without sections yet).
   */
  addNewArea(): void {
    if (this.disableCreateAreas) {
      this.blockedAction.emit('Crear áreas no está disponible en este menú.');
      return;
    }
    const form = this.newAreaForm?.form;
    if (!form || !form.valid) {
      form?.markAllAsTouched();
      return;
    }

    const values = form.getRawValue();
    const newArea: AreaRequest = {
      name: values.name,
      type: values.type,
      isExternal: values.isExternal,
      sections: []
    };

    this.newAreas.set([...this.newAreas(), newArea]);
    form.reset();
    this.emitChange();
  }

  /**
   * Removes a new area from the list.
   */
  removeNewArea(index: number): void {
    this.newAreas.set(this.newAreas().filter((_, i) => i !== index));
    this.emitChange();
  }

  /**
   * Opens the section editor for a new area.
   */
  editNewAreaSections(index: number): void {
    this.editingNewAreaIndex = index;
    this.tempSections = [...this.newAreas()[index].sections];
  }

  /**
   * Closes the section editor.
   */
  closeSectionEditor(): void {
    this.editingNewAreaIndex = null;
    this.tempSections = [];
  }

  /**
   * Adds a section to the temporary list.
   */
  addSectionToNewArea(): void {
    const form = this.newSectionForm?.form;
    if (!form || !form.valid) {
      form?.markAllAsTouched();
      return;
    }

    const values = form.getRawValue();
    this.tempSections = [...this.tempSections, { name: values.name }];
    form.reset();
  }

  /**
   * Removes a section from the temporary list.
   */
  removeSectionFromTemp(index: number): void {
    this.tempSections = this.tempSections.filter((_, i) => i !== index);
  }

  /**
   * Saves the sections to the new area being edited.
   */
  saveSectionsToNewArea(): void {
    if (this.editingNewAreaIndex === null) return;

    const updated = [...this.newAreas()];
    updated[this.editingNewAreaIndex].sections = [...this.tempSections];
    this.newAreas.set(updated);

    this.closeSectionEditor();
    this.emitChange();
  }

  /**
   * Gets the area type label for display.
   */
  getAreaTypeLabel(value: string): string {
    return this.areaTypes.find(t => t.value === value)?.label || value;
  }

  /**
   * Emits the current state if not using apply button.
   */
  private emitChange(): void {
    if (!this.showApplyButton) {
      this.selectionChange.emit(this.getCurrentOutput());
    }
  }

  /**
   * Handles apply button click.
   */
  onApply(): void {
    this.apply.emit(this.getCurrentOutput());
  }

  /**
   * Gets the current output data structure.
   */
  private getCurrentOutput(): AreaSectionOutput {
    return {
      workspaces: this.selectedWorkspaces(),
      newAreas: this.newAreas()
    };
  }

  /**
   * Validates that there's at least one area with sections selected.
   */
  isValid(): boolean {
    const hasValidWorkspace = this.selectedWorkspaces().some(w => w.sectionIds?.length > 0);
    const hasValidNewArea = this.newAreas().some(a => a.sections?.length > 0);
    return hasValidWorkspace || hasValidNewArea;
  }

  /**
   * Returns a label for the number of selected items, handling singular/plural.
   * @param count The number of selected items.
   * @returns A string like "1 seleccionada" or "X seleccionadas".
   */
  getSelectedItemsLabel(count: number): string {
    if (count === 0) {
      return 'Ninguna seleccionada';
    } else if (count === 1) {
      return '1 seleccionada';
    } else {
      return `${count} seleccionadas`;
    }
  }
}
