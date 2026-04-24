import { gql } from "@apollo/client/core";

export const GET_STAFF_DATA = gql`
  query GetStaffData($location_id: Int) {
    employees(location_id: $location_id) {
      id
      name
      country
      location_id
      phone
      email
      active
      base_hours
      qr_code
      role
    }
    activeStaff {
      id
      name
      start
      current_hours
    }
    workHistory(location_id: $location_id) {
      id
      emp_id
      emp_name
      location_id
      date
      start_time
      end_time
      hours_worked
      base_hours
      overtime_hours
      role
    }
  }
`;

export const CREATE_EMPLOYEE = gql`
  mutation CreateEmployee(
    $name: String!
    $country: String!
    $location_id: Int
    $phone: String
    $email: String
    $role: String!
  ) {
    createEmployee(
      name: $name
      country: $country
      location_id: $location_id
      phone: $phone
      email: $email
      role: $role
    ) {
      id
      name
      role
    }
  }
`;

export const TOGGLE_STATUS = gql`
  mutation ToggleStatus($empId: Int!) {
    toggleEmployeeStatus(emp_id: $empId) {
      id
      active
    }
  }
`;

export const SCAN_QR = gql`
  mutation ScanQR($empId: Int!) {
    scanAttendance(emp_id: $empId) {
      status
      employee
      hours
      overtime
      message
      time
    }
  }
`;
