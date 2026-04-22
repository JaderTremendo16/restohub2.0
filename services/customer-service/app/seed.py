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

        users = [
            User(
                id=str(uuid.uuid4()),
                auth0_id="local|admin@restohub.com",
                name="Admin RestoHub",
                email="admin@restohub.com",
                phone="3001234567",
                role="admin",
                password_hash=hash_password("admin123"),
                preferences=None,
                country="Colombia",
                city="Monteria",
                branch="Sede Norte"
            ),
            User(
                id=str(uuid.uuid4()),
                auth0_id="local|cristiano@restohub.com",
                name="Cristiano Ronaldo",
                email="cristiano@restohub.com",
                phone="7777777777",
                role="customer",
                password_hash=hash_password("cristiano7"),
                preferences="SIIIUUUUUU! Mesa VIP",
                country="Portugal",
                city="Lisboa",
                branch="do dragao"
            ),
        ]
        db.add_all(users)
        db.commit()
        logger.info(
            "[seed] Usuarios creados:\n"
            "  Admin   → admin@restohub.com   / admin123\n"
            "  Cliente → cliente@restohub.com / cliente123"
        )
    except Exception as exc:
        db.rollback()
        logger.error(f"[seed] Error durante el seed: {exc}")
    finally:
        db.close()
