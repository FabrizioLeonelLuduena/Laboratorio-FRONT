import { Component, EventEmitter, Input, Output } from '@angular/core';

import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';

/**
 * Header component for worksheet fill form
 * Displays worksheet info and action buttons
 */
@Component({
  selector: 'app-worksheet-fill-header',
  standalone: true,
  imports: [GenericButtonComponent],
  templateUrl: './worksheet-fill-header.component.html',
  styleUrl: './worksheet-fill-header.component.css'
})
export class WorksheetFillHeaderComponent {
  @Input({ required: true }) worksheetName: string = '';
  @Input({ required: true }) sampleCount: number = 0;
  @Input({ required: true }) saving: boolean = false;

  @Output() saveWorksheet = new EventEmitter<void>();
  @Output() cancelWorksheet = new EventEmitter<void>();

}
