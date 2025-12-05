import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { GenericModalComponent } from 'src/app/shared/components/generic-modal/generic-modal.component';

import { NbuVersionService } from '../../../application/nbu-version.service';
import { NbuVersion } from '../../../domain/nbu-version.model';
import { NbuVersionNbuSelectorComponent } from '../nbu-version-nbu-selector/nbu-version-nbu-selector.component';

/**
 * Formulario de edición/creación de versiones NBU
 * Permite seleccionar una versión existente o crear una nueva
 */
@Component({
  selector: 'app-nbu-version-edit-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericFormComponent,
    GenericModalComponent,
    SelectModule,
    DividerModule,
    GenericButtonComponent,
    MessageModule,
    NbuVersionNbuSelectorComponent
  ],
  templateUrl: './nbu-version-edit-form.component.html',
  styleUrl: './nbu-version-edit-form.component.css'
})
export class NbuVersionEditFormComponent {
  private readonly nbuVersionService = inject(NbuVersionService);

  visible = input.required<boolean>();
  nbuVersion = input<NbuVersion | null>(null);

  closed = output<void>();
  saved = output<NbuVersion>();

  availableVersions = signal<NbuVersion[]>([]);
  selectedVersion = signal<NbuVersion | null>(null);
  // Versión base seleccionada para pre-cargar NBUs al crear
  baseVersion = signal<NbuVersion | null>(null);
  formData = signal<Partial<NbuVersion>>({});
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  
  // NBU Association signals
  selectedNbuIds = signal<number[]>([]);
  preSelectedNbuIds = signal<number[]>([]);
  savingAssociations = signal<boolean>(false);

  formFields: GenericFormField[] = [
    {
      name: 'versionCode',
      label: 'Código de versión',
      type: 'text',
      required: true,
      colSpan: 2
    },
    {
      name: 'publicationYear',
      label: 'Año de publicación',
      type: 'number',
      required: true,
      colSpan: 2
    },
    {
      name: 'updateYear',
      label: 'Año de actualización',
      type: 'number',
      required: false,
      colSpan: 2
    },
    {
      name: 'publicationDate',
      label: 'Fecha de publicación',
      type: 'date',
      required: false,
      colSpan: 2
    },
    {
      name: 'effectivityDate',
      label: 'Fecha de vigencia',
      type: 'date',
      required: false,
      colSpan: 2
    },
    {
      name: 'ub',
      label: 'UB',
      type: 'number',
      required: false,
      colSpan: 2
    }
  ];

  modalTitle = computed(() => {
    if (this.nbuVersion()) {
      return 'Editar Versión NBU';
    }
    return 'Nueva Versión NBU';
  });

  /**
   * Initializes the component and loads available versions
   */
  constructor() {
    // Load available versions when component initializes
    effect(() => {
      if (this.visible()) {
        this.loadAvailableVersions();
        
        if (this.nbuVersion()) {
          this.formData.set({ ...this.nbuVersion()! });
        } else {
          this.formData.set({});
        }
      }
    });

    // Auto-fill form when a version is selected from dropdown
    effect(() => {
      const selected = this.selectedVersion();
      if (selected && !this.nbuVersion()) {
        this.formData.set({ ...selected });
        // Load associated NBUs when a version is selected
        if (selected.id) {
          this.loadAssociatedNbus(selected.id);
        }
      }
    });
  }

  /**
   * Loads available NBU versions from service
   */
  private loadAvailableVersions(): void {
    this.loading.set(true);
    this.nbuVersionService.getNbuVersions().subscribe({
      next: (versions) => {
        this.availableVersions.set(versions);
        this.loading.set(false);
      },
      error: () => {
        // console.error('Error loading NBU versions:', _error);
        this.loading.set(false);
      }
    });
  }

  /**
   * Handles version selection from dropdown
   */
  onVersionSelect(version: NbuVersion): void {
    this.selectedVersion.set(version);
    // Si estamos creando una nueva versión (nbuVersion() es null), recordar la versión base
    if (!this.nbuVersion()) {
      this.baseVersion.set(version);
    }
  }

