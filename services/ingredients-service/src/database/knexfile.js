// knexfile.js: Es el archivo que se encarga de la configuracion de las migraciones.
// knex.js = configuracion de la base de datos; knexfile.js = configuracion de las migraciones.
import dotenv from 'dotenv' //Importamos el 'dotenv' para crear las variables de entorno.
dotenv.config() //Cargamos las variables de entorno para que knex pueda acceder a ellas.

export default {
  client: 'pg',
  connection: {
    host:     process.env.POSTGRES_HOST,
    port:     process.env.POSTGRES_PORT || 5432,
    user:     process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  },
  migrations: {
    directory: './migrations', // Indicamos la ruta donde se encuentra las migraciones,
    extension: 'js', //le decimos que tienen que estar escrito en .js no en .ts u otro formato.
  }
}