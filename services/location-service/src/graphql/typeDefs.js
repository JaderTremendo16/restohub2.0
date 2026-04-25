const { gql } = require("apollo-server-express");

module.exports = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Country @key(fields: "id") {
    id: ID!
    name: String!
    currencyCode: String!
    currencySymbol: String
    timezone: String!
    flagUrl: String
    locale: String
    locations: [Location!]!
  }

  type Location @key(fields: "id") {
    id: ID!
    name: String!
    address: String!
    timezone: String
    countryId: ID!
    lat: Float
    lng: Float
    admin: User
  }

  type CountryAPIResult {
    name: String!
    code: String!
    currencyCode: String!
    currencySymbol: String!
    timezone: String!
    flagUrl: String!
    locale: String
  }

  type ExternalCountryListItem {
    name: String!
    flag: String!
    code: String!
  }

  type User @key(fields: "id") {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: String!
    locationId: ID
    location: Location
  }

  type AuthPayload {
    token: String!
    user: User!
    message: String!
  }

  type Query {
    countries: [Country!]!
    country(id: ID!): Country
    locations: [Location!]!
    locationsByCountry(countryId: ID!): [Location!]!
    users: [User!]!
    me: User
    dashboard: [Country!]!
    searchExternalCountry(code: String!): CountryAPIResult
    listAllExternalCountries: [ExternalCountryListItem!]!
  }

  input CreateAdminInput {
    firstName: String!
    lastName: String!
    email: String!
    password: String!
    locationId: ID!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!

    createCountry(
      name: String!
      currencyCode: String!
      currencySymbol: String
      timezone: String!
      flagUrl: String
      locale: String
    ): Country!

    createLocation(
      name: String!
      address: String!
      countryId: ID!
      timezone: String
      lat: Float
      lng: Float
    ): Location!
    createAdmin(input: CreateAdminInput!): User!
  }
`;
