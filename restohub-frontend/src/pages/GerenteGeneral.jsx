import { useState, useEffect } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import {
  GET_COUNTRIES,
  GET_LOCATIONS,
  GET_USERS,
  CREATE_COUNTRY,
  CREATE_LOCATION,
  CREATE_ADMIN,
  LIST_ALL_EXTERNAL_COUNTRIES,
  SEARCH_EXTERNAL_COUNTRY,
} from "../graphql/location";
import { Globe, Store, MapPin, User, Building2 } from "lucide-react";
import MapaPicker from "../components/MapaPicker";

// Lista rápida de países con sus monedas y zonas horarias automáticas
// Removido WORLD_COUNTRIES hardcoded para usar la API en tiempo real.

const inputStyle = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  fontSize: "0.875rem",
  color: "#1a1a2e",
  outline: "none",
  backgroundColor: "white",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: "600",
  color: "#374151",
  marginBottom: "0.4rem",
};

const btnPrimario = {
  backgroundColor: "#ea580c",
  color: "white",
  border: "none",
  padding: "0.625rem 1.25rem",
  borderRadius: "0.625rem",
  fontSize: "0.875rem",
  fontWeight: "600",
  cursor: "pointer",
};

const cardStyle = {
  backgroundColor: "white",
  borderRadius: "1rem",
  padding: "1.5rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  marginBottom: "1.5rem",
};

