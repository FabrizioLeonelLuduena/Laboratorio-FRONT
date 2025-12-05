import { DatePipe, DecimalPipe, NgClass, CurrencyPipe } from '@angular/common';
import { Component, Input } from '@angular/core';

import { Card } from 'primeng/card';

/**
 * Interface for the settlement summary shown in cards.
 */
export interface ReportSummary {
  /** Total settled amount in the period */
  totalAmount: number;
  /** Date of the last settlement performed */
  lastSettlementDate: string;
  /** Percentage variation compared to previous month */
  variation: number;
}

/**
 * Component to display settlement summary cards.
 * Shows settled amount, last settlement date, and monthly variation.
 * All comments and documentation are in English as requested.
 */
@Component({
  selector: 'app-report-cards',
  templateUrl: './report-cards.component.html',
  imports: [
    Card,
    DatePipe,
    DecimalPipe,
    CurrencyPipe,
    NgClass
  ],
  styleUrls: ['./report-cards.component.css']
})
export class ReportCardsComponent {
  /** Settlement summary data */
  @Input() summary!: ReportSummary;

  /**
   * Returns the summary with default values if not present.
   * @returns Safe ReportSummary object
   */
  get safeSummary(): ReportSummary {
    return this.summary ?? {
      totalAmount: 0,
      lastSettlementDate: new Date().toISOString(),
      variation: 0
    };
  }
}
