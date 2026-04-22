require("dotenv").config();

module.exports = {
  development: {
    client: "postgresql",
    connection: {
      host: process.env.DB_HOST || "pos-db",
      port: 5432,
      user: process.env.DB_USER || "pos_user",
      password: process.env.DB_PASSWORD || "admin123",
      database: process.env.DB_NAME || "db_pos_service",
    },
    migrations: { directory: "./src/db/migrations" },
  },
};
