# Resumen de Modificaciones - RestoHub 2.0

Este documento resume los cambios realizados para restaurar la funcionalidad de Docker, corregir errores de lógica y mejorar la internacionalización del sistema.

## 1. Modificaciones Realizadas

### Correcciones de Estabilidad (Build & Runtime)
- **Fix Apollo Client 4**: Se actualizaron las importaciones de `useQuery`, `useMutation` y `useApolloClient` en `customer-frontend` para usar `@apollo/client/react` (en `AuthContext.jsx`, `Cart.jsx`, etc.).
- **Reparación de `MapPicker.jsx`**: Se detectó una corrupción de archivos (codificación no UTF-8) que impedía la construcción de la imagen de Docker. El archivo fue reescrito completamente.
- **Visibilidad de UI**: Se corrigió el botón de envío en `RatingModal.jsx`, cambiando el color inexistente `brand-600` por `brand-orange` y añadiendo soporte para scroll.

### Internacionalización y Moneda
- **Centralización de Precios**: Se creó la función `formatPrice` en el `AuthContext` para que todos los precios en la app muestren el código de moneda correspondiente (ej. `$ 1.500 MXN`).
- **Lógica de Lealtad**: Se mejoró el cálculo de puntos en `orders-service` para que tome la moneda de la factura como respaldo si no se envía explícitamente desde el cliente.

---

## 2. Explicación de Archivos Abiertos

### Carpeta `utils/` (en `customer-frontend`)
- **`currency.js`**: Es el motor de divisas de la aplicación. Contiene la configuración de cada país (Colombia, México, etc.), definiendo su símbolo, locale (para el formato de miles/decimales) y el **divisor de puntos**. Este divisor es vital: define cuánta moneda local equivale a 1 punto de lealtad (ej. 1000 COP = 1 punto, 20 MXN = 1 punto).

### Componentes de Frontend
- **`AuthContext.jsx`**: El "cerebro" de la sesión. Gestiona el login, el usuario actual y ahora provee la función global `formatPrice` y la configuración de moneda a toda la aplicación.
- **`Checkout.jsx`**: Gestiona el proceso final de compra. Integra PayPal, el cálculo de vuelto en efectivo y la generación de la factura con la moneda correcta.
- **`MapPicker.jsx`**: Componente de mapas basado en Leaflet. Permite al usuario seleccionar su ubicación, valida el radio de entrega (8km) y autocompleta la dirección mediante geocodificación inversa.
- **`Cart.jsx`**: Controla los productos seleccionados, el cálculo del subtotal y la visualización de puntos de lealtad del usuario antes de comprar.

### Servicios (Backend)
- **`resolvers.js` (orders-service)**: Contiene la lógica de negocio para crear órdenes, facturas y pagos. Se modificó específicamente la mutación `createPayment` para asegurar la consistencia en el cálculo de puntos de lealtad multimoneda.

---

## 3. Explicación de la Migración
**Archivo**: `20260429000000_add_currency_to_invoices.js`

Esta migración añade la columna `currency` a la tabla de `invoices` (facturas) en la base de datos de órdenes.
- **Propósito**: Permite que cada factura guarde permanentemente en qué moneda fue emitida. Esto es fundamental para que, meses después, el sistema sepa si un monto de "50,000" eran Pesos Colombianos o Dólares, permitiendo reportes financieros y auditorías de puntos de lealtad precisas.

---

## 4. Instrucciones para GitHub

Para subir los cambios excluyendo las carpetas solicitadas, usa los siguientes comandos en tu terminal:

```bash
# 1. Asegúrate de estar en la rama correcta
# git checkout nombre-de-tu-rama

# 2. Agregar cambios (excluyendo la base de datos de staff)
git add .
git reset services/staff-service/backend/restohub.db

# 3. Crear el commit
git commit -m "Fix: Restauración de Docker, corrección de codificación en MapPicker, unificación de moneda local y ajustes de UI"

# 4. Subir a GitHub
# git push origin nombre-de-tu-rama
```

> [!NOTE]
> Los comandos de `git reset` quitan los archivos de esas carpetas del área de preparación (staging), por lo que no se incluirán en el commit aunque hayas hecho `git add .`.
