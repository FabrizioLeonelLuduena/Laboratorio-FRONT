/**
 * Represents a single step in the tutorial or guided tour.
 */
export interface TutorialStep {
  target: string; // Selector CSS del elemento a resaltar
  title: string;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right'; // Posición del mensaje
  highlightPadding?: number; // Padding alrededor del elemento resaltado
  onEnter?: () => void; // Callback ejecutado al entrar a este paso
}

/**
 * Configuration for the entire tutorial or guided tour sequence.
 */
export interface TutorialConfig {
  steps: TutorialStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}
