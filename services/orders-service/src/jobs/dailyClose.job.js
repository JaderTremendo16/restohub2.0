const cron = require('node-cron')
const db = require('../db/knex')
const { publishMessage } = require('../messaging/publisher')

const dailyCloseJob = () => {
  cron.schedule('59 23 * * *', async () => {
    console.log('Ejecutando cierre de caja diario...')

    try {
      const pendingOrders = await db('orders')
        .whereIn('status', ['pending', 'validated', 'in_preparation', 'packing'])
        .andWhere('created_at', '<', new Date())

      if (pendingOrders.length > 0) {
        console.log(`Hay ${pendingOrders.length} pedidos sin cerrar`)
      }

      const todayOrders = await db('orders')
        .whereIn('status', ['delivered', 'cancelled'])
        .andWhere('updated_at', '>=', new Date(new Date().setHours(0, 0, 0, 0)))

      const totalRevenue = await db('invoices')
        .where('status', 'paid')
        .andWhere('created_at', '>=', new Date(new Date().setHours(0, 0, 0, 0)))
        .sum('total as total')

      await publishMessage('daily_close', {
        date: new Date().toISOString().split('T')[0],
        total_orders: todayOrders.length,
        pending_orders: pendingOrders.length,
        total_revenue: totalRevenue[0].total || 0
      })

      console.log('Cierre de caja completado:', {
        fecha: new Date().toISOString().split('T')[0],
        pedidos_completados: todayOrders.length,
        pedidos_pendientes: pendingOrders.length,
        ingresos_totales: totalRevenue[0].total || 0
      })
    } catch (error) {
      console.error('Error en cierre de caja:', error.message)
    }
  })

  console.log('Job de cierre de caja programado para las 11:59pm')
}

module.exports = { dailyCloseJob }