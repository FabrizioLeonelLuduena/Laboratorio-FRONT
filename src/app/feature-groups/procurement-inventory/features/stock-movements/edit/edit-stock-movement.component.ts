import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import { StockMovementsService } from '../../../services/stock-movements/stock-movements.service';

/**
 * Interface for stock movement detail from backend
 */
interface StockMovementDetail {
  id: number;
  quantity: number;
  notes?: string;
  batch?: {
    id: number;
    batchNumber: string;
    expirationDate: string | number[];
  };
  supply?: {
    id: number;
    name: string;
  };
}

/**
 * Interface for stock movement data from backend
 */
interface StockMovementData {
  id: number;
  movementType: string;
  movementDate: string;
  details?: StockMovementDetail[];
}

/**
 * Interface for form data from generic form component
 */
interface StockMovementFormData {
  quantity: string;
  batchNumber: string;
  expirationDate: string;
  notes?: string;
}

/**
 * Component to edit stock movement details
 * Currently supports editing PURCHASE (Entrada) movements
 * Allows editing: quantity, batch number, expiration date, and notes
 */
@Component({
  selector: 'app-edit-stock-movement',
  standalone: true,
  imports: [
    CommonModule,
    GenericFormComponent
  ],
  templateUrl: './edit-stock-movement.component.html',
  styleUrls: ['./edit-stock-movement.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditStockMovementComponent implements OnInit {
  // Form fields configuration
  formFields: GenericFormField[] = [
    {
      name: 'quantity',
      label: 'Cantidad',
      type: 'number',
      required: true,
      placeholder: '0',
      colSpan: 1 // Ocupa 1 de 2 columnas (mitad del renglón)
    },
    {
      name: 'batchNumber',
      label: 'Lote',
      type: 'text',
      required: false,
      placeholder: 'Ej: L-001',
      colSpan: 1 // Ocupa 1 de 2 columnas (mitad del renglón, mismo que cantidad)
    },
    {
      name: 'expirationDate',
      label: 'Fecha de Vencimiento',
      type: 'date',
      required: false,
      placeholder: 'dd/mm/aaaa',
      colSpan: 1 // Ocupa 1 de 2 columnas (mismo tamaño que cantidad)
    },
    {
      name: 'notes',
      label: 'Notas',
      type: 'textarea',
      placeholder: 'Notas adicionales',
      rows: 3,
      colSpan: 2 // Ocupa las 2 columnas (ancho completo)
    }
  ];

  // Movement data
  movementData?: StockMovementData;
  detailData?: StockMovementDetail;

  // State
  movementId!: number;
  loading = false;
  saving = false;


  private stockMovementsService = inject(StockMovementsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);

  /**
   * Component initialization
   * Loads movement data
   */
  ngOnInit(): void {
    this.movementId = +this.route.snapshot.paramMap.get('id')!;
    this.breadcrumbService.setFromString(
      'Compras e inventario > Movimientos de stock > Editar',
      '/procurement-inventory/stock-movements'
    );

    // Load movement data
    this.loadMovement();
  }

  /**
   * Load movement data from backend
   */
  private loadMovement(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.stockMovementsService.getStockMovementById(this.movementId).subscribe({
      next: (movement: StockMovementData) => {
        this.movementData = movement;

        // Check if it's a PURCHASE or RETURN movement
        if (movement.movementType !== 'PURCHASE' && movement.movementType !== 'RETURN') {
          this.showError();
          this.loading = false;
          this.cdr.markForCheck();
          // Navigate back after delay
          setTimeout(() => {
            this.router.navigate(['/procurement-inventory/stock-movements']);
          }, 2000);
          return;
        }

        // Get first detail (assuming single detail for now)
        if (movement.details && movement.details.length > 0) {
          this.detailData = movement.details[0];

          // Transform detail data to match form field names
          const formData: any = {
            quantity: (this.detailData?.quantity ?? 0).toString(),
            batchNumber: this.detailData?.batch?.batchNumber ?? '',
            expirationDate: this.formatDateForForm(this.detailData?.batch?.expirationDate),
            notes: this.detailData?.notes ?? ''
          };

          this.detailData = { ...this.detailData, ...formData };
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.showError();
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Format date from backend format to form format (YYYY-MM-DD)
   */
  private formatDateForForm(date: string | number[] | undefined): string {
    if (!date) return '';

    try {
      if (Array.isArray(date)) {
        // Format: [yyyy, MM, dd]
        const [year, month, day] = date;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else {
        // ISO string format
        return date.split('T')[0];
      }
    } catch {
      return '';
    }
  }

  /**
   * Handle form submission
   */
  onFormSubmit(formData: StockMovementFormData): void {
    if (!this.detailData) {
      this.showError();
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

    // Build update payload
    const updatePayload = {
      quantity: parseInt(formData.quantity, 10),
      batchNumber: formData.batchNumber || undefined,
      expirationDate: formData.expirationDate || undefined,
      notes: formData.notes || undefined
    };

    this.stockMovementsService.updateStockMovement(this.movementId, updatePayload).subscribe({
      next: () => {
        this.showSuccess();
        this.saving = false;
        this.cdr.markForCheck();

        // Navigate back to list after short delay
        setTimeout(() => {
          this.router.navigate(['/procurement-inventory/stock-movements']);
        }, 1500);
      },
      error: () => {
        this.showError();
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handle form cancellation
   */
  onFormCancel(): void {
    this.router.navigate(['/procurement-inventory/stock-movements']);
  }

  /**
   * Show error alert
   */
  private showError(): void {
    this.cdr.markForCheck();
  }

  /**
   * Show success alert
   */
  private showSuccess(): void {
    this.cdr.markForCheck();
  }
}
