//holaa

# RestoHub

Sistema de Gestión Unificado para Cadenas de Restaurantes, construido sobre una arquitectura de microservicios con Apollo Federation.

---

## Tecnologías Principales

Frontend (Admin): React + Vite + Tailwind CSS.\
Frontend (Cliente): React + Vite.\
Backend (Node.js): Apollo Federation v4 + GraphQL + Knex.js.\
Backend (Python): FastAPI.\
Base de Datos: PostgreSQL (Gestionado con Knex.js).\
Mensajería: RabbitMQ (Comunicación asíncrona).\
Infraestructura: Docker Desktop

---

## Instalación

### Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

### Pasos

**1. Clonar el repositorio**

```bash
git clone https://github.com/JaderTremendo16/restohub2.0.git
cd restohub2.0
```

**2. Levantar todos los servicios**

```bash
docker compose up --build
```

> La primera vez puede tardar varios minutos mientras Docker descarga las imágenes base y construye cada servicio. Las siguientes veces será mucho más rápido.

**3. Esperar a que todos los servicios estén listos**

Docker levantará los servicios en el orden correcto automáticamente (las bases de datos primero, luego los microservicios, y finalmente el gateway y los frontends). Puedes monitorear el estado con:

```bash
docker compose ps
```

Todos los servicios deben aparecer como `healthy` o `running`.

---

## URLs de Acceso

Una vez que todo esté corriendo, accede desde tu navegador:

Panel Admin / Gerente: http://localhost:3000 (Gestión interna del sistema)\
**Credencial del Gerente:** gerente@restohub.com / **contraseña:** password123\
App de Clientes: http://localhost:4777 (Vista de menú y lealtad)\
API Gateway (GraphQL) http://localhost:4000 (Sitio de Pruebas en Apollo Server)\
RabbitMQ Management: http://localhost:15672 (Panel de mensajería)\
Customer API (Swagger): http://localhost:28000/docs (Documentación REST (Ya vinculado por Apollo Gateway))\
Loyalty API (Swagger): http://localhost:28001/docs (Documentación REST (Lo mismo que con Customer))\
**Credenciales de prueba de PayPal para realizar pagos como cliente:** sb-linqo50566422@personal.example.com / **contraseña:** MM7vZ|-S

---

## Detener los servicios

```bash
# Detener sin borrar datos
docker compose down

# Detener Y borrar todos los datos (bases de datos incluidas)
docker compose down -v
```

---

## Microservicios

| Servicio       | Puerto       | Tecnología        |
| -------------- | ------------ | ----------------- |
| Gateway        | 4000         | Apollo Federation |
| Ingredients    | 4001         | Node.js + GraphQL |
| Menu           | 4002         | Node.js + GraphQL |
| Inventory      | 4003         | Node.js + GraphQL |
| Location       | 4005         | Node.js + GraphQL |
| Staff Subgraph | 4006         | Node.js + Apollo  |
| Staff API      | 8000         | FastAPI (Python)  |
| Orders         | 3001         | Node.js           |
| Kitchen        | 3002         | Node.js           |
| POS            | 3004         | Node.js           |
| Customer       | 28000        | FastAPI (Python)  |
| Loyalty        | 28001        | FastAPI (Python)  |
| RabbitMQ       | 5672 / 15672 | RabbitMQ          |
