/**
 *
 */
export interface ClientListItemDto {
  idCliente: string;
  RazonSocial: string;
  CUIT: string;
  Activo: '0' | '1';
  Email: string;
  Telefono: string;
}

/**
 *
 */
export interface ClientListResponseDto {
  service: {
    provision: string;
    operacion: string;
    version: string;
    response_date: string;
  };
  result: {
    estado: number;
    mensaje: string;
  };
  response: {
    success: boolean;
    message: string;
    data: ClientListItemDto[];
    total: number;
  };
}

/**
 *
 */
export interface CustomerOption {
  value: string; // idCliente
  label: string; // RazonSocial
}

/**
 *
 */
export interface CreateCustomerOverrides {
  tradeName: string;        // NombreFantasia
  legalName: string;        // RazonSocial
  cuit?: string;             // CUIT
  postalAddress?: string;    // DirPostal
  postalCity?: string;       // DirPostalCiudad
  postalZipCode?: string;    // DirPostalCodigoPostal
  postalProvince?: string;   // DirPostalProvincia
  postalCountry?: string;    // DirPostalPais
  phone?: string;            // Telefono
  email?: string;            // Email
  vatConditionId: string;   // idCondicionIva
  active: '0' | '1';        // Activo
}

/**
 *
 */
export interface CreateCustomerMinimalResponse {
  colppyId: string;  // id asignado por Colppy
  message: string;
}
