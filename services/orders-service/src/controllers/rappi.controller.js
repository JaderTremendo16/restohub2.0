const db = require('../db/knex')
const { publishMessage } = require('../messaging/publisher')

const receiveRappiOrder = async (req, res) => {
  try {
    const rappiOrder = req.body

    if (!rappiOrder.orderId || !rappiOrder.storeId || !rappiOrder.products) {
      return res.status(400).json({ error: 'Formato de pedido Rappi inválido' })
    }

    const order = await db('orders').insert({
      restaurant_id: rappiOrder.storeId,
      customer_id: rappiOrder.userId || 'rappi-customer',
      channel: 'rappi',
      area: 'delivery',
      notes: rappiOrder.comments || null,
      status: 'pending',
      priority: 'high'
    }).returning('*')

    const items = rappiOrder.products.map(product => ({
      order_id: order[0].id,
      product_id: String(product.id),
      product_name: product.name,
      quantity: product.quantity,
      unit_price: product.price,
      subtotal: product.quantity * product.price,
      notes: product.comments || null
    }))

    await db('order_items').insert(items)

    await publishMessage('order_created', {
      order_id: order[0].id,
      restaurant_id: order[0].restaurant_id,
      customer_id: order[0].customer_id,
      channel: 'rappi',
      status: order[0].status,
      priority: order[0].priority,
      area: 'delivery'
    })

    res.status(201).json({
      success: true,
      order_id: order[0].id,
      message: 'Pedido de Rappi recibido correctamente'
    })
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar pedido de Rappi' })
  }
}

module.exports = { receiveRappiOrder }