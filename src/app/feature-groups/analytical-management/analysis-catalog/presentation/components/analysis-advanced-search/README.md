# Analysis Advanced Search Components

## Overview
Three-component architecture for advanced analysis search functionality, following the established patterns from Phase 2.

## Components Created (Phase 3 - Days 17-18)

### 1. AnalysisAdvancedSearchComponent
**Location:** `analysis-catalog/presentation/components/analysis-advanced-search/`

#### Purpose
Provides a multi-criteria search form using GenericFormComponent pattern.

#### Features
- 8 search criteria fields:
  - **Text fields** (partial match): name, familyName, code, nbuDetermination, nbuAbbreviation, description
  - **Number fields** (exact match): shortCode, nbuCode
- Uses GenericFormComponent with 2-column grid layout
- Shows results count badge after search
- Includes info box with search tips
- Loading state during search execution

#### Inputs
None (standalone search form)

#### Outputs
```typescript
searchResults = output<Analysis[]>();  // Emitted with search results
searchCleared = output<void>();        // Emitted when clear button clicked
```

#### Usage Example
```typescript
<app-analysis-advanced-search
  (searchResults)="onSearchResults($event)"
  (searchCleared)="onSearchCleared()" />
```

---

### 2. AnalysisSearchResultsComponent
**Location:** `analysis-catalog/presentation/components/analysis-search-results/`

#### Purpose
Displays search results in a structured table with actions.

#### Features
- Uses AdvancedTableComponent for consistent UI
- 8 sortable/filterable columns
- Empty state when no results found
- Action buttons per row: View Details, Edit Analysis
- Responsive table layout
- Results count display in header

#### Inputs
```typescript
results = input.required<Analysis[]>();  // Search results to display
```

#### Outputs
```typescript
editAnalysis = output<number>();   // Emitted with analysis ID to edit
viewDetails = output<number>();    // Emitted with analysis ID to view
```

#### Data Transformation
Flattens nested Analysis objects to FlatAnalysis interface for table compatibility:
```typescript
interface FlatAnalysis {
  id: number;
  shortCode: number | undefined;
  name: string;
  familyName: string | undefined;
  code: string | undefined;
  nbuCode: number | null;
  nbuDetermination: string;
  sampleTypeName: string;
  description: string;
  originalAnalysis: Analysis;  // Preserved for actions
}
```

#### Usage Example
```typescript
<app-analysis-search-results
  [results]="searchResults"
  (editAnalysis)="onEdit($event)"
  (viewDetails)="onViewDetails($event)" />
```

---

### 3. AnalysisSearchContainerComponent
**Location:** `analysis-catalog/presentation/components/analysis-search-container/`

#### Purpose
Container component that orchestrates search form and results display.

#### Features
- Combines search and results components
- Signal-based state management
- Conditional results display (only after search)
- Page header with icon and description
- Handles search/edit/view actions
- Clean separation of concerns

#### Signals
```typescript
searchResults = signal<Analysis[]>([]);     // Current results
showResults = signal<boolean>(false);       // Results visibility
```

#### Event Handlers
```typescript
onSearchResults(results: Analysis[]): void
onSearchCleared(): void
onEditAnalysis(analysisId: number): void
onViewDetails(analysisId: number): void
```

#### Usage Example
```typescript
// Standalone page or embedded in analytical-home
<app-analysis-search-container />
```

---

## Integration Guide

### Option 1: Add to Analytical Home (Recommended)
Add a "Advanced Search" button to `analytical-home.component.html`:

```typescript
// In analytical-home.component.ts
showAdvancedSearch = signal<boolean>(false);

toggleAdvancedSearch(): void {
  this.showAdvancedSearch.update(val => !val);
}
```

```html
<!-- In analytical-home.component.html -->
<p-button
  label="Advanced Search"
  icon="pi pi-search"
  severity="secondary"
  (onClick)="toggleAdvancedSearch()" />

@if (showAdvancedSearch()) {
  <app-analysis-search-container />
}
```

