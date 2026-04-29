const db = require('../db/knex')

const getKitchenOrders = async (req, res) => {
  try {
    const orders = await db('kitchen_orders').select('*').orderBy('created_at', 'desc')
    res.json(orders)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las órdenes' })
  }
}

const updateKitchenOrderStatus = async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  const validStatuses = ['received', 'in_preparation', 'packing', 'ready', 'cancelled']
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' })
  }

  try {
    const order = await db('kitchen_orders').where({ id }).update({ status }).returning('*')
    if (!order.length) return res.status(404).json({ error: 'Orden no encontrada' })
    res.json(order[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la orden' })
  }
}

module.exports = { getKitchenOrders, updateKitchenOrderStatus }