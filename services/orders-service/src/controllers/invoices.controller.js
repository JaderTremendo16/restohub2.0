const db = require('../db/knex')

const generateInvoice = async (req, res) => {
  const { id } = req.params
  const { customer_name, customer_email } = req.body

  try {
    const order = await db('orders').where({ id }).first()
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' })

    const existingInvoice = await db('invoices').where({ order_id: id }).first()
    if (existingInvoice) return res.status(400).json({ error: 'Ya existe una factura para este pedido' })

    const items = await db('order_items').where({ order_id: id })
    if (items.length === 0) return res.status(400).json({ error: 'El pedido no tiene ítems' })

    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0)
    const tax = subtotal * 0.19
    const total = subtotal + tax

    const invoiceNumber = `FAC-${Date.now()}`

    const invoice = await db('invoices').insert({
      order_id: id,
      invoice_number: invoiceNumber,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      customer_name,
      customer_email,
      status: 'pending'
    }).returning('*')

    res.status(201).json(invoice[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al generar la factura' })
  }
}

const getInvoiceByOrder = async (req, res) => {
  const { id } = req.params
  try {
    const invoice = await db('invoices').where({ order_id: id }).first()
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' })
    res.json(invoice)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la factura' })
  }
}

module.exports = { generateInvoice, getInvoiceByOrder }