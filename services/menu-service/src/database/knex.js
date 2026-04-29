// knex.js: Es el archivo que se encarga de la configuracion de la base de datos.

import knex from 'knex' //Importamos tanto knex como dotenv
import dotenv from 'dotenv'

dotenv.config() //Cargamos las variables de entorno del .env

const database = knex({
  client: 'pg', //Especificamos que vamos a usar PostgreSQL.
  connection: {
    host:     process.env.POSTGRES_HOST,
    port:     process.env.POSTGRES_PORT || 5432,
    user:     process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  },
  pool: {
    min: 2,
    max: 10,
  }
})

//Pool: se encarga de gestionar las conexiones a la base de datos
//min: numero minimo de conexiones que se mantienen abiertas.
//max: numero maximo de conexiones que se pueden abrir.

export default database