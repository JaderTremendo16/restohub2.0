const express = require('express')
const router = express.Router()
const { createOrder, getOrders, getOrderById, updateOrderStatus, updateOrderPriority, addOrderItems, getOrderItems, getOrderTiming } = require('../controllers/orders.controller')
router.post('/orders', createOrder)
router.get('/orders', getOrders)
router.get('/orders/:id', getOrderById)
router.patch('/orders/:id/status', updateOrderStatus)
router.patch('/orders/:id/priority', updateOrderPriority)
router.post('/orders/:id/items', addOrderItems)
router.get('/orders/:id/items', getOrderItems)
router.get('/orders/:id/timing', getOrderTiming)

module.exports = router