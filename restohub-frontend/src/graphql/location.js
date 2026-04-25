import { gql } from "@apollo/client/core";

// ─── QUERIES ────────────────────────────────────────────────────

// Trae todos los países
export const GET_COUNTRIES = gql`
  query GetCountries {
    countries {
      id
      name
      currencyCode
      currencySymbol
      timezone
      flagUrl
      locale
    }
  }
`;

// Trae todas las sedes/restaurantes
export const GET_LOCATIONS = gql`
  query GetLocations {
    locations {
      id
      name
      address
      timezone
      countryId
      lat
      lng
    }
  }
`;

// Trae las sedes de un país específico
export const GET_LOCATIONS_BY_COUNTRY = gql`
  query GetLocationsByCountry($countryId: ID!) {
    locationsByCountry(countryId: $countryId) {
      id
      name
      address
      countryId
    }
  }
`;

// Trae todos los usuarios del sistema
export const GET_USERS = gql`
  query GetUsers {
    users {
      id
      firstName
      lastName
      email
      role
      locationId
    }
  }
`;

// Trae el usuario actualmente logueado — útil para saber el rol
export const GET_ME = gql`
  query GetMe {
    me {
      id
      firstName
      lastName
      email
      role
      locationId
    }
  }
`;

export const SEARCH_EXTERNAL_COUNTRY = gql`
  query SearchExternalCountry($code: String!) {
    searchExternalCountry(code: $code) {
      name
      code
      currencyCode
      currencySymbol
      timezone
      flagUrl
      locale
    }
  }
`;

export const LIST_ALL_EXTERNAL_COUNTRIES = gql`
  query ListAllExternalCountries {
    listAllExternalCountries {
      name
      flag
      code
    }
  }
`;

// ─── MUTATIONS ───────────────────────────────────────────────────

// Login — devuelve el token JWT y los datos del usuario
export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      message
      user {
        id
        firstName
        lastName
        email
        role
        locationId
      }
    }
  }
`;

export const CREATE_COUNTRY = gql`
  mutation CreateCountry(
    $name: String!
    $currencyCode: String!
    $currencySymbol: String
    $timezone: String!
    $flagUrl: String
    $locale: String
  ) {
    createCountry(
      name: $name
      currencyCode: $currencyCode
      currencySymbol: $currencySymbol
      timezone: $timezone
      flagUrl: $flagUrl
      locale: $locale
    ) {
      id
      name
      currencyCode
      currencySymbol
      timezone
      flagUrl
      locale
    }
  }
`;

export const CREATE_LOCATION = gql`
  mutation CreateLocation($name: String!, $address: String!, $countryId: ID!, $timezone: String, $lat: Float, $lng: Float) {
    createLocation(name: $name, address: $address, countryId: $countryId, timezone: $timezone, lat: $lat, lng: $lng) {
      id
      name
      address
      timezone
      countryId
      lat
      lng
    }
  }
`;

export const CREATE_ADMIN = gql`
  mutation CreateAdmin($input: CreateAdminInput!) {
    createAdmin(input: $input) {
      id
      firstName
      lastName
      email
      role
      locationId
    }
  }
`;
