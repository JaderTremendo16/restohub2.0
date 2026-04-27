const db = require("../db/connection");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const CountryAPI = require("../services/country_api_service");

const JWT_SECRET = process.env.JWT_SECRET || "restohub_secret_key";

module.exports = {
  Query: {
    countries: async () => {
      return db("countries").orderBy("name");
    },

    country: async (_, { id }) => {
      return db("countries").where({ id }).first();
    },

    locations: async () => {
      return db("locations").orderBy("name");
    },

    locationsByCountry: async (_, { countryId }) => {
      return db("locations").where({ country_id: countryId }).orderBy("name");
    },

    users: async () => {
      return db("users").orderBy("last_name");
    },

    me: async (_, __, { user }) => {
      if (!user) throw new Error("No autenticado");
      return db("users").where({ id: user.id }).first();
    },

    dashboard: async (_, __, { user }) => {
      if (!user || user.role !== "general_manager") {
        throw new Error("Acceso denegado");
      }
      return db("countries").orderBy("name");
    },

    searchExternalCountry: async (_, { code }) => {
      return await CountryAPI.fetchCountryData(code);
    },

    listAllExternalCountries: async () => {
      return await CountryAPI.listAllCountries();
    },
  },

  Mutation: {
    login: async (_, { email, password }) => {
      const userFound = await db("users").where({ email }).first();
      if (!userFound) throw new Error("Credenciales incorrectas");

      const valid = await bcrypt.compare(password, userFound.password_hash);
      if (!valid) throw new Error("Credenciales incorrectas");

      const token = jwt.sign(
        {
          id: userFound.id,
          role: userFound.role,
          locationId: userFound.location_id,
        },
        JWT_SECRET,
        { expiresIn: "8h" },
      );

      const message =
        userFound.role === "general_manager"
          ? "Bienvenido Gerente General"
          : `Vista del administrador - Restaurante asignado`;

      return { token, user: userFound, message };
    },

    createCountry: async (
      _,
      { name, currencyCode, currencySymbol, timezone, flagUrl, locale },
      { user },
    ) => {
      if (!user || user.role !== "general_manager") {
        throw new Error("Acceso denegado");
      }
      const [country] = await db("countries")
        .insert({
          name,
          currency_code: currencyCode,
          currency_symbol: currencySymbol,
          timezone,
          flag_url: flagUrl,
          locale: locale || 'es-CO',
        })
        .returning("*");
      return country;
    },

    createLocation: async (
      _,
      { name, address, latitude, longitude, countryId, timezone },
      { user },
    ) => {
      if (!user || user.role !== "general_manager") {
        throw new Error("Acceso denegado");
      }
      const [location] = await db("locations")
        .insert({ name, address, latitude, longitude, country_id: countryId, timezone })
        .returning("*");
      return location;
    },

    createAdmin: async (_, { input }, { user }) => {
      // 1. Verificación de permisos
      if (!user || user.role !== "general_manager") {
        throw new Error("Acceso denegado");
      }

      // 2. Extraer datos del objeto 'input' (según define tu typeDefs.js)
      const { firstName, lastName, email, password, locationId } = input;

      // 3. Hashear el password (ahora 'password' ya no será undefined)
      const password_hash = await bcrypt.hash(password, 10);

      // 4. Insertar en la base de datos
      const [admin] = await db("users")
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          password_hash,
          role: "admin",
          location_id: locationId,
        })
        .returning("*");

      return admin;
    },
  },
  // Mapeo snake_case → camelCase
  Country: {
    currencyCode: (c) => c.currency_code,
    currencySymbol: (c) => c.currency_symbol,
    flagUrl: (c) => c.flag_url,
    locations: (c) =>
      db("locations").where({ country_id: c.id }).orderBy("name"),
  },
  CountryAPIResult: {
    currencyCode: (c) => c.currency_code,
    currencySymbol: (c) => c.currency_symbol,
    flagUrl: (c) => c.flag_url,
  },

  Location: {
    countryId: (l) => l.country_id,
    admin: (l) =>
      db("users").where({ location_id: l.id, role: "admin" }).first(),
  },

  User: {
    __resolveReference: async ({ id }) => db("users").where({ id }).first(),
    firstName: (u) => u.first_name,
    lastName: (u) => u.last_name,
    locationId: (u) => u.location_id,
    location: (u) =>
      u.location_id
        ? db("locations").where({ id: u.location_id }).first()
        : null,
  },
};
