const db = require('../db/knex')
const { publishMessage } = require('../messaging/publisher')
const { ORDER_STATUSES, ORDER_PRIORITIES } = require('../models/order.models')

const assignArea = (channel, notes) => {
  if (channel === 'rappi') return 'delivery'
  if (notes && notes.toLowerCase().includes('barra')) return 'bar'
  if (notes && notes.toLowerCase().includes('frio')) return 'cold_kitchen'
  return 'hot_kitchen'
}

const createOrder = async (req, res) => {
  const { restaurant_id, customer_id, channel, items, notes } = req.body

  if (!restaurant_id || !customer_id || !channel || !items || items.length === 0) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' })
  }

  try {
    const area = assignArea(channel, notes)

    const order = await db('orders')
      .insert({
        restaurant_id,
        customer_id,
        channel,
        notes,
        area,
        status: 'pending',
        priority: 'normal'
      })
      .returning('*')

    await publishMessage('order_created', {
      order_id: order[0].id,
      restaurant_id: order[0].restaurant_id,
      customer_id: order[0].customer_id,
      channel: order[0].channel,
      status: order[0].status,
      priority: order[0].priority,
      area: order[0].area
    })

    res.status(201).json(order[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el pedido' })
  }
}

const getOrders = async (req, res) => {
  try {
    const orders = await db('orders').select('*').orderBy('created_at', 'desc')
    res.json(orders)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los pedidos' })
  }
}

const getOrderById = async (req, res) => {
  const { id } = req.params
  try {
    const order = await db('orders').where({ id }).first()
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' })
    res.json(order)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el pedido' })
  }
}

const updateOrderStatus = async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  const validStatuses = ORDER_STATUSES
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' })
  }

  try {
    const updates = { status }

    if (status === 'validated') updates.validated_at = new Date()
    if (status === 'in_preparation') updates.preparation_started_at = new Date()
    if (status === 'packing') updates.packing_at = new Date()
    if (status === 'ready') updates.ready_at = new Date()
    if (status === 'delivered') updates.delivered_at = new Date()

    const order = await db('orders').where({ id }).update(updates).returning('*')
    if (!order.length) return res.status(404).json({ error: 'Pedido no encontrado' })

    await publishMessage('order_status_updated', {
      order_id: order[0].id,
      status: order[0].status,
      restaurant_id: order[0].restaurant_id,
      customer_id: order[0].customer_id
    })

    res.json(order[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el pedido' })
  }
}

const updateOrderPriority = async (req, res) => {
  const { id } = req.params
  const { priority } = req.body

  const validPriorities = ORDER_PRIORITIES
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'Prioridad inválida' })
  }

  try {
    const order = await db('orders').where({ id }).update({ priority }).returning('*')
    if (!order.length) return res.status(404).json({ error: 'Pedido no encontrado' })
    res.json(order[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la prioridad' })
  }
}

const addOrderItems = async (req, res) => {
  const { id } = req.params
  const { items } = req.body

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Debes enviar al menos un ítem' })
  }

  try {
    const order = await db('orders').where({ id }).first()
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' })

    const orderItems = items.map(item => ({
      order_id: id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.quantity * item.unit_price,
      notes: item.notes || null
    }))

    const created = await db('order_items').insert(orderItems).returning('*')
    res.status(201).json(created)
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar ítems' })
  }
}

const getOrderItems = async (req, res) => {
  const { id } = req.params
  try {
    const items = await db('order_items').where({ order_id: id })
    res.json(items)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los ítems' })
  }
}

const getOrderTiming = async (req, res) => {
  const { id } = req.params

  try {
    const order = await db('orders').where({ id }).first()
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' })

    const now = new Date()

    const timing = {
      order_id: order.id,
      status: order.status,
      area: order.area,
      estimated_preparation_time: order.estimated_preparation_time,
      times: {
        created_at: order.created_at,
        validated_at: order.validated_at,
        preparation_started_at: order.preparation_started_at,
        packing_at: order.packing_at,
        ready_at: order.ready_at,
        delivered_at: order.delivered_at
      },
      durations: {
        waiting_minutes: order.validated_at
          ? Math.round((new Date(order.validated_at) - new Date(order.created_at)) / 60000)
          : Math.round((now - new Date(order.created_at)) / 60000),
        preparation_minutes: order.preparation_started_at
          ? Math.round(((order.packing_at ? new Date(order.packing_at) : now) - new Date(order.preparation_started_at)) / 60000)
          : null,
        total_minutes: order.delivered_at
          ? Math.round((new Date(order.delivered_at) - new Date(order.created_at)) / 60000)
          : Math.round((now - new Date(order.created_at)) / 60000)
      }
    }

    res.json(timing)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tiempos del pedido' })
  }
}

module.exports = { createOrder, getOrders, getOrderById, updateOrderStatus, updateOrderPriority, addOrderItems, getOrderItems, getOrderTiming }