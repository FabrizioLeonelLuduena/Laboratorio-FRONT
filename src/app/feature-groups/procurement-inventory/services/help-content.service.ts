import { Injectable } from '@angular/core';

/**
 * Servicio que proporciona contenido de ayuda contextual
 * según la ruta activa del módulo de Procurement & Inventory.
 */
@Injectable({
  providedIn: 'root'
})
export class HelpContentService {
  /**
   * Obtiene el contenido de ayuda basado en la ruta actual.
   * @param currentPath Ruta actual de la aplicación
   * @returns Objeto con título y contenido HTML de ayuda
   */
  getHelpContent(currentPath: string): { title: string; content: string } {
    // Normalizar la ruta
    const path = currentPath.toLowerCase();

    // Contenido para la vista principal/home
    if (path === '/procurement-inventory' || path === '/procurement-inventory/') {
      return {
        title: 'Ayuda - Gestión de compras e inventario',
        content: `
          <div>
            <h3>Bienvenido al módulo de compras e inventario</h3>
            <p>
              Este es el panel principal del módulo que te permite gestionar todo lo relacionado
              con el inventario del laboratorio.
            </p>

            <h3>Funcionalidades disponibles</h3>
            <ul>
              <li><strong>Proveedores:</strong> Administra los proveedores y sus datos de contacto.</li>
              <li><strong>Suministros:</strong> Gestiona el catálogo de productos y materiales.</li>
              <li><strong>Ubicaciones:</strong> Organiza las ubicaciones físicas del inventario.</li>
              <li><strong>Lotes:</strong> Controla los lotes de productos con fechas de vencimiento.</li>
              <li><strong>Movimientos de stock:</strong> Registra entradas, salidas y ajustes.</li>
              <li><strong>Depósitos:</strong> Administra los depósitos del laboratorio.</li>
              <li><strong>Áreas:</strong> Organiza las áreas de almacenamiento.</li>
            </ul>

            <h3>Navegación</h3>
            <p>
              Haz clic en cualquier tarjeta para acceder a la sección correspondiente.
              Cada sección tiene su propia ayuda contextual específica.
            </p>
          </div>
        `
      };
    }

    // Contenido para Proveedores
    if (path.includes('/suppliers')) {
      if (path.includes('/create')) {
        return {
          title: 'Ayuda - Crear Proveedor',
          content: `
            <div>
              <h3>Crear Nuevo Proveedor</h3>
              <p>
                En esta pantalla puedes registrar un nuevo proveedor en el sistema.
              </p>

              <h3>Campos requeridos</h3>
              <ul>
                <li><strong>Razón Social:</strong> Nombre legal del proveedor.</li>
                <li><strong>CUIT:</strong> Número de identificación tributaria (validado automáticamente).</li>
                <li><strong>Tipo de Proveedor:</strong> Selecciona la categoría del proveedor.</li>
                <li><strong>Email:</strong> Correo electrónico de contacto.</li>
                <li><strong>Teléfono:</strong> Número de contacto principal.</li>
              </ul>

              <h3>Información adicional</h3>
              <ul>
                <li>Los campos marcados con <strong>*</strong> son obligatorios.</li>
                <li>El CUIT se valida automáticamente según el formato argentino.</li>
                <li>Puedes agregar múltiples contactos y direcciones.</li>
              </ul>

              <h3>Acciones</h3>
              <p>
                <strong>Guardar:</strong> Registra el proveedor en el sistema.<br>
                <strong>Cancelar:</strong> Descarta los cambios y vuelve a la lista.
              </p>
            </div>
          `
        };
      } else if (path.includes('/view') || path.includes('/edit')) {
        return {
          title: 'Ayuda - Detalle de Proveedor',
          content: `
            <div>
              <h3>Detalle del Proveedor</h3>
              <p>
                Esta vista muestra toda la información detallada del proveedor seleccionado.
              </p>

              <h3>Secciones disponibles</h3>
              <ul>
                <li><strong>Información General:</strong> Datos básicos del proveedor.</li>
                <li><strong>Contactos:</strong> Lista de personas de contacto.</li>
                <li><strong>Direcciones:</strong> Direcciones registradas del proveedor.</li>
                <li><strong>Historial:</strong> Registro de transacciones y pedidos.</li>
              </ul>

              <h3>Acciones disponibles</h3>
              <ul>
                <li><i class="pi pi-pencil"></i> <strong>Editar:</strong> Modifica la información del proveedor.</li>
                <li><i class="pi pi-trash"></i> <strong>Eliminar:</strong> Elimina el proveedor (requiere confirmación).</li>
                <li><i class="pi pi-arrow-left"></i> <strong>Volver:</strong> Regresa a la lista de proveedores.</li>
              </ul>

              <h3>Nota importante</h3>
              <p>
                No se puede eliminar un proveedor que tenga pedidos o Movimientos de stock asociados.
              </p>
            </div>
          `
        };
      } else {
        return {
          title: 'Ayuda - Lista de Proveedores',
          content: `
            <div>
              <h3>Gestión de Proveedores</h3>
              <p>
                En esta pantalla puedes ver, buscar y gestionar todos los proveedores registrados en el sistema.
              </p>

              <h3>Funcionalidades de la tabla</h3>
              <ul>
                <li><strong>Búsqueda:</strong> Usa el campo de búsqueda para filtrar por nombre, CUIT o tipo.</li>
                <li><strong>Ordenamiento:</strong> Haz clic en los encabezados de columna para ordenar.</li>
                <li><strong>Paginación:</strong> Navega entre las páginas usando los controles inferiores.</li>
                <li><strong>Filtros:</strong> Filtra por tipo de proveedor, estado, etc.</li>
              </ul>

              <h3>Acciones por fila</h3>
              <ul>
                <li><i class="pi pi-eye"></i> <strong>Ver:</strong> Muestra el detalle completo del proveedor.</li>
                <li><i class="pi pi-pencil"></i> <strong>Editar:</strong> Modifica la información del proveedor.</li>
                <li><i class="pi pi-trash"></i> <strong>Eliminar:</strong> Elimina el proveedor (requiere confirmación).</li>
              </ul>

              <h3>Crear nuevo proveedor</h3>
              <p>
                Usa el botón <strong>"+ Nuevo Proveedor"</strong> en la parte superior para agregar uno nuevo.
              </p>
            </div>
          `
        };
      }
    }

    // Contenido para Suministros
    if (path.includes('/supplies')) {
      if (path.includes('/create')) {
        return {
          title: 'Ayuda - Crear Suministro',
          content: `
            <div>
              <h3>Crear Nuevo Suministro</h3>
              <p>
                Registra un nuevo producto o material en el catálogo de suministros.
              </p>

              <h3>Campos principales</h3>
              <ul>
                <li><strong>Código:</strong> Identificador único del suministro.</li>
                <li><strong>Nombre:</strong> Descripción del producto o material.</li>
                <li><strong>Categoría:</strong> Tipo de suministro (reactivo, insumo, equipamiento, etc.).</li>
                <li><strong>Unidad de Medida:</strong> ml, gr, unidades, etc.</li>
                <li><strong>Stock Mínimo:</strong> Cantidad mínima que activa alertas.</li>
                <li><strong>Stock Máximo:</strong> Capacidad máxima de almacenamiento.</li>
              </ul>

              <h3>Información adicional</h3>
              <ul>
                <li>Puedes vincular el suministro con uno o más proveedores.</li>
                <li>Define precios de referencia para cada proveedor.</li>
                <li>Configura si requiere control de lotes y/o fechas de vencimiento.</li>
              </ul>

              <h3>Consejos</h3>
              <p>
                Asegúrate de definir correctamente el stock mínimo para recibir alertas
                cuando el inventario esté bajo.
              </p>
            </div>
          `
        };
      } else {
        return {
          title: 'Ayuda - Lista de Suministros',
          content: `
            <div>
              <h3>Catálogo de Suministros</h3>
              <p>
                Gestiona todos los productos y materiales disponibles en el laboratorio.
              </p>

              <h3>Información mostrada</h3>
              <ul>
                <li><strong>Código:</strong> Identificador único del suministro.</li>
                <li><strong>Nombre:</strong> Descripción del producto.</li>
                <li><strong>Categoría:</strong> Tipo de suministro.</li>
                <li><strong>Stock Actual:</strong> Cantidad disponible en inventario.</li>
                <li><strong>Estado:</strong> Indicador visual del nivel de stock.</li>
              </ul>

              <h3>Indicadores de stock</h3>
              <ul>
                <li><strong style="color: #22c55e;">Verde:</strong> Stock óptimo (por encima del mínimo).</li>
                <li><strong style="color: #f59e0b;">Amarillo:</strong> Stock bajo (cerca del mínimo).</li>
                <li><strong style="color: #ef4444;">Rojo:</strong> Stock crítico (por debajo del mínimo).</li>
              </ul>

              <h3>Acciones disponibles</h3>
              <ul>
                <li><i class="pi pi-eye"></i> <strong>Ver detalle:</strong> Stock por ubicación y lotes.</li>
                <li><i class="pi pi-pencil"></i> <strong>Editar:</strong> Modifica la información del suministro.</li>
                <li><i class="pi pi-plus"></i> <strong>Registrar movimiento:</strong> Ingreso o salida de stock.</li>
              </ul>
            </div>
          `
        };
      }
    }

    // Contenido para Ubicaciones
    if (path.includes('/locations')) {
      if (path.includes('/create')) {
        return {
          title: 'Ayuda - Crear Ubicación',
          content: `
            <div>
              <h3>Crear Nueva Ubicación</h3>
              <p>
                Define una nueva ubicación física donde se almacenarán los suministros.
              </p>

              <h3>Estructura de ubicaciones</h3>
              <p>
                La ubicación sigue una jerarquía: <strong>Depósito → Área → Ubicación</strong>
              </p>

              <h3>Campos requeridos</h3>
              <ul>
                <li><strong>Depósito:</strong> Selecciona el depósito donde estará la ubicación.</li>
                <li><strong>Área:</strong> Selecciona o crea el área dentro del depósito.</li>
                <li><strong>Código:</strong> Identificador único (ej: A1-E2-P3).</li>
                <li><strong>Descripción:</strong> Nombre descriptivo de la ubicación.</li>
                <li><strong>Capacidad:</strong> Cantidad máxima de items que puede almacenar.</li>
              </ul>

              <h3>Tipos de ubicación</h3>
              <ul>
                <li><strong>Estantería:</strong> Almacenamiento en estantes.</li>
                <li><strong>Refrigerada:</strong> Requiere temperatura controlada.</li>
                <li><strong>Piso:</strong> Almacenamiento directo en el suelo.</li>
                <li><strong>Cámara:</strong> Espacio cerrado con condiciones especiales.</li>
              </ul>
            </div>
          `
        };
      } else if (path.includes('/view') || path.includes('/edit')) {
        return {
          title: 'Ayuda - Detalle de Ubicación',
          content: `
            <div>
              <h3>Información de la Ubicación</h3>
              <p>
                Vista detallada de la ubicación seleccionada con su inventario actual.
              </p>

              <h3>Información mostrada</h3>
              <ul>
                <li><strong>Jerarquía:</strong> Depósito > Área > Ubicación.</li>
                <li><strong>Código:</strong> Identificador único de la ubicación.</li>
                <li><strong>Capacidad:</strong> Uso actual vs. capacidad máxima.</li>
                <li><strong>Tipo:</strong> Características especiales de almacenamiento.</li>
              </ul>

              <h3>Inventario actual</h3>
              <p>
                Muestra todos los suministros almacenados en esta ubicación con:
              </p>
              <ul>
                <li>Cantidad disponible</li>
                <li>Lotes asociados</li>
                <li>Fechas de vencimiento</li>
                <li>Estado del stock</li>
              </ul>

              <h3>Acciones</h3>
              <ul>
                <li><strong>Editar:</strong> Modifica los datos de la ubicación.</li>
                <li><strong>Transferir stock:</strong> Mueve productos a otra ubicación.</li>
                <li><strong>Ver historial:</strong> Registro de movimientos.</li>
              </ul>
            </div>
          `
        };
      } else {
        return {
          title: 'Ayuda - Lista de Ubicaciones',
          content: `
            <div>
              <h3>Gestión de Ubicaciones</h3>
              <p>
                Administra todas las ubicaciones físicas de almacenamiento del laboratorio.
              </p>

              <h3>Organización jerárquica</h3>
              <p>
                Las ubicaciones se organizan en tres niveles:
              </p>
              <ol>
                <li><strong>Depósito:</strong> Edificio o área principal</li>
                <li><strong>Área:</strong> Sección dentro del depósito</li>
                <li><strong>Ubicación:</strong> Posición específica de almacenamiento</li>
              </ol>

              <h3>Filtros disponibles</h3>
              <ul>
                <li>Por depósito</li>
                <li>Por área</li>
                <li>Por tipo de ubicación</li>
                <li>Por nivel de ocupación</li>
              </ul>

              <h3>Indicadores visuales</h3>
              <ul>
                <li><strong>Barra de capacidad:</strong> Muestra el % de ocupación.</li>
                <li><strong>Códigos de color:</strong> Verde (disponible), Amarillo (medio), Rojo (lleno).</li>
              </ul>

              <h3>Acciones</h3>
              <p>
                Usa el botón <strong>"+ Nueva Ubicación"</strong> para crear una nueva posición de almacenamiento.
              </p>
            </div>
          `
        };
      }
    }

    // Contenido para Movimientos de stock
    if (path.includes('/stock-movements')) {
      return {
        title: 'Ayuda - Movimientos de stock',
        content: `
          <div>
            <h3>Registro de Movimientos de stock</h3>
            <p>
              Visualiza y registra todos los movimientos de entrada, salida y ajustes del inventario.
            </p>

            <h3>Tipos de movimiento</h3>
            <ul>
              <li><strong>Entrada:</strong> Ingreso de mercadería (compras, devoluciones).</li>
              <li><strong>Salida:</strong> Consumo o despacho de productos.</li>
              <li><strong>Ajuste:</strong> Correcciones de inventario (faltantes, sobrantes).</li>
              <li><strong>Transferencia:</strong> Movimiento entre ubicaciones.</li>
            </ul>

            <h3>Información del movimiento</h3>
            <ul>
              <li><strong>Fecha y hora:</strong> Momento del registro.</li>
              <li><strong>Tipo:</strong> Entrada, salida, ajuste o transferencia.</li>
              <li><strong>Suministro:</strong> Producto afectado.</li>
              <li><strong>Cantidad:</strong> Unidades movidas.</li>
              <li><strong>Ubicación:</strong> Origen y/o destino.</li>
              <li><strong>Usuario:</strong> Quien registró el movimiento.</li>
              <li><strong>Motivo:</strong> Razón del movimiento.</li>
            </ul>

            <h3>Filtros y búsqueda</h3>
            <ul>
              <li>Por rango de fechas</li>
              <li>Por tipo de movimiento</li>
              <li>Por suministro</li>
              <li>Por ubicación</li>
              <li>Por usuario</li>
            </ul>

            <h3>Registrar nuevo movimiento</h3>
            <p>
              Usa el botón <strong>"+ Nuevo Movimiento"</strong> para registrar una operación de stock.
            </p>

            <h3>Nota importante</h3>
            <p>
              Los movimientos son irreversibles. Asegúrate de verificar toda la información antes de confirmar.
            </p>
          </div>
        `
      };
    }

    // Contenido por defecto (fallback)
    return {
      title: 'Ayuda - Procurement & Inventory',
      content: `
        <div>
          <h3>Gestión de compras e inventario</h3>
          <p>
            Sistema integral para la gestión del inventario del laboratorio.
          </p>

          <h3>Módulos disponibles</h3>
          <ul>
            <li><strong>Proveedores:</strong> Gestión de proveedores y contactos.</li>
            <li><strong>Suministros:</strong> Catálogo de productos y materiales.</li>
            <li><strong>Ubicaciones:</strong> Organización física del almacenamiento.</li>
            <li><strong>Movimientos:</strong> Registro de entradas, salidas y ajustes.</li>
          </ul>

          <h3>¿Necesitas ayuda?</h3>
          <p>
            Navega a la sección específica para obtener ayuda contextual detallada.
          </p>
        </div>
      `
    };
  }
}
