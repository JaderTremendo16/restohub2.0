FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Copiar el entrypoint a una ubicación fuera de /app para que no lo pise el volumen
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

# Normalizar saltos de línea y dar permisos al entrypoint
RUN sed -i 's/\r//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8001
ENTRYPOINT ["entrypoint.sh"]
