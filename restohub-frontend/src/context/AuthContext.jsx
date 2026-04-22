//Aqui lo que hacemos es un estado global para el usuario.
//Significa que cualquier componente de la aplicacion podra acceder a esta informacion sin necesidad de pasar props.
//Esto es muy util para manejar el estado de la aplicacion.
//Por ejemplo, si el usuario inicia sesion, podemos guardar su informacion en el estado global y acceder a ella desde cualquier componente.
//Si el usuario cierra sesion, podemos guardar su informacion en el estado global y acceder a ella desde cualquier componente.

import { createContext, useContext, useState } from "react";

// Creamos el contexto — es como un "canal" de datos global
const AuthContext = createContext(null);

// AuthProvider envuelve toda la app y provee el usuario a todos los componentes
export function AuthProvider({ children }) {
  // Intentamos cargar el usuario desde localStorage al iniciar
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("restohub_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("restohub_token") ?? null;
  });

  // locationId para filtros técnicos en el Menú e Inventario
  const [locationId, setLocationId] = useState(() => {
    return localStorage.getItem("restohub_location_id") ? parseInt(localStorage.getItem("restohub_location_id")) : null;
  });

  // Nombre de la sede (branch) para filtros en Lealtad y Reseñas
  const [branchName, setBranchName] = useState(() => {
    return localStorage.getItem("restohub_branch_name") || "Global";
  });

  // Se llama cuando el login es exitoso
  const login = (userData, authToken, locId = null, bName = "Global") => {
    setUser(userData);
    setToken(authToken);
    setLocationId(locId);
    setBranchName(bName);
    
    localStorage.setItem("restohub_user", JSON.stringify(userData));
    localStorage.setItem("restohub_token", authToken);
    if (locId) {
      localStorage.setItem("restohub_location_id", locId.toString());
    }
    localStorage.setItem("restohub_branch_name", bName);
  };

  // Se llama cuando el usuario cierra sesión
  const logout = () => {
    setUser(null);
    setToken(null);
    setLocationId(null);
    setBranchName("Global");
    localStorage.removeItem("restohub_user");
    localStorage.removeItem("restohub_token");
    localStorage.removeItem("restohub_location_id");
    localStorage.removeItem("restohub_branch_name");
  };

  const isGerenteGeneral = user?.role === "general_manager" || user?.role?.toLowerCase() === "gerente";
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{ user, token, locationId, branchName, setLocationId, login, logout, isGerenteGeneral, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar el contexto fácilmente
// En lugar de escribir useContext(AuthContext) en cada componente,
// simplemente escribes useAuth()
export function useAuth() {
  return useContext(AuthContext);
}
