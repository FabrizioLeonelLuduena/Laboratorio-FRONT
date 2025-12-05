import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';

import { ResponseBatchDTO } from '../../../models/batches/batches.model';
import { BatchesService } from '../../../services/batches.service';

/**
 * Componente para visualizar detalles de lotes
 */
@Component({
  selector: 'app-view-batch',
  standalone: true,
  imports: [CommonModule, GenericAlertComponent, ButtonModule, CardModule, TagModule],
  templateUrl: './view-batch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewBatchComponent implements OnInit {
  batchId!: number;
  batch: ResponseBatchDTO | null = null;
  loading = false;
  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' = 'success';
  showAlert = false;

  private batchesService = inject(BatchesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  /**
   * Inicializa el componente
   */
  ngOnInit(): void {
    this.batchId = +this.route.snapshot.paramMap.get('id')!;
    this.loadBatch();
  }

  /**
   * Carga el lote
   */
  private loadBatch(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.batchesService.getBatchById(this.batchId).subscribe({
      next: (batch) => {
        this.batch = batch;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.showError('Error al cargar el lote');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Edita el lote
   */
  editBatch(): void {
    this.router.navigate(['/procurement-inventory/batches', this.batchId, 'edit']);
  }

  /**
   * Vuelve a la lista de lotes
   */
  goBack(): void {
    this.router.navigate(['/procurement-inventory/batches']);
  }

  /**
   * Formatea la fecha
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Muestra el mensaje de error
   */
  private showError(message: string): void {
    this.alertMessage = message;
    this.alertType = 'error';
    this.showAlert = true;
    this.cdr.markForCheck();
    setTimeout(() => { this.showAlert = false; this.cdr.markForCheck(); }, 5000);
  }
}

