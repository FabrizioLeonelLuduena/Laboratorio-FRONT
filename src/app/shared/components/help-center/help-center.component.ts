import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Dialog } from 'primeng/dialog';

import { HelpCenterService } from '../../services/help-center.service';

/**
 * HelpCenterComponent
 *
 * Displays a modal with contextual help for each page.
 * The content (title, items, steps, etc.) is managed by HelpCenterService.
 * The modal can be opened and closed multiple times without losing data.
 */
@Component({
  selector: 'app-help-center',
  imports: [Dialog],
  templateUrl: './help-center.component.html',
  styleUrl: './help-center.component.css'
})
export class HelpCenterComponent {
  /** Injected services */
  help = inject(HelpCenterService);
  router = inject(Router);

  /**
   * Reactive getter/setter connected to p-dialog.
   * This allows the modal to open and close via two-way binding.
   */
  get visible() {
    return this.help.visible();
  }


  /**
   * Reactive getter/setter connected to p-dialog.
   * This allows the modal to open and close via two-way binding.
   */
  set visible(v: boolean) {
    v ? this.help.open() : this.help.close();
  }

  /**
   * Current state of the Help Center (title and items).
   * Automatically updated by the service using Angular Signals.
   */
  get state() {
    return this.help.state();
  }

  /**
   * Navigates to the route defined in a help item, if any.
   * Closes the modal before navigating.
   */
  openPath(path?: string) {
    if (!path) return;
    this.help.close();
    this.router.navigate([path]);
  }
}
