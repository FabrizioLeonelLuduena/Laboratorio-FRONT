import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';

import { of, throwError } from 'rxjs';

import { delay } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { MockDataService } from '../services/mock-data.service';

/**
 * Mock API Interceptor
 * Intercepta peticiones HTTP y devuelve datos mock cuando el modo mock está activado
 * 
 * Uso: Agregar en app.config.ts:
 * provideHttpClient(withInterceptors([mockApiInterceptor]))
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo interceptar si el modo mock está activado
  if (!environment.useMockData) {
    return next(req);
  }

  const mockService = inject(MockDataService);
  const url = req.url;
  const method = req.method;

  // Interceptar solo rutas de API
  if (!url.includes('/api/')) {
    return next(req);
  }

  console.log(`🔍 Mock interceptor: ${method} ${url}`);

  // Asegurar que los datos estén cargados
  if (!mockService.isLoaded()) {
    return throwError(() => new HttpErrorResponse({
      error: { message: 'Mock data not loaded. Call mockService.loadMockData() first.' },
      status: 500,
      statusText: 'Internal Server Error'
    }));
  }

  // === SUPPLIERS ===
  if (url.includes('/api/v1/stock/suppliers')) {
    return handleSuppliersRequest(url, method, req.body, mockService);
  }

  // === SUPPLIES ===
  if (url.includes('/api/v1/stock/supplies')) {
    return handleSuppliesRequest(url, method, req.body, mockService);
  }

  // === PURCHASE ORDERS ===
  if (url.includes('/api/v1/stock/purchase-orders')) {
    return handlePurchaseOrdersRequest(url, method, req.body, mockService);
  }

  // === CATEGORIES ===
  if (url.includes('/api/v1/stock/categories')) {
    return handleCategoriesRequest(url, method, req.body, mockService);
  }

  // === LOCATIONS ===
  if (url.includes('/api/v1/stock/locations')) {
    return handleLocationsRequest(url, method, req.body, mockService);
  }

  // === KPIs ===
  if (url.includes('/api/v1/stock/kpi/')) {
    return handleKpiRequest(url, method, mockService);
  }

  // === ALERTS ===
  if (url.includes('/api/v1/stock/alerts/')) {
    return handleAlertsRequest(url, method, mockService);
  }

  // === NOTIFICATIONS ===
  if (url.includes('/api/v1/notifications')) {
    return handleNotificationsRequest(url, method);
  }

  // === LOGIN ===
  if (url.includes('/api/v1/auth/internal/login') || url.includes('/api/v1/internal/login')) {
    return handleLoginRequest(url, method, req.body);
  }

  // Si no coincide con ninguna ruta mock, pasar al siguiente
  return next(req);
};

// ========== HANDLERS ==========

/**
 * Handle suppliers API requests
 * @param url - Request URL
 * @param method - HTTP method
 * @param body - Request body
 * @param mockService - Mock data service
 * @returns Observable with response
 */
function handleSuppliersRequest(url: string, method: string, body: any, mockService: MockDataService) {
  // GET /api/v1/stock/suppliers/actives
  if (method === 'GET' && url.includes('/suppliers/actives')) {
    return mockService.getAllActive('suppliers');
  }

  // GET /api/v1/stock/suppliers
  if (method === 'GET' && url.match(/\/suppliers\/?$/)) {
    const params = extractQueryParams(url);
    return mockService.search('suppliers', 
      parseInt(params.page || '0'), 
      parseInt(params.size || '10'),
      params
    );
  }

  // GET /api/v1/stock/suppliers/{id}
  const getByIdMatch = url.match(/\/suppliers\/(\d+)$/);
  if (method === 'GET' && getByIdMatch) {
    const id = parseInt(getByIdMatch[1]);
    return mockService.getById('suppliers', id);
  }

  // POST /api/v1/stock/suppliers
  if (method === 'POST' && url.match(/\/suppliers\/?$/)) {
    return mockService.create('suppliers', body);
  }

  // PUT /api/v1/stock/suppliers/{id}
  const updateMatch = url.match(/\/suppliers\/(\d+)$/);
  if (method === 'PUT' && updateMatch) {
    const id = parseInt(updateMatch[1]);
    return mockService.update('suppliers', id, body);
  }

  // DELETE /api/v1/stock/suppliers/{id}
  const deleteMatch = url.match(/\/suppliers\/(\d+)$/);
  if (method === 'DELETE' && deleteMatch) {
    const id = parseInt(deleteMatch[1]);
    return mockService.delete('suppliers', id);
  }

  return mockNotFound(url);
}

