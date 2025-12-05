import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  inject, signal
} from '@angular/core';

import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { Subscription, forkJoin, map, timer } from 'rxjs';

import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericBadgeComponent } from '../../../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from '../../../../../shared/components/generic-modal/generic-modal.component';
import { GenericTableComponent } from '../../../../../shared/components/generic-table/generic-table.component';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner.component';
import { GenericColumn } from '../../../../../shared/models/generic-table.models';
import { AttentionNumberPipe } from '../../../../../shared/pipes/attention-number.pipe';
import { BreadcrumbService } from '../../../../../shared/services/breadcrumb.service';
import { PatientService } from '../../../../patients/services/PatientService';
import { InternalUser } from '../../../../user-management/models/InternalUser';
import {
  AssignExtractorToAttentionRequest,
  AttentionResponse
} from '../../../models/attention.models';
import { Branch } from '../../../models/branch';
import { ExtractorBox } from '../../../models/extractor-box';
import { AttentionService } from '../../../services/attention.service';
import { BranchService } from '../../../services/branch.service';
import { BoxConfigDialogComponent } from '../box-config-dialog/box-config-dialog.component';
import { ExtractionDialogComponent } from '../extraction-dialog/extraction-dialog.component';
/**
 *
 */
@Component({
  selector: 'app-extraction-queue',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    GenericBadgeComponent,
    GenericButtonComponent,
    GenericAlertComponent,
    GenericTableComponent,
    GenericModalComponent,
    BoxConfigDialogComponent,
    SpinnerComponent,
    BoxConfigDialogComponent,
    AttentionNumberPipe
  ],
  templateUrl: './extraction-queue.component.html',
  styleUrls: ['./extraction-queue.component.css']
})
export class ExtractionQueueComponent
implements OnInit, OnDestroy, AfterViewInit
{
  // Injected services
  private attentionService = inject(AttentionService);
  private patientService = inject(PatientService);
  private dialogService = inject(DialogService);
  private branchService = inject(BranchService);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);

  loading = signal<boolean>(false);

  private static readonly STORAGE_KEY_PREFIX = 'extraction_boxes_branch_';
  private attentionsSub?: Subscription;
  private pollingSub?: Subscription;
  flash?: {
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
    title?: string;
  };
  awaitingExtractions: AttentionResponse[] = [];
  inExtractions: AttentionResponse[] = [];
  branchStorage: Branch | null = null;
  boxesNumber: number = 0;
  ref?: DynamicDialogRef; // For ExtractionDialogComponent (not yet migrated)

  selectedExtractor: ExtractorBox | null = null;

  extractors: ExtractorBox[] = [];

  // Box config modal state
  showBoxConfigModal = false;

  // Columns definitions for the generic table components
  awaitingColumns: GenericColumn[] = [
    { field: 'attentionNumber', header: 'N° extracción' },
    { field: 'dni', header: 'Documento' },
    { field: 'fullName', header: 'Paciente' },
    { field: 'isUrgent', header: 'Urgente' },
    { field: 'actions', header: 'Acciones' }
  ];

  inColumns: GenericColumn[] = [
    { field: 'attentionNumber', header: 'N° extracción' },
    { field: 'dni', header: 'Documento' },
    { field: 'fullName', header: 'Paciente' },
    { field: 'boxAssigned', header: 'Box asignado' },
    { field: 'end', header: 'Acciones' }
  ];

  // Template refs maps to pass to the generic table
  columnTemplatesAwaiting: Map<string, TemplateRef<any>> = new Map();
  columnTemplatesIn: Map<string, TemplateRef<any>> = new Map();

  // TemplateRef bindings — templates are defined in the component HTML
  @ViewChild('attentionNumberTpl') attentionNumberTpl!: TemplateRef<any>;
  @ViewChild('urgentTpl') urgentTpl!: TemplateRef<any>;
  @ViewChild('actionsTpl') actionsTpl!: TemplateRef<any>;
  @ViewChild('boxAssignedTpl') boxAssignedTpl!: TemplateRef<any>;
  @ViewChild('endTpl') endTpl!: TemplateRef<any>;

  /** Lifecycle: on component initialization */
  ngOnInit(): void {
    this.breadcrumbService.setFromString('Gestión de atenciones > Extracciones');
    this.loadBranchData();
    this.pollingSub = timer(30000, 30000).subscribe(() => {
      this.loadAttentions();
    });
  }

  /**
   * After the view initializes we register TemplateRefs used by the generic tables.
   */
  ngAfterViewInit(): void {
    // Register templates for the generic table after the view initializes
    // Awaiting table: urgent badge + actions button
    if (this.attentionNumberTpl) {
      this.columnTemplatesAwaiting.set('attentionNumber', this.attentionNumberTpl);
      this.columnTemplatesIn.set('attentionNumber', this.attentionNumberTpl);
    }
    if (this.urgentTpl)
      this.columnTemplatesAwaiting.set('isUrgent', this.urgentTpl);
    if (this.actionsTpl)
      this.columnTemplatesAwaiting.set('actions', this.actionsTpl);

    // In-extraction table: urgent badge + boxAssigned template
    if (this.boxAssignedTpl)
      this.columnTemplatesIn.set('boxAssigned', this.boxAssignedTpl);
    if (this.endTpl) this.columnTemplatesIn.set('end', this.endTpl);

    // Trigger change detection in case any templates affect rendering
    this.cdr.markForCheck();
  }

  /** Fetches branch info from local storage and backend */
  loadBranchData(): void {
    const userAuthString = localStorage.getItem('auth_user');
    let branchId: number | null = null;

    if (userAuthString) {
      try {
        const userAuthObject = JSON.parse(userAuthString);
        branchId = userAuthObject?.branch;
      } catch {
        this.showFlashMessage(
          'warning',
          'Error al recuperar información de la sesión actual.'
        );
      }
    }

    if (branchId) {
      this.branchService.getBranchById(branchId).subscribe({
        next: (branch) => {
          if (branch) {
            this.branchStorage = branch;
            this.boxesNumber = branch.boxCount ?? 3;
          } else {
            this.showFlashMessage('warning', 'No se encontró información de la sucursal, usando 3 boxes por defecto.');
            this.boxesNumber = 3;
          }
          this.createBoxes();
          this.loadAttentions();
        },
        error: () => {
          this.boxesNumber = 3;
          this.showFlashMessage(
            'warning',
            'Error al cargar datos de la sucursal, usando 3 boxes por defecto.'
          );
          this.createBoxes();
          this.loadAttentions();
        }
      });
    } else {
      this.showFlashMessage(
        'warning',
        'No se pudo determinar la sucursal, usando 3 boxes por defecto.'
      );
      this.boxesNumber = 3;
      this.createBoxes();
      this.loadAttentions();
    }
  }

  /** Creates extractor boxes based on branch configuration */
  createBoxes(): void {
    this.extractors = [];
    for (let i = 1; i <= this.boxesNumber; i++) {
      this.extractors.push({
        id: i,
        name: `Box ${i}`,
        key: `${i}`,
        assignedUser: null
      });
    }

    this.loadExtractorsFromStorage();
  }

  /** Lifecycle: clean subscriptions on destroy */
  ngOnDestroy(): void {
    this.ref?.close();
    this.attentionsSub?.unsubscribe();
    this.pollingSub?.unsubscribe();
  }

  /** Loads attentions and enriches them with patient data */
  loadAttentions() {
    this.loading.set(true);
    this.attentionsSub?.unsubscribe();
    this.attentionsSub = forkJoin({
      inExtraction: this.attentionService.getInExtraction(),
      awaitingExtraction: this.attentionService.getAwaitingExtraction()
    }).subscribe({
      next: ({ inExtraction, awaitingExtraction }) => {
        // Combine both lists into one for enrichment
        const allAttentions = [...inExtraction, ...awaitingExtraction];

        if (allAttentions.length === 0) {
          this.awaitingExtractions = [];
          this.inExtractions = [];
          this.loading.set(false);
          this.cdr.markForCheck();
          return;
        }

        const requests = allAttentions.map((att) =>
          this.patientService.getPatientById(att.patientId).pipe(
            map(
              (patient) =>
                ({
                  ...att,
                  patient,
                  dni: patient.dni,
                  firstName: patient.firstName,
                  lastName: patient.lastName,
                  fullName: `${patient.lastName} ${patient.firstName}`,
                  urgentLabel: att.isUrgent ? 'Sí' : 'No',
                  boxAssigned: this.getBoxAssigned(att)
                } as AttentionResponse)
            )
          )
        );

        forkJoin(requests).subscribe((data) => {
          // Sort by urgency first, then by admission date ascending
          const sorted = data.sort((a, b) => {
            if (a.isUrgent !== b.isUrgent) {
              // Urgent attentions go first
              return a.isUrgent ? -1 : 1;
            }
            // Then sort by admission_date (earlier first)
            return (
              new Date(a.admissionDate).getTime() -
              new Date(b.admissionDate).getTime()
            );
          });

          // Split back to state
          this.awaitingExtractions = sorted.filter(
            (a) => a.attentionState === 'AWAITING_EXTRACTION'
          );
          this.inExtractions = sorted.filter(
            (a) => a.attentionState === 'IN_EXTRACTION'
          );
          this.loading.set(false);
          this.cdr.markForCheck();
        });
      }
    });
  }

  /**
   * Key helper for localStorage. We store per-branch so different branches keep their own config.
   */
  private getStorageKey(branchId?: number | null): string {
    return `${ExtractionQueueComponent.STORAGE_KEY_PREFIX}${branchId ?? 'default'}`;
  }

  /** Saves the current extractor configuration to localStorage. */
  private saveExtractorsToStorage(): void {
    try {
      const key = this.getStorageKey(this.branchStorage?.id ?? null);
      const toStore = this.extractors.map(e => ({ id: e.id, key: e.key, assignedUser: e.assignedUser }));
      localStorage.setItem(key, JSON.stringify(toStore));
    } catch {
      this.showFlashMessage('error', 'No se pudo guardar la configuración de los boxes.', 'Error de almacenamiento');
    }
  }

  /** Loads stored configuration and merges it with the newly created boxes. */
  private loadExtractorsFromStorage(): void {
    try {
      const key = this.getStorageKey(this.branchStorage?.id ?? null);
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{ id: number; key: string; assignedUser: Partial<InternalUser> | null }>;
      if (!Array.isArray(parsed)) return;

      this.extractors = this.extractors.map(box => {
        const found = parsed.find(p => String(p.key) === String(box.key) || p.id === box.id);
        if (found && found.assignedUser) {
          return { ...box, assignedUser: found.assignedUser } as ExtractorBox;
        }
        return box;
      });
    } catch {
      this.showFlashMessage('warning', 'No se pudo cargar la configuración de un box guardada previamente.', 'Configuración corrupta');
    }
  }

  /** Returns an attention back to the queue */
  returnToQueue(attention: AttentionResponse) {
    this.attentionService
      .cancelExtractionProcess(attention.attentionId)
      .subscribe(() => this.loadAttentions());
  }

  /** Gets the name of the assigned box or '-' if none */
  getBoxAssigned(attention: AttentionResponse): string {
    if (!attention.attentionBox) return '-';
    const extractor = this.extractors.find(
      (e) => e.key === String(attention.attentionBox)
    );
    return extractor ? extractor.name : '-';
  }

  /** Listens for keys 1–3 to select an extractor */
  @HostListener('window:keydown', ['$event'])
  handleKey(event: KeyboardEvent) {
    const extractor = this.extractors.find((e) => e.key === event.key);
    if (!extractor) return;

    const assigned = this.inExtractions.find(
      (a) =>
        a.attentionBox === parseInt(extractor.key) &&
        a.attentionState === 'IN_EXTRACTION'
    );

    if (assigned) {
      this.openDialog(assigned, extractor, 'close');
    } else {
      this.selectedExtractor = extractor;
    }
  }

  /** Allows manual extractor selection (optional) */
  selectExtractor(ext: ExtractorBox) {
    if (this.isExtractorSelected(ext)) {
      this.selectedExtractor = null;
      return;
    }
    this.selectedExtractor = ext;
  }

  /** Checks if extractor is currently selected */
  isExtractorSelected(extractor: ExtractorBox): boolean {
    return this.selectedExtractor?.id === extractor.id;
  }

  /** Gets the display name for an extractor (username if assigned, otherwise box name) */
  getExtractorDisplayName(extractor: ExtractorBox): string {
    if (extractor.assignedUser) {
      const user = extractor.assignedUser;
      return user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.username;
    }
    return extractor.name;
  }

  /** Handles the "Attend" button click */
  onAttendClick(attention: AttentionResponse) {
    if (!this.selectedExtractor) {
      this.showFlashMessage(
        'warning',
        'Por favor, seleccioná un extractor presionando su tecla asignada.'
      );
      return;
    }

    if (!this.selectedExtractor.assignedUser) {
      this.showFlashMessage(
        'warning',
        'El box seleccionado no tiene un usuario asignado. Configuralo primero.'
      );
      return;
    }

    const boxNumber = parseInt(this.selectedExtractor.key, 10);
    const hasActiveExtraction = this.inExtractions.some(e => e.attentionBox === boxNumber && e.attentionState === 'IN_EXTRACTION');
    if (hasActiveExtraction) {
      this.showFlashMessage('warning', 'El box seleccionado ya tiene un paciente en extracción. Finalizá la extracción antes de atender otro paciente.');
      return;
    }

    this.patientService.getPatientById(attention.patientId).subscribe({
      next: (patient) => {
        const enrichedAttention = { ...attention, patient };
        if (this.selectedExtractor) {
          this.openDialog(enrichedAttention, this.selectedExtractor, 'start');
        }
      },
      error: () =>
        this.showFlashMessage(
          'error',
          'No se pudo obtener la información del paciente.',
          'Error'
        )
    });
  }

  /** Handles the "End" button click */
  onEndClick(attention: AttentionResponse) {
    if (!this.selectedExtractor) {
      this.showFlashMessage(
        'warning',
        'Por favor, seleccioná un extractor presionando su tecla asignada.'
      );
      return;
    }

    if (!this.selectedExtractor.assignedUser) {
      this.showFlashMessage(
        'warning',
        'El box seleccionado no tiene un usuario asignado. Configuralo primero.'
      );
      return;
    }
    if (this.selectedExtractor.assignedUser.id !== attention.employeeId) {
      this.showFlashMessage(
        'warning',
        'El box seleccionado tiene otro usuario asignado.'
      );
      return;
    }
    this.patientService.getPatientById(attention.patientId).subscribe({
      next: (patient) => {
        const enrichedAttention = { ...attention, patient };
        if (this.selectedExtractor) {
          this.openDialog(enrichedAttention, this.selectedExtractor, 'close');
        }
      },
      error: () =>
        this.showFlashMessage(
          'error',
          'No se pudo obtener la información del paciente.',
          'Error'
        )
    });
  }

  /** Shows a transient generic alert using the shared component */
  private showFlashMessage(
    type: 'success' | 'error' | 'warning' | 'info',
    text: string,
    title?: string
  ) {
    this.flash = { type, text, title };
    // Clear after a short timeout
    setTimeout(() => {
      this.flash = undefined;
      this.cdr.markForCheck();
    }, 5000);
  }

  /** Opens dialog for starting or closing an attention */
  openDialog(
    attention: AttentionResponse,
    extractor: ExtractorBox,
    mode: 'start' | 'close'
  ) {
    this.ref = this.dialogService.open(ExtractionDialogComponent, {
      header:
        mode === 'start'
          ? `Extraer : ${attention.attentionNumber} | ${extractor.name}`
          : `Cerrar extracción: ${attention.attentionNumber} | ${extractor.name}`,
      width: '40vw',
      data: { attention, extractor, mode },
      closable: false
    });

    this.ref.onClose.subscribe((result: any) => {
      if (!result) {
        if (mode === 'start') this.selectedExtractor = null;
        return;
      }

      if (result.liberar) {
        this.returnToQueue(attention);
        return;
      }

      if (mode === 'start') {
        const dto: AssignExtractorToAttentionRequest = {
          extractorId: extractor.assignedUser!.id,
          attentionBox: parseInt(extractor.key)
        };

        this.attentionService
          .assignExtractorToAttention(attention.attentionId, dto)
          .subscribe(() => {
            this.selectedExtractor = null;
            this.loadAttentions();
          });
      } else if (mode === 'close') {
        if (result.notes && result.notes.trim() !== '') {
          this.attentionService
            .addObservationsToAttention(attention.attentionId, {
              observations: result.notes
            })
            .subscribe();
        }

        this.attentionService
          .endAttentionByExtractorProcess(attention.attentionId)
          .subscribe(() => this.loadAttentions());
      }
    });
  }

  /** Opens the box configuration dialog */
  openBoxConfig(): void {
    this.showBoxConfigModal = true;
  }

  /** Closes the box configuration dialog */
  closeBoxConfig(): void {
    this.showBoxConfigModal = false;
  }

  /** Handle box configuration result */
  onBoxConfigResult(result: any): void {
    if (result) {
      const idx = this.extractors.findIndex(
        (e) => e.id === result.extractor.id
      );
      if (idx !== -1) {
        if (result.clear) {
          this.extractors[idx].assignedUser = null;
          if (this.selectedExtractor?.id === result.extractor.id) {
            this.selectedExtractor = null;
          }
        } else {
          this.extractors[idx].assignedUser = {
            ...result.user
          };
          this.selectedExtractor = this.extractors[idx];
        }
        this.extractors = [...this.extractors];
        this.saveExtractorsToStorage();
      }
    }
    this.closeBoxConfig();
  }
}
