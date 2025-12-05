# GenericAlertComponent

Componente genérico de **alerta** para mostrar mensajes de éxito, error o advertencia.  
Es **responsivo** y se adapta automáticamente a pantallas móviles y de escritorio.

---

## Parámetros

- `title: string` → Título de la alerta (si no se pasa, usa un valor por defecto: "Éxito", "Error", "Advertencia").
- `text: string` → Texto descriptivo del mensaje.
- `type: 'success' | 'error' | 'warning'` → Define color, estilo e ícono.

---

## Ejemplo de uso

```html
<!-- Mensaje de éxito con título automático -->
<app-generic-alert
  type="success"
  text="El registro fue creado correctamente.">
</app-generic-alert>

<!-- Mensaje de error con título personalizado -->
<app-generic-alert
  type="error"
  title="Error al guardar"
  text="No se pudo conectar con el servidor.">
</app-generic-alert>

<!-- Mensaje de advertencia -->
<app-generic-alert
  type="warning"
  text="Este cambio puede afectar otros registros.">
</app-generic-alert>
