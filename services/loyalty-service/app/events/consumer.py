import asyncio
import json
import logging
import os
import uuid

import aio_pika

from app.database import SessionLocal
from app.models import LoyaltyAccount, PointHistory

logger = logging.getLogger(__name__)

RABBITMQ_URL   = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq/")
EXCHANGE_NAME  = "restohub_events"

# ── PROBLEMA DETECTADO en publisher.js ────────────────────────────────────
# El orders-service publica en una COLA directa (`channel.sendToQueue`),
# NO en un exchange con routing_key.
# El loyalty-service debe escuchar esa misma cola directa además del exchange
# topic para ser compatible con ambos patrones.
#
# Cola directa usada por orders-service: "order.completed"
# Exchange topic para futuros servicios:  restohub_events / order.completed
# ─────────────────────────────────────────────────────────────────────────

POINTS_PER_UNIT = 1          # 1 punto
AMOUNT_PER_UNIT = 1          # por cada $1 USD


def _compute_tier(points: int) -> str:
    """Calcula el tier según puntos acumulados totales."""
    if points >= 1_000:
        return "platinum"
    elif points >= 500:
        return "gold"
    elif points >= 100:
        return "silver"
    return "bronze"


def _calculate_points(total_amount: float) -> int:
    """
    Regla de negocio: 1 punto por cada $1 USD pagado con PayPal.
    Si el evento viene con 'points' calculado, se usa directamente.
    """
    return max(0, int(total_amount // AMOUNT_PER_UNIT) * POINTS_PER_UNIT)


def _process_event(data: dict) -> None:
    """
    Lógica de negocio compartida entre el consumidor de la cola directa
    y el consumidor del exchange topic.
    """
    customer_id: str  = data.get("customer_id", "")
    # El orders-service puede enviar `total_amount` (preferido) o `points` directo
    total_amount: float = float(data.get("total_amount", 0))
    points_override: int = int(data.get("points", 0))

    # Prioridad: si viene total_amount calculamos; si no, usamos points directo
    points = _calculate_points(total_amount) if total_amount > 0 else points_override

    if not customer_id:
        logger.warning("[loyalty consumer] order.completed sin customer_id — ignorando.")
        return

    if points <= 0:
        logger.info(
            f"[loyalty consumer] order.completed customer={customer_id} "
            f"total={total_amount} → 0 pts (monto insuficiente), ignorando."
        )
        return

    logger.info(
        f"[loyalty consumer] order.completed → customer={customer_id}, "
        f"total_amount={total_amount}, +{points}pts"
    )

    db = SessionLocal()
    try:
        acc = db.query(LoyaltyAccount).filter(
            LoyaltyAccount.customer_id == customer_id
        ).first()

        if not acc:
            acc = LoyaltyAccount(
                id=str(uuid.uuid4()),
                customer_id=customer_id,
                total_points=0,
                tier="bronze",
            )
            db.add(acc)
            db.flush()
            logger.info(f"[loyalty consumer] Nueva cuenta creada para {customer_id}")

        acc.total_points += points
        acc.tier = _compute_tier(acc.total_points)

        db.add(PointHistory(
            id=str(uuid.uuid4()),
            loyalty_account_id=acc.id,
            action_type="earn",
            points=points,
            description=f"Pedido completado (+${total_amount:,.0f})",
        ))
        db.commit()

        logger.info(
            f"[loyalty consumer] {customer_id} → {acc.total_points} pts total ({acc.tier})"
        )
    except Exception as exc:
        db.rollback()
        logger.error(f"[loyalty consumer] Error al procesar order.completed: {exc}", exc_info=True)
    finally:
        db.close()


# ── Handler para el exchange TOPIC (patrón nuevo) ─────────────────────────
async def _on_order_completed_topic(message: aio_pika.IncomingMessage) -> None:
    async with message.process():
        try:
            data = json.loads(message.body)
            _process_event(data)
        except json.JSONDecodeError as e:
            logger.error(f"[loyalty consumer] Mensaje con JSON inválido: {e}")


# ── Handler para la cola directa del orders-service (Node.js) ─────────────
async def _on_order_completed_direct(message: aio_pika.IncomingMessage) -> None:
    async with message.process():
        try:
            data = json.loads(message.body)
            _process_event(data)
        except json.JSONDecodeError as e:
            logger.error(f"[loyalty consumer][direct] JSON inválido: {e}")


async def start_consumer() -> None:
    """
    Inicia DOS consumidores:
      1. Cola directa 'order.completed'  ← compatible con publisher.js actual
      2. Exchange topic 'restohub_events' routing_key='order.completed'  ← patrón nuevo
    """
    await asyncio.sleep(6)
    retry = 0
    while True:
        try:
            connection = await aio_pika.connect_robust(RABBITMQ_URL)
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=10)

            # ── 1. Cola directa (orders-service Node.js actual) ───────────
            direct_queue = await channel.declare_queue("order.completed", durable=True)
            await direct_queue.consume(_on_order_completed_direct)
            logger.info("[loyalty consumer] Escuchando cola directa: order.completed")

            # ── 2. Exchange TOPIC (arquitectura federada futura) ──────────
            exchange = await channel.declare_exchange(
                EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True
            )
            topic_queue = await channel.declare_queue(
                "order.completed.loyalty_points", durable=True
            )
            await topic_queue.bind(exchange, routing_key="order.completed")
            await topic_queue.consume(_on_order_completed_topic)
            logger.info("[loyalty consumer] Escuchando exchange topic: order.completed")

            logger.info("[loyalty consumer] ✓ Listo. Esperando eventos...")
            await asyncio.Future()  # Bloquear para siempre

        except Exception as exc:
            retry += 1
            wait = min(30, 5 * retry)
            logger.error(
                f"[loyalty consumer] Error (retry {retry}): {exc}. Reintentando en {wait}s...",
                exc_info=True,
            )
            await asyncio.sleep(wait)
            
