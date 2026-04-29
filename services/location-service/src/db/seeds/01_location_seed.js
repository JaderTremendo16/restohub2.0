const bcrypt = require("bcryptjs");

exports.seed = async function (knex) {
  // Comprobamos si ya existe el gerente para no duplicarlo ni borrar datos existentes
  const emailGerente = "gerente@restohub.com";
  const existingUser = await knex("users").where({ email: emailGerente }).first();

  if (!existingUser) {
    const passwordGenerica = await bcrypt.hash("password123", 10);
    await knex("users").insert({
      first_name: "Gerente",
      last_name: "General",
      email: emailGerente,
      password_hash: passwordGenerica,
      role: "general_manager",
    });
    console.log("Semilla: Gerente General creado.");
  } else {
    console.log("Semilla: El Gerente General ya existe. No se realizaron cambios.");
  }
};
