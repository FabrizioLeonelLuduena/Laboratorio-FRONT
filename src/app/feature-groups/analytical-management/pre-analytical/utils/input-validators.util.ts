/**
 * Utility functions for input validation
 */

/**
 * Validates if a keyboard event key is a numeric digit (0-9)
 * @param key - The keyboard event key
 * @returns true if the key is a digit, false otherwise
 */
export function isNumericKey(key: string): boolean {
  return /^\d$/.test(key);
}

/**
 * Validates if a keyboard event key is an allowed control key
 * @param key - The keyboard event key
 * @returns true if the key is allowed, false otherwise
 */
export function isAllowedControlKey(key: string): boolean {
  const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
  return allowedKeys.includes(key);
}

/**
 * Validates if a keyboard event should be allowed for numeric-only inputs
 * Allows numbers and control keys (backspace, delete, arrows, tab)
 * @param event - The keyboard event
 * @returns true if the key should be allowed, false otherwise
 */
export function isValidNumericInput(event: KeyboardEvent): boolean {
  return isAllowedControlKey(event.key) || isNumericKey(event.key);
}

/**
 * Prevents non-numeric input on a keyboard event
 * Use this in (keydown) handlers for numeric-only inputs
 * @param event - The keyboard event to validate
 * @returns true if the event was prevented, false if it was allowed
 */
export function preventNonNumericInput(event: KeyboardEvent): boolean {
  if (!isValidNumericInput(event)) {
    event.preventDefault();
    return true;
  }
  return false;
}
