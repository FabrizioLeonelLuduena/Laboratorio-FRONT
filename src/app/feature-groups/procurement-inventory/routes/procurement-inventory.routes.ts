import { Routes } from '@angular/router';

import { egresoAccessGuard } from '../../../core/guards/egreso-access.guard';
import { CreateGoodsReceiptComponent } from '../features/goods-receipts/create/create-goods-receipt.component';
import { EditGoodsReceiptComponent } from '../features/goods-receipts/edit/edit-goods-receipt.component';
import { GoodsReceiptsListComponent } from '../features/goods-receipts/list/goods-receipts-list.component';
import { ViewGoodsReceiptComponent } from '../features/goods-receipts/view/view-goods-receipt.component';
import { CreateLocationComponent } from '../features/locations/create/create-location.component';
import { EditLocationComponent } from '../features/locations/edit/edit-location.component';
import { LocationsListComponent } from '../features/locations/list/locations-list.component';
import { PURCHASE_ORDERS_ROUTES } from '../features/purchase-orders/purchase-orders.routes';
import { EditStockMovementComponent } from '../features/stock-movements/edit/edit-stock-movement.component';
import { StockMovementsListComponent } from '../features/stock-movements/list/stock-movements-list.component';
import { ContactEditComponent } from '../features/suppliers/contact-edit/contact-edit.component';
import { CreateSupplierComponent } from '../features/suppliers/create/create-supplier.component';
import { CreateSupplierItemComponent } from '../features/suppliers/create-supplier-item/create-supplier-item.component';
import { EditSupplierComponent } from '../features/suppliers/edit/edit-supplier.component';
import { SuppliersListComponent } from '../features/suppliers/list/suppliers-list.component';
import { CreateSupplyComponent } from '../features/supplies/create/create-supply.component';
import { EditSupplyComponent } from '../features/supplies/edit/edit-supply.component';
import { SuppliesListComponent } from '../features/supplies/list/supplies-list.component';
import { DashboardDetailComponent } from '../procurement-inventory-home/components/dashboard-detail/dashboard-detail.component';
import { ProcurementInventoryHomeComponent } from '../procurement-inventory-home/procurement-inventory-home.component';

/**
 * Routes for the Procurement and Inventory module
 * Includes routes for suppliers, locations, supplies, stock movements, purchase orders, and goods receipts
 */
export const procurementInventoryRoutes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: ProcurementInventoryHomeComponent },
      { path: 'detail/:type', component: DashboardDetailComponent },
      {
        path: 'critical-stock-detail',
        loadComponent: () =>
          import('../procurement-inventory-home/components/critical-stock-detail/critical-stock-detail.component').then(
            (m) => m.CriticalStockDetailComponent
          )
      },
      {
        path: 'excess-stock-detail',
        loadComponent: () =>
          import('../procurement-inventory-home/components/excess-stock-detail/excess-stock-detail.component').then(
            (m) => m.ExcessStockDetailComponent
          )
      },
      {
        path: 'suppliers',
        children: [
          { path: '', component: SuppliersListComponent },
          { path: 'create', component: CreateSupplierComponent },
          { path: ':id/edit', component: EditSupplierComponent },
          { path: ':supplierId/items/create', component: CreateSupplierItemComponent },
          { path: ':id/contacts/:contactId/edit', component: ContactEditComponent }
        ]
      },
      {
        path: 'locations',
        children: [
          { path: '', component: LocationsListComponent },
          { path: 'create', component: CreateLocationComponent },
          { path: ':id/edit', component: EditLocationComponent }
        ]
      },
      {
        path: 'supplies',
        children: [
          { path: '', component: SuppliesListComponent },
          { path: 'create', component: CreateSupplyComponent },
          { path: ':id/edit', component: EditSupplyComponent }
        ]
      },
      {
        path: 'stock-movements',
        children: [
          { path: '', component: StockMovementsListComponent, canActivate: [egresoAccessGuard] },
          { path: ':id/edit', component: EditStockMovementComponent }
        ]
      },
      {
        path: 'purchase-orders',
        children: PURCHASE_ORDERS_ROUTES
      },
      {
        path: 'goods-receipts',
        children: [
          { path: '', component: GoodsReceiptsListComponent },
          { path: 'create', component: CreateGoodsReceiptComponent },
          { path: ':id', component: ViewGoodsReceiptComponent },
          { path: ':id/edit', component: EditGoodsReceiptComponent }
        ]
      }
    ]
  }
];
