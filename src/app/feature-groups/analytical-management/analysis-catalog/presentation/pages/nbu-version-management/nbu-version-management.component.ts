import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { forkJoin, Observable, of } from 'rxjs';
import { AuthService } from 'src/app/core/authentication/auth.service';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { GenericModalComponent } from 'src/app/shared/components/generic-modal/generic-modal.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner/spinner.component';
import { TranslatePipe } from 'src/app/shared/pipes/translate.pipe';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { extractErrorMessage } from 'src/app/shared/utils/error-message.util';

import { catchError, map } from 'rxjs/operators';

import { NbuVersionService } from '../../../application/nbu-version.service';
import { NbuVersion } from '../../../domain/nbu-version.model';
import { NbuVersionListComponent } from '../../components/nbu-version-list/nbu-version-list.component';
import { NbuVersionNbuSelectorComponent } from '../../components/nbu-version-nbu-selector/nbu-version-nbu-selector.component';

/**
 * Component for managing NBU versions, including creation, editing, and association with NBUs.
 * Handles version selection, form management, and batch operations for NBU associations.
 */
@Component({
  selector: 'app-nbu-version-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericButtonComponent,
    InputTextModule,
    DividerModule,
    MessageModule,
    SelectModule,
    GenericAlertComponent,
    GenericFormComponent,
    NbuVersionNbuSelectorComponent,
    NbuVersionListComponent,
    GenericModalComponent,
    SpinnerComponent,
    TranslatePipe
  ],
  templateUrl: './nbu-version-management.component.html',
  styleUrls: ['./nbu-version-management.component.css']
})
export class NbuVersionManagementComponent implements OnInit {
  private readonly nbuVersionService = inject(NbuVersionService);
  private readonly route = inject(ActivatedRoute);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly authService = inject(AuthService);
  @ViewChild('versionForm') versionForm!: GenericFormComponent;

  // Sidebar: versions list
  versions = signal<NbuVersion[]>([]);
  loadingVersions = signal<boolean>(false);
  
  // Cache of versions with details to avoid additional requests
  versionsWithDetailsCache = signal<Map<number, { nbuIds: number[], ub?: number }>>(new Map());
  
  // Cache of UB by NBU for each version: Map<versionId, Map<nbuId, ub>>
  nbuUbMapCache = signal<Map<number, Map<number, number>>>(new Map());

  // Current selection
  selectedVersion = signal<NbuVersion | null>(null);
  baseVersion = signal<NbuVersion | null>(null);
  isEditMode = signal<boolean>(false);

  // Form for creating a new version
  formData = signal<Partial<NbuVersion>>({});
  savingVersion = signal<boolean>(false);

  // NBU selector state
  preSelectedNbuIds = signal<number[]>([]);
  selectedNbuIds = signal<number[]>([]);
  savingAssociations = signal<boolean>(false);

  // UB value for association
  ubValue = signal<number>(0);

  // NBU association modal
  showAssociateModal = signal<boolean>(false);
  
  // Temporary state to save modal changes before persisting
  pendingNbuIds = signal<number[]>([]);
  isCreatingVersion = signal<boolean>(false);

  // Informative alert state (for auto-dismiss)
  showBaseVersionAlert = signal<boolean>(false);
  showPreselectedNbusAlert = signal<boolean>(false);

  // Error handling signals
  associationErrors = signal<string[]>([]);
  disassociationErrors = signal<string[]>([]);
  showErrorAlert = signal<boolean>(false);

  // Generic Table configuration
  versionColumns = [
    { field: 'versionCode', header: 'Código' },
    { field: 'publicationYear', header: 'Año' }
  ];

