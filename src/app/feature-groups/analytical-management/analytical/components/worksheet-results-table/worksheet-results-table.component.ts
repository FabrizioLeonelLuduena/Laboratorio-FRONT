import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';

import { AnalysisSection } from '../../models/worksheet/worksheet-form.interface';

/**
 * Inverted table component for entering results
 * Rows = Determinations, Columns = Patients/Samples
 * According to API: each analysis has patients[] and determinations[]
 */
@Component({
  selector: 'app-worksheet-results-table',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule],
  templateUrl: './worksheet-results-table.component.html',
  styleUrls: ['./worksheet-results-table.component.css']
})
export class WorksheetResultsTableComponent {
  @Input({ required:true }) analysis!: AnalysisSection;
  @Input({ required:true }) formValues: Record<string, string> = {};

  @Output() valueChange = new EventEmitter<{ analysisId: number; sampleId: number; determinationId: number; value: string }>();

  // Paginación - usar patients del analysis
  pageSize = 11;
  currentPage = signal(0);

  // Computed property para obtener los pacientes paginados
  paginatedPatients = computed(() => {
    const start = this.currentPage();
    const patients = this.analysis?.patients || [];
    return patients.slice(start, start + this.pageSize);
  });

  /**
   * Advances to the next page of patients if available
   * Updates the current page index by adding the page size
   */
  nextPage(): void {
    const totalPatients = this.analysis?.patients?.length || 0;
    if ((this.currentPage() + this.pageSize) < totalPatients) {
      this.currentPage.set(this.currentPage() + this.pageSize);
    }
  }

  /**
   * Returns to the previous page of patients if available
   * Updates the current page index by subtracting the page size
   */
  prevPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.set(this.currentPage() - this.pageSize);
    }
  }

  /**
   * Get value for a specific cell
   */
  getValue(sampleId: number, determinationId: number): string {
    const key = `${sampleId}_${this.analysis!.analysisId}_${determinationId}`;
    return this.formValues[key] || '';
  }

  /**
   * Handle value change
   */
  onValueChange(sampleId: number, determinationId: number, value: string): void {
    this.valueChange.emit({
      sampleId,
      analysisId: this.analysis!.analysisId,
      determinationId,
      value
    });
  }

  /**
   * Maneja el input del usuario, sanitizea el valor y emite al padre
   */
  onInput(sampleId: number, determinationId: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    let raw = target.value ?? '';
    raw = String(raw).trim();
    // Normalizar coma decimal a punto
    let normalized = raw.replace(/,/g, '.');
    // Evitar cadena literal 'NaN' (insensible a mayúsculas)
    if (normalized.toLowerCase() === 'nan') normalized = '';
    // Emitir el valor (vacío si quedó inválido)
    this.onValueChange(sampleId, determinationId, normalized);
  }

  /**
   * Format date for display. Accepts either ISO string or array [y,m,d,h,min]
   */
  formatDate(dateLike: string | number[]): string {
    if (!dateLike) return '';
    let date: Date;
    if (Array.isArray(dateLike)) {
      const [y, m, d, hh = 0, mm = 0] = dateLike as number[];
      // month in input seems 1-based; convert to 0-based for JS Date
      date = new Date(y, (m || 1) - 1, d || 1, hh, mm);
    } else {
      date = new Date(dateLike as string);
    }
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  /**
   * Handles keyboard navigation between input cells
   * Supports arrow keys (up, down, left, right) and Tab
   */
  onKeyDown(event: KeyboardEvent, rowIndex: number, colIndex: number): void {
    const key = event.key;
    const totalRows = this.analysis?.determinations?.length || 0;
    const totalCols = this.paginatedPatients().length;

    let nextRow = rowIndex;
    let nextCol = colIndex;
    let shouldPreventDefault = false;

    switch (key) {
    case 'ArrowUp':
      nextRow = rowIndex > 0 ? rowIndex - 1 : rowIndex;
      shouldPreventDefault = true;
      break;

    case 'ArrowDown':
      nextRow = rowIndex < totalRows - 1 ? rowIndex + 1 : rowIndex;
      shouldPreventDefault = true;
      break;

    case 'ArrowLeft':
      nextCol = colIndex > 0 ? colIndex - 1 : colIndex;
      shouldPreventDefault = true;
      break;

    case 'ArrowRight':
      nextCol = colIndex < totalCols - 1 ? colIndex + 1 : colIndex;
      shouldPreventDefault = true;
      break;

    case 'Tab':
      if (event.shiftKey) {
        // Shift+Tab: navigate backwards
        if (colIndex > 0) {
          nextCol = colIndex - 1;
        } else if (rowIndex > 0) {
          nextRow = rowIndex - 1;
          nextCol = totalCols - 1;
        }
      } else {
        // Tab: navigate to the right, then down
        if (colIndex < totalCols - 1) {
          nextCol = colIndex + 1;
        } else if (rowIndex < totalRows - 1) {
          nextRow = rowIndex + 1;
          nextCol = 0;
        }
      }
      shouldPreventDefault = true;
      break;
    }

    // If position changed, focus the next input
    if ((nextRow !== rowIndex || nextCol !== colIndex) && shouldPreventDefault) {
      event.preventDefault();
      this.focusInput(nextRow, nextCol);
    }
  }

  /**
   * Focus the input at the specified row and column
   */
  private focusInput(rowIndex: number, colIndex: number): void {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      const input = document.querySelector(
        `input[data-row="${rowIndex}"][data-col="${colIndex}"]`
      ) as HTMLInputElement;

      if (input) {
        input.focus();
        input.select(); // Select all text for easy overwriting
      }
    }, 0);
  }

  protected readonly Math = Math;
}
