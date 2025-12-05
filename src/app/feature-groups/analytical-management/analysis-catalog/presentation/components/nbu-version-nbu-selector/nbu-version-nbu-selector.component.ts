import { CommonModule } from '@angular/common';
import { Component, input, output, signal, computed, inject, OnInit, effect, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { GenericBadgeComponent } from 'src/app/shared/components/generic-badge/generic-badge.component';
import { GenericTableComponent } from 'src/app/shared/components/generic-table/generic-table.component';

import { NbuService } from '../../../application/nbu.service';
import { Nbu } from '../../../domain/nbu.model';

/**
 * Selector component for choosing NBUs to associate with a version.
 * Displays available NBUs in a table with checkboxes for multiple selection.
 * 
 * Features:
 * - Multiple selection with checkboxes
 * - Search/filter by code, determination
 * - Shows current version for each NBU
 * - Disabled state for pre-selected NBUs
 * - Real-time selection count
 * 
 * @example
 * <app-nbu-version-nbu-selector
 *   [versionId]="selectedVersionId()"
 *   [preSelectedNbuIds]="existingNbuIds()"
 *   (nbusSelected)="onNbusSelected($event)" />
 */
@Component({
  selector: 'app-nbu-version-nbu-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CheckboxModule,
    InputTextModule,
    GenericBadgeComponent,
    GenericTableComponent
  ],
  templateUrl: './nbu-version-nbu-selector.component.html',
  styleUrl: './nbu-version-nbu-selector.component.css'
})
export class NbuVersionNbuSelectorComponent implements OnInit, AfterViewInit {
  private readonly nbuService = inject(NbuService);

  /** Version ID for context (optional, for display purposes) */
  versionId = input<number | undefined>();

  /** NBU IDs that are already associated with the version (pre-selected and disabled) */
  preSelectedNbuIds = input<number[]>([]);

  /** Map of NBU ID to UB value for the current version */
  nbuUbMap = input<Map<number, number>>(new Map());

  /** Emitted when the selection changes */
  nbusSelected = output<number[]>();

  /** All available NBUs loaded from the service */
  availableNbus = signal<Nbu[]>([]);

  /** Set of currently selected NBU IDs */
  selectedIds = signal<Set<number>>(new Set());

  /** Search/filter text */
  searchText = signal<string>('');

  /** Loading state */
  loading = signal<boolean>(false);

  /** Column definitions for GenericTable */
  tableColumns = [
    { field: 'selection', header: '' },
    { field: 'nbuCode', header: 'Código NBU' },
    { field: 'determination', header: 'Determinación' },
    { 
      field: 'ub', 
      header: 'UB',
      nullDisplay: '-',
      pipes: [{ name: 'number', args: ['1.2-2'] }] // Formato con 2 decimales
    },
    // { field: 'currentVersionLabel', header: 'Versión actual' }, // Comentada según solicitud
    { field: 'stateText', header: 'Estado' }
  ];

  /** Column templates map for GenericTable */
  columnTemplates: Map<string, TemplateRef<any>> = new Map();

  /** Templates references */
  @ViewChild('selectionTpl') selectionTpl!: TemplateRef<any>;
  @ViewChild('stateTpl') stateTpl!: TemplateRef<any>;

  /** Computed: Filtered NBUs based on search text */
  filteredNbus = computed(() => {
    const search = this.searchText().toLowerCase().trim();
    const nbus = this.availableNbus();

    if (!search) {
      return nbus;
    }

    return nbus.filter(nbu => 
      nbu.nbuCode?.toString().toLowerCase().includes(search) ||
      nbu.determination?.toLowerCase().includes(search)
    );
  });

  /** Computed: rows adapted for the GenericTable */
  tableRows = computed(() => {
    const filtered = this.filteredNbus();
    const selected = this.selectedIds();
    const preSelected = this.preSelectedNbuIds();
    const ubMap = this.nbuUbMap();
    return filtered.map(nbu => {
      const isPre = preSelected.includes(nbu.id);
      const isSel = selected.has(nbu.id);
      return {
        ...nbu,
        currentVersionLabel: this.getCurrentVersionLabel(nbu),
        ub: ubMap.get(nbu.id) ?? null,
        stateText: (isPre && isSel) ? 'Preseleccionado' : isSel ? 'Seleccionado' : 'Disponible'
      };
    });
  });

