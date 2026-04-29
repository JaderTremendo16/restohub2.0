import logging
import uuid
from app.database import SessionLocal
from app.models import User
from app.auth import hash_password

logger = logging.getLogger(__name__)


def seed_initial_data() -> None:
    """
    Crea usuarios por defecto al arrancar el servicio por primera vez.
    Credenciales de prueba:
        Admin   → admin@restohub.com   / admin123
        Cliente → cliente@restohub.com / cliente123
    """
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            logger.info("[seed] Base de datos ya tiene datos. Seed omitido.")
            return

        # Seed de usuarios desactivado por petición del usuario para entorno limpio.
        db.commit()
        logger.info("[seed] El sistema está listo para recibir nuevos registros manuales.")
    except Exception as exc:
        db.rollback()
        logger.error(f"[seed] Error durante el seed: {exc}")
    finally:
        db.close()