// ── Sección Países ──────────────────────────────────────────────
function SeccionPaises({ countries, loadingCountries, refetchCountries }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    currencyCode: "",
    currencySymbol: "",
    timezone: "",
    flagUrl: "",
    locale: "",
  });
  const [expandido, setExpandido] = useState(false);

  // Queries para la API externa
  const { data: externalCountriesData, loading: loadingExternal } = useQuery(
    LIST_ALL_EXTERNAL_COUNTRIES,
  );
  const [searchCountry, { data: searchData, loading: searching }] =
    useLazyQuery(SEARCH_EXTERNAL_COUNTRY, {
      errorPolicy: "all",
      fetchPolicy: "network-only",
      notifyOnNetworkStatusChange: true,
      onError: (e) => console.warn("Error parcial (ignorado):", e),
    });

  // Efecto reactivo: En cuanto lleguen datos, llenar el formulario
  useEffect(() => {
    const country = searchData?.searchExternalCountry;
    if (country) {
      setForm((prev) => ({
        ...prev,
        name: country.name,
        code: country.code,
        currencyCode: country.currencyCode,
        currencySymbol: country.currencySymbol,
        timezone: country.timezone,
        flagUrl: country.flagUrl,
        locale: country.locale,
      }));
    }
  }, [searchData]);
  const [createCountry, { loading }] = useMutation(CREATE_COUNTRY, {
    refetchQueries: [{ query: GET_COUNTRIES }],
    onCompleted: () => {
      setForm({
        name: "",
        code: "",
        currencyCode: "",
        currencySymbol: "",
        timezone: "",
        flagUrl: "",
        locale: "",
      });
      setExpandido(false);
    },
    onError: (e) => {
      console.error("Error detallado al crear país:", e);
      alert("Error al crear país: " + e.message);
    },
  });

  const handleSubmit = () => {
    if (!form.name || !form.currencyCode || !form.timezone) {
      alert("Todos los campos son obligatorios");
      return;
    }
    createCountry({ variables: { ...form } });
  };

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: expandido ? "1.5rem" : 0,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: "700",
              color: "#1a1a2e",
            }}
          >
            <Globe size={16} color="#000000ff" strokeWidth={1.75} /> Países
          </h3>
          <p
            style={{
              margin: "0.2rem 0 0 0",
              fontSize: "0.8rem",
              color: "#6b7280",
            }}
          >
            {countries?.length ?? 0} países registrados
          </p>
        </div>
        <button onClick={() => setExpandido(!expandido)} style={btnPrimario}>
          {expandido ? "Cancelar" : "+ Nuevo país"}
        </button>
      </div>

      {/* Formulario */}
      {expandido && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginBottom: "1.5rem",
            padding: "1.25rem",
            backgroundColor: "#f9fafb",
            borderRadius: "0.75rem",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: "160px" }}>
              <label style={labelStyle}>Buscar País *</label>
              <select
                value={form.code}
                onChange={async (e) => {
                  const selectedCode = e.target.value;
                  if (!selectedCode) return;
                  const country =
                    externalCountriesData?.listAllExternalCountries?.find(
                      (c) => c.code === selectedCode,
                    );
                  if (!country) return;
                  // Actualizar name y code inmediatamente
                  setForm((prev) => ({
                    ...prev,
                    name: country.name,
                    code: selectedCode,
                  }));
                  // Esperar la respuesta de la query directamente (evita el problema de referencia en useEffect)
                  const result = await searchCountry({
                    variables: { code: selectedCode },
                  });
                  const data = result?.data?.searchExternalCountry;
                  if (data) {
                    setForm((prev) => ({
                      ...prev,
                      currencyCode: data.currencyCode ?? "",
                      currencySymbol: data.currencySymbol ?? "",
                      timezone: data.timezone ?? "",
                      flagUrl: data.flagUrl ?? "",
                      locale: data.locale ?? "",
                    }));
                  }
                }}
                style={inputStyle}
                disabled={loadingExternal || searching}
              >
                <option value="">
                  {loadingExternal
                    ? "Cargando países..."
                    : "Seleccione un país de la lista..."}
                </option>
                {externalCountriesData?.listAllExternalCountries?.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Diagnóstico visual temporal */}
            {searching && (
              <p
                style={{
                  color: "#3b82f6",
                  fontSize: "0.8rem",
                  margin: "0.5rem 0",
                }}
              >
                Buscando información de {form.name} ({form.code})...
              </p>
            )}

            {form.flagUrl && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  paddingTop: "1.5rem",
                }}
              >
                <img
                  src={form.flagUrl}
                  alt="Flag"
                  style={{
                    width: "40px",
                    borderRadius: "4px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                />
              </div>
            )}

            <div style={{ flex: 1, minWidth: "100px" }}>
              <label style={labelStyle}>Código moneda</label>
              <input
                value={form.currencyCode}
                readOnly
                placeholder="Auto"
                style={{
                  ...inputStyle,
                  backgroundColor: "#f3f4f6",
                  color: "#6b7280",
                  cursor: "not-allowed",
                }}
              />
            </div>

            <div style={{ flex: 2, minWidth: "160px" }}>
              <label style={labelStyle}>Zona horaria</label>
              <input
                value={form.timezone}
                readOnly
                placeholder="Auto"
                style={{
                  ...inputStyle,
                  backgroundColor: "#f3f4f6",
                  color: "#6b7280",
                  cursor: "not-allowed",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={btnPrimario}
            >
              {loading ? "Creando..." : "Crear país"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de países */}
      {loadingCountries ? (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: "2.5rem",
                backgroundColor: "#f3f4f6",
                borderRadius: "0.5rem",
              }}
            />
          ))}
        </div>
      ) : countries?.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: 0 }}>
          No hay países registrados aún.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {countries?.map((country) => (
            <div
              key={country.id}
              style={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "1rem",
                padding: "1rem",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              {country.flagUrl && (
                <img
                  src={country.flagUrl}
                  alt="Flag"
                  style={{ width: "32px", height: "auto", borderRadius: "2px" }}
                />
              )}
              <div>
                <p style={{ margin: 0, fontWeight: "600", color: "#1a1a2e" }}>
                  {country.name}
                </p>
                <p
                  style={{
                    margin: "0.2rem 0 0 0",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    fontWeight: "500",
                  }}
                >
                  {country.currencySymbol} {country.currencyCode} ·{" "}
                  {country.timezone}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sección Sedes ───────────────────────────────────────────────
function SeccionSedes({ countries, locations, loadingLocations }) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    countryId: "",
    latitude: null,
    longitude: null,
  });
  const [expandido, setExpandido] = useState(false);
  const [filtroPais, setFiltroPais] = useState("");

  const [createLocation, { loading }] = useMutation(CREATE_LOCATION, {
    refetchQueries: [{ query: GET_LOCATIONS }],
    onCompleted: () => {
      setForm({ name: "", address: "", countryId: "", latitude: null, longitude: null });
      setExpandido(false);
    },
    onError: (e) => alert("Error al crear sede: " + e.message),
  });

  const handleSubmit = () => {
    if (!form.name || !form.address || !form.countryId) {
      alert("Todos los campos son obligatorios");
      return;
    }
    createLocation({ variables: { ...form, countryId: form.countryId } });
  };

  const locationsFiltradas =
    locations?.filter((l) =>
      filtroPais ? String(l.countryId) === String(filtroPais) : true,
    ) ?? [];

  const nombrePais = (countryId) => {
    return (
      countries?.find((c) => String(c.id) === String(countryId))?.name ??
      `País #${countryId}`
    );
  };

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: "700",
              color: "#1a1a2e",
            }}
          >
            <Building2 size={16} color="#000000ff" strokeWidth={1.75} /> Sedes
          </h3>
          <p
            style={{
              margin: "0.2rem 0 0 0",
              fontSize: "0.8rem",
              color: "#6b7280",
            }}
          >
            {locations?.length ?? 0} sedes registradas
          </p>
        </div>
        <button onClick={() => setExpandido(!expandido)} style={btnPrimario}>
          {expandido ? "Cancelar" : "+ Nueva sede"}
        </button>
      </div>

      {/* Formulario */}
      {expandido && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginBottom: "1.5rem",
            padding: "1.25rem",
            backgroundColor: "#f9fafb",
            borderRadius: "0.75rem",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: "160px" }}>
              <label style={labelStyle}>Nombre de la sede *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: RestoHub Bogotá Centro"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 2, minWidth: "160px" }}>
              <label style={labelStyle}>Dirección *</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Ej: Cra 7 #32-16"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label style={labelStyle}>País *</label>
              <select
                value={form.countryId}
                onChange={(e) =>
                  setForm({ ...form, countryId: e.target.value })
                }
                style={inputStyle}
              >
                <option value="">Seleccionar país</option>
                {countries?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mapa interactivo */}
            <div style={{ width: "100%", marginTop: "0.5rem" }}>
              <label style={labelStyle}>Ubicación en el mapa Manualmente</label>
              <MapaPicker
                lat={form.latitude}
                lng={form.longitude}
                countryName={
                  countries?.find((c) => String(c.id) === String(form.countryId))
                    ?.name
                }
                onLocationChange={({ lat, lng, address }) => {
                  setForm((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                    // Si el mapa devuelve una dirección y el campo estaba vacío, lo auto-rellenamos
                    address: prev.address || address || "",
                  }));
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={btnPrimario}
            >
              {loading ? "Creando..." : "Crear sede"}
            </button>
          </div>
        </div>
      )}

      {/* Filtro por país */}
      {(locations?.length ?? 0) > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <select
            value={filtroPais}
            onChange={(e) => setFiltroPais(e.target.value)}
            style={{ ...inputStyle, width: "auto", minWidth: "200px" }}
          >
            <option value="">Todos los países</option>
            {countries?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Lista de sedes */}
      {loadingLocations ? (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "3rem",
                backgroundColor: "#f3f4f6",
                borderRadius: "0.5rem",
              }}
            />
          ))}
        </div>
      ) : locationsFiltradas.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: 0 }}>
          No hay sedes registradas aún.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {locationsFiltradas.map((loc) => (
            <div
              key={loc.id}
              style={{
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "0.875rem 1rem",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontWeight: "600",
                  color: "#1a1a2e",
                  fontSize: "0.875rem",
                }}
              >
                <Store size={16} color="#000000ff" strokeWidth={1.75} />
                {loc.name}
              </p>
              <p
                style={{
                  margin: "0.2rem 0 0 0",
                  fontSize: "0.75rem",
                  color: "#6b7280",
                }}
              >
                <MapPin size={16} color="#f90000ff" strokeWidth={1.75} />{" "}
                {loc.address}
              </p>
              <p
                style={{
                  margin: "0.2rem 0 0 0",
                  fontSize: "0.75rem",
                  color: "#9ca3af",
                }}
              >
                {nombrePais(loc.countryId)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sección Administradores ─────────────────────────────────────
function SeccionAdmins({ locations }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    locationId: "",
  });
  const [expandido, setExpandido] = useState(false);

  // Traemos los usuarios para mostrar los admins registrados
  const { data: usersData, loading: loadingUsers } = useQuery(GET_USERS);

  const admins = usersData?.users?.filter((u) => u.role === "admin") ?? [];

  const nombreSede = (locationId) => {
    return (
      locations?.find((l) => String(l.id) === String(locationId))?.name ??
      `Sede #${locationId}`
    );
  };

  const [createAdmin, { loading }] = useMutation(CREATE_ADMIN, {
    refetchQueries: [{ query: GET_USERS }],
    onCompleted: () => {
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        locationId: "",
      });
      setExpandido(false);
    },
    onError: (e) => alert("Error al crear administrador: " + e.message),
  });

  const handleSubmit = () => {
    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.password ||
      !form.locationId
    ) {
      alert("Todos los campos son obligatorios");
      return;
    }
    createAdmin({
      variables: {
        input: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          locationId: form.locationId,
        },
      },
    });
  };

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: "700",
              color: "#1a1a2e",
            }}
          >
            <User size={16} color="#000000ff" strokeWidth={1.75} />{" "}
            Administradores
          </h3>
          <p
            style={{
              margin: "0.2rem 0 0 0",
              fontSize: "0.8rem",
              color: "#6b7280",
            }}
          >
            {admins.length} administrador{admins.length !== 1 ? "es" : ""}{" "}
            registrado{admins.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setExpandido(!expandido)} style={btnPrimario}>
          {expandido ? "Cancelar" : "+ Nuevo administrador"}
        </button>
      </div>

      {/* Formulario */}
      {expandido && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            padding: "1.25rem",
            backgroundColor: "#f9fafb",
            borderRadius: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label style={labelStyle}>Nombre *</label>
              <input
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                placeholder="Ej: Carlos"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label style={labelStyle}>Apellido *</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Ej: Martínez"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@restohub.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Contraseña *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Sede asignada *</label>
            <select
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              style={inputStyle}
            >
              <option value="">Seleccionar sede</option>
              {locations?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.address}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={btnPrimario}
            >
              {loading ? "Creando..." : "Crear administrador"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de admins */}
      {loadingUsers ? (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: "3rem",
                backgroundColor: "#f3f4f6",
                borderRadius: "0.5rem",
              }}
            />
          ))}
        </div>
      ) : admins.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: 0 }}>
          No hay administradores registrados aún.
        </p>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {admins.map((admin) => (
            <div
              key={admin.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "0.875rem 1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "50%",
                    backgroundColor: "#1a1a2e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "700",
                    fontSize: "0.875rem",
                    flexShrink: 0,
                  }}
                >
                  {admin.firstName?.charAt(0)?.toUpperCase() ?? "A"}
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: "600",
                      color: "#1a1a2e",
                      fontSize: "0.875rem",
                    }}
                  >
                    {admin.firstName} {admin.lastName}
                  </p>
                  <p
                    style={{
                      margin: "0.1rem 0 0 0",
                      fontSize: "0.75rem",
                      color: "#6b7280",
                    }}
                  >
                    ✉️ {admin.email}
                  </p>
                </div>
              </div>
              {/* Sede asignada */}
              <div
                style={{
                  backgroundColor: "#ea580c18",
                  color: "#ea580c",
                  padding: "0.3rem 0.75rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                }}
              >
                🏪 {nombreSede(admin.locationId)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────
function GerenteGeneral() {
  const { data: countriesData, loading: loadingCountries } =
    useQuery(GET_COUNTRIES);
  const { data: locationsData, loading: loadingLocations } =
    useQuery(GET_LOCATIONS);

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: "700",
            color: "#1a1a2e",
          }}
        >
          Gestión Global
        </h2>
        <p
          style={{
            margin: "0.25rem 0 0 0",
            color: "#6b7280",
            fontSize: "0.875rem",
          }}
        >
          Administra países, sedes y administradores de la cadena
        </p>
      </div>

      <SeccionPaises
        countries={countriesData?.countries}
        loadingCountries={loadingCountries}
      />

      <SeccionSedes
        countries={countriesData?.countries}
        locations={locationsData?.locations}
        loadingLocations={loadingLocations}
      />

      <SeccionAdmins locations={locationsData?.locations} />
    </div>
  );
}

export default GerenteGeneral;