  /** Computed: Selection count for display */
  selectionCount = computed(() => this.selectedIds().size);

  /** Computed: Check if all filtered items are selected */
  allSelected = computed(() => {
    const filtered = this.filteredNbus();
    const selected = this.selectedIds();
    return filtered.length > 0 && filtered.every(nbu => selected.has(nbu.id));
  });

  /** Computed: Check if some (but not all) filtered items are selected */
  indeterminate = computed(() => {
    const filtered = this.filteredNbus();
    const selected = this.selectedIds();
    const someSelected = filtered.some(nbu => selected.has(nbu.id));
    const allSelected = this.allSelected();
    return someSelected && !allSelected;
  });

  /**
   * Initializes the component with effects for selection management
   */
  constructor() {
    // Effect to emit selection changes
    effect(() => {
      const ids = Array.from(this.selectedIds());
      this.nbusSelected.emit(ids);
    });

    // Reinitialize selection when preSelectedNbuIds input changes
    effect(() => {
      const preSelected = this.preSelectedNbuIds();
      // If parent updates preSelected (e.g., after selecting a version), reflect it here
      if (preSelected && preSelected.length >= 0) {
        this.selectedIds.set(new Set(preSelected));
      }
    });

  }

  /**
   * Binds templates to column fields after view initialization
   */
  ngAfterViewInit(): void {
    // Bind templates to column fields for GenericTable
    this.columnTemplates.set('selection', this.selectionTpl);
    this.columnTemplates.set('stateText', this.stateTpl);
  }

  /**
   * Initializes component and loads NBUs on component initialization
   */
  ngOnInit(): void {
    this.loadNbus();
  }

  /**
   * Loads all available NBUs from the service
   */
  private loadNbus(): void {
    this.loading.set(true);

    this.nbuService.getNbus().subscribe({
      next: (nbus) => {
        this.availableNbus.set(nbus);
        this.initializeSelection();
        this.loading.set(false);
      },
      error: () => {
        // console.error('Error loading NBUs:', error);
        this.loading.set(false);
      }
    });
  }

  /**
   * Initializes selection with pre-selected NBU IDs
   */
  private initializeSelection(): void {
    const preSelected = this.preSelectedNbuIds();
    if (preSelected.length > 0) {
      this.selectedIds.set(new Set(preSelected));
    }
  }

  /**
   * Handles individual checkbox change
   */
  onSelectionChange(nbuId: number, selected: boolean): void {
    const ids = new Set(this.selectedIds());
    
    if (selected) {
      ids.add(nbuId);
    } else {
      ids.delete(nbuId);
    }
    
    this.selectedIds.set(ids);
  }

  /**
   * Handles "Select All" checkbox
   */
  onSelectAll(selected: boolean): void {
    const ids = new Set(this.selectedIds());
    const filtered = this.filteredNbus();

    filtered.forEach(nbu => {
      if (selected) {
        ids.add(nbu.id);
      } else {
        ids.delete(nbu.id);
      }
    });

    this.selectedIds.set(ids);
  }

  /**
   * Checks if an NBU is selected
   */
  isSelected(nbuId: number): boolean {
    return this.selectedIds().has(nbuId);
  }

  /**
   * Checks if an NBU is pre-selected (and should be disabled)
   */
  isPreSelected(nbuId: number): boolean {
    return this.preSelectedNbuIds().includes(nbuId);
  }

  /**
   * Gets the current version label for an NBU
   */
  getCurrentVersionLabel(nbu: Nbu): string {
    if (!nbu.nbuVersionDetails?.[0]?.nbuVersion) {
      return 'Sin versión';
    }

    const version = nbu.nbuVersionDetails[0].nbuVersion;
    return `${version.versionCode || 'N/A'} (${version.publicationYear || 'N/A'})`;
  }


  /**
   * Handles search input change
   */
  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText.set(input.value);
  }

  /**
   * Clears the search filter
   */
  clearSearch(): void {
    this.searchText.set('');
  }

  /**
   * Sync global filter from GenericTable
   */
  onGlobalFilterChange(value: string): void {
    this.searchText.set(value);
  }
}