  // Generic Form fields for minimal creation
  formFields: GenericFormField[] = [
    { name: 'versionCode', label: 'Código de versión', type: 'text', required: true, colSpan: 2 },
    { name: 'publicationYear', label: 'Año de publicación', type: 'number', required: true, colSpan: 2 },
    { name: 'updateYear', label: 'Año de actualización', type: 'number', required: false, colSpan: 2 },
    { name: 'publicationDate', label: 'Fecha de publicación', type: 'date', required: false, colSpan: 2 },
    { name: 'effectivityDate', label: 'Fecha de vigencia', type: 'date', required: false, colSpan: 2 }
  ];

  /**
   * Initializes the component and loads versions with details.
   * On entry, makes a GET request to the nbu_detail endpoint to load versions with details.
   */
  constructor() {
    this.loadVersionsWithDetails();
  }

  /**
   * Configures breadcrumbs when the component initializes.
   */
  ngOnInit(): void {
    this.breadcrumbService.buildFromRoute(this.route);
  }

  /**
   * Loads versions with details and caches NBUs/UB to avoid additional requests.
   */
  loadVersionsWithDetails(): void {
    this.loadingVersions.set(true);
    
    this.nbuVersionService.getNbuVersionsWithDetails().subscribe({
      next: (versionsWithDetails) => {
        // Map versions with details to NbuVersion for the list
        const versionsList = versionsWithDetails.map(v => ({
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
        } as NbuVersion));
        
        this.versions.set(versionsList);
        
        // Cache details (NBUs and UB) to avoid additional requests
        const detailsMap = new Map<number, { nbuIds: number[], ub?: number }>();
        const ubMapCache = new Map<number, Map<number, number>>();
        
        versionsWithDetails.forEach(v => {
          const nbuIds = (v.nbuDetails || []).map(d => d.nbu?.id).filter((id): id is number => typeof id === 'number');
          // If there are details, take UB from the first NBU (assuming all have the same UB for that version)
          // Save UB even if it's 0 or undefined
          const ub = v.nbuDetails?.[0]?.ub ?? 0;
          detailsMap.set(v.id, { nbuIds, ub });
          
          // Create map of nbuId -> ub for this version
          const versionUbMap = new Map<number, number>();
          (v.nbuDetails || []).forEach(detail => {
            if (detail.nbu?.id && detail.ub !== undefined && detail.ub !== null) {
              versionUbMap.set(detail.nbu.id, detail.ub);
            }
          });
          ubMapCache.set(v.id, versionUbMap);
        });
        
        this.versionsWithDetailsCache.set(detailsMap);
        this.nbuUbMapCache.set(ubMapCache);
        
        this.loadingVersions.set(false);
      },
      error: (_err) => {
        // console.error('[NbuVersionManagement] Error loading versions with details:', _err);
        // Fallback: try to load versions without details
        this.refreshVersions();
      }
    });
  }

  /**
   * Refreshes the versions list.
   */
  refreshVersions(): void {
    this.loadingVersions.set(true);
    this.nbuVersionService.getNbuVersions().subscribe({
      next: (versions) => {
        this.versions.set(versions);
        this.loadingVersions.set(false);
      },
      error: () => {
        this.loadingVersions.set(false);
      }
    });
  }