/**
 * Handle supplies API requests
 * @param url - Request URL
 * @param method - HTTP method
 * @param body - Request body
 * @param mockService - Mock data service
 * @returns Observable with response
 */
function handleSuppliesRequest(url: string, method: string, body: any, mockService: MockDataService) {
  // GET /api/v1/stock/supplies
  if (method === 'GET' && url.match(/\/supplies\/?$/)) {
    const params = extractQueryParams(url);
    return mockService.search('supplies', 
      parseInt(params.page || '0'), 
      parseInt(params.size || '10'),
      params
    );
  }

  // GET /api/v1/stock/supplies/{id}
  const getByIdMatch = url.match(/\/supplies\/(\d+)$/);
  if (method === 'GET' && getByIdMatch) {
    const id = parseInt(getByIdMatch[1]);
    return mockService.getById('supplies', id);
  }

  // POST /api/v1/stock/supplies
  if (method === 'POST' && url.match(/\/supplies\/?$/)) {
    return mockService.create('supplies', body);
  }

  // PUT /api/v1/stock/supplies/{id}
  const updateMatch = url.match(/\/supplies\/(\d+)$/);
  if (method === 'PUT' && updateMatch) {
    const id = parseInt(updateMatch[1]);
    return mockService.update('supplies', id, body);
  }

  // DELETE /api/v1/stock/supplies/{id}
  const deleteMatch = url.match(/\/supplies\/(\d+)$/);
  if (method === 'DELETE' && deleteMatch) {
    const id = parseInt(deleteMatch[1]);
    return mockService.delete('supplies', id);
  }

  return mockNotFound(url);
}

/**
 * Handle purchase orders API requests
 * @param url - Request URL
 * @param method - HTTP method
 * @param body - Request body
 * @param mockService - Mock data service
 * @returns Observable with response
 */
function handlePurchaseOrdersRequest(url: string, method: string, body: any, mockService: MockDataService) {
  // GET /api/v1/stock/purchase-orders
  if (method === 'GET' && url.match(/\/purchase-orders\/?$/)) {
    const params = extractQueryParams(url);
    return mockService.search('purchase-orders', 
      parseInt(params.page || '0'), 
      parseInt(params.size || '10'),
      params
    );
  }

  // GET /api/v1/stock/purchase-orders/{id}
  const getByIdMatch = url.match(/\/purchase-orders\/(\d+)$/);
  if (method === 'GET' && getByIdMatch) {
    const id = parseInt(getByIdMatch[1]);
    return mockService.getById('purchase-orders', id);
  }

  // POST /api/v1/stock/purchase-orders
  if (method === 'POST' && url.match(/\/purchase-orders\/?$/)) {
    return mockService.create('purchase-orders', body);
  }

  // PUT /api/v1/stock/purchase-orders/{id}
  const updateMatch = url.match(/\/purchase-orders\/(\d+)$/);
  if (method === 'PUT' && updateMatch) {
    const id = parseInt(updateMatch[1]);
    return mockService.update('purchase-orders', id, body);
  }

  // DELETE /api/v1/stock/purchase-orders/{id}
  const deleteMatch = url.match(/\/purchase-orders\/(\d+)$/);
  if (method === 'DELETE' && deleteMatch) {
    const id = parseInt(deleteMatch[1]);
    return mockService.delete('purchase-orders', id);
  }

  return mockNotFound(url);
}

/**
 * Handle categories API requests
 * @param url - Request URL
 * @param method - HTTP method
 * @param body - Request body
 * @param mockService - Mock data service
 * @returns Observable with response
 */
function handleCategoriesRequest(url: string, method: string, body: any, mockService: MockDataService) {
  // GET /api/v1/stock/categories
  if (method === 'GET' && url.match(/\/categories\/?$/)) {
    return mockService.getAll('categories');
  }

  // GET /api/v1/stock/categories/{id}
  const getByIdMatch = url.match(/\/categories\/(\d+)$/);
  if (method === 'GET' && getByIdMatch) {
    const id = parseInt(getByIdMatch[1]);
    return mockService.getById('categories', id);
  }

  return mockNotFound(url);
}

