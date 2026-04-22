import { useStaff } from "../hooks/useStaff";
import ActiveStaff from "../components/staff/ActiveStaff";
import CreateEmployee from "../components/staff/CreateEmployee";
import StaffList from "../components/staff/StaffList";
import QRScanner from "../components/staff/QRScanner";
import WorkHistory from "../components/staff/WorkHistory";
import { useAuth } from "../context/AuthContext";
import { GET_LOCATIONS, GET_COUNTRIES } from "../graphql/location";
import { useQuery } from "@apollo/client/react";

const Staff = () => {
  const { user } = useAuth();
  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const { data: countriesData } = useQuery(GET_COUNTRIES);

  const sedeActual = locationsData?.locations?.find(
    (l) => String(l.id) === String(user?.locationId),
  );
  const paisActual = countriesData?.countries?.find(
    (c) => String(c.id) === String(sedeActual?.countryId),
  );

  const locationId = user?.locationId ? parseInt(user.locationId) : null;

  const {
    employees,
    activeStaff,
    workHistory,
    loading,
    error,
    createEmployee,
    toggleStatus,
    scanQR,
  } = useStaff(locationId);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error cargando datos</p>;

  return (
    <div>
      <h1>Gestión de Personal</h1>

      <ActiveStaff activeStaff={activeStaff} />

      <CreateEmployee createEmployee={createEmployee} />

      <StaffList employees={employees} toggleStatus={toggleStatus} />

      <QRScanner scanQR={scanQR} />
      <h3
        style={{
          fontSize: "1.1rem",
          fontWeight: "700",
          margin: "3rem 0 1.25rem 0",
          color: "#1a1a2e",
        }}
      >
        Historial de turnos
      </h3>
      <WorkHistory history={workHistory} />
    </div>
  );
};

export default Staff;
