import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

import { filter } from 'rxjs/operators';

import { LoggerService } from './logger.service';

/**
 * Interface representing performance metrics
 * @interface PerformanceMetrics
 */
export interface PerformanceMetrics {
    pageLoadTime?: number;
    domContentLoaded?: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    firstInputDelay?: number;
    cumulativeLayoutShift?: number;
    timeToInteractive?: number;
    url?: string;
    duration?: number;
    operation?: string;
}

/**
 * Service for monitoring application performance metrics
 * Tracks Web Vitals, page load times, and custom operation durations
 * Automatically logs performance data using LoggerService
 *
 * @example
 * ```typescript
 * constructor(private perfMonitor: PerformanceMonitorService) {}
 *
 * // Measure custom operation
 * this.perfMonitor.measureOperation('data-load', async () => {
 *   await this.loadData();
 * });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class PerformanceMonitorService {
  private logger = inject(LoggerService);
  private router = inject(Router);

  /**
         * Initializes the performance monitoring service
         */
  constructor() {
    this.initializeMonitoring();
  }

  /**
           * Initializes performance monitoring
           * Sets up observers for page load, Web Vitals, and route changes
           * @private
           */
  private initializeMonitoring(): void {
    // Monitorear carga inicial de la página
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Esperar a que la página esté completamente cargada
      if (document.readyState === 'complete') {
        this.measurePageLoad();
      } else {
        window.addEventListener('load', () => this.measurePageLoad());
      }

      // Monitorear Web Vitals
      this.observeWebVitals();
    }

    // Monitorear navegación entre rutas
    this.monitorRouteChanges();
  }

  /**
           * Measures page load performance metrics
           * Captures timing data from Navigation Timing API
           * @private
           */
  private measurePageLoad(): void {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (!perfData) return;

      const metrics: PerformanceMetrics = {
        pageLoadTime: perfData.loadEventEnd - perfData.fetchStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
        timeToInteractive: perfData.domInteractive - perfData.fetchStart
      };

      // Solo enviar métricas, no logear en consola
      this.sendMetrics('page_load', metrics);
    }, 0);
  }

  /**
           * Observes Web Vitals metrics (LCP, FID, CLS, FCP)
           * Uses PerformanceObserver API to capture real user metrics
           * @private
           */
  private observeWebVitals(): void {
    // Largest Contentful Paint (LCP)
    this.observeLCP();

    // First Input Delay (FID)
    this.observeFID();

    // Cumulative Layout Shift (CLS)
    this.observeCLS();

    // First Contentful Paint (FCP)
    this.observeFCP();
  }

  /**
           * Observes Largest Contentful Paint (LCP) metric
           * LCP measures loading performance - should occur within 2.5s
           * @private
           */
  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        const lcp = lastEntry.renderTime || lastEntry.loadTime;
        this.sendMetrics('lcp', { largestContentfulPaint: lcp });
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // PerformanceObserver no soportado
    }
  }

  /**
           * Observes First Input Delay (FID) metric
           * FID measures interactivity - should be less than 100ms
           * @private
           */
  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime;
          this.sendMetrics('fid', { firstInputDelay: fid });
        });
      });

      observer.observe({ type: 'first-input', buffered: true });
    } catch {
      // PerformanceObserver no soportado
    }
  }

  /**
           * Observes Cumulative Layout Shift (CLS) metric
           * CLS measures visual stability - should be less than 0.1
           * @private
           */
  private observeCLS(): void {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.sendMetrics('cls', { cumulativeLayoutShift: clsValue });
      });

      observer.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // PerformanceObserver no soportado
    }
  }

  /**
           * Observes First Contentful Paint (FCP) metric
           * FCP measures when first content is rendered - should be under 1.8s
           * @private
           */
  private observeFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fcp = entry.startTime;
          this.sendMetrics('fcp', { firstContentfulPaint: fcp });
        });
      });

      observer.observe({ type: 'paint', buffered: true });
    } catch {
      // PerformanceObserver no soportado
    }
  }

  /**
           * Monitors route changes and measures navigation time
           * @private
           */
  private monitorRouteChanges(): void {
    let navigationStart = Date.now();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const navigationTime = Date.now() - navigationStart;

        // Solo enviar métricas, no logear en consola
        this.sendMetrics('navigation', {
          url: event.urlAfterRedirects,
          duration: navigationTime
        });

        // Resetear para próxima navegación
        navigationStart = Date.now();
      });
  }

  /**
           * Measures the duration of a custom operation
           * Works with both synchronous and asynchronous operations
           * @param {string} operationName - Name of the operation being measured
           * @param {Function} operation - The operation to measure
           * @returns {T | Promise<T>} The result of the operation
           * @example
           * ```typescript
           * await this.perfMonitor.measureOperation('load-users', async () => {
           *   return await this.userService.getUsers();
           * });
           * ```
           */
  measureOperation<T>(
    operationName: string,
    operation: () => T | Promise<T>
  ): T | Promise<T> {
    const startTime = performance.now();

    try {
      const result = operation();

      if (result instanceof Promise) {
        return result.then((value) => {
          const duration = performance.now() - startTime;
          // Solo enviar métricas, no logear en consola
          this.sendMetrics('operation', { operation: operationName, duration });
          return value;
        });
      }

      const duration = performance.now() - startTime;
      // Solo enviar métricas, no logear en consola
      this.sendMetrics('operation', { operation: operationName, duration });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `Operación "${operationName}" falló después de ${duration.toFixed(2)}ms`,
        'Performance',
        { operation: operationName, duration, error }
      );
      throw error;
    }
  }

  /**
           * Sends performance metrics to backend (currently disabled)
           * Metrics are collected but not logged to console to avoid clutter
           * @private
           * @param {string} metricType - Type of metric being sent
           * @param {PerformanceMetrics} metrics - The metrics data
           */
  private sendMetrics(_metricType: string, _metrics: PerformanceMetrics): void {
    // Métricas recolectadas pero no logueadas en consola
    // En el futuro, aquí se podrían enviar a un servicio de analytics
  }

  /**
           * Gets current performance metrics snapshot
           * @returns {PerformanceMetrics} Current performance metrics
           */
  getCurrentMetrics(): PerformanceMetrics {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (!perfData) {
      return {};
    }

    return {
      pageLoadTime: perfData.loadEventEnd - perfData.fetchStart,
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
      timeToInteractive: perfData.domInteractive - perfData.fetchStart
    };
  }
}

