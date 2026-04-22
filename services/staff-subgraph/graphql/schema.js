import gql from "graphql-tag";

const typeDefs = gql`
  type Employee {
    id: ID!
    name: String!
    country: String
    location_id: Int
    phone: String
    email: String
    active: Boolean!
    base_hours: Int!
    qr_code: String!
  }

  type ActiveStaff {
    id: ID!
    name: String!
    start: String!
    current_hours: Float!
  }

  type ScanResponse {
    status: String!
    employee: String
    hours: Float
    overtime: Float
    message: String
    time: String
  }

  type WorkShift {
    id: ID!
    emp_id: Int!
    emp_name: String!
    date: String!
    start_time: String!
    end_time: String!
    hours_worked: Float!
    base_hours: Int!
    overtime_hours: Float!
    location_id: Int!
  }

  type Query {
    # Lista completa de empleados (GET /employees)
    employees(location_id: Int): [Employee!]!

    # Lista de staff con turno abierto (GET /attendance/active)
    activeStaff: [ActiveStaff!]!

    workHistory(location_id: Int): [WorkShift!]!
  }

  type Mutation {
    # Crea empleado usando params (POST /employees/create)
    createEmployee(
      name: String!
      country: String!
      location_id: Int
      phone: String
      email: String
    ): Employee!

    # Escaneo de asistencia (POST /attendance/scan/{id})
    scanAttendance(emp_id: Int!): ScanResponse!

    # Cambia estado usando path variable (PUT /employees/toggle/{id})
    toggleEmployeeStatus(emp_id: Int!): Employee!
  }
`;

export default typeDefs;
