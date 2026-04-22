const express = require('express')
const router = express.Router()
const { generateInvoice, getInvoiceByOrder } = require('../controllers/invoices.controller')

router.post('/orders/:id/invoice', generateInvoice)
router.get('/orders/:id/invoice', getInvoiceByOrder)

module.exports = router