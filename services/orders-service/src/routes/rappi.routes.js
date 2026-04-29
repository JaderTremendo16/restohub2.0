const express = require('express')
const router = express.Router()
const { receiveRappiOrder } = require('../controllers/rappi.controller')

router.post('/rappi/orders', receiveRappiOrder)

module.exports = router