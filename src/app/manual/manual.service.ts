import { HttpClient } from '@angular/common/http';
import { Injectable, signal, inject } from '@angular/core';

import { firstValueFrom, throwError, of } from 'rxjs';

import { ManualIndex, ManualModule, ManualPage } from './IManual';

/**
 * Resultado de búsqueda en el manual
 */
export interface ManualSearchResult {
  moduleId: string;
  moduleLabel?: string;
  pageId: string;
  pageLabel?: string;
  excerpt?: string;
  path: string;
}

/**
 * Servicio que gestiona la carga y búsqueda del manual.
 *
 * - Carga `manual-index.json` al iniciar.
 * - Hace prefetch en background de las páginas y las cachea.
 * - Expone `searchReady` y `prefetchProgress` para conocer el estado del indexado.
 */
@Injectable({ providedIn: 'root' })
export class ManualService {
  private http = inject(HttpClient);

  index = signal<ManualIndex | null>(null);
  modules = signal<ManualModule[]>([]);

  // Señales públicas para exponer estado de indexado/prefetch
  searchReady = signal(false);
  prefetchProgress = signal(0); // 0..100

  // Cache de páginas y deduplicación de fetches
  private pagesCache = new Map<string, ManualPage>();
  private pendingFetches = new Map<string, Promise<ManualPage>>();

  // Promise que se resuelve cuando el índice está cargado
  private indexLoadedPromise: Promise<void> | null = null;

  /**
   * Inicializa el servicio y comienza la carga del índice.
   */
  constructor() {
    this.indexLoadedPromise = this.loadIndex();
  }

  /**
   * Espera a que el índice esté completamente cargado.
   * Útil para guards o componentes que necesitan garantizar que el índice existe.
   */
  async waitForIndex(): Promise<void> {
    if (this.indexLoadedPromise) {
      await this.indexLoadedPromise;
    }
  }

  /**
   * Carga el índice (manual-index.json) y dispara el prefetch en background.
   */
  private async loadIndex(): Promise<void> {
    const data = await firstValueFrom(this.http.get<ManualIndex>('./assets/manual/manual-index.json'));
    this.index.set(data);
    this.modules.set([...data.modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));

    // Prefetch en background: no bloqueante
    this.prefetchAllPages().catch(() => {
      // marcar listo aunque falle prefetch
      this.searchReady.set(true);
    });
  }

  /**
   * Prefetch de todas las páginas listadas en el índice para poblar la cache.
   */
  private async prefetchAllPages(): Promise<void> {
    const idx = this.index();
    if (!idx) {
      this.searchReady.set(true);
      return;
    }

    const metas: string[] = [];
    for (const mod of idx.modules) {
      for (const p of mod.sidebar) metas.push(p.path);
    }

    const total = metas.length;
    if (total === 0) {
      this.prefetchProgress.set(100);
      this.searchReady.set(true);
      return;
    }

    let done = 0;
    for (const path of metas) {
      if (!this.pagesCache.has(path)) {
        try {
          await this.fetchPage(path);
        } catch {
          // ignorar errores individuales
        }
      }
      done++;
      this.prefetchProgress.set(Math.round((done / total) * 100));
    }

    this.searchReady.set(true);
  }

  /**
   * Recupera una página desde la cache o la carga via HTTP (deduplicando requests).
   * @param path ruta del JSON de la página
   */
  private async fetchPage(path: string): Promise<ManualPage> {
    const cached = this.pagesCache.get(path);
    if (cached) return cached;

    const pending = this.pendingFetches.get(path);
    if (pending) return pending;

    const p = firstValueFrom(this.http.get<ManualPage>(path))
      .then((page) => {
        this.pagesCache.set(path, page);
        this.pendingFetches.delete(path);
        return page;
      })
      .catch((err) => {
        this.pendingFetches.delete(path);
        throw err;
      });

    this.pendingFetches.set(path, p);
    return p;
  }

  /**
   * Obtiene una página específica del manual. Devuelve un observable con la página.
   */
  getPage(moduleId: string, pageId: string) {
    const idx = this.index();
    if (!idx) return throwError(() => new Error('Manual index no cargado'));

    const mod = idx.modules.find((m) => m.id === moduleId);
    if (!mod) return throwError(() => new Error(`Módulo no encontrado: ${moduleId}`));

    const pageMeta = mod.sidebar.find((p) => p.id === pageId);
    if (!pageMeta) return throwError(() => new Error(`Página no encontrada: ${pageId}`));

    const cached = this.pagesCache.get(pageMeta.path);
    if (cached) return of(cached);

    return this.http.get<ManualPage>(pageMeta.path);
  }

