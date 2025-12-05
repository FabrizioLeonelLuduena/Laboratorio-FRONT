import { CommonModule } from '@angular/common';
import { Component, input, output, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner/spinner.component';

import { NbuVersionService } from '../../../application/nbu-version.service';
import { NbuVersion } from '../../../domain/nbu-version.model';
import { Nbu } from '../../../domain/nbu.model';
import { NbuVersionNbuSelectorComponent } from '../nbu-version-nbu-selector/nbu-version-nbu-selector.component';


/**
 * Manager component for handling NBU version and UB value.
 * Allows changing the NBU version and updating the UB (Unidad Bioquímica) value.
 * 
 * Features:
 * - Dropdown selector for NBU versions
 * - Input field for UB value (numeric)
 * - Save button to apply changes
 * - Loading states
 * 
 * @example
 * <app-nbu-version-manager
 *   [currentNbu]="nbu"
 *   [currentUb]="analysis.ub"
 *   (versionChanged)="onVersionChanged($event)" />
 */
@Component({
  selector: 'app-nbu-version-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    InputNumberModule,
    GenericButtonComponent,
    DividerModule,
    TabsModule,
    MessageModule,
    NbuVersionNbuSelectorComponent,
    SpinnerComponent
  ],
  templateUrl: './nbu-version-manager.component.html',
  styleUrl: './nbu-version-manager.component.css'
})
export class NbuVersionManagerComponent implements OnInit {
  private readonly nbuVersionService = inject(NbuVersionService);

  /** Current NBU associated with the analysis */
  currentNbu = input<Nbu | undefined>();

  /** Current UB value */
  currentUb = input<number | undefined>();

  /** Emitted when saved successfully */
  saved = output<Event>();

  /** Emitted when version or UB is changed */
  versionChanged = output<{ versionId: number; ub: number }>();

  /** All available NBU versions */
  availableVersions = signal<NbuVersion[]>([]);

  /** Versions where the current NBU is associated (with UB values) */
  nbuVersionsWithUb = signal<Array<{ version: NbuVersion; ub: number }>>([]);

  /** Selected version ID */
  selectedVersionId = signal<number | undefined>(undefined);

  /** UB value */
  ubValue = signal<number | undefined>(undefined);

  /** Loading state */
  loading = signal<boolean>(false);

  /** Current active tab index (0 = Version Config, 1 = NBU Selection) */
  activeTabIndex = signal<number>(0);

  /** Selected NBU IDs to associate with the version */
  selectedNbuIds = signal<number[]>([]);

  /** Already associated NBU IDs (pre-selected and disabled in selector) */
  preSelectedNbuIds = signal<number[]>([]);

  /** Saving state */
  saving = signal<boolean>(false);

  /** Computed: Check if Step 1 (version config) is valid */
  isStep1Valid = computed(() => {
    const versionId = this.selectedVersionId();
    const ub = this.ubValue();
    return versionId !== undefined && ub !== undefined && ub > 0;
  });

  /** Computed: Check if there are changes to save */
  hasChanges = computed(() => {
    const nbu = this.currentNbu();
    if (!nbu) return false;

    const currentVersionId = nbu.nbuVersionDetails?.[0]?.nbuVersion?.id;
    const selectedVersion = this.selectedVersionId();
    const currentUbVal = this.currentUb();
    const newUbVal = this.ubValue();

    return (
      (selectedVersion !== undefined && selectedVersion !== currentVersionId) ||
      (newUbVal !== undefined && newUbVal !== currentUbVal)
    );
  });

  /** Options for version dropdown */
  versionOptions = computed(() => {
    return this.availableVersions().map(v => ({
      label: `${v.versionCode} (${v.publicationYear || 'N/D'})`,
      value: v.id
    }));
  });

  /** Computed: Selected version label for display */
  selectedVersionLabel = computed(() => {
    const selected = this.versionOptions().find(v => v.value === this.selectedVersionId());
    return selected?.label || 'N/D';
  });

