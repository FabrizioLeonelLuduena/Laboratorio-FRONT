import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to convert numbers to Spanish words with currency suffix.
 * Provides a lightweight alternative for displaying totals in written form.
 */
@Pipe({
  name: 'numberToWords'
})
export class NumberToWordsPipe implements PipeTransform {
  private readonly units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  private readonly teens = [
    'diez',
    'once',
    'doce',
    'trece',
    'catorce',
    'quince',
    'dieciséis',
    'diecisiete',
    'dieciocho',
    'diecinueve'
  ];
  private readonly tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  private readonly hundreds = [
    '',
    'ciento',
    'doscientos',
    'trescientos',
    'cuatrocientos',
    'quinientos',
    'seiscientos',
    'setecientos',
    'ochocientos',
    'novecientos'
  ];

  /**
   * Transforms a number to Spanish words with currency suffix.
   * @param value - The numeric value to convert
   * @param currency - The currency name (default: 'pesos')
   * @returns The number expressed in Spanish words with currency
   */
  transform(value: number, currency: string = 'pesos'): string {
    const integerPart = Math.floor(value);
    const decimalPart = Math.round((value - integerPart) * 100);

    if (integerPart === 0) {
      if (decimalPart === 0) {
        return `cero ${currency}`;
      }
      return `cero ${currency} con ${this.convertGroup(decimalPart)} centavos`;
    }

    let words = this.convertThousands(integerPart).trim();

    // Adjust "uno" to "un" for currency
    if (integerPart === 1) {
      words = 'un';
    }

    let result = `${words} ${integerPart === 1 ? 'peso' : currency}`.trim();

    if (decimalPart > 0) {
      result += ` con ${this.convertGroup(decimalPart)} centavos`;
    }

    return result;
  }

  /**
   * Converts numbers ≥ 1000 by dividing them into thousands and remainder.
   * @param num - The number to convert (>= 1000)
   * @returns The number expressed in Spanish words
   */
  private convertThousands(num: number): string {
    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      let thousandWords = '';

      if (thousands === 1) {
        thousandWords = 'mil';
      } else {
        thousandWords = `${this.convertGroup(thousands)} mil`;
      }

      if (remainder > 0) {
        return `${thousandWords} ${this.convertGroup(remainder)}`.trim();
      }
      return thousandWords;
    }

    return this.convertGroup(num);
  }

  /**
   * Converts a group of up to 3 digits to Spanish words.
   * @param num - The number to convert (0-999)
   * @returns The number expressed in Spanish words
   */
  private convertGroup(num: number): string {
    if (num === 0) return '';

    let result = '';
    const hundredsDigit = Math.floor(num / 100);
    const remainder = num % 100;
    const tensDigit = Math.floor(remainder / 10);
    const unitsDigit = remainder % 10;

    // Special hundreds
    if (hundredsDigit > 0) {
      if (num === 100) {
        return 'cien';
      }
      result += this.hundreds[hundredsDigit];
      if (remainder > 0) {
        result += ' ';
      }
    }

    // Numbers from 10 to 19
    if (remainder >= 10 && remainder < 20) {
      result += this.teens[remainder - 10];
    }
    // Numbers from 21 to 29 (veintiuno, veintidós, etc.)
    else if (tensDigit === 2 && unitsDigit > 0) {
      result += `veinti${this.units[unitsDigit]}`;
    }
    // Rest of tens
    else {
      if (tensDigit > 0) {
        result += this.tens[tensDigit];
        if (unitsDigit > 0) {
          result += ` y ${this.units[unitsDigit]}`;
        }
      } else if (unitsDigit > 0 || result === '') {
        result += this.units[unitsDigit];
      }
    }

    return result.trim();
  }
}
