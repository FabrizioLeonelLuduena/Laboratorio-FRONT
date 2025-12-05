import { Component, Input } from '@angular/core';

/**
 * ManualBadgeComponent
 * Muestra una palabra en el color recibido como fondo (badge redondeado) y calcula un color
 * de texto con buen contraste (blanco o negro). Mantiene font-size: inherit.
 */
@Component({
  standalone: true,
  selector: 'app-manual-badge',
  templateUrl: './manual-badge.component.html',
  styleUrls: ['./manual-badge.component.css']
})
export class ManualBadgeComponent {
  @Input() text: string = '';
  @Input() color?: string;
  @Input() outline?: boolean; // se mantiene por compatibilidad

  /** Devuelve el color de fondo a usar (si no viene, usa gris oscuro). */
  get displayBackground(): string {
    return this.color || '#333333';
  }

  /** Devuelve el color del texto (blanco o negro) en base al contraste con el fondo. */
  get textColor(): string {
    const c = this.displayBackground;
    try {
      const rgb = parseColorToRgb(c);
      if (!rgb) return '#ffffff';
      const luminance = relativeLuminance(rgb.r, rgb.g, rgb.b);
      return luminance > 0.5 ? '#000000' : '#ffffff';
    } catch {
      return '#ffffff';
    }
  }
}

/**
 * Parse a hex or rgb(a) color string into an rgb object, or null if unsupported.
 * @param input color string (#hex, rgb(...), rgba(...))
 */
function parseColorToRgb(input: string): { r: number; g: number; b: number } | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  // hex formats: #RGB, #RRGGBB
  if (s[0] === '#') {
    const hex = s.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
    return null;
  }

  // rgb() or rgba()
  const rgbMatch = s.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map(p => p.trim());
    if (parts.length >= 3) {
      const r = parseComponent(parts[0]);
      const g = parseComponent(parts[1]);
      const b = parseComponent(parts[2]);
      if (r != null && g != null && b != null) return { r, g, b };
    }
  }

  // fallback: named colors not supported reliably -> return null
  return null;
}

/**
 * Parse a single RGB component (number or percent) into 0..255 or null.
 */
function parseComponent(comp: string): number | null {
  if (comp.endsWith('%')) {
    const v = parseFloat(comp.replace('%', ''));
    if (isNaN(v)) return null;
    return Math.round((v / 100) * 255);
  }
  const v = parseFloat(comp);
  if (isNaN(v)) return null;
  return Math.round(v);
}

/**
 * Convert sRGB component (0..255) to linear value for luminance calculation.
 */
function srgbToLinear(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * Calculate relative luminance (WCAG) from RGB linear components.
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B; // in range 0..1
}
