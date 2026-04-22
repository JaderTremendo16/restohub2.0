import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_STAFF_DATA,
  CREATE_EMPLOYEE,
  TOGGLE_STATUS,
  SCAN_QR,
} from "../graphql/staffOperations";

export const useStaff = (locationId) => {
  const { loading, error, data, refetch } = useQuery(GET_STAFF_DATA, {
    variables: { location_id: locationId },
    skip: !locationId,
  });

  const [createEmployeeMutation] = useMutation(CREATE_EMPLOYEE);
  const [toggleStatusMutation] = useMutation(TOGGLE_STATUS);
  const [scanQRMutation] = useMutation(SCAN_QR);

  const createEmployee = async (name, country, location_id, phone, email) => {
    await createEmployeeMutation({
      variables: { name, country, location_id, phone, email },
    });
    await refetch();
  };

  const toggleStatus = async (id) => {
    await toggleStatusMutation({
      variables: { empId: parseInt(id) },
    });
    await refetch();
  };

  const scanQR = async (id, options = {}) => {
    const response = await scanQRMutation({
      variables: { empId: parseInt(id) },
      ...options,
    });
    await refetch();
    return response.data.scanAttendance;
  };

  return {
    employees: data?.employees || [],
    activeStaff: data?.activeStaff || [],
    workHistory: data?.workHistory || [],
    loading,
    error,
    createEmployee,
    toggleStatus,
    scanQR,
  };
};
