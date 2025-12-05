import { Injectable, signal } from '@angular/core';

/**
 * Represents the structure of the Help Center content.
 * Each page that uses the Help Center provides a title and a list of items.
 */
export interface HelpCenterPayload {
  /** Title of the current page or section. */
  title: string;

  /** List of help items (cards) to display in the modal. */
  items: HelpItem[];
}

/**
 * Represents a single help card or topic shown inside the Help Center modal.
 */
export interface HelpItem {
  /** Optional icon for the help card (PrimeIcons or custom CSS class). */
  icon?: string;

  /** Title of the help card. */
  title: string;

  /** Short description or summary of the help topic. */
  description?: string;

  /** Optional list of step-by-step instructions. */
  steps?: string[];

  /** Optional route to navigate when clicking the card. */
  path?: string;
}

/**
 * HelpCenterService
 *
 * Central service that controls the Help Center modal state.
 * Uses Angular Signals for reactive, lightweight updates.
 */
@Injectable({ providedIn: 'root' })
export class HelpCenterService {
  /** Holds the current help content (title and items). */
  private _state = signal<HelpCenterPayload | null>(null);

  /** Tracks whether the help modal is currently visible. */
  private _visible = signal<boolean>(false);

  /** Read-only signals exposed to components. */
  readonly state = this._state.asReadonly();
  readonly visible = this._visible.asReadonly();

  /**
   * Loads help data without opening the modal automatically.
   * @param data Help content (page title and help items).
   */
  show(data: HelpCenterPayload) {
    this._state.set(data);
  }

  /**
   * Opens the Help Center modal (only if content exists).
   */
  open() {
    if (this._state()) {
      this._visible.set(true);
    }
  }

  /**
   * Closes the modal but keeps the help data in memory.
   */
  close() {
    this._visible.set(false);
  }

  /**
   * Clears all help data and hides the modal.
   * Should be called when navigating away or logging out.
   */
  clear() {
    this._visible.set(false);
    this._state.set(null);
  }
}
