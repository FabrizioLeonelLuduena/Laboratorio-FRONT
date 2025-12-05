import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to transform zone codes into human-readable names.
 */
@Pipe({
  name: 'zoneName',
  standalone: true
})
export class ZoneNamePipe implements PipeTransform {
  /**
   * Transforms a zone code into its corresponding name.
   * @param value The zone code to transform.
   * @returns The human-readable zone name.
   */
  transform(value: string | null | undefined): string {
    if (!value) return '-';

    switch (value) {
    case 'CENTRAL':
      return 'Centro';
    case 'NORTH':
      return 'Norte';
    case 'SOUTH':
      return 'Sur';
    case 'EAST':
      return 'Este';
    case 'WEST':
      return 'Oeste';
    default:
      return '-';
    }
  }
}

