const jwt = require('jsonwebtoken')

const validateCookToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) return res.status(401).json({ error: 'Token requerido' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.cook = decoded
    next()
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' })
  }
}

module.exports = { validateCookToken }