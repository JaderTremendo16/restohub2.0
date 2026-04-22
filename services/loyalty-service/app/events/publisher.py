import json
import os
import logging
import aio_pika

logger = logging.getLogger(__name__)
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq/")
EXCHANGE_NAME = "restohub_events"


async def publish_event(routing_key: str, payload: dict) -> None:
    """
    Publica un evento en el exchange 'restohub_events'.
    Ejemplo:
        await publish_event("points.redeemed", {"customer_id": "...", "reward": "...", "points_used": 200})
    """
    try:
        connection = await aio_pika.connect_robust(RABBITMQ_URL)
        async with connection:
            channel = await connection.channel()
            exchange = await channel.declare_exchange(
                EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True
            )
            await exchange.publish(
                aio_pika.Message(
                    body=json.dumps(payload).encode(),
                    content_type="application/json",
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                ),
                routing_key=routing_key,
            )
            logger.info(f"[loyalty publisher] Event sent → {routing_key}: {payload}")
    except Exception as e:
        logger.error(f"[loyalty publisher] Failed to publish '{routing_key}': {e}")
