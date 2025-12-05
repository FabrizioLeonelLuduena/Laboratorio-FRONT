import { Pipe, PipeTransform } from '@angular/core';

/**
 * Scales a numeric value by a given factor.
 */
@Pipe({
  name: 'scale',
  standalone: true
})
export class ScalePipe implements PipeTransform {

  /**
   * Scales a numeric value by a given factor.
   * @param value The numeric value to be scaled.
   * @param factor The scaling factor (default is 1).
   * @returns The scaled numeric value or the original value if it's not a valid number.
   */
  transform(value: any, factor = 1): any {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    return (typeof n === 'number' && !isNaN(n)) ? n * factor : value;
  }

}
