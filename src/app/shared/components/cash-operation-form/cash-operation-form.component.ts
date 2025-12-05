import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { GenericFormComponent, GenericFormField } from '../generic-form/generic-form.component';

/** Tipos de operación admitidos. */
export type OperationType = 'deposit' | 'withdrawal';

/** Estructura de datos del formulario. */
export interface OperationFormData {
  amount: number;
  paymentMethod: string;
  concept: string;
  observations?: string;
  receiptNumber?: string;
  customer?: string;
  beneficiary?: string;
}

/** Configuración del formulario de operación de caja. */
export interface OperationFormConfig {
  type: OperationType;
  title: string;
  subtitle: string;
  icon: string;
  concepts: { name: string }[];
  showReceiptNumber?: boolean;
  showCustomer?: boolean;
  showBeneficiary?: boolean;
  showQuickConcepts?: boolean;
  allowedPaymentMethods?: string[];
  maxAmount?: number;
  minAmount?: number;
}

/**
 * Declaración del componente.
 * - Es standalone (no necesita un módulo).
 * - Importa los módulos comunes, reactivos y genéricos necesarios.
 */
@Component({
  selector: 'cash-operation-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericFormComponent
  ],
  templateUrl: './cash-operation-form.component.html',
  styleUrls: ['./cash-operation-form.component.css']
})
export class CashOperationFormComponent implements OnInit {
  @Input({ required: true }) config!: OperationFormConfig;
  @Output() formSubmit = new EventEmitter<OperationFormData>();
  @Output() formCancel = new EventEmitter<void>();

  fields: GenericFormField[] = [];

  /**
   * Hook `ngOnInit`.
   * Construye el formulario al inicializar el componente.
   */
  ngOnInit(): void {
    this.buildFields();
  }

  /**
   * Genera la lista de campos (`fields`) para el formulario según la configuración.
   *
   * Cada campo define:
   * - nombre interno (`name`)
   * - etiqueta visible (`label`)
   * - tipo (`type`) → mapeado al tipo genérico de input (text, number, select, etc.)
   * - validaciones (requerido, mínimos, máximos)
   * - opciones (en selects)
   * - ayudas visuales (`hint`, `addonLeft`, etc.)
   */
  private buildFields(): void {
    const cfg = this.config;

    this.fields = [
      {
        name: 'amount',
        label: 'Monto',
        type: 'number',
        required: true,
        min: cfg.minAmount || 0.01,
        max: cfg.maxAmount,
        addonLeft: '$',
        hint: 'Ingrese el monto de la operación'
      },
      {
        name: 'paymentMethod',
        label: 'Método de pago',
        type: 'select',
        required: true,
        options: (cfg.allowedPaymentMethods || []).map((m) => ({
          label: this.getPaymentMethodLabel(m),
          value: m
        }))
      },
      {
        name: 'concept',
        label: 'Concepto',
        type: 'select',
        required: true,
        options: cfg.concepts.map((c) => ({ label: c.name, value: c.name }))
      },
      {
        name: 'observations',
        label: 'Observaciones',
        type: 'textarea',
        hint: 'Máximo 500 caracteres',
        rows: 3
      },
      ...(cfg.showReceiptNumber
        ? [
          {
            name: 'receiptNumber',
            label: 'N° de comprobante',
            type: 'text' as const,
            required: cfg.type === 'withdrawal'
          }
        ]
        : []),
      ...(cfg.showCustomer
        ? [
          {
            name: 'customer',
            label: 'Cliente/Paciente',
            type: 'text' as const
          }
        ]
        : []),
      ...(cfg.showBeneficiary
        ? [
          {
            name: 'beneficiary',
            label: 'Beneficiario',
            type: 'text' as const,
            required: cfg.type === 'withdrawal'
          }
        ]
        : [])
    ];
  }

  /**
   * Handler que se ejecuta al enviar el formulario.
   * Emite el evento `formSubmit` con los valores del formulario.
   */
  onSubmit(formValue: Record<string, any>): void {
    this.formSubmit.emit(formValue as OperationFormData);
  }

  /**
   * Handler que se ejecuta al cancelar.
   * Emite el evento `formCancel` sin payload.
   */
  onCancel(): void {
    this.formCancel.emit();
  }

  /**
   * Traduce los códigos internos de método de pago (cash, debit_card, etc.)
   * a etiquetas legibles por el usuario.
   */
  private getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      debit_card: 'Tarjeta de Débito',
      credit_card: 'Tarjeta de Crédito',
      transfer: 'Transferencia Bancaria'
    };
    return labels[method] || method;
  }
}
