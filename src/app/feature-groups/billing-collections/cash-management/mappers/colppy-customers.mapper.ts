import { ClientListResponseDto, CustomerOption } from '../view-models/colppy-customer.vm';

/**
 * Maps a ClientListResponseDto to an array of CustomerOption objects.
 *
 * @param dto - The ClientListResponseDto to map.
 * @returns An array of CustomerOption objects.
 */
export function mapClientListResponseToOptions(dto: ClientListResponseDto): CustomerOption[] {
  const data = dto?.response?.data ?? [];
  return data.map(c => ({
    value: c.idCliente,
    label: c.RazonSocial?.trim() || `(sin razón social) ${c.idCliente}`
  }));
}
