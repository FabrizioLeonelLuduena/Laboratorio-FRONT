import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, signal, computed, Signal, HostListener } from '@angular/core';

import { TutorialConfig } from '../../models/generic-tutorial';

/**
 * Tutorial overlay component that provides an interactive step-by-step guide for users.
 * Highlights specific elements and displays instructional messages.
 * Features:
 * - Responsive design (mobile, tablet, desktop)
 * - Improved focus with controlled scroll
 * - Blocked interactions (scroll and clicks outside tutorial)
 * - Navigation only through tutorial buttons
 */
@Component({
  selector: 'app-tutorial-overlay, app-generic-tutorial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-tutorial.component.html',
  styleUrls: ['./generic-tutorial.component.css']
})
export class TutorialOverlayComponent implements OnInit, OnDestroy {
  @Input() config: Signal<TutorialConfig> = signal<TutorialConfig>({ steps: [] });

  isActive = signal(false);
  currentStepIndex = signal(0);
  highlightRect = signal({ x: 0, y: 0, width: 0, height: 0 });
  messagePosition = signal({ x: 0, y: 0 });

  currentStep = computed(() => {
    const steps = this.config().steps;
    const index = this.currentStepIndex();
    return steps[index] || steps[0];
  });

  private resizeObserver?: ResizeObserver;
  private originalOverflow = '';
  private originalPosition = '';
  private scrollBlocked = false;