  /**
   * Selects a version and prepares edit mode.
   */
  onSelectVersion(version: NbuVersion | null): void {
    if (!version) {
      // Deselection: clear state and return to creation mode
      this.selectedVersion.set(null);
      this.isEditMode.set(false);
      this.baseVersion.set(null);
      this.formData.set({});
      this.preSelectedNbuIds.set([]);
      this.selectedNbuIds.set([]);
      this.pendingNbuIds.set([]);
      this.ubValue.set(0);
      this.showBaseVersionAlert.set(false);
      this.showPreselectedNbusAlert.set(false);
      return;
    }
    // Selection: enter edit mode with the chosen version
    this.selectedVersion.set(version);
    this.isEditMode.set(true);
    
    // Load version data into the form (including all fields)
    this.formData.set({
      id: version.id,
      entityVersion: version.entityVersion,
      versionCode: version.versionCode,
      publicationYear: version.publicationYear,
      updateYear: version.updateYear,
      publicationDate: version.publicationDate,
      effectivityDate: version.effectivityDate,
      endDate: version.endDate
    });
    
    // Load associated NBUs and UB from cache (without additional requests)
    const details = this.versionsWithDetailsCache().get(version.id);
    if (details) {
      this.preSelectedNbuIds.set(details.nbuIds);
      this.selectedNbuIds.set(details.nbuIds);
      this.pendingNbuIds.set(details.nbuIds); // Initialize pending with current ones
      // Load UB if it exists (including 0)
      if (details.ub !== undefined && details.ub !== null) {
        this.ubValue.set(details.ub);
      } else {
        this.ubValue.set(0);
      }
    } else {
      // If not in cache, load (but this shouldn't happen)
      this.loadAssociatedNbus(version.id);
    }
    
    // Reset base version when switching selection
    this.baseVersion.set(null);
    this.showBaseVersionAlert.set(false);
  }

  // Actions provider for GenericTable rows
  getActionsForVersionRow = (row: NbuVersion) => [
    {
      id: 'edit',
      label: 'Editar',
      icon: 'pi pi-check',
      command: () => this.onSelectVersion(row)
    }
  ];

  /**
   * Selects a base version to preload NBUs when creating a new version.
   */
  onBaseVersionSelect(version: NbuVersion | null): void {
    this.baseVersion.set(version ?? null);
    if (version?.id) {
      // Load associated NBUs and UB from cache (without additional requests)
      const details = this.versionsWithDetailsCache().get(version.id);
      if (details) {
        this.preSelectedNbuIds.set(details.nbuIds);
        this.selectedNbuIds.set(details.nbuIds);
        this.pendingNbuIds.set(details.nbuIds); // Initialize pending with preselected ones
        // Load UB if it exists (including 0)
        if (details.ub !== undefined && details.ub !== null) {
          this.ubValue.set(details.ub);
        } else {
          this.ubValue.set(0);
        }
      } else {
        // If not in cache, load (but this shouldn't happen)
        this.loadAssociatedNbus(version.id);
      }
      
      // If we're creating, copy information from base version to form
      if (!this.isEditMode()) {
        const { publicationYear, updateYear, publicationDate, effectivityDate } = version;
        this.formData.set({ publicationYear, updateYear, publicationDate, effectivityDate });
      }

      // Show informative alert (will auto-hide after 4 seconds)
      this.showBaseVersionAlert.set(true);
    } else {
      this.preSelectedNbuIds.set([]);
      this.selectedNbuIds.set([]);
      this.pendingNbuIds.set([]);
      this.ubValue.set(0);
      this.showBaseVersionAlert.set(false);
    }
  }

  /**
   * Starts the version creation flow.
   */
  startCreate(): void {
    this.selectedVersion.set(null);
    this.isEditMode.set(false);
    this.baseVersion.set(null);
    this.formData.set({});
    this.preSelectedNbuIds.set([]);
    this.selectedNbuIds.set([]);
    this.pendingNbuIds.set([]);
    this.isCreatingVersion.set(false);
    this.ubValue.set(0);
    this.showBaseVersionAlert.set(false);
    this.showPreselectedNbusAlert.set(false);
  }

  /**
   * Formats a date for the backend (yyyy-MM-dd).
   * Converts Date or string to Java LocalDate format.
   */
  private formatDateForBackend(date: Date | string | null | undefined): string | undefined {
    if (!date) return undefined;
    
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // If it's a string, check if it has time and extract only the date
    if (typeof date === 'string') {
      // If it has ISO format with time (2023-12-31T03:00:00.000Z), extract only the date
      if (date.includes('T')) {
        return date.split('T')[0];
      }
      // If it's already yyyy-MM-dd format, return it as is
      return date;
    }
    
    return undefined;
  }

