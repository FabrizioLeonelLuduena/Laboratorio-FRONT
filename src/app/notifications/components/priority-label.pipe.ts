import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to transform a notification priority string (e.g., 'high') into a user-friendly label (e.g., 'Alta').
 */
@Pipe({
  name: 'priorityLabelPipe',
  standalone: true
})
export class PriorityLabelPipe implements PipeTransform {
  /**
   * Transforms a priority string into a localized label.
   */
  transform(priority: string): string {
    switch ((priority || '').toLowerCase()) {
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Media';
    case 'low':
      return 'Baja';
    default:
      return priority ?? '';
    }
  }

}