/**
 * Handle locations API requests
 * @param url - Request URL
 * @param method - HTTP method
 * @param body - Request body
 * @param mockService - Mock data service
 * @returns Observable with response
 */
function handleLocationsRequest(url: string, method: string, body: any, mockService: MockDataService) {
  // GET /api/v1/stock/locations/types
  if (method === 'GET' && url.match(/\/locations\/types\/?$/)) {
    return mockService.getAll('location-types');
  }

  // GET /api/v1/stock/locations/actives
  if (method === 'GET' && url.match(/\/locations\/actives\/?$/)) {
    return mockService.getAllActive('locations');
  }

  // GET /api/v1/stock/locations
  if (method === 'GET' && url.match(/\/locations\/?$/)) {
    const params = extractQueryParams(url);
    return mockService.search('locations', 
      parseInt(params.page || '0'), 
      parseInt(params.size || '10'),
      params
    );
  }

  // GET /api/v1/stock/locations/{id}
  const getByIdMatch = url.match(/\/locations\/(\d+)$/);
  if (method === 'GET' && getByIdMatch) {
    const id = parseInt(getByIdMatch[1]);
    return mockService.getById('locations', id);
  }

  // POST /api/v1/stock/locations
  if (method === 'POST' && url.match(/\/locations\/?$/)) {
    return mockService.create('locations', body);
  }

  // PUT /api/v1/stock/locations/{id}
  const updateMatch = url.match(/\/locations\/(\d+)$/);
  if (method === 'PUT' && updateMatch) {
    const id = parseInt(updateMatch[1]);
    return mockService.update('locations', id, body);
  }

  // DELETE /api/v1/stock/locations/{id}
  const deleteMatch = url.match(/\/locations\/(\d+)$/);
  if (method === 'DELETE' && deleteMatch) {
    const id = parseInt(deleteMatch[1]);
    return mockService.delete('locations', id);
  }

  return mockNotFound(url);
}

/**
 * Handle KPI API requests
 * @param url - Request URL
 * @param method - HTTP method
 * @param mockService - Mock data service
 * @returns Observable with response
 */
function handleKpiRequest(url: string, method: string, mockService: MockDataService) {
  if (method !== 'GET') {
    return mockNotFound(url);
  }

  // Map URLs to KPI types (matching actual backend endpoints)
  const kpiMapping: { [key: string]: string } = {
    // Purchase Orders KPIs
    '/api/v1/stock/kpi/orders/total-volume': 'total-purchase-volume',
    '/api/v1/stock/kpi/orders/average-delivery-time': 'average-delivery-time',
    '/api/v1/stock/kpi/orders/created-count': 'created-orders',
    '/api/v1/stock/kpi/orders/return-rate': 'return-rate',
    '/api/v1/stock/kpi/orders/volume-by-supplier': 'volume-by-supplier',
    '/api/v1/stock/kpi/orders/per-month': 'orders-by-month',
    '/api/v1/stock/kpi/orders/return-rate-by-supplier': 'return-rate-by-supplier',
    // Supplier KPIs
    '/api/v1/stock/kpi/suppliers/average-delivery-time': 'delivery-time-by-supplier',
    // Transfer KPIs
    '/api/v1/stock/kpi/transfers/by-location': 'transfers-by-location',
    '/api/v1/stock/kpi/transfers/average-time': 'average-transfer-time',
    // Supply KPIs
    '/api/v1/stock/kpi/supplies/outputs-by-location': 'outputs-by-location',
    '/api/v1/stock/kpi/supplies/most-demanded': 'most-demanded-supplies',
    // Additional KPIs (if used elsewhere)
    '/api/v1/stock/kpi/critical-stock': 'critical-stock',
    '/api/v1/stock/kpi/inventory-value': 'inventory-value',
    '/api/v1/stock/kpi/pending-orders': 'pending-orders',
    '/api/v1/stock/kpi/ontime-delivery-rate': 'ontime-delivery-rate',
    '/api/v1/stock/kpi/top-suppliers': 'top-suppliers',
    '/api/v1/stock/kpi/top-products': 'top-products',
    '/api/v1/stock/kpi/top-locations': 'top-locations'
  };

  // Extract base URL without query params
  const baseUrl = url.split('?')[0];

  // Find matching KPI type
  for (const [pattern, kpiType] of Object.entries(kpiMapping)) {
    if (baseUrl === pattern || baseUrl.startsWith(pattern)) {
      return mockService.getKpiData(kpiType);
    }
  }

  return mockNotFound(url);
}

