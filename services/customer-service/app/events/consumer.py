import asyncio
import json
import logging
import os
import aio_pika

logger = logging.getLogger(__name__)
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq/")
EXCHANGE_NAME = "restohub_events"


async def _on_points_redeemed(message: aio_pika.IncomingMessage) -> None:
    """
    Consume el evento 'points.redeemed' publicado por loyalty-service.
    Aquí se puede disparar una notificación al cliente o registrar el canje.
    """
    async with message.process():
        data = json.loads(message.body)
        logger.info(
            f"[customer-service consumer] points.redeemed received: "
            f"customer={data.get('customer_id')} | "
            f"reward={data.get('reward')} | "
            f"points_used={data.get('points_used')}"
        )
        # Punto de extensión: enviar email, push notification, etc.


async def start_consumer() -> None:
    """Inicia el consumidor de RabbitMQ en background. Se llama al arrancar FastAPI."""
    await asyncio.sleep(6)  # Espera adicional a que RabbitMQ esté 100% listo
    retry = 0
    while True:
        try:
            connection = await aio_pika.connect_robust(RABBITMQ_URL)
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=10)

            exchange = await channel.declare_exchange(
                EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True
            )
            queue = await channel.declare_queue(
                "points.redeemed.customer_log", durable=True
            )
            await queue.bind(exchange, routing_key="points.redeemed")
            await queue.consume(_on_points_redeemed)

            logger.info("[customer-service consumer] Listening on: points.redeemed")
            await asyncio.Future()  # Corre indefinidamente
        except Exception as e:
            retry += 1
            wait = min(30, 5 * retry)
            logger.error(f"[customer-service consumer] Error (retry {retry}): {e}. Retrying in {wait}s...")
            await asyncio.sleep(wait)