  /**
   * Creates a new version and manages associations.
   */
  onCreateVersion(formValue: Partial<NbuVersion>): void {
    // If there are pending NBUs (from modal), first create version then associate
    if (this.pendingNbuIds().length > 0) {
      this.isCreatingVersion.set(true);
    }
    
    // Show spinner during the entire process
    this.savingVersion.set(true);
    this.nbuVersionService.createNbuVersion(formValue).subscribe({
      next: (created) => {
        // Update local list without making additional request
        const newVersion: NbuVersion = {
          ...created,
          ...formValue
        } as NbuVersion;
        this.versions.update(v => [...v, newVersion]);
        
        // Select the created version
        this.selectedVersion.set(newVersion);
        this.isEditMode.set(true);
        
        // If there are pending NBUs, associate them now (spinner will remain active)
        if (this.isCreatingVersion() && this.pendingNbuIds().length > 0 && newVersion.id) {
          // Keep spinner active during association
          this.associatePendingNbus(newVersion.id);
        } else {
          // If no pending, hide spinner
          this.savingVersion.set(false);
          if (newVersion.id) {
            // If there's a base version, open modal
            this.openAssociateModal();
          }
        }
      },
      error: () => {
        this.savingVersion.set(false);
        this.isCreatingVersion.set(false);
      }
    });
  }

  /**
   * Updates the selected version.
   */
  onUpdateVersion(formValue: Partial<NbuVersion>): void {
    const current = this.selectedVersion();
    if (!current) return;
    
    // Format dates before sending
    const payload: NbuVersion = {
      ...current,
      ...formValue,
      publicationDate: this.formatDateForBackend(formValue.publicationDate ?? current.publicationDate),
      effectivityDate: this.formatDateForBackend(formValue.effectivityDate ?? current.effectivityDate),
      endDate: this.formatDateForBackend(formValue.endDate ?? current.endDate)
    } as NbuVersion;
    
    this.savingVersion.set(true);
    this.nbuVersionService.updateNbuVersion(payload).subscribe({
      next: (updated) => {
        // Update local list without making additional request
        this.versions.update(v => v.map(ver => ver.id === updated.id ? updated : ver));
        this.selectedVersion.set(updated);
        // Update formData with updated data
        this.formData.set({
          id: updated.id,
          entityVersion: updated.entityVersion,
          versionCode: updated.versionCode,
          publicationYear: updated.publicationYear,
          updateYear: updated.updateYear,
          publicationDate: updated.publicationDate,
          effectivityDate: updated.effectivityDate,
          endDate: updated.endDate
        });
        this.savingVersion.set(false);
      },
      error: () => {
        this.savingVersion.set(false);
      }
    });
  }

  /**
   * Updates selected NBUs in memory only (does not make requests).
   */
  onNbusSelected(nbuIds: number[]): void {
    this.selectedNbuIds.set(nbuIds);
    // Save selected NBUs in memory (pending to save)
    this.pendingNbuIds.set(nbuIds);
  }

  /**
   * Changes selection from modal: only saves in memory, does not persist.
   */
  onChangeFromModal(): void {
    // Save selected NBUs in memory (do not persist)
    const selectedIds = this.selectedNbuIds();
    this.pendingNbuIds.set(selectedIds);
    // Close modal but keep pending ones (keepPending = true)
    this.closeAssociateModal(true);
  }

  /**
   * Saves version and associates NBUs according to the current mode.
   * Creates/edits version and then associates NBUs.
   */
  onSaveVersionWithNbus(): void {
    // Get form values
    if (!this.versionForm || !this.versionForm.form) {
      return;
    }

    // Validar formulario
    if (this.versionForm.form.invalid) {
      return;
    }

    const formValue = this.versionForm.form.value;
    
    if (!formValue.versionCode || !formValue.publicationYear) {
      return;
    }

    if (this.isEditMode()) {
      this.handleUpdateModeSave(formValue);
    } else {
      this.handleCreateModeSave(formValue);
    }
  }