### Option 2: Create Dedicated Route
Add route in `analysis-catalog/routes/`:

```typescript
{
  path: 'search',
  component: AnalysisSearchContainerComponent,
  title: 'Analysis Search'
}
```

### Option 3: Dialog Modal
Use with PrimeNG Dialog:

```html
<p-dialog
  [(visible)]="searchDialogVisible"
  [modal]="true"
  [style]="{ width: '90vw', maxWidth: '1200px' }">
  <app-analysis-search-container />
</p-dialog>
```

---

## Technical Details

### Dependencies
- **PrimeNG Components**: Button, Divider, Tag, Table
- **Shared Components**: GenericForm, AdvancedTable, GenericAlert
- **Services**: AnalysisService.searchAnalyses()
- **RxJS**: Observable pattern for async search

### API Integration
Calls `AnalysisService.searchAnalyses(params)`:
- **Endpoint**: GET `/api/v1/analysis`
- **Query Parameters**: All filters optional, sent in snake_case
- **Response**: Analysis[] array mapped from DTOs

### Styling Pattern
- Uses CSS variables: `--brand-primary-700`, `--on-surface`, `--surface-0`, `--border-color`, `--on-surface-muted`
- Responsive breakpoints at 768px
- Consistent spacing and border-radius
- PrimeNG token integration

### State Management
- Signals for reactive updates
- Computed for derived data (flattenedResults)
- Output events for parent communication
- No global state required

---

## Testing Checklist

### Unit Tests (TODO - Phase 5)
- [ ] AnalysisAdvancedSearchComponent
  - Form field initialization
  - Search parameter filtering (empty values)
  - Search execution and loading states
  - Clear action
- [ ] AnalysisSearchResultsComponent
  - Empty state rendering
  - Data flattening logic
  - Action button emissions
- [ ] AnalysisSearchContainerComponent
  - Event orchestration
  - Signal updates
  - Conditional rendering

### Integration Tests (TODO - Phase 7)
- [ ] Full search workflow
- [ ] Edit/view navigation
- [ ] Error handling
- [ ] Empty results handling

---

## Next Steps (Phase 3 Completion)

1. **Integrate with analytical-home** (Day 19)
   - Add "Advanced Search" button to toolbar
   - Implement toggle logic
   - Test user flow

2. **Connect edit/view actions** (Day 19)
   - Implement navigation to edit form
   - Implement detail view (modal or route)
   - Pass analysis ID correctly

3. **Error handling enhancement** (Day 20)
   - Add GenericAlert for search errors
   - Handle network failures gracefully
   - Add retry logic

4. **Performance optimization** (Day 20)
   - Debounce search if needed
   - Consider pagination for large result sets
   - Optimize table rendering

---

## Design Decisions

### Why 3 Components?
- **Single Responsibility**: Each component has one clear purpose
- **Reusability**: Search form and results can be used independently
- **Testability**: Easier to unit test isolated components
- **Maintainability**: Changes to search UI don't affect results display

### Why Flatten Data?
AdvancedTableComponent expects flat objects for columns. Nested properties (nbu.nbuCode) don't work with the current column model, so we transform data while preserving the original Analysis for actions.

### Why Signal-Based State?
Follows Angular 18+ best practices and existing codebase patterns. Signals provide:
- Fine-grained reactivity
- Better performance
- Simpler mental model than RxJS for UI state

---

## Related Documentation
- [Phase 1: Services](../../../application/README.md)
- [Phase 2: Selectors and Managers](../README.md)
- [Frontend Development Plan](../../../../../../docs/frontend-development-plan.md)
- [Analysis Service Documentation](../../../application/analysis.service.ts)

---

**Status**: ✅ Completed (Phase 3 Days 17-18)  
**Commit**: `fe56d1a6d` - feat: add analysis advanced search components (Phase 3)  
**Branch**: `feature/determination-edit`