/**
 * Handle alerts API requests
 * @param url - Request URL
 * @param method - HTTP method
 * @param mockService - Mock data service
 * @returns Observable with response
 */
function handleAlertsRequest(url: string, method: string, mockService: MockDataService) {
  if (method !== 'GET') {
    return mockNotFound(url);
  }

  // GET /api/v1/stock/alerts/critical-stock
  if (url.includes('/alerts/critical-stock')) {
    const data = mockService.getRawData('alerts-critical-stock');
    return of(new HttpResponse({
      status: 200,
      body: data?.content || [] // Return only the content array
    })).pipe(delay(300));
  }

  // GET /api/v1/stock/alerts/excess-stock
  if (url.includes('/alerts/excess-stock')) {
    const data = mockService.getRawData('alerts-excess-stock');
    return of(new HttpResponse({
      status: 200,
      body: data || { alerts: [] } // Return object with alerts property
    })).pipe(delay(300));
  }

  return mockNotFound(url);
}

/**
 * Handle notifications API requests
 * @param url - Request URL
 * @param method - HTTP method
 * @returns Observable with response
 */
function handleNotificationsRequest(url: string, method: string) {
  if (method !== 'GET') {
    return mockNotFound(url);
  }

  // Mock empty notifications
  const emptyNotifications = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    size: 100,
    number: 0
  };

  return of(new HttpResponse({
    status: 200,
    body: emptyNotifications
  })).pipe(delay(300));
}

/**
 * Handle login API requests
 * @param url - Request URL
 * @param method - HTTP method
 * @param body - Request body with credentials
 * @returns Observable with response
 */
function handleLoginRequest(url: string, method: string, body: any) {
  if (method !== 'POST') {
    return mockNotFound(url);
  }

  const { username, password } = body || {};

  // Check for Admin user
  if (username === 'Admin' && password === 'Superadmin') {
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlcyI6WyJBRE1JTklTVFJBRE9SIiwiQklPUVVJTUlDTyIsIkVYVEVSTk8iLCJGQUNUVVJJU1RBIiwiTUFOQUdFUl9TVE9DSyIsIk9QRVJBRE9SX0NPTVBSQVMiLCJSRVNQT05TQUJMRV9TRUNSRVRBUklBIiwiU0VDUkVUQVJJQSIsIlRFQ05JQ09fTEFCT1JBVE9SSU8iXSwiaWQiOjEsInN1YiI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NjI0NzczNjAsImV4cCI6MTgyNTU0OTM2MH0.B-Dnc-jIkbUzJZK6x3YRzEAE-3NI5lwB89ZFRYVpxyg';
    
    const loginResponse = {
      token: adminToken,
      user: {
        id: 1,
        username: 'Admin',
        email: 'admin@laboratorio.com',
        firstName: 'Super',
        lastName: 'Administrador',
        isActive: true,
        isFirstLogin: false,
        roles: [
          'ADMINISTRADOR',
          'BIOQUIMICO',
          'EXTERNO',
          'FACTURISTA',
          'MANAGER_STOCK',
          'OPERADOR_COMPRAS',
          'RESPONSABLE_SECRETARIA',
          'SECRETARIA',
          'TECNICO_LABORATORIO'
        ]
      }
    };

    return of(new HttpResponse({
      status: 200,
      body: loginResponse
    })).pipe(delay(500));
  }

  // Return 401 for invalid credentials
  return throwError(() => new HttpErrorResponse({
    error: { message: 'Credenciales inválidas' },
    status: 401,
    statusText: 'Unauthorized'
  })).pipe(delay(500));
}

// ========== HELPERS ==========

/**
 * Extract query parameters from URL
 * @param url - Request URL
 * @returns Object with query parameters
 */
function extractQueryParams(url: string): any {
  const params: any = {};
  const queryString = url.split('?')[1];
  
  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    });
  }
  
  return params;
}

/**
 * Return 404 error response
 * @param url - Request URL
 * @returns Observable with error
 */
function mockNotFound(url: string) {
  return throwError(() => new HttpErrorResponse({
    error: { message: `Mock endpoint not found: ${url}` },
    status: 404,
    statusText: 'Not Found'
  })).pipe(delay(300));
}
