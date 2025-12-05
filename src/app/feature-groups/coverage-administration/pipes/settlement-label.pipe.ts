import { Pipe, PipeTransform } from '@angular/core';

import { SettlementStatus, SettlementType } from '../models/settlement.model';

/**
 *  SettlementLabelPipe.
 */
@Pipe({ name: 'settlementLabel',standalone: true })
export class SettlementLabelPipe implements PipeTransform {
  /**
   * Transform the TYPE or STATUS response to a human-readable label.
   */
  transform(value: string, type: 'status' | 'type'): string {
    if (type === 'status') {
      return SettlementStatus[value as keyof typeof SettlementStatus] ?? value;
    }
    if (type === 'type') {
      return SettlementType[value as keyof typeof SettlementType] ?? value;
    }
    return value;
  }
}
