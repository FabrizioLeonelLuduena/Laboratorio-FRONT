import { Pipe, PipeTransform } from '@angular/core';

/**
 * Capitalizes the first letter of each word in a string.
 */
@Pipe({
  name: 'capitalize',
  standalone: true
})
export class CapitalizePipe implements PipeTransform {
  /**
   *  Nothing
   */
  transform(value: string): string {
    if (!value) return '';

    // Split the text into words, normalize spaces, and capitalize each one
    return value
      .toLowerCase()
      .split(' ')
      .filter(word => word.trim().length > 0)
      .map(word => word[0].toUpperCase() + word.slice(1))
      .join(' ');
  }
}
