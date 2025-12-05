# 📘 Guía Oficial para Crear JSONs del Manual de Usuario  
Sistema de Manual interactivo — Laboratorio Castillo Chidiak

---

## 🧩 1. Estructura General del JSON

Cada archivo JSON representa **una página del manual** y sigue esta estructura:

```json
{
  "id": "identificador-unico",
  "moduleId": "modulo-al-que-pertenece",
  "title": "Título de la página",
  "intro": "Introducción opcional",
  "roles": {
    "title": "Roles autorizados",
    "items": ["Rol 1", "Rol 2"]
  },
  "sections": [
    {
      "id": "id-de-seccion",
      "title": "Título de la sección",
      "blocks": []
    }
  ],
  "tags": ["palabras", "clave"]
}
```

---

## 🧱 2. Campos del Nivel Superior

### **`id`**
Identificador único. Usar **kebab-case**.

### **`moduleId`**
Debe coincidir con un módulo definido en `manual-index.json`.

### **`title`**
Título principal de la página.

### **`intro`**
Texto introductorio opcional.

### **`roles`**
Lista de roles que pueden operar esta pantalla.

---

## 🧱 3. Secciones (`sections`)

Cada sección tiene:

```json
{
  "id": "seccion-1",
  "title": "1. Título de la Sección",
  "blocks": []
}
```

---

## 🧩 4. Tipos de Bloques

### **Paragraph**
```json
{ "type": "paragraph", "text": "Texto descriptivo." }
```

### **Subtitle**
```json
{ "type": "subtitle", "text": "Subtítulo de nivel 3" }
```

### **Image**
```json
{ "type": "image", "src": "/manual/ruta/img.png", "alt": "Descripción" }
```

### **Note**
```json
{
  "type": "note",
  "variant": "info",
  "title": "Información",
  "text": "Texto de la nota."
}
```

### **Table**
```json
{
  "type": "table",
  "columns": ["Columna", "Descripción"],
  "rows": [
    ["Sucursal", "Nombre de la sede"]
  ]
}
```

### **List**
Lista con viñetas:
```json
{
  "type": "list",
  "ordered": false,
  "items": ["Item 1", "Item 2"]
}
```

Lista numerada:
```json
{
  "type": "list",
  "ordered": true,
  "items": ["Paso 1", "Paso 2"]
}
```

---
## 🛠 5. Plantilla Base

```json
{
  "id": "id-de-la-pagina",
  "moduleId": "modulo",
  "title": "Título de la Página",
  "intro": "Texto introductorio opcional.",
  "roles": {
    "title": "Roles autorizados",
    "items": ["Rol 1", "Rol 2"]
  },
  "sections": [
    {
      "id": "seccion-1",
      "title": "1. Nombre de la Sección",
      "blocks": [
        { "type": "paragraph", "text": "Texto descriptivo." }
      ]
    }
  ],
  "tags": ["tag1", "tag2"]
}
```

---

## 🧪 6. Validación antes de subir

- Validar JSON.
- Revisar rutas de imágenes.
- Verificar que cada bloque tenga `type`.
- Mantener consistencia en títulos y numeración.

---

## 🎉 ¡Listo!
Cualquier integrante del laboratorio puede crear o actualizar JSONs del Manual de Usuario siguiendo esta guía.
