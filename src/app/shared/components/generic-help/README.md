# GenericHelpComponent

Componente genérico de **ayuda contextual**.  
Muestra un ícono de ayuda (`pi pi-question-circle`) en la pantalla —sin fondo ni borde— que al presionarlo abre un modal con información o guía del usuario.  
Permite personalizar el contenido, el título y la posición, adaptándose a cada vista del sistema.

---

## Uso básico

```html
<app-generic-help
  [title]="'Ayuda — Gestión de pacientes'"
  [content]="
    '<p>Desde esta pantalla podés crear, editar o eliminar pacientes.</p>
     <ul>
       <li>El ícono <i class=\'pi pi-pencil\'></i> edita.</li>
       <li>El ícono <i class=\'pi pi-trash\'></i> elimina.</li>
       <li>El botón <i class=\'pi pi-plus\'></i> agrega uno nuevo.</li>
     </ul>'
  "
  [position]="'bottom-right'">
</app-generic-help>