  /**
   * Handles saving in edit mode.
   */
  private handleUpdateModeSave(formValue: any): void {
    const current = this.selectedVersion();
    if (!current) {
      return;
    }
    
    const payload = this.buildUpdatePayload(current, formValue);
    
    this.savingVersion.set(true);
    this.nbuVersionService.updateNbuVersion(payload).subscribe({
      next: (updated) => {
        this.updateVersionState(updated);
        this.handleNbuAssociationAfterUpdate(updated.id);
      },
      error: () => {
        this.savingVersion.set(false);
      }
    });
  }

  /**
   * Handles saving in create mode.
   */
  private handleCreateModeSave(formValue: any): void {
    const payload = this.buildCreatePayload(formValue);
    
    this.savingVersion.set(true);
    this.nbuVersionService.createNbuVersion(payload).subscribe({
      next: (created) => {
        const newVersion = this.createVersionFromResponse(created, formValue);
        this.updateVersionsListAfterCreate(newVersion);
        
        if (newVersion.id) {
          this.handleNbuAssociationAfterCreate(newVersion.id);
        } else {
          this.finishCreatingVersion();
        }
      },
      error: () => {
        this.savingVersion.set(false);
      }
    });
  }

  /**
   * Builds the payload for updating an existing version.
   */
  private buildUpdatePayload(current: NbuVersion, formValue: any): NbuVersion {
    const currentUser = this.authService.getUser();
    const userId = currentUser?.id ?? 0;
    
    return {
      ...current,
      ...formValue,
      // Ensure entityVersion is always from current version (CRITICAL for optimistic locking)
      entityVersion: current.entityVersion ?? 0,
      // Ensure id is always from current version
      id: current.id ?? 0,
      // Ensure createdUser is always from current version
      createdUser: current.createdUser ?? userId,
      // lastUpdatedUser is always the current user
      lastUpdatedUser: userId,
      // Format dates
      publicationDate: this.formatDateForBackend(formValue.publicationDate ?? current.publicationDate),
      effectivityDate: this.formatDateForBackend(formValue.effectivityDate ?? current.effectivityDate),
      endDate: this.formatDateForBackend(formValue.endDate ?? current.endDate)
    } as NbuVersion;
  }

  /**
   * Builds the payload for creating a new version.
   */
  private buildCreatePayload(formValue: any): Partial<NbuVersion> {
    return {
      ...formValue,
      publicationDate: this.formatDateForBackend(formValue.publicationDate),
      effectivityDate: this.formatDateForBackend(formValue.effectivityDate),
      endDate: this.formatDateForBackend(formValue.endDate)
    };
  }

  /**
   * Updates the state after updating a version.
   */
  private updateVersionState(updated: NbuVersion): void {
    this.versions.update(v => v.map(ver => ver.id === updated.id ? updated : ver));
    this.selectedVersion.set(updated);
    this.formData.set({
      id: updated.id,
      entityVersion: updated.entityVersion,
      versionCode: updated.versionCode,
      publicationYear: updated.publicationYear,
      updateYear: updated.updateYear,
      publicationDate: updated.publicationDate,
      effectivityDate: updated.effectivityDate,
      endDate: updated.endDate
    });
  }

  /**
   * Handles NBU association after updating a version.
   */
  private handleNbuAssociationAfterUpdate(versionId: number | undefined): void {
    if (!versionId) {
      this.savingVersion.set(false);
      return;
    }

    const pendingIds = this.pendingNbuIds();
    
    if (pendingIds.length > 0) {
      this.associatePendingNbus(versionId);
    } else {
      // If no pending but there are selected, use selected ones
      const selectedIds = this.selectedNbuIds();
      if (selectedIds.length > 0) {
        this.pendingNbuIds.set(selectedIds);
        this.associatePendingNbus(versionId);
      } else {
        this.savingVersion.set(false);
      }
    }
  }