  /**
   * Búsqueda que utiliza únicamente páginas en cache (sin nuevas peticiones).
   * Devuelve un array de resultados con un pequeño excerpt.
   */
  async search(query: string): Promise<ManualSearchResult[]> {
    if (!query) return [];
    const q = query.trim();
    if (!q) return [];

    if (this.indexLoadedPromise) await this.indexLoadedPromise;
    const idx = this.index();
    if (!idx) return [];

    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    const results: ManualSearchResult[] = [];
    const MAX = 20;

    // helper para escapar texto en regex
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // helper para limpiar tags HTML pero preservar el contenido de texto
    const stripHtmlTags = (text: string): string => {
      // Eliminar tags HTML completos (incluyendo iconos como <i class='pi pi-filter'></i>)
      // Usamos una regex más completa que capture tags de apertura y cierre
      // eslint-disable-next-line prefer-const
      let cleaned = text
        // Eliminar tags HTML con cualquier atributo
        .replace(/<[^>]+>/g, ' ')
        // Eliminar entidades HTML comunes
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        // eslint-disable-next-line quotes
        .replace(/&apos;/g, '\'')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        // Reemplazar múltiples espacios por uno solo
        .replace(/\s+/g, ' ')
        // Trim espacios al inicio y final
        .trim();

      return cleaned;
    };

    for (const mod of idx.modules) {
      for (const pageMeta of mod.sidebar) {
        const page = this.pagesCache.get(pageMeta.path);
        if (!page) continue; // no hacemos nuevas peticiones

        const textParts: string[] = [];
        if (page.title) textParts.push(page.title);
        if (page.intro) textParts.push(page.intro);
        if ((page as any).tags) textParts.push(...((page as any).tags));

        if (page.sections) {
          for (const sec of page.sections) {
            if (sec.title) textParts.push(sec.title);
            if (sec.blocks) {
              for (const b of sec.blocks as any[]) {
                if (!b || !b.type) continue;
                switch (b.type) {
                case 'title':
                case 'paragraph':
                case 'subtitle':
                case 'note':
                  if (b.text) textParts.push(b.text);
                  if (b.title) textParts.push(b.title);
                  break;
                case 'list':
                  if (b.items && Array.isArray(b.items)) textParts.push(b.items.join(' '));
                  break;
                case 'table':
                  if (b.columns) textParts.push(b.columns.join(' '));
                  if (b.rows) {
                    // Limpiar HTML de cada celda antes de unirlas
                    const cleanRows = b.rows.map((r: string[]) =>
                      r.map(cell => stripHtmlTags(cell)).join(' ')
                    ).join(' ');
                    textParts.push(cleanRows);
                  }
                  break;
                case 'image':
                  if (b.alt) textParts.push(b.alt);
                  break;
                case 'badge':
                  if (b.text) textParts.push(b.text);
                  break;
                case 'dropdown':
                  if (b.label) textParts.push(b.label);
                  if (b.options && Array.isArray(b.options)) {
                    textParts.push(b.options.map((o: any) => `${o.label} ${o.description ?? ''}`).join(' '));
                  }
                  break;
                default:
                  if (b.text) textParts.push(b.text);
                }
              }
            }
          }
        }

        // Construimos el texto original y luego lo limpiamos
        const fullTextOriginal = textParts.join(' ');

        // Limpiar tags HTML del texto completo ANTES de buscar
        const fullTextClean = stripHtmlTags(fullTextOriginal);
        const fullText = fullTextClean.toLowerCase();

        const matched = tokens.find((t) => fullText.indexOf(t) !== -1);
        if (matched) {
          const idxFound = fullText.indexOf(matched);
          // candidatos de ventana
          const windowBefore = 40;
          const windowAfter = 60;
          const startCandidate = Math.max(0, idxFound - windowBefore);
          const endCandidate = Math.min(fullText.length, idxFound + matched.length + windowAfter);

          // expandir a límites de palabra (no cortar palabras) usando el texto limpio
          let start = startCandidate;
          const lastSpaceBefore = fullTextClean.lastIndexOf(' ', startCandidate);
          if (lastSpaceBefore !== -1) start = lastSpaceBefore + 1;

          let end = endCandidate;
          const firstSpaceAfter = fullTextClean.indexOf(' ', endCandidate);
          if (firstSpaceAfter !== -1) end = firstSpaceAfter;

          // extraer excerpt desde el texto YA LIMPIO
          let excerptOriginal = fullTextClean.substring(start, end);

          // resaltar la coincidencia con <strong> (case-insensitive)
          try {
            const re = new RegExp(escapeRegex(matched), 'gi');
            excerptOriginal = excerptOriginal.replace(re, function(m: string) {
              return `<strong>${m}</strong>`;
            });
          } catch  {
            // en caso de regex fallida, no resaltar
          }

          results.push({
            moduleId: mod.id,
            moduleLabel: mod.label,
            pageId: pageMeta.id,
            pageLabel: pageMeta.label,
            excerpt: excerptOriginal,
            path: pageMeta.path
          });

          if (results.length >= MAX) return results;
        }
      }
    }

    return results;
  }
}