  /**
   * Initializes the component and loads available versions
   */
  ngOnInit(): void {
    // Load versions and NBU details in background
    this.loadVersions();
    this.loadNbuVersionsWithDetails();
  }

  /**
   * Loads all available NBU versions.
   * Uses cached data from service for better performance.
   */
  private loadVersions(): void {
    this.loading.set(true);

    // Service now handles caching, won't trigger duplicate HTTP requests
    this.nbuVersionService.getNbuVersions().subscribe({
      next: (versions) => {
        this.availableVersions.set(versions);
        this.loading.set(false);
      },
      error: (_error) => {
        // console.error('Error loading NBU versions:', _error);
        this.loading.set(false);
      }
    });
  }

  /**
   * Loads versions where the current NBU is associated from nbu_detail endpoint
   */
  private loadNbuVersionsWithDetails(): void {
    const nbu = this.currentNbu();
    if (!nbu?.id) {
      return;
    }

    this.loading.set(true);

    this.nbuVersionService.getNbuVersionsWithDetails().subscribe({
      next: (versionsWithDetails) => {
        const nbuId = nbu.id!;
        const versionsWithUb: Array<{ version: NbuVersion; ub: number }> = [];

        // Filter versions where the NBU is associated
        versionsWithDetails.forEach(v => {
          const nbuDetail = v.nbuDetails?.find(d => d.nbu?.id === nbuId);
          if (nbuDetail) {
            versionsWithUb.push({
              version: {
                id: v.id,
                entityVersion: v.entityVersion,
                createdDatetime: v.createdDatetime,
                lastUpdatedDatetime: v.lastUpdatedDatetime,
                createdUser: v.createdUser,
                lastUpdatedUser: v.lastUpdatedUser,
                versionCode: v.versionCode,
                publicationYear: v.publicationYear,
                updateYear: v.updateYear,
                publicationDate: v.publicationDate,
                effectivityDate: v.effectivityDate,
                endDate: v.endDate
              } as NbuVersion,
              ub: nbuDetail.ub
            });
          }
        });

        this.nbuVersionsWithUb.set(versionsWithUb);

        // Inicializar valores: usar el currentUb si está definido, o el primero de la lista
        const currentUb = this.currentUb();
        if (currentUb !== undefined) {
          // Buscar la versión que tiene este UB
          const matchingVersion = versionsWithUb.find(v => v.ub === currentUb);
          if (matchingVersion) {
            this.selectedVersionId.set(matchingVersion.version.id);
            this.ubValue.set(matchingVersion.ub);
          } else {
            // Si no hay coincidencia, usar el primero
            if (versionsWithUb.length > 0) {
              this.selectedVersionId.set(versionsWithUb[0].version.id);
              this.ubValue.set(versionsWithUb[0].ub);
            }
          }
        } else if (versionsWithUb.length > 0) {
          // Si no hay currentUb, usar el primero
          this.selectedVersionId.set(versionsWithUb[0].version.id);
          this.ubValue.set(versionsWithUb[0].ub);
        }

        this.loading.set(false);
      },
      error: (_error) => {
        // console.error('Error loading NBU versions with details:', _error);
        this.loading.set(false);
        // Fallback: usar valores del NBU si están disponibles
        this.initializeValuesFromNbu();
      }
    });
  }

  /**
   * Fallback: Initializes selected values from current NBU when API call fails
   */
  private initializeValuesFromNbu(): void {
    const nbu = this.currentNbu();
    if (nbu?.nbuVersionDetails?.[0]?.nbuVersion) {
      this.selectedVersionId.set(nbu.nbuVersionDetails[0].nbuVersion.id);
    }

    const ub = this.currentUb();
    if (ub !== undefined) {
      this.ubValue.set(ub);
    }
  }

