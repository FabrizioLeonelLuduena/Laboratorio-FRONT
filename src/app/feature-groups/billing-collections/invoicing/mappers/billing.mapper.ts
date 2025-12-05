import {
  Billing,
  BillingItem,
  PaymentMethodDetail,
  VoucherType,
  InvoiceType,
  InvoiceStatus,
  PaymentMethod,
  FundDestination,
  BillingCreateRequestDto,
  BillingItemCreateRequestDto,
  PaymentMethodCreateRequestDto,
  BillingResponseDto,
  BillingItemDto,
  PaymentMethodDto
} from '../domain';
import { CreateInvoiceItemRequestDto } from '../domain/dto/create-invoice-item-request.dto';
import { CreateInvoicePaymentRequestDto } from '../domain/dto/create-invoice-payment-request.dto';
import { CreateInvoiceRequestDto } from '../domain/dto/create-invoice-request.dto';
import { InvoiceReferenceRequestDto } from '../domain/dto/invoice-reference-request.dto';
import { getInvoiceKindFromSeparateTypes } from '../domain/invoice-kind.enum';

/**
 * BillingMapper - Utility class for billing calculations and transformations
 * Handles all calculation logic, validation, and DTO conversions
 */
export class BillingMapper {
  /**
   * Calculate totals for a single billing item
   */
  static calculateItemTotals(item: BillingItem): BillingItem {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    const discountPercentage = item.discountPercentage || 0;
    const vatRate = item.vatRate || 0;

    // Calculate subtotal before discount
    const subtotal = quantity * unitPrice;

    // Calculate discount amount
    const discountAmount = (subtotal * discountPercentage) / 100;

    // Calculate taxable amount (after discount)
    const taxableAmount = subtotal - discountAmount;

    // Calculate VAT amount
    const vatAmount = (taxableAmount * vatRate) / 100;

    // Calculate total amount
    const totalAmount = taxableAmount + vatAmount;

    return {
      ...item,
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      taxableAmount: Number(taxableAmount.toFixed(2)),
      vatAmount: Number(vatAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2))
    };
  }

  /**
   * Calculate all billing totals based on items
   */
  static calculateBillingTotals(billing: Billing): Billing {
    // Recalculate all items
    const itemsWithTotals = billing.items.map(item => this.calculateItemTotals(item));

    // Sum up totals from all items
    const totalInvoice = itemsWithTotals.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const totalVat = itemsWithTotals.reduce((sum, item) => sum + (item.vatAmount || 0), 0);

    // Calculate net taxable and non-taxable
    // For now, we'll use the existing values or calculate from items
    const netTaxable = itemsWithTotals.reduce((sum, item) => {
      return sum + (item.vatRate > 0 ? (item.taxableAmount || 0) : 0);
    }, 0);

    const netNonTaxable = itemsWithTotals.reduce((sum, item) => {
      return sum + (item.vatRate === 0 ? (item.taxableAmount || 0) : 0);
    }, 0);

    // VAT perception is typically 2% of taxable amount (example calculation)
    const vatPerception = Number((netTaxable * 0.02).toFixed(2));

    return {
      ...billing,
      items: itemsWithTotals,
      netTaxable: Number(netTaxable.toFixed(2)),
      netNonTaxable: Number(netNonTaxable.toFixed(2)),
      totalVat: Number(totalVat.toFixed(2)),
      vatPerception,
      totalInvoice: Number(totalInvoice.toFixed(2))
    };
  }

  /**
   * Validate that payment methods sum equals invoice total
   */
  static validatePaymentMethods(billing: Billing): { valid: boolean; message?: string } {
    const totalPayments = billing.paymentMethods.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    );

    const totalInvoice = billing.totalInvoice || 0;
    const difference = Math.abs(totalInvoice - totalPayments);

    // Allow small rounding differences (less than 0.01)
    if (difference > 0.01) {
      return {
        valid: false,
        message: `El total en los medios de pago ($${totalPayments.toFixed(2)}) no concuerda con el total de la factura ($${totalInvoice.toFixed(2)}). Diferencia: $${difference.toFixed(2)}`
      };
    }

    if (billing.paymentMethods.length === 0) {
      return {
        valid: false,
        message: 'Se requiere al menos un método de pago.'
      };
    }

    return { valid: true };
  }

  /**
   * Create an empty billing instance with default values
   */
  static createEmpty(): Billing {
    const today = new Date().toISOString().split('T')[0];

    return {
      invoiceDate: today,
      voucherType: VoucherType.FACTURA,
      invoiceType: InvoiceType.TIPO_B,
      invoiceNumberPrefix: '0001',
      invoiceNumber: '00000001',
      status: InvoiceStatus.SIN_COBRAR,
      description: '',
      generateRemito: false,
      items: [],
      netTaxable: 0,
      netNonTaxable: 0,
      totalVat: 0,
      vatPerception: 0,
      iibbPerception: 0,
      totalInvoice: 0,
      paymentMethods: [],
      observations: '',
      customerName: '',
      customerIdentification: '',
      customerAddress: ''
    };
  }

  /**
   * Create an empty billing item
   */
  static createEmptyItem(): BillingItem {
    return {
      code: '',
      description: '',
      warehouse: '',
      import: 0,
      local: 0,
      unitOfMeasure: 'unidad',
      quantity: 1,
      unitPrice: 0,
      discountPercentage: 0,
      vatRate: 21,
      accountPlanId: '',
      enabled: true,
      subtotal: 0,
      discountAmount: 0,
      taxableAmount: 0,
      vatAmount: 0,
      totalAmount: 0
    };
  }

  /**
   * Create an empty payment method detail
   */
  static createEmptyPaymentMethod(): PaymentMethodDetail {
    const today = new Date().toISOString().split('T')[0];

    return {
      paymentMethod: PaymentMethod.EFECTIVO,
      fundDestination: FundDestination.CAJA_GENERAL,
      paymentDate: today,
      amount: 0
    };
  }

  /**
   * Generate full invoice number
   */
  static generateFullInvoiceNumber(prefix: string, number: string): string {
    return `${prefix}-${number}`;
  }

  /**
   * Validate invoice data step
   */
  static validateInvoiceData(billing: Billing): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!billing.invoiceDate) {
      errors.push('Se requiere fecha de factura');
    }

    if (!billing.voucherType) {
      errors.push('Se requiere tipo de comprobante');
    }

    if (!billing.invoiceType) {
      errors.push('Se requiere tipo de factura');
    }

    if (!billing.invoiceNumberPrefix || billing.invoiceNumberPrefix.length !== 4) {
      errors.push('El prefijo del número de factura debe tener 4 dígitos');
    }

    if (!billing.invoiceNumber || billing.invoiceNumber.length !== 8) {
      errors.push('El número de factura debe tener 8 dígitos');
    }

    if (!billing.status) {
      errors.push('El estado de la factura es requerido');
    }

    if (!billing.description || billing.description.trim().length === 0) {
      errors.push('La descripción de la factura es requerida');
    }

    if (billing.generateRemito && (!billing.remitoNumber || billing.remitoNumber.trim().length === 0)) {
      errors.push('Se requiere número de remito si se genera remito');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate items step
   */
  static validateItems(items: BillingItem[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (items.length === 0) {
      errors.push('Se requiere al menos un ítem en la factura');
    }

    items.forEach((item, index) => {
      const itemNumber = index + 1;

      if (!item.code || item.code.trim().length === 0) {
        errors.push(`Item ${itemNumber}: Se requiere código`);
      }

      if (!item.description || item.description.trim().length === 0) {
        errors.push(`Item ${itemNumber}: Se requiere descripción`);
      }

      if (item.quantity <= 0) {
        errors.push(`Item ${itemNumber}: Cantidad debe ser mayor a cero`);
      }

      if (item.unitPrice < 0) {
        errors.push(`Item ${itemNumber}: Precio unitario no puede ser negativo`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate totals step
   */
  static validateTotals(billing: Billing): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (billing.netTaxable < 0) {
      errors.push('El neto gravado no puede ser negativo');
    }

    if (billing.netNonTaxable < 0) {
      errors.push('El neto no gravado no puede ser negativo');
    }

    if (billing.totalVat < 0) {
      errors.push('El IVA total no puede ser negativo');
    }

    if (billing.iibbPerception < 0) {
      errors.push('La percepción de IIBB no puede ser negativa');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert billing to create request DTO (prepare for API connection)
   */
  static toCreateRequestDto(billing: Billing): BillingCreateRequestDto {
    return {
      invoiceDate: billing.invoiceDate,
      voucherType: billing.voucherType,
      invoiceType: billing.invoiceType,
      invoiceNumberPrefix: billing.invoiceNumberPrefix,
      invoiceNumber: billing.invoiceNumber,
      fullInvoiceNumber: this.generateFullInvoiceNumber(
        billing.invoiceNumberPrefix,
        billing.invoiceNumber
      ),
      status: billing.status,
      description: billing.description,
      generateRemito: billing.generateRemito,
      remitoNumber: billing.remitoNumber,
      netTaxable: billing.netTaxable,
      netNonTaxable: billing.netNonTaxable,
      totalVat: billing.totalVat,
      vatPerception: billing.vatPerception,
      iibbPerception: billing.iibbPerception,
      iibbPerceptionType: billing.iibbPerceptionType,
      totalInvoice: billing.totalInvoice,
      attachedDocuments: billing.attachedDocuments,
      customerId: billing.customerId,
      companyId: billing.companyId,
      branchId: billing.branchId,
      observations: billing.observations,
      items: billing.items.map(item => this.toItemRequestDto(item)),
      paymentMethods: billing.paymentMethods.map(pm => this.toPaymentMethodRequestDto(pm))
    };
  }

  /**
   * Convert billing item to request DTO
   */
  static toItemRequestDto(item: BillingItem): BillingItemCreateRequestDto {
    return {
      code: item.code,
      description: item.description,
      warehouse: item.warehouse,
      import: item.import,
      local: item.local,
      unitOfMeasure: item.unitOfMeasure,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercentage: item.discountPercentage,
      vatRate: item.vatRate,
      accountPlanId: item.accountPlanId,
      enabled: item.enabled
    };
  }

  /**
   * Convert payment method to request DTO
   */
  static toPaymentMethodRequestDto(paymentMethod: PaymentMethodDetail): PaymentMethodCreateRequestDto {
    return {
      paymentMethod: paymentMethod.paymentMethod,
      fundDestination: paymentMethod.fundDestination,
      bank: paymentMethod.bank,
      number: paymentMethod.number,
      paymentDate: paymentMethod.paymentDate,
      amount: paymentMethod.amount,
      observations: paymentMethod.observations,
      transactionReference: paymentMethod.transactionReference
    };
  }

  /**
   * Convert response DTO to billing (prepare for API connection)
   */
  static fromResponseDto(dto: BillingResponseDto): Billing {
    return {
      id: dto.id,
      invoiceDate: dto.invoiceDate,
      voucherType: dto.voucherType as VoucherType,
      invoiceType: dto.invoiceType as InvoiceType,
      invoiceNumberPrefix: dto.invoiceNumberPrefix,
      invoiceNumber: dto.invoiceNumber,
      fullInvoiceNumber: dto.fullInvoiceNumber,
      status: dto.status as InvoiceStatus,
      description: dto.description,
      generateRemito: dto.generateRemito,
      remitoNumber: dto.remitoNumber,
      items: dto.items?.map(item => this.fromItemResponseDto(item)) || [],
      netTaxable: dto.netTaxable,
      netNonTaxable: dto.netNonTaxable,
      totalVat: dto.totalVat,
      vatPerception: dto.vatPerception,
      iibbPerception: dto.iibbPerception,
      iibbPerceptionType: dto.iibbPerceptionType,
      totalInvoice: dto.totalInvoice,
      attachedDocuments: dto.attachedDocuments,
      paymentMethods: dto.paymentMethods?.map(pm => this.fromPaymentMethodResponseDto(pm)) || [],
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      createdBy: dto.createdBy,
      updatedBy: dto.updatedBy,
      customerId: dto.customerId,
      companyId: dto.companyId,
      branchId: dto.branchId,
      observations: dto.observations
    };
  }

  /**
   * Convert item response DTO to billing item
   */
  static fromItemResponseDto(dto: BillingItemDto): BillingItem {
    return {
      id: dto.id,
      code: dto.code,
      description: dto.description,
      warehouse: dto.warehouse,
      import: dto.import,
      local: dto.local,
      unitOfMeasure: dto.unitOfMeasure,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      discountPercentage: dto.discountPercentage,
      vatRate: dto.vatRate,
      subtotal: dto.subtotal,
      discountAmount: dto.discountAmount,
      taxableAmount: dto.taxableAmount,
      vatAmount: dto.vatAmount,
      totalAmount: dto.totalAmount,
      accountPlanId: dto.accountPlanId,
      enabled: dto.enabled ?? true
    };
  }

  /**
   * Convert payment method response DTO to payment method detail
   */
  static fromPaymentMethodResponseDto(dto: PaymentMethodDto): PaymentMethodDetail {
    return {
      id: dto.id,
      paymentMethod: dto.paymentMethod,
      fundDestination: dto.fundDestination,
      bank: dto.bank,
      number: dto.number,
      paymentDate: dto.paymentDate,
      amount: dto.amount,
      observations: dto.observations,
      transactionReference: dto.transactionReference
    };
  }

  // ============================================================================
  // NEW INVOICE REFERENCE REQUEST MAPPERS (for Colppy integration)
  // ============================================================================

  /**
   * Convert billing to InvoiceReferenceRequestDto (for new backend endpoint)
   * @param billing The billing data
   * @param invoiceableId The ID of the invoiceable entity this invoice references
   * @param isAttention Optional flag indicating if attention is required
   */
  static toInvoiceReferenceRequestDto(
    billing: Billing,
    invoiceableId: number,
    isAttention?: boolean
  ): InvoiceReferenceRequestDto {
    return {
      invoiceableId: invoiceableId,
      isAttention: isAttention,
      invoiceData: this.toColppyInvoiceRequestDto(billing)
    };
  }

  /**
   * Convert billing to CreateInvoiceRequestDto (Colppy format)
   */
  static toColppyInvoiceRequestDto(billing: Billing): CreateInvoiceRequestDto {
    // Get invoice kind from separate voucher and invoice types
    const kind = getInvoiceKindFromSeparateTypes(
      billing.voucherType,
      billing.invoiceType
    );

    if (!kind) {
      throw new Error(`Invalid voucher/invoice type combination: ${billing.voucherType} / ${billing.invoiceType}`);
    }

    return {
      kind,
      description: billing.description,
      invoiceDate: billing.invoiceDate,
      paymentDate: billing.paymentDate || billing.invoiceDate, // Default to invoice date if not set
      paymentCondition: billing.paymentCondition || 'Contado',
      paymentType: billing.paymentType || 'Efectivo',
      customerId: billing.customerId || '',
      companyId: billing.companyId || '',
      currencyId: billing.currencyId || '1', // Default to 1 (ARS)
      invoiceNumberPrefix: billing.invoiceNumberPrefix,
      invoiceNumber: billing.invoiceNumber,
      taxableSubtotal: billing.netTaxable,
      nonTaxableSubtotal: billing.netNonTaxable,
      totalVat: billing.totalVat,
      grandTotal: billing.grandTotal || billing.totalInvoice || 0,
      items: billing.items.map(item => this.toColppyInvoiceItemRequestDto(item)),
      payments: billing.paymentMethods?.map(pm => this.toColppyInvoicePaymentRequestDto(pm))
    };
  }

  /**
   * Convert billing item to CreateInvoiceItemRequestDto (Colppy format)
   */
  static toColppyInvoiceItemRequestDto(item: BillingItem): CreateInvoiceItemRequestDto {
    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      discountPercentage: item.discountPercentage || 0,
      accountPlanId: item.accountPlanId,
      unitOfMeasure: item.unitOfMeasure || 'unidad'
    };
  }

  /**
   * Convert payment method to CreateInvoicePaymentRequestDto (Colppy format)
   */
  static toColppyInvoicePaymentRequestDto(paymentMethod: PaymentMethodDetail): CreateInvoicePaymentRequestDto {
    return {
      paymentMethodId: this.mapPaymentMethodToColppyId(paymentMethod.paymentMethod),
      accountPlanId: this.mapFundDestinationToAccountPlan(paymentMethod.fundDestination),
      bank: paymentMethod.bank,
      checkNumber: paymentMethod.number,
      validityDate: paymentMethod.paymentDate,
      amount: paymentMethod.amount
    };
  }

  /**
   * Map internal PaymentMethod enum to Colppy payment method ID
   * TODO: This mapping should come from backend configuration
   */
  private static mapPaymentMethodToColppyId(method: PaymentMethod): string {
    const mapping: Record<PaymentMethod, string> = {
      [PaymentMethod.EFECTIVO]: '1',
      [PaymentMethod.TARJETA_DEBITO]: '2',
      [PaymentMethod.TRANSFERENCIA]: '3',
      [PaymentMethod.CHEQUE]: '4',
      [PaymentMethod.TARJETA_CREDITO]: '5',
      [PaymentMethod.MERCADO_PAGO]: '6',
      [PaymentMethod.QR]: '7',
      [PaymentMethod.OTRO]: '8'
    };
    return mapping[method] || '1';
  }

  /**
   * Map internal FundDestination enum to Colppy account plan ID
   * TODO: This mapping should come from backend configuration
   */
  private static mapFundDestinationToAccountPlan(destination: FundDestination): string {
    const mapping: Record<FundDestination, string> = {
      [FundDestination.CAJA_GENERAL]: '1010',
      [FundDestination.BANCO_CUENTA_CORRIENTE]: '1020',
      [FundDestination.BANCO_CAJA_AHORRO]: '1030',
      [FundDestination.CAJA_CHICA]: '1040',
      [FundDestination.INVERSIONES]: '1060',
      [FundDestination.OTRO]: '1050'
    };
    return mapping[destination] || '1010';
  }
}
