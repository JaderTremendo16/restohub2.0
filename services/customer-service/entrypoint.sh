#!/bin/sh
set -e

# Wait for DB to be ready
echo "==> [customer-service] Waiting for database..."
until python -c "
import os, sys
from sqlalchemy import create_engine, text
url = os.environ.get('DATABASE_URL', '')
if not url:
    print('DATABASE_URL not defined, skipping wait')
    sys.exit(0)
try:
    engine = create_engine(url)
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    print('DB ready.')
    sys.exit(0)
except Exception as e:
    print(f'DB not available: {e}')
    sys.exit(1)
"; do
  echo "   ...retrying in 3s"
  sleep 3
done

# Apply migrations
echo "==> [customer-service] Applying migrations..."
PYTHONPATH=/app alembic upgrade head

# Start server
echo "==> [customer-service] Starting uvicorn on port 8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload