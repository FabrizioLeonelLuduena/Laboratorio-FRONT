/**
 * Dictionary and utilities to translate backend error messages
 * for the Branches module into human-readable Spanish.
 *
 * @remarks
 * - Exact translations are handled by {@link ERROR_MAP}.
 * - Dynamic messages (with variables) are handled by {@link ERROR_REGEX}.
 * - If no match is found, the original message is returned unchanged.
 */

/**
 * Exact-match translation map.
 * The key is the backend message in English; the value is its Spanish translation.
 */
export const ERROR_MAP: Record<string, string> = {
  'Street name is required': 'La calle es obligatoria.',
  'Street number is required': 'El número es obligatorio.',
  'Postal code is required': 'El código postal es obligatorio.',
  'Neighborhood ID is required': 'El barrio es obligatorio.',

  'Non-null fields are required': 'Todos los campos son obligatorios.',
  'Schedule from time must be before schedule to time': 'La hora de inicio debe ser anterior a la hora de fin.',
  'Day from and Day to are not valid days': 'El día inicial y el día final no son válidos.',

  'Branch not found': 'No se encontró la sucursal.',

  'contact is required': 'El contacto es obligatorio.',
  'contact type is required': 'El tipo de contacto es obligatorio.',
  'contact must be numeric': 'El contacto debe ser numérico.',
  'contact must be a valid email': 'El contacto debe ser un email válido.',
  'invalid contact type': 'El tipo de contacto es inválido.',

  'Validation failed': 'La validación ha fallado.',
  'An unexpected error occurred.': 'Ocurrió un error inesperado.'
};

/**
 * Translation rules for messages that contain variables.
 * Each entry defines a `pattern` and a `replace` string used when the pattern matches.
 * Order matters: more specific rules should appear first.
 */
export const ERROR_REGEX: Array<{ pattern: RegExp; replace: string }> = [
  { pattern: /^Branch code already exists:\s*(.*)$/i, replace: 'Ya existe una sucursal con el código: $1' },
  {
    pattern: /^Invalid status value:\s*(.*?)\.?\s*Allowed values are:\s*(.*)$/i,
    replace: 'Estado inválido: $1. Valores permitidos: $2'
  },
  { pattern: /^Invalid status value:\s*(.*)$/i, replace: 'Estado inválido: $1' },
  { pattern: /^Branch not found with id:\s*(.*)$/i, replace: 'No se encontró la sucursal con id: $1' },

  { pattern: /^Address not found:\s*(.*)$/i, replace: 'No se encontró la dirección: $1' },
  { pattern: /^Neighborhood not found:\s*(.*)$/i, replace: 'No se encontró el barrio: $1' },

  { pattern: /^City not found:\s*(.*)$/i, replace: 'No se encontró la ciudad: $1' },
  { pattern: /^Province not found:\s*(.*)$/i, replace: 'No se encontró la provincia: $1' },




  { pattern: /^Contact not found:\s*(.*)$/i, replace: 'No se encontró el contacto: $1' },

  { pattern: /^Schedule not found:\s*(.*)$/i, replace: 'No se encontró el horario: $1' },

  { pattern: /^streetName:\s*(.*)$/i, replace: 'calle: $1' },
  { pattern: /^streetNumber:\s*(.*)$/i, replace: 'número: $1' },
  { pattern: /^postalCode:\s*(.*)$/i, replace: 'código postal: $1' },
  { pattern: /^neighborhoodId:\s*(.*)$/i, replace: 'barrio: $1' },
  { pattern: /^dayFrom:\s*(.*)$/i, replace: 'día desde: $1' },
  { pattern: /^dayTo:\s*(.*)$/i, replace: 'día hasta: $1' },
  { pattern: /^scheduleFromTime:\s*(.*)$/i, replace: 'hora desde: $1' },
  { pattern: /^scheduleToTime:\s*(.*)$/i, replace: 'hora hasta: $1' },
  { pattern: /^scheduleType:\s*(.*)$/i, replace: 'tipo de horario: $1' },
  { pattern: /^status:\s*(.*)$/i, replace: 'estado: $1' },
  { pattern: /^code:\s*(.*)$/i, replace: 'código: $1' },
  { pattern: /^description:\s*(.*)$/i, replace: 'descripción: $1' }
];

/**
 * Translates a backend error message into Spanish.
 *
 * @param msg Original backend message (may contain variables).
 * @returns The translated message if a match is found; otherwise, the original message.
 *
 * @example
 * translateDetail('Street name is required') // -> 'La calle es obligatoria.'
 * translateDetail('Branch code already exists: BR-123') // -> 'Ya existe una sucursal con el código: BR-123'
 */
export function translateDetail(msg: string): string {
  if (!msg) return msg;

  const exact = ERROR_MAP[msg];
  if (exact) return exact;

  for (const { pattern, replace } of ERROR_REGEX) {
    if (pattern.test(msg)) return msg.replace(pattern, replace);
  }

  return msg;
}
