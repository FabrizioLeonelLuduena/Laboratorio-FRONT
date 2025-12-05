/**
 * Defines a single step in a tutorial.
 */
export interface TutorialStep {
  target: string; // Selector CSS del elemento a resaltar
  title: string;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right'; // Posición del mensaje
  highlightPadding?: number; // Padding alrededor del elemento resaltado
}

/**
 * Defines the configuration for a tutorial, including all its steps and callbacks.
 */
export interface TutorialConfig {
  steps: TutorialStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}
