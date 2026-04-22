const express = require('express')
const router = express.Router()


router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'orders-service',
    message: 'Microservicio de pedidos funcionando'
  })
})

module.exports = router