  /**
   * Prevents wheel scrolling when tutorial is active
   */
  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    if (this.isActive() && this.scrollBlocked) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Prevents touch scrolling on mobile when tutorial is active
   */
  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.isActive() && this.scrollBlocked) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Prevents keyboard scrolling when tutorial is active
   * Also allows ESC key to skip the tutorial
   */
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.isActive()) {
      // ESC key skips the tutorial
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.skip();
        return;
      }

      // Block scrolling keys
      if (this.scrollBlocked) {
        const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Space'];
        if (scrollKeys.includes(event.key) || (event.key === ' ')) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }
  }

  /**
   * Initializes the component and sets up the resize observer.
   */
  ngOnInit() {
    this.setupResizeObserver();
  }

  /**
   * Cleans up the component by disconnecting the resize observer and restoring scroll.
   */
  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.restoreScroll();
  }

  /**
   * Starts the tutorial from the first step.
   * Blocks body scroll and prevents user interactions outside the tutorial.
   */
  start() {
    this.isActive.set(true);
    this.currentStepIndex.set(0);
    this.blockScroll();
    
    // Execute onEnter callback for the first step BEFORE updating highlight
    // This ensures any DOM changes (like opening popovers) happen first
    const firstStep = this.currentStep();
    firstStep.onEnter?.();
    
    // Small delay to allow DOM updates, then scroll first, then highlight
    setTimeout(() => {
      this.scrollToTarget();
      // Wait for scroll to complete (smooth scroll takes 600ms) before highlighting
      setTimeout(() => {
        this.updateHighlight();
      }, 450);
    }, 50);
  }

  /**
   * Advances to the next tutorial step if available.
   */
  next() {
    if (this.currentStepIndex() < this.config().steps.length - 1) {
      this.currentStepIndex.update(i => i + 1);
      
      // Execute onEnter callback for the new step BEFORE updating highlight
      const currentStep = this.currentStep();
      currentStep.onEnter?.();
      
      // Small delay to allow DOM updates, then scroll first, then highlight
      setTimeout(() => {
        this.scrollToTarget();
        // Wait for scroll to complete (smooth scroll takes 600ms) before highlighting
        setTimeout(() => {
          this.updateHighlight();
        }, 450);
      }, 50);
    }
  }

  /**
   * Goes back to the previous tutorial step if available.
   */
  previous() {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.update(i => i - 1);
      
      // Execute onEnter callback for the previous step BEFORE updating highlight
      const currentStep = this.currentStep();
      currentStep.onEnter?.();
      
      // Small delay to allow DOM updates, then scroll first, then highlight
      setTimeout(() => {
        this.scrollToTarget();
        // Wait for scroll to complete (smooth scroll takes 600ms) before highlighting
        setTimeout(() => {
          this.updateHighlight();
        }, 450);
      }, 50);
    }
  }

  /**
   * Skips the tutorial and calls the onSkip callback if provided.
   * Restores scroll functionality.
   */
  skip() {
    this.isActive.set(false);
    this.restoreScroll();
    this.config().onSkip?.();
  }

  /**
   * Completes the tutorial and calls the onComplete callback if provided.
   * Restores scroll functionality.
   */
  complete() {
    this.isActive.set(false);
    this.restoreScroll();
    this.config().onComplete?.();
  }

  /**
   * Handles clicks on the background overlay.
   * Blocked to force user to use tutorial buttons only.
   */
  onBackgroundClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    // No action - force user to use tutorial buttons
  }

  /**
   * Scrolls to the target element of the current step without updating highlight.
   * This is called before updateHighlight to ensure smooth scroll before positioning.
   */
  private scrollToTarget() {
    const step = this.currentStep();
    let targetSelector = step.target;
    
    // Check if this is a special combined selector
    const isTableIntro = targetSelector.endsWith(':table-intro');
    
    if (isTableIntro) {
      const baseSelector = targetSelector.replace(':table-intro', '');
      const container = document.querySelector(baseSelector);
      if (!container) return;
      
      const thead = container.querySelector('thead');
      if (thead) {
        this.scrollToElement(thead);
      }
      return;
    }
    
    // Standard single-element selector
    const element = document.querySelector(targetSelector);
    if (element) {
      this.scrollToElement(element);
    }
  }

  /**
   * Updates the highlight position and message location based on the current step's target element.
   * Supports special selector ':table-intro' to combine table header and first row.
   * Does NOT scroll - scrolling should be done separately via scrollToTarget().
   */
  private updateHighlight() {
    const step = this.currentStep();
    let targetSelector = step.target;
    
    // Check if this is a special combined selector
    const isTableIntro = targetSelector.endsWith(':table-intro');
    
    if (isTableIntro) {
      // Remove the special suffix to get the base selector
      const baseSelector = targetSelector.replace(':table-intro', '');
      const container = document.querySelector(baseSelector);
      
      if (!container) {
        return;
      }
      
      // Find thead and first tbody row
      const thead = container.querySelector('thead');
      const firstRow = container.querySelector('tbody tr:first-child');
      
      if (!thead || !firstRow) {
        return;
      }
      
      // Calculate combined bounding box
      const theadRect = thead.getBoundingClientRect();
      const firstRowRect = firstRow.getBoundingClientRect();
      
      // Create a combined rect that encompasses both elements
      const combinedRect = {
        left: Math.min(theadRect.left, firstRowRect.left),
        top: Math.min(theadRect.top, firstRowRect.top),
        right: Math.max(theadRect.right, firstRowRect.right),
        bottom: Math.max(theadRect.bottom, firstRowRect.bottom),
        width: 0,
        height: 0
      };
      
      combinedRect.width = combinedRect.right - combinedRect.left;
      combinedRect.height = combinedRect.bottom - combinedRect.top;
      
      const padding = step.highlightPadding || 8;
      
      // Update highlight rectangle with combined dimensions
      this.highlightRect.set({
        x: combinedRect.left - padding,
        y: combinedRect.top - padding,
        width: combinedRect.width + (padding * 2),
        height: combinedRect.height + (padding * 2)
      });
      
      // Calculate message position using the combined rect
      this.calculateMessagePosition(combinedRect as DOMRect, step.position || 'bottom');
      
      return;
    }
    
    // Standard single-element selector
    const element = document.querySelector(targetSelector);

    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const padding = step.highlightPadding || 8;

    // Actualizar rectángulo de resaltado
    this.highlightRect.set({
      x: rect.left - padding,
      y: rect.top - padding,
      width: rect.width + (padding * 2),
      height: rect.height + (padding * 2)
    });

    // Calcular posición del mensaje
    this.calculateMessagePosition(rect, step.position || 'bottom');
  }

  /**
   * Calculates the optimal position for the tutorial message relative to the highlighted element.
   */
  private calculateMessagePosition(rect: DOMRect, position: string) {
    const messageWidth = 400;
    const messageHeight = 200; // Estimado
    const gap = 20;

    let x = 0;
    let y = 0;

    switch (position) {
    case 'bottom':
      x = rect.left + (rect.width / 2);
      y = rect.bottom + gap;
      // Ajustar si se sale de la pantalla
      if (x + messageWidth / 2 > window.innerWidth) {
        x = window.innerWidth - messageWidth / 2 - 20;
      }
      if (x - messageWidth / 2 < 0) {
        x = messageWidth / 2 + 20;
      }
      break;

    case 'top':
      x = rect.left + (rect.width / 2);
      y = rect.top - messageHeight - gap;
      if (x + messageWidth / 2 > window.innerWidth) {
        x = window.innerWidth - messageWidth / 2 - 20;
      }
      if (x - messageWidth / 2 < 0) {
        x = messageWidth / 2 + 20;
      }
      break;

    case 'left':
      x = rect.left - messageWidth - gap;
      y = rect.top + (rect.height / 2);
      if (x < 0) {
        x = rect.right + gap;
      }
      break;

    case 'right':
      x = rect.right + gap;
      y = rect.top + (rect.height / 2);
      if (x + messageWidth > window.innerWidth) {
        x = rect.left - messageWidth - gap;
      }
      break;
    }

    this.messagePosition.set({ x, y });
  }

  /**
   * Scrolls the highlighted element into view with improved focus.
   * Temporarily enables scroll, centers the element, then blocks scroll again.
   */
  private scrollToElement(element: Element) {
    // Temporarily enable scroll for smooth navigation
    this.scrollBlocked = false;
    
    // Get element position and viewport dimensions
    const rect = element.getBoundingClientRect();
    const absoluteTop = window.pageYOffset + rect.top;
    const absoluteLeft = window.pageXOffset + rect.left;
    
    // Calculate centered position
    const centerY = absoluteTop - (window.innerHeight / 2) + (rect.height / 2);
    const centerX = absoluteLeft - (window.innerWidth / 2) + (rect.width / 2);
    
    // Smooth scroll to centered position
    window.scrollTo({
      top: Math.max(0, centerY),
      left: Math.max(0, centerX),
      behavior: 'smooth'
    });
    
    // Re-block scroll after animation completes
    setTimeout(() => {
      this.scrollBlocked = true;
    }, 600);
  }

  /**
   * Blocks page scrolling by modifying body styles.
   */
  private blockScroll() {
    const body = document.body;
    this.originalOverflow = body.style.overflow;
    this.originalPosition = body.style.position;
    
    body.style.overflow = 'hidden';
    body.style.position = 'relative';
    this.scrollBlocked = true;
  }

  /**
   * Restores page scrolling by reverting body styles.
   */
  private restoreScroll() {
    const body = document.body;
    body.style.overflow = this.originalOverflow;
    body.style.position = this.originalPosition;
    this.scrollBlocked = false;
  }

  /**
   * Sets up a ResizeObserver to update the highlight when the window or elements are resized.
   */
  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.isActive()) {
        this.updateHighlight();
      }
    });

    this.resizeObserver.observe(document.body);
  }
}

// Export as GenericTutorialComponent for backwards compatibility
export { TutorialOverlayComponent as GenericTutorialComponent };
