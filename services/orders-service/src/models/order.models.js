const ORDER_STATUSES = [
  'pending',
  'validated', 
  'in_preparation',
  'packing',
  'ready',
  'delivered',
  'cancelled'
]

const ORDER_PRIORITIES = ['low', 'normal', 'high']

const ORDER_CHANNELS = ['app', 'tpv', 'rappi']

module.exports = { ORDER_STATUSES, ORDER_PRIORITIES, ORDER_CHANNELS }