const { getChannel } = require('./connection')

const EXCHANGE_NAME = 'restohub_events'

/**
 * Publica un mensaje en una cola directa (compatibilidad hacia atrás).
 * Usado por otros servicios que aún consumen colas directas.
 */
const publishMessage = async (queue, message) => {
  try {
    const channel = getChannel()
    if (!channel) {
      console.error('[publisher] No hay canal de RabbitMQ disponible')
      return
    }
    await channel.assertQueue(queue, { durable: true })
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)))
    console.log(`[publisher] Mensaje publicado en cola directa "${queue}":`, message)
  } catch (error) {
    console.error('[publisher] Error publicando mensaje en cola directa:', error.message)
  }
}

/**
 * Publica un evento en el exchange topic `restohub_events`.
 * El loyalty-service (y futuros servicios) lo consumen mediante routing keys.
 *
 * @param {string} routingKey  - Ej: "order.completed", "order.cancelled"
 * @param {object} payload     - Datos del evento
 */
const publishEvent = async (routingKey, payload) => {
  try {
    const channel = getChannel()
    if (!channel) {
      console.error('[publisher] No hay canal de RabbitMQ disponible')
      return
    }

    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true })
    channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    )
    console.log(`[publisher] Evento publicado en exchange "${EXCHANGE_NAME}" routing="${routingKey}":`, payload)
  } catch (error) {
    console.error('[publisher] Error publicando evento en exchange:', error.message)
  }
}

/**
 * Publica `order.completed` en AMBOS canales para garantizar compatibilidad:
 *  - Cola directa     → loyalty-service (consumidor actual)
 *  - Exchange topic   → cualquier servicio suscrito a `order.completed`
 *
 * Regla de puntos: 1 punto por cada $1.000 del pedido.
 * El loyalty-service calcula los puntos a partir de `total_amount`.
 *
 * @param {string} customerId
 * @param {number} totalAmount  - Total del pedido en pesos
 * @param {string} orderId
 */
const publishOrderCompleted = async (customerId, totalAmount, orderId) => {
  const payload = {
    customer_id: customerId,
    order_id:    orderId,
    total_amount: totalAmount,
    // Precalculado como referencia, pero el consumer usa total_amount
    points: Math.floor(totalAmount / 1000),
    timestamp: new Date().toISOString(),
  }

  // Publicar en ambos canales en paralelo
  await Promise.all([
    publishMessage('order.completed', payload),   // cola directa (compatibilidad)
    publishEvent('order.completed', payload),     // exchange topic (arquitectura nueva)
  ])
}

module.exports = { publishMessage, publishEvent, publishOrderCompleted }