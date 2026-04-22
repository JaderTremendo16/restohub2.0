FROM python:3.12-slim

# ── Variables de entorno para Python ──────────────────────────────────────
# PYTHONPATH asegura que `from app.xxx import ...` funcione desde /app
# El código reside directamente en /app/app (debido al COPY . . y WORKDIR /app)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Instalar dependencias primero (capa cacheada)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente completo
# El contexto de build debe apuntarse a services/customer-service/
# Ej: context: ./services/customer-service  en docker-compose.yml
COPY . .

# Copiar el entrypoint a una ubicación fuera de /app para que no lo pise el volumen
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

# Normalizar saltos de línea y dar permisos al entrypoint
RUN sed -i 's/\r//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["entrypoint.sh"]