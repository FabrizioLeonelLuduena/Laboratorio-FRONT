import { Pipe, PipeTransform } from '@angular/core';

/**
 * Traduce códigos de estado a español.
 * @example {{ 'PENDING' | translateStatus }} → 'Pendiente'
 */
@Pipe({
  name: 'translateStatus',
  standalone: true
})
export class TranslateStatusPipe implements PipeTransform {
  private translations: { [key: string]: string } = {
    'PENDING': 'Pendiente',
    'IN_PROGRESS': 'En progreso',
    'COMPLETED': 'Completado',
    'COLLECTED': 'Recolectado',
    'IN_TRANSIT': 'En tránsito',
    'REJECTED': 'Rechazado',
    'APPROVED': 'Aprobado',
    'CANCELLED': 'Cancelado',
    'CANCELED': 'Cancelado',
    'PROCESSING': 'En proceso',
    'ANALYZED': 'Analizado',
    'REPORTED': 'Reportado',
    'DONE': 'Finalizado',
    'SAMPLES_COLLECTED': 'Muestras recolectadas',
    'IN_PREPARATION': 'En preparación',
    'READY_TO_SAMPLES_COLLECTION': 'Listo para recolección',
    'PENDING_COLLECTION': 'Pendiente de recolección',
    'DERIVED': 'Derivado',
    'LOST': 'Perdido',

    'PRE_ANALYTICAL': 'Pre analítico',
    'ANALYTICAL': 'Analítico',
    'POST_ANALYTICAL': 'Post analítico',
    'VALIDATED': 'Validado',
    'DELIVERED': 'Entregado',

    'CREATED': 'Creado',
    'PRINTED': 'Impreso',
    'REPRINTED': 'Reimpreso'
  };

  /**
   * Translate a status code into its equivalent in spanish.
   * @param value Código de estado (ej: 'PENDING')
   * @returns Texto traducido o el valor original
   */
  transform(value: string): string {
    if (!value) return '';

    const statusString = value.toString().trim();

    return this.translations[statusString] || statusString;
  }
}