  /**
   * Creates a complete NbuVersion object from the server response and form values.
   */
  private createVersionFromResponse(created: NbuVersion, formValue: any): NbuVersion {
    return {
      ...created,
      ...formValue
    } as NbuVersion;
  }

  /**
   * Updates the versions list after creating a new one.
   */
  private updateVersionsListAfterCreate(newVersion: NbuVersion): void {
    this.versions.update(v => [...v, newVersion]);
    this.selectedVersion.set(newVersion);
    this.isEditMode.set(true);
  }

  /**
   * Handles NBU association after creating a version.
   */
  private handleNbuAssociationAfterCreate(versionId: number): void {
    if (this.pendingNbuIds().length > 0) {
      this.associatePendingNbus(versionId);
    } else {
      // No NBUs to associate, just update empty cache
      // UB is an NBU field, use 0 as default value
      const currentCache = this.versionsWithDetailsCache();
      currentCache.set(versionId, { nbuIds: [], ub: 0 });
      this.versionsWithDetailsCache.set(new Map(currentCache));
      this.finishCreatingVersion();
    }
  }

  /**
   * Finishes the version creation process.
   */
  private finishCreatingVersion(): void {
    this.savingVersion.set(false);
    if (this.isCreatingVersion()) {
      this.isCreatingVersion.set(false);
    }
  }

