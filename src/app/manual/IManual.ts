// ===========================================
// MANUAL INDEX
// ===========================================

/**
 *
 */
export interface ManualIndex {
  version: string;
  modules: ManualModule[];
}

/**
 *
 */
export interface ManualModule {
  id: string;
  label: string;
  icon?: string;
  order?: number;
  homeCard?: ManualHomeCard;
  sidebar: ManualPageLink[];
}

/**
 *
 */
export interface ManualHomeCard {
  number: number;
  title: string;
  description: string;
  bullets?: string[];
}

/**
 *
 */
export interface ManualPageLink {
  id: string;
  label: string;
  path: string;
  icon?: string;
}

// ===========================================
// MANUAL PAGE
// ===========================================

/**
 *
 */
export interface ManualPage {
  id: string;
  moduleId: string;
  title: string;
  intro?: string;
  sections: ManualSection[];
  tags?: string[];
}

/**
 *
 */
export interface ManualSection {
  id: string;
  title: string;
  blocks: ManualBlock[];
  /** Si true, la sección se mostrará abierta por defecto en el desplegable */
  open?: boolean;
  introBlocks?: ManualBlock[];
}

/**
 *das
 */
export interface TitleBlock extends BaseBlock {
  type: 'title';
  text: string;
}

// ===========================================
// BLOQUES (UNION DISCRIMINADO)
// ===========================================

/**
 *
 */
export type ManualBlock =
  | TitleBlock
  | ParagraphBlock
  | SubtitleBlock
  | ImageBlock
  | NoteBlock
  | TableBlock
  | ListBlock
  | BadgeBlock
  | DropdownBlock; // añadido

// Cada bloque tiene un `type` literal fijo
/**
 *
 */
export interface BaseBlock {
  type: string;
}

// ---- Paragraph ----
/**
 *
 */
export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  text: string;
}

// ---- Subtitle ----
/**
 *
 */
export interface SubtitleBlock extends BaseBlock {
  type: 'subtitle';
  text: string;
}

// ---- Image ----
/**
 *
 */
export interface ImageBlock extends BaseBlock {
  type: 'image';
  src: string;
  alt?: string;
}

// ---- Note ----
/**
 *
 */
export interface NoteBlock extends BaseBlock {
  type: 'note';
  title?: string;
  text: string;
  variant?: 'info' | 'warning' | 'success' | 'danger';
}

// ---- Table ----
/**
 *
 */
export interface TableBlock extends BaseBlock {
  type: 'table';
  columns: string[];
  rows: string[][]; // ← más correcto
}

// ---- List ----
/**
 *
 */
export interface ListBlock extends BaseBlock {
  type: 'list';
  ordered?: boolean;
  items: string[];
}

// Nuevo: Badge block
/**
 *dasd
 */
export interface BadgeBlock extends BaseBlock {
  type: 'badge';
  text: string;
  color?: string;    // color en formato CSS (#hex, rgb..., color name)
  outline?: boolean; // si true renderiza borde y texto en color; si false fondo en color y texto blanco
}

// Nuevo: Dropdown block
/**
 *asd
 */
export interface DropdownOption {
  label: string;
  value: string;
  description?: string;
}

/**
 *asd
 */
export interface DropdownBlock extends BaseBlock {
  type: 'dropdown';
  label?: string;               // etiqueta visible sobre el select
  placeholder?: string;         // texto placeholder (no siempre aplicable en <select>)
  options: DropdownOption[];    // opciones del desplegable
  multiple?: boolean;           // permite selección múltiple
  selected?: string | string[]; // valor por defecto (o valores si multiple=true)
  hint?: string;                // texto de ayuda debajo
}
