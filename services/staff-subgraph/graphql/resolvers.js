import axios from "axios";

const STAFF_API_URL = "http://staff-api:8000";

const resolvers = {
  Query: {
    employees: async (_, { location_id }) => {
      const params = {};
      if (location_id) params.location_id = location_id;
      const response = await axios.get(`${STAFF_API_URL}/employees`, {
        params,
      });
      return response.data;
    },
    // Movido a Query porque en Python es un GET
    activeStaff: async () => {
      const response = await axios.get(`${STAFF_API_URL}/attendance/active`);
      return response.data;
    },
    workHistory: async (_, { location_id }) => {
      const params = {};
      if (location_id) params.location_id = location_id;
      const response = await axios.get(`${STAFF_API_URL}/history`, { params });
      return response.data;
    },
  },

  Mutation: {
    createEmployee: async (_, { name, country, location_id, phone, email, password, role }) => {
      // Usamos .post y pasamos params porque Python los recibe como argumentos de función
      const response = await axios.post(
        `${STAFF_API_URL}/employees/create`,
        null,
        {
          params: { name, country, location_id, phone, email, password, role },
        },
      );
      return response.data;
    },
    loginStaff: async (_, { email, password }) => {
      try {
        const response = await axios.post(
          `${STAFF_API_URL}/login`,
          null,
          {
            params: { email, password },
          },
        );
        return response.data;
      } catch (error) {
        const message = error.response?.data?.detail || error.message || "Error en el servidor de Staff";
        console.log("SUBGRAPH ERROR CAUGHT:", message);
        throw new Error(message);
      }
    },
    toggleEmployeeStatus: async (_, { emp_id }) => {
      try {
        const response = await axios.put(
          `${STAFF_API_URL}/employees/toggle/${emp_id}`,
        );
        return response.data;
      } catch (error) {
        const message = error.response?.data?.detail || error.message || "Error al cambiar estado";
        throw new Error(message);
      }
    },

    scanAttendance: async (_, { emp_id }) => {
      const response = await axios.post(
        `${STAFF_API_URL}/attendance/scan/${emp_id}`,
        {},
      );

      return response.data;
    },
  },
};

export default resolvers;