  /**
   * Calculates differences between initial and final state, and executes associations and disassociations in parallel.
   * Handles partial errors while maintaining successful operations.
   */
  private associatePendingNbus(versionId: number): void {
    // UB is an NBU field, not edited from versions. Use 0 as default value.
    const ub = 0;
    const pendingIds = this.pendingNbuIds();
    const _preSelectedIds = this.preSelectedNbuIds();
    
    // Clear previous errors
    this.associationErrors.set([]);
    this.disassociationErrors.set([]);
    this.showErrorAlert.set(false);
    
    // Get NBUs that are already associated from cache (initial state)
    const details = this.versionsWithDetailsCache().get(versionId);
    const existingIds = details?.nbuIds || [];
    
    // Calculate differences: NBUs to associate and to disassociate
    const toAssociate = pendingIds.filter(id => !existingIds.includes(id));
    const toDisassociate = existingIds.filter(id => !pendingIds.includes(id));
    
    // If no changes, just update cache and close
    if (toAssociate.length === 0 && toDisassociate.length === 0) {
      const currentCache = this.versionsWithDetailsCache();
      // Keep UB from existing cache or use 0
      const existingUb = this.versionsWithDetailsCache().get(versionId)?.ub ?? 0;
      currentCache.set(versionId, { nbuIds: pendingIds, ub: existingUb });
      this.versionsWithDetailsCache.set(new Map(currentCache));
      
      // Update signals
      this.preSelectedNbuIds.set(pendingIds);
      this.selectedNbuIds.set(pendingIds);
      
      // Hide spinners
      this.savingAssociations.set(false);
      this.savingVersion.set(false);
      if (this.isCreatingVersion()) {
        this.isCreatingVersion.set(false);
      }
      return;
    }
    
    // Show spinner during the entire process
    this.savingAssociations.set(true);
    
    // Prepare observables for both operations with individual error handling
    const operations: Array<Observable<{ success: boolean; errors: string[] }>> = [];
    
    // Association operation
    if (toAssociate.length > 0) {
      const associateOp = this.nbuVersionService.associateMultipleNbus(toAssociate, versionId, ub).pipe(
        map(() => ({ success: true, errors: [] as string[] })),
        catchError((error) => {
          const errorMsg = extractErrorMessage(error, 'al asociar NBUs');
          this.associationErrors.update(errors => [...errors, errorMsg]);
          return of({ success: false, errors: [errorMsg] });
        })
      );
      operations.push(associateOp);
    }
    
    // Disassociation operation
    if (toDisassociate.length > 0) {
      const disassociateOp = this.nbuVersionService.disassociateMultipleNbus(toDisassociate, versionId).pipe(
        map(() => ({ success: true, errors: [] as string[] })),
        catchError((error) => {
          const errorMsg = extractErrorMessage(error, 'al desasociar NBUs');
          this.disassociationErrors.update(errors => [...errors, errorMsg]);
          return of({ success: false, errors: [errorMsg] });
        })
      );
      operations.push(disassociateOp);
    }
    
    // If no operations to perform, just update cache
    if (operations.length === 0) {
      const currentCache = this.versionsWithDetailsCache();
      // Keep UB from existing cache or use 0
      const existingUb = this.versionsWithDetailsCache().get(versionId)?.ub ?? 0;
      currentCache.set(versionId, { nbuIds: pendingIds, ub: existingUb });
      this.versionsWithDetailsCache.set(new Map(currentCache));
      
      this.preSelectedNbuIds.set(pendingIds);
      this.selectedNbuIds.set(pendingIds);
      
      this.savingAssociations.set(false);
      this.savingVersion.set(false);
      if (this.isCreatingVersion()) {
        this.isCreatingVersion.set(false);
      }
      return;
    }
    
    // Execute both operations in parallel
    forkJoin(operations).subscribe({
      next: (_results) => {
        // Check if there were errors
        const hasErrors = this.associationErrors().length > 0 || this.disassociationErrors().length > 0;
        
        if (hasErrors) {
          // If there are errors, show alert but reload data from backend for consistency
          this.showErrorAlert.set(true);
          setTimeout(() => {
            this.showErrorAlert.set(false);
          }, 5000);
        }
        
        // Reload versions with details from backend to ensure consistency
        // This invalidates the service cache and gets fresh data
        this.loadVersionsWithDetails();
        
        // Update signals with expected state (pendingIds)
        this.preSelectedNbuIds.set(pendingIds);
        this.selectedNbuIds.set(pendingIds);
        
        // If we were creating version, also hide that spinner
        if (this.isCreatingVersion()) {
          this.savingVersion.set(false);
          this.isCreatingVersion.set(false);
        }
        
        // Hide spinner
        this.savingAssociations.set(false);
        this.savingVersion.set(false);
        this.pendingNbuIds.set([]);
      },
      error: (error) => {
        // General error in forkJoin (shouldn't happen if each operation handles its error)
        const errorMsg = extractErrorMessage(error, 'al procesar asociaciones/desasociaciones');
        this.associationErrors.set([errorMsg]);
        this.showErrorAlert.set(true);
        setTimeout(() => {
          this.showErrorAlert.set(false);
        }, 5000);
        
        this.savingAssociations.set(false);
        this.savingVersion.set(false);
        if (this.isCreatingVersion()) {
          this.isCreatingVersion.set(false);
        }
      }
    });
  }

  /**
   * Performs batch association (deprecated).
   * This method is no longer used, kept for compatibility.
   * @deprecated Use onSaveFromModal instead.
   */
  onSaveAssociations(): void {
    const versionId = this.isEditMode() 
      ? this.selectedVersion()?.id 
      : this.selectedVersion()?.id;
    
    if (versionId) {
      this.associatePendingNbus(versionId);
    }
  }

  /**
   * Batch disassociates NBUs (placeholder).
   * Intentionally left as placeholder; enable when backend supports batch disassociate.
   */
  onDisassociateBatch(): void {
    // Placeholder implementation
  }