  /**
   * Handles form submission
   */
  onSubmit(formValue: Partial<NbuVersion>): void {
    this.saving.set(true);
    
    this.nbuVersionService.createNbuVersion(formValue as NbuVersion).subscribe({
      next: (savedVersion) => {
        this.saving.set(false);
        // Emit el evento de guardado
        this.saved.emit(savedVersion);

        // Mantener el formulario abierto y mostrar la sección de asociación de NBUs.
        // Establecer la versión seleccionada en la nueva versión creada
        this.selectedVersion.set(savedVersion);
        // Importante: NO recargar las asociaciones de la nueva versión,
        // para conservar la preselección basada en la versión base elegida.
      },
      error: () => {
        // console.error('Error saving NBU version:', _error);
        this.saving.set(false);
      }
    });
  }

  /**
   * Handles modal close
   */
  handleClose(): void {
    this.selectedVersion.set(null);
    this.baseVersion.set(null);
    this.formData.set({});
    this.selectedNbuIds.set([]);
    this.preSelectedNbuIds.set([]);
    this.closed.emit();
  }

  /**
   * Loads NBUs already associated with the selected version
   */
  private loadAssociatedNbus(versionId: number): void {
    this.loading.set(true);

    this.nbuVersionService.getNbusByVersion(versionId).subscribe({
      next: (nbus) => {
        const associatedIds = nbus.map(nbu => nbu.id);
        this.preSelectedNbuIds.set(associatedIds);
        this.selectedNbuIds.set(associatedIds);
        this.loading.set(false);
      },
      error: () => {
        // console.error('Error loading associated NBUs:', error);
        this.preSelectedNbuIds.set([]);
        this.selectedNbuIds.set([]);
        this.loading.set(false);
      }
    });
  }

  /**
   * Handles NBU selection change from selector component
   */
  onNbusSelected(nbuIds: number[]): void {
    this.selectedNbuIds.set(nbuIds);
  }

  /**
   * Saves NBU associations for the selected version
   */
  onSaveAssociations(): void {
    const currentSelected = this.selectedVersion();
    const baseSelected = this.baseVersion();
    const formValue = this.formData() as any;
    const nbuIds = this.selectedNbuIds();

    // Si no hay NBUs seleccionados, no hacemos nada
    if (!nbuIds || nbuIds.length === 0) {
      this.savingAssociations.set(false);
      return;
    }

    this.savingAssociations.set(true);

    // Caso 1: estamos en creación (nbuVersion() es null) y aún no existe una versión nueva
    // En este caso, crear la versión primero y luego asociar NBUs a esa nueva versión
    if (!this.nbuVersion() && currentSelected && baseSelected && currentSelected.id === baseSelected.id) {
      this.nbuVersionService.createNbuVersion(formValue as NbuVersion).subscribe({
        next: (savedVersion) => {
          // Actualizar la versión seleccionada a la recién creada
          this.selectedVersion.set(savedVersion);
          const ubVal = formValue['ub'] ?? 0;

          this.nbuVersionService.associateMultipleNbus(nbuIds, savedVersion.id!, ubVal).subscribe({
            next: () => {
              // console.log(`Successfully associated ${nbuIds.length} NBUs with new version ${savedVersion.id}`);
              this.savingAssociations.set(false);
              // Recargar asociaciones para la nueva versión
              this.loadAssociatedNbus(savedVersion.id!);
            },
            error: () => {
              // console.error('Error associating NBUs to new version:', error);
              this.savingAssociations.set(false);
            }
          });
        },
        error: () => {
          // console.error('Error creating NBU version before association:', error);
          this.savingAssociations.set(false);
        }
      });
      return;
    }

    // Caso 2: edición o ya tenemos la versión creada en selectedVersion
    const versionId = this.selectedVersion()?.id;
    if (!versionId) {
      // console.error('Cannot save associations: missing version ID');
      this.savingAssociations.set(false);
      return;
    }

    const ub = formValue['ub'] ?? 0;

    this.nbuVersionService.associateMultipleNbus(nbuIds, versionId, ub).subscribe({
      next: () => {
        // console.log(`Successfully associated ${nbuIds.length} NBUs with version ${versionId}`);
        this.savingAssociations.set(false);
        // Reload to get updated associations
        this.loadAssociatedNbus(versionId);
      },
      error: () => {
        // console.error('Error associating NBUs:', error);
        this.savingAssociations.set(false);
      }
    });
  }
}
