import logging
import uuid
from app.database import SessionLocal
from app.models import Promotion, Reward

logger = logging.getLogger(__name__)


def seed_initial_data() -> None:
    """
    Crea promociones y premios de ejemplo al arrancar por primera vez.
    """
    db = SessionLocal()
    try:
        if db.query(Promotion).count() > 0:
            logger.info("[seed] loyalty_db ya tiene datos. Seed omitido.")
            return

        promotions = [
            Promotion(
                id=str(uuid.uuid4()),
                title="2x1 los Martes",
                description="Pide dos hamburguesas y paga solo una cada martes.",
                discount_percent=50.0,
                is_active=True,
            ),
            Promotion(
                id=str(uuid.uuid4()),
                title="15% de descuento en tu cumpleaños",
                description="Muestra tu cédula el día de tu cumpleaños y obtén el descuento.",
                discount_percent=15.0,
                is_active=True,
            ),
            Promotion(
                id=str(uuid.uuid4()),
                title="Descuento Madrugador",
                description="10% de descuento en pedidos antes de las 12:00 pm.",
                discount_percent=10.0,
                is_active=False,
            ),
        ]

        rewards = [
            Reward(
                id=str(uuid.uuid4()),
                name="Hamburguesa Gratis",
                description="Canjea puntos por una hamburguesa clásica sin costo.",
                points_cost=200,
                is_active=True,
                stock=3,
            ),
            Reward(
                id=str(uuid.uuid4()),
                name="Bebida Gratis",
                description="Refresco de 400ml a elección.",
                points_cost=80,
                is_active=True,
                stock=5,
            ),
            Reward(
                id=str(uuid.uuid4()),
                name="Combo Familiar",
                description="Combo para 4 personas con descuento especial.",
                points_cost=500,
                is_active=True,
                stock=2,
            ),
        ]

        db.add_all(promotions + rewards)
        db.commit()
        logger.info(
            "[seed] Promociones y premios de ejemplo creados en loyalty_db.")
    except Exception as exc:
        db.rollback()
        logger.error(f"[seed] Error: {exc}")
    finally:
        db.close()
