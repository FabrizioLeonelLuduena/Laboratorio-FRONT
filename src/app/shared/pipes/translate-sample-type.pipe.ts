import { Pipe, PipeTransform } from '@angular/core';

/**
 * Traduce códigos de tipo de muestra a español.
 * @example {{ 'BLOOD' | translateSampleType }} → 'Sangre'
 */
@Pipe({
  name: 'translateSampleType',
  standalone: true
})
export class TranslateSampleTypePipe implements PipeTransform {
  private translations: { [key: string]: string } = {
    'BLOOD': 'Sangre',
    'URINE': 'Orina',
    'SALIVA': 'Saliva',
    'TISSUE': 'Tejido',
    'STOOL': 'Heces',
    'OTHER': 'Otro',
    'SERUM': 'Suero'
  };

  /**
   * Translate a sample type into its equivalent in spanish.
   * @param value Código del tipo de muestra (ej: 'BLOOD')
   * @returns Texto traducido o el valor original
   */
  transform(value: string): string {
    if (!value) return '';
    return this.translations[value] || value;
  }
}
