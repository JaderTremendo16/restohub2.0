const cron = require('node-cron')
const db = require('../db/knex')

const dailyKitchenJob = () => {
  cron.schedule('59 23 * * *', async () => {
    console.log('Ejecutando cierre de cocina...')

    try {
      const pendingOrders = await db('kitchen_orders')
        .whereIn('status', ['received', 'in_preparation', 'packing'])

      if (pendingOrders.length > 0) {
        console.log(`Hay ${pendingOrders.length} órdenes sin completar`)
      }

      const completedOrders = await db('kitchen_orders')
        .where('status', 'ready')
        .andWhere('updated_at', '>=', new Date(new Date().setHours(0, 0, 0, 0)))

      console.log('Cierre de cocina completado:', {
        fecha: new Date().toISOString().split('T')[0],
        ordenes_completadas: completedOrders.length,
        ordenes_pendientes: pendingOrders.length
      })
    } catch (error) {
      console.error('Error en cierre de cocina:', error.message)
    }
  })

  console.log('Job de cierre de cocina programado para las 11:59pm')
}

module.exports = { dailyKitchenJob }