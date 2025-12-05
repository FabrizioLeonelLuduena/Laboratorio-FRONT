import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CalendarModule } from 'primeng/calendar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';

import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { ProtocolResponse } from '../../../pre-analytical/models/protocol.interface';

/**
 * Component for searching and selecting protocols.
 */
@Component({
  selector: 'app-protocol-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CalendarModule,
    SelectModule,
    ProgressSpinnerModule,
    GenericButtonComponent
  ],
  templateUrl: './protocol-search.component.html',
  styleUrl: './protocol-search.component.css',
  encapsulation: ViewEncapsulation.None
})
export class ProtocolSearchComponent {

  /** List of protocols to display */
  @Input() set protocols(value: ProtocolResponse[]) {
    this._protocols = value;
    this.updateProtocolOptions();
    // Auto-select if there's only one protocol
    if (value.length === 1 && !this.selectedProtocol) {
      this.selectedProtocol = value[0];
      this.selectedProtocolId = this.formatProtocolOption(value[0]);
      this.protocolSelected.emit(value[0]);
    }
  }

  /** Returns the list of protocols */
  get protocols(): ProtocolResponse[] {
    return this._protocols;
  }
  private _protocols: ProtocolResponse[] = [];

  /** Options for the select dropdown */
  protocolOptions: { label: string; value: string }[] = [];

  /** Selected protocol ID from dropdown */
  selectedProtocolId: string | null = null;

  /** Loading flag used to show/hide spinners */
  @Input() isLoading = false;

  /** Currently selected protocol */
  @Input() selectedProtocol: ProtocolResponse | null = null;

  /**
   * Emits the selected (or deselected) protocol.
   * Used by the parent component to update the detail view.
   */
  @Output() protocolSelected = new EventEmitter<ProtocolResponse | null>();

  /**
   * Emits filter data:
   * - optional start date
   * - optional end date
   */
  @Output() searchFilters = new EventEmitter<{
    start?: string;
    end?: string;
  }>();

  /** Selected start date for filtering */
  startDate: Date = new Date();

  /** Selected end date for filtering */
  endDate: Date = new Date();

  /** Maximum date for date pickers (today) */
  maxDate: Date = new Date();

  /** Minimum date for end date picker (startDate) */
  get minEndDate(): Date | undefined {
    return this.startDate;
  }

  /** Maximum date for start date picker (endDate or today, whichever is earlier) */
  get maxStartDate(): Date | undefined {
    return this.endDate || this.maxDate;
  }

  /**
   * Handles protocol selection from dropdown.
   *
   * @param protocol The selected protocol.
   */
  onProtocolSelected(protocol: ProtocolResponse | null) {
    this.selectedProtocol = protocol;
    this.protocolSelected.emit(protocol);
  }

  /**
   * Handles protocol ID change from select.
   *
   * @param protocolId The selected protocol ID.
   */
  onProtocolIdChange(protocolId: string | null) {
    if (!protocolId) {
      this.selectedProtocol = null;
      this.protocolSelected.emit(null);
      return;
    }

    const found = this._protocols.find(p => this.formatProtocolOption(p) === protocolId);
    this.selectedProtocol = found || null;
    this.protocolSelected.emit(found || null);
  }

  /**
   * Updates the protocol options for the select dropdown.
   */
  private updateProtocolOptions(): void {
    this.protocolOptions = this._protocols.map(p => ({
      label: `#${p.id} - ${p.patientName}`,
      value: this.formatProtocolOption(p)
    }));
  }

  /**
   * Formats a protocol into a unique string identifier.
   */
  private formatProtocolOption(protocol: ProtocolResponse): string {
    return `${protocol.id}`;
  }

  /**
   * Called when date fields change.
   * Emits selected date filters with time boundaries.
   * Clears the selected protocol if one is currently selected.
   */
  onDateChange() {
    // Clear selected protocol if one is selected
    if (this.selectedProtocol) {
      this.selectedProtocol = null;
      this.selectedProtocolId = null;
      this.protocolSelected.emit(null);
    }

    const start = this.startDate
      ? `${this.startDate.toISOString().split('T')[0]}T00:00:00`
      : undefined;

    const end = this.endDate
      ? `${this.endDate.toISOString().split('T')[0]}T23:59:59`
      : undefined;

    this.searchFilters.emit({ start, end });
  }
}
