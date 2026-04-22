const express = require('express')
const router = express.Router()
const { validateCookToken } = require('../middlewares/auth.middleware')
const { getKitchenOrders, updateKitchenOrderStatus } = require('../controllers/kitchen.controller')

router.get('/health', (req, res) => {
  res.json({ status: 'ok', 
             service: 'kitchen-service',
             message: 'Microservicio de cocina funcionando' })

})

router.get('/kitchen/orders', validateCookToken, getKitchenOrders)
router.patch('/kitchen/orders/:id/status', validateCookToken, updateKitchenOrderStatus)

module.exports = router