  /**
   * Loads NBUs associated with a version.
   * Uses cache first to avoid unnecessary requests.
   */
  private loadAssociatedNbus(versionId: number): void {
    // Try to get from cache first
    const details = this.versionsWithDetailsCache().get(versionId);
    if (details) {
      this.preSelectedNbuIds.set(details.nbuIds);
      this.selectedNbuIds.set(details.nbuIds);
      if (details.ub !== undefined && details.ub !== null) {
        this.ubValue.set(details.ub);
      } else {
        this.ubValue.set(0);
      }
      return;
    }
    
    // If not in cache, make request (only as fallback)
    this.nbuVersionService.getAssociatedNbuIdsByVersion(versionId).subscribe({
      next: (idsFromDetails: number[]) => {
        const ids = idsFromDetails || [];
        this.preSelectedNbuIds.set(ids);
        this.selectedNbuIds.set(ids);
        // Load UB from cache if available, or use 0 as default
        const cachedDetails = this.versionsWithDetailsCache().get(versionId);
        const ub = cachedDetails?.ub ?? 0;
        this.ubValue.set(ub);
        // Update cache
        const currentCache = this.versionsWithDetailsCache();
        currentCache.set(versionId, { nbuIds: ids, ub });
        this.versionsWithDetailsCache.set(new Map(currentCache));
      },
      error: () => {
        // If no associated NBUs, clear
        this.preSelectedNbuIds.set([]);
        this.selectedNbuIds.set([]);
        this.ubValue.set(0);
      }
    });
  }

  /**
   * Opens the NBU association modal.
   */
  openAssociateModal(): void {
    // If we're in create mode and there's a base version, use that for preselection
    // If we're in edit mode, use the selected version
    const versionId = this.isEditMode() 
      ? this.selectedVersion()?.id 
      : this.baseVersion()?.id;
    
    if (!versionId) {
      // If there's no selected or base version, cannot open modal
      return;
    }
    
    // Load associated NBUs from cache (without additional requests)
    const details = this.versionsWithDetailsCache().get(versionId);
    if (details) {
      this.preSelectedNbuIds.set(details.nbuIds);
      this.selectedNbuIds.set(details.nbuIds);
      // Load UB if it exists (including 0)
      if (details.ub !== undefined && details.ub !== null) {
        this.ubValue.set(details.ub);
      } else {
        this.ubValue.set(0);
      }
    } else {
      // If not in cache, load (but this shouldn't happen)
      this.loadAssociatedNbus(versionId);
    }
    
    // Initialize pendingNbuIds with preselected ones
    this.pendingNbuIds.set(this.preSelectedNbuIds());
    
    this.showAssociateModal.set(true);
  }

  /**
   * Closes the association modal.
   * @param keepPending - If true, keeps pending NBUs when closing the modal.
   */
  closeAssociateModal(keepPending: boolean = false): void {
    this.showAssociateModal.set(false);
    // If we're in create mode, keep pending ones for when version is saved
    if (!this.isEditMode()) {
      // pendingNbuIds are kept for when version is created
    } else {
      // In edit mode, only clear pending if not specified to keep them
      // (when clicking "Change", keepPending will be true)
      if (!keepPending) {
        this.pendingNbuIds.set([]);
      }
    }
  }

  /**
   * Gets the UB map by NBU for a specific version.
   * @param versionId - The version ID to get the UB map for.
   * @returns A map of NBU ID to UB value.
   */
  getNbuUbMapForVersion(versionId?: number): Map<number, number> {
    if (!versionId) {
      return new Map();
    }
    return this.nbuUbMapCache().get(versionId) ?? new Map();
  }

  /**
   * Gets formatted error messages to display in the alert.
   * @returns A formatted string with all error messages.
   */
  getErrorMessages(): string {
    const associationErrs = this.associationErrors();
    const disassociationErrs = this.disassociationErrors();
    const messages: string[] = [];

    if (associationErrs.length > 0) {
      messages.push(`Errores al asociar: ${associationErrs.join('; ')}`);
    }

    if (disassociationErrs.length > 0) {
      messages.push(`Errores al desasociar: ${disassociationErrs.join('; ')}`);
    }

    return messages.length > 0 ? messages.join('\n') : 'Ocurrió un error inesperado.';
  }
}