  /**
   * Handles save button click (old single-step flow)
   * @deprecated Use onContinue() and onFinalSave() for new two-step flow
   */
  onSave(): void {
    const versionId = this.selectedVersionId();
    const ub = this.ubValue();

    if (versionId === undefined || ub === undefined) {
      return;
    }

    this.versionChanged.emit({ versionId, ub });
  }

  /**
   * Handles tab change
   */
  onTabChange(value: string | number): void {
    const tabIndex = typeof value === 'string' ? parseInt(value, 10) : value;
    this.activeTabIndex.set(tabIndex);
  }

  /**
   * Handles continue to step 2 (NBU selection)
   */
  onContinue(): void {
    if (!this.isStep1Valid()) {
      return;
    }

    // Load existing NBUs associated with the selected version
    this.loadAssociatedNbus();

    // Move to step 2
    this.activeTabIndex.set(1);
  }

  /**
   * Loads NBUs already associated with the selected version
   * 
   * ⚠️ NOTE: This endpoint doesn't exist in the backend yet.
   * Commenting out until backend implements GET /api/v1/analysis/nbu/versions/{versionId}/nbus
   * For now, we'll start with empty pre-selection.
   */
  private loadAssociatedNbus(): void {
    const versionId = this.selectedVersionId();
    if (!versionId) return;

    // TODO: Uncomment when backend implements this endpoint
    // this.loading.set(true);
    // this.nbuVersionService.getNbusByVersion(versionId).subscribe({
    //   next: (nbus) => {
    //     const associatedIds = nbus.map(nbu => nbu.id);
    //     this.preSelectedNbuIds.set(associatedIds);
    //     this.loading.set(false);
    //   },
    //   error: (error) => {
    //     console.error('Error loading associated NBUs:', error);
    //     this.preSelectedNbuIds.set([]);
    //     this.loading.set(false);
    //   }
    // });

    // Temporary: Start with empty pre-selection
    this.preSelectedNbuIds.set([]);
  }

  /**
   * Handles NBU selection change from selector component
   */
  onNbusSelected(nbuIds: number[]): void {
    this.selectedNbuIds.set(nbuIds);
  }

  /**
   * Handles final save (create version + associate NBUs)
   */
  onFinalSave(): void {
    const versionId = this.selectedVersionId();
    const ub = this.ubValue();
    const nbuIds = this.selectedNbuIds();

    if (versionId === undefined || ub === undefined) {
      return;
    }

    this.saving.set(true);

    // First, emit version change (this will create/update the version)
    this.versionChanged.emit({ versionId, ub });

    // Then, associate selected NBUs with the version
    if (nbuIds.length > 0) {
      this.nbuVersionService.associateMultipleNbus(nbuIds, versionId, ub).subscribe({
        next: () => {
          // console.log(`Successfully associated ${nbuIds.length} NBUs with version ${versionId}`);
          this.saving.set(false);
          this.resetState();
          this.saved.emit(new Event('saved'));
        },
        error: (_error) => {
          // console.error('Error associating NBUs:', _error);
          this.saving.set(false);
        }
      });
    } else {
      this.saving.set(false);
      this.resetState();
      this.saved.emit(new Event('saved'));
    }
  }

  /**
   * Handles back to step 1
   */
  onBackToStep1(): void {
    this.activeTabIndex.set(0);
  }

  /**
   * Resets component state
   */
  private resetState(): void {
    this.activeTabIndex.set(0);
    this.selectedNbuIds.set([]);
    this.preSelectedNbuIds.set([]);
  }

  /**
   * Gets current version label
   */
  getCurrentVersionLabel(): string {
    const nbu = this.currentNbu();
    if (!nbu?.nbuVersionDetails?.[0]?.nbuVersion) {
      return 'No hay versión asignada';
    }

    const version = nbu.nbuVersionDetails[0].nbuVersion;
    return `${version.versionCode} (${version.publicationYear || 'N/D'})`;
  }
}
