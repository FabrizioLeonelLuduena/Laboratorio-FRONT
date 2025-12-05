/**
 * Interface that represents the address for a branch.
 */
export interface Address {
  id: number;
  streetName: string;
  streetNumber: string;
  neighborhoodId: number;
  cityId: number;
  provinceId: number;
  postalCode: string;
  latitude: number;
  longitude: number;
}

/**
 * Interface to do a request to the API.
 */
export interface AddressRequest {
  streetName: string;
  streetNumber: string;
  neighborhoodId: number;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
}
