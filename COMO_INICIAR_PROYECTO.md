# 🚀 Guía Paso a Paso: Cómo iniciar el proyecto al encender tu PC

Esta guía te explica qué hacer exactamente desde que prendes tu computadora hasta que tienes los dos links (Admin y Cliente) funcionando y listos para compartir.

## Paso 1: Iniciar Docker
1. Abre la aplicación **Docker Desktop** en tu computadora.
2. Espera unos segundos hasta que el ícono esté en verde o diga que el "Engine" está corriendo. (Esto es necesario para que los contenedores puedan funcionar).

## Paso 2: Levantar el proyecto
1. Abre una terminal (PowerShell o CMD).
2. Navega a la carpeta principal del proyecto:
   ```powershell
   cd C:\Users\mateo\Downloads\restohub2.0-main\restohub2.0-main
   ```
3. Ejecuta el comando para levantar todos los servicios:
   ```powershell
   docker compose up
   ```
   *(Nota: Puedes agregar `-d` al final si no quieres ver todos los logs y prefieres que corra de fondo: `docker compose up -d`)*
4. **Espera un par de minutos** para que todas las bases de datos, microservicios y el frontend terminen de cargar.

## Paso 3: Generar los links públicos (Personalizados)
Usaremos `localtunnel` para tener URLs bonitas y personalizadas. Para asegurarnos de que Windows siempre encuentre Node (incluso si tu terminal no se ha actualizado), usaremos este comando forzado:

1. Abre **una nueva ventana** de terminal.
2. Pega este comando exacto para generar el link del **Panel Admin (Gerente General)**:
    ```powershell
    $env:PATH += ";C:\Program Files\nodejs"; lt.cmd --port 3000 --subdomain restohub-admin
    ```
    *(Nota: Si se queda cargando, espera hasta 1 minuto. Si falla, cambia el subdominio ligeramente, ej: restohub-admin-tunel)*

3. Abre **otra nueva ventana** de terminal.
4. Pega este comando para generar el link de **Caja (POS)**:
    ```powershell
    $env:PATH += ";C:\Program Files\nodejs"; lt.cmd --port 3000 --subdomain restohub-pos
    ```

5. Abre **otra nueva ventana** de terminal.
6. Pega este comando para generar el link de la **Cocina**:
    ```powershell
    $env:PATH += ";C:\Program Files\nodejs"; lt.cmd --port 3000 --subdomain restohub-cocina
    ```

7. Abre **otra nueva ventana** de terminal.
8. Pega este comando para generar el link de la **App Cliente**:
    ```powershell
    $env:PATH += ";C:\Program Files\nodejs"; lt.cmd --port 4777 --subdomain restohub-cliente
    ```


9. Abre **otra nueva ventana** de terminal.
10. Pega este comando para generar el link de la **App Monitorio**:
    ```powershell
    $env:PATH += ";C:\Program Files\nodejs"; lt.cmd --port 3010 --subdomain restohub-grafana
    ```

## Paso 4: ¡A trabajar!
- El proyecto y las URLs están totalmente funcionales.
- Recuerda **no cerrar** las ventanas de las terminales que tienen los comandos SSH corriendo, ya que si las cierras, los links se caerán.

---

### ¿Cómo apagar todo correctamente al terminar el día?
1. Ve a las terminales donde están corriendo los links (los comandos `lt`) y presiona `Ctrl + C` para cerrarlos.
2. Ve a la terminal donde está corriendo Docker y presiona `Ctrl + C` para detener los contenedores (o si usaste `-d`, ejecuta `docker compose down`).
3. ¡Listo, puedes apagar tu computadora!
