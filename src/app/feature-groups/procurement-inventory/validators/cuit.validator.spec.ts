import { FormControl } from '@angular/forms';

import { cuitValidator, formatCuit, normalizeCuit } from './cuit.validator';

describe('CUIT Validator', () => {
  describe('cuitValidator', () => {
    it('debe validar un CUIT correcto (20-30536116-9)', () => {
      const control = new FormControl('20305361169');
      const result = cuitValidator()(control);
      expect(result).toBeNull();
    });

    it('debe validar un CUIT correcto con guiones (20-30536116-9)', () => {
      const control = new FormControl('20-30536116-9');
      const result = cuitValidator()(control);
      expect(result).toBeNull();
    });

    it('debe validar un CUIT correcto (27-23456789-4)', () => {
      const control = new FormControl('27234567894');
      const result = cuitValidator()(control);
      expect(result).toBeNull();
    });

    it('debe rechazar un CUIT con dígito verificador incorrecto', () => {
      const control = new FormControl('20305361160'); // DV incorrecto
      const result = cuitValidator()(control);
      expect(result).not.toBeNull();
      expect(result?.['invalidCuit']).toBeDefined();
    });

    it('debe rechazar un CUIT con menos de 11 dígitos', () => {
      const control = new FormControl('2030536116');
      const result = cuitValidator()(control);
      expect(result).not.toBeNull();
      expect(result?.['invalidCuit']).toBeDefined();
      expect(result?.['invalidCuit']?.message).toContain('11 dígitos');
    });

    it('debe rechazar un CUIT con más de 11 dígitos', () => {
      const control = new FormControl('203053611699');
      const result = cuitValidator()(control);
      expect(result).not.toBeNull();
    });

    it('debe rechazar un CUIT con caracteres no numéricos', () => {
      const control = new FormControl('20-3053611A-9');
      const result = cuitValidator()(control);
      expect(result).not.toBeNull();
    });

    it('debe aceptar valores vacíos (null check para Validators.required)', () => {
      const control = new FormControl('');
      const result = cuitValidator()(control);
      expect(result).toBeNull();
    });

    it('debe aceptar valores null', () => {
      const control = new FormControl(null);
      const result = cuitValidator()(control);
      expect(result).toBeNull();
    });
  });

  describe('formatCuit', () => {
    it('debe formatear correctamente un CUIT de 11 dígitos', () => {
      expect(formatCuit('20305361169')).toBe('20-30536116-9');
    });

    it('debe mantener el formato si ya tiene guiones', () => {
      expect(formatCuit('20-30536116-9')).toBe('20-30536116-9');
    });

    it('debe retornar string vacío si el input es vacío', () => {
      expect(formatCuit('')).toBe('');
    });

    it('debe retornar el CUIT sin cambios si no tiene 11 dígitos', () => {
      expect(formatCuit('2030536116')).toBe('2030536116');
    });
  });

  describe('normalizeCuit', () => {
    it('debe quitar guiones de un CUIT formateado', () => {
      expect(normalizeCuit('20-30536116-9')).toBe('20305361169');
    });

    it('debe quitar espacios de un CUIT', () => {
      expect(normalizeCuit('20 30536116 9')).toBe('20305361169');
    });

    it('debe retornar string vacío si el input es vacío', () => {
      expect(normalizeCuit('')).toBe('');
    });

    it('debe manejar CUIT sin formato', () => {
      expect(normalizeCuit('20305361169')).toBe('20305361169');
    });
  });
});
