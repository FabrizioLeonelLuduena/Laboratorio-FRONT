import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { ProgressSpinnerModule } from 'primeng/progressspinner';

/**
 * Spinner component to indicate loading state.
 *
 * Can optionally display a label below the spinner and an overlay effect.
 */
@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [
    CommonModule,
    ProgressSpinnerModule
  ],
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.css']
})
export class SpinnerComponent {
  /** 
   *  Label to display below the spinner. If null, no label is shown.
  */
  @Input() label: string | null = null;

  /** 
   *  If true, displays the spinner with an overlay effect.
  */
  @Input() overlay: boolean = false;

}
