import { useQuery } from "@apollo/client/react";
import { GET_SUPPLY_ORDERS } from "../graphql/inventory";
import { GET_EXPIRING_BATCHES } from "../graphql/inventory";
import { GET_LOW_STOCK_CONFIGS } from "../graphql/inventory";
import { GET_STOCKS } from "../graphql/inventory";
import { GET_INGREDIENTS } from "../graphql/ingredients";
import { useAuth } from "../context/AuthContext";
import { GET_COUNTRIES, GET_LOCATIONS, GET_USERS } from "../graphql/location";
import StatCard from "../components/StatCard";
import {
  Globe,
  Store,
  Users,
  TriangleAlert,
  ClockAlert,
  Calendar,
} from "lucide-react";

function Dashboard() {
  const { user, isGerenteGeneral } = useAuth();
  const { data: countriesData, loading: countriesLoading } = useQuery(
    GET_COUNTRIES,
    { skip: !isGerenteGeneral }, //significa "no ejecutes esta query si el usuario NO es gerente". Así el admin no hace queries innecesarias.
  );
  const { data: locationsData, loading: locationsLoading } = useQuery(
    GET_LOCATIONS,
    { skip: !isGerenteGeneral },
  );
  const { data: usersData, loading: usersLoading } = useQuery(GET_USERS, {
    skip: !isGerenteGeneral,
  });
  const locationId = user?.locationId ? parseInt(user.locationId) : null;

  // ── Pedidos pendientes ──────────────────────────────────────────
  // Llamamos a la API pidiendo solo las órdenes con status PENDIENTE
  const {
    data: ordersData,
    loading: ordersLoading,
    error: ordersError,
  } = useQuery(GET_SUPPLY_ORDERS, {
    variables: { status: "PENDIENTE", location_id: locationId },
    skip: isGerenteGeneral,
  });

  // ── Lotes por vencer en 3 días ──────────────────────────────────
  const {
    data: expiringData,
    loading: expiringLoading,
    error: expiringError,
  } = useQuery(GET_EXPIRING_BATCHES, {
    variables: { days: 3, location_id: locationId },
    skip: isGerenteGeneral,
  });

  // ── Configuraciones de stock mínimo ────────────────────────────
  // GET_LOW_STOCK_CONFIGS
  const {
    data: lowStockData,
    loading: lowStockLoading,
    error: lowStockError,
  } = useQuery(GET_LOW_STOCK_CONFIGS, {
    variables: { location_id: locationId },
    skip: isGerenteGeneral,
  });

  // GET_STOCKS
  const { data: stocksData, loading: stocksLoading } = useQuery(GET_STOCKS, {
    variables: { location_id: locationId },
    skip: isGerenteGeneral,
  });

  // GET_INGREDIENTS — este es global, no necesita filtro
  const { data: ingredientsData, loading: ingredientsLoading } = useQuery(
    GET_INGREDIENTS,
    {
      skip: isGerenteGeneral,
    },
  );

  // ── Calcular stock crítico ─────────────────────────────────────
  // Un ingrediente tiene stock crítico cuando su cantidad actual
  // es menor que el umbral mínimo configurado (min_threshold)
  const criticalStockCount = () => {
    if (!lowStockData?.lowStockConfigs || !stocksData?.stocks) return 0;

    return lowStockData.lowStockConfigs.filter((config) => {
      // Buscamos el stock actual de este ingrediente en esta ubicación
      const stock = stocksData.stocks.find(
        (s) =>
          s.ingredient_id === config.ingredient_id &&
          s.location_id === config.location_id,
      );
      // Si no hay stock registrado, o si está por debajo del mínimo → crítico
      if (!stock) return true;
      return stock.total_quantity < config.min_threshold;
    }).length;
  };

  // ── Preparar datos para el gráfico ────────────────────────────
  // Combinamos stocks con nombres de ingredientes
  const chartData = () => {
    if (!stocksData?.stocks || !ingredientsData?.ingredients) return [];

    // Tomamos los primeros 8 para que el gráfico no quede muy apretado
    return stocksData.stocks.slice(0, 8).map((stock) => {
      const ingredient = ingredientsData?.ingredients.find(
        (i) => String(i.id) === String(stock.ingredient_id),
      );
      return {
        name: ingredient?.name ?? "Desconocido",
        quantity: stock.total_quantity,
        unit: stock.unit,
      };
    });
  };

  // El valor máximo del gráfico — para calcular los porcentajes de las barras
  const maxQuantity = Math.max(...chartData().map((d) => d.quantity), 1);

  const sedesSinAdmin =
    locationsData?.locations?.filter(
      (l) =>
        !usersData?.users?.some(
          (u) => u.role === "admin" && String(u.locationId) === String(l.id),
        ),
    ).length ?? 0;

  // ── Render ─────────────────────────────────────────────────────

  //Si es gerente general:
  // Si es gerente, muestra su propio dashboard
  if (isGerenteGeneral) {
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
            Dashboard
          </h2>
          <p
            style={{
              margin: "0.25rem 0 0 0",
              color: "#6b7280",
              fontSize: "0.875rem",
            }}
          >
            Resumen global de la cadena RestoHub
          </p>
        </div>

        {/* KPIs del gerente */}
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            marginBottom: "2rem",
            flexWrap: "wrap",
          }}
        >
          <StatCard
            title="Países"
            icon={Globe}
            color="#8b5cf6"
            loading={countriesLoading}
            value={countriesData?.countries?.length ?? 0}
          />
          <StatCard
            title="Sedes totales"
            icon={Store}
            color="#ea580c"
            loading={locationsLoading}
            value={locationsData?.locations?.length ?? 0}
          />
          <StatCard
            title="Administradores"
            icon={Users}
            color="#10b981"
            loading={usersLoading}
            value={
              usersData?.users?.filter((u) => u.role === "admin").length ?? 0
            }
          />
          <StatCard
            title="Sedes sin admin"
            icon={TriangleAlert}
            color="#fff700"
            loading={locationsLoading || usersLoading}
            value={sedesSinAdmin}
          />
        </div>

        {/* Tabla de países con sus sedes */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: "700",
                color: "#1a1a2e",
              }}
            >
              Sedes por país
            </h3>
          </div>

          {countriesLoading ? (
            <div
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {[1, 2, 3].map((i) => (
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
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f9fafb" }}>
                  {[
                    "País",
                    "Moneda",
                    "Zona horaria",
                    "Sedes",
                    "Admins asignados",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.875rem 1.25rem",
                        textAlign: "left",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {countriesData?.countries?.map((country, index) => {
                  const sedesDelPais =
                    locationsData?.locations?.filter(
                      (l) => String(l.countryId) === String(country.id),
                    ) ?? [];
                  const adminsDelPais =
                    usersData?.users?.filter(
                      (u) =>
                        u.role === "admin" &&
                        sedesDelPais.some(
                          (s) => String(s.id) === String(u.locationId),
                        ),
                    ).length ?? 0;

                  return (
                    <tr
                      key={country.id}
                      style={{
                        borderBottom:
                          index < countriesData?.countries?.length - 1
                            ? "1px solid #f3f4f6"
                            : "none",
                      }}
                    >
                      <td
                        style={{
                          padding: "1rem 1.25rem",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#1a1a2e",
                        }}
                      >
                        <Globe size={16} color="#000000ff" strokeWidth={1.75} />{" "}
                        {country.name}
                      </td>
                      <td
                        style={{
                          padding: "1rem 1.25rem",
                          fontSize: "0.875rem",
                          color: "#6b7280",
                        }}
                      >
                        {country.currencyCode}
                      </td>
                      <td
                        style={{
                          padding: "1rem 1.25rem",
                          fontSize: "0.875rem",
                          color: "#6b7280",
                        }}
                      >
                        {country.timezone}
                      </td>
                      <td
                        style={{
                          padding: "1rem 1.25rem",
                          fontSize: "0.875rem",
                          color: "#374151",
                        }}
                      >
                        {sedesDelPais.length}
                      </td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <span
                          style={{
                            backgroundColor:
                              adminsDelPais === sedesDelPais.length
                                ? "#dcfce7"
                                : "#fef3c7",
                            color:
                              adminsDelPais === sedesDelPais.length
                                ? "#16a34a"
                                : "#92400e",
                            padding: "0.2rem 0.7rem",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                          }}
                        >
                          {adminsDelPais} / {sedesDelPais.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Título de la página */}
      <div style={{ marginBottom: "2rem" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: "700",
            color: "#1a1a2e",
          }}
        >
          Dashboard
        </h2>
        <p
          style={{
            margin: "0.25rem 0 0 0",
            color: "#6b7280",
            fontSize: "0.875rem",
          }}
        >
          Resumen general del sistema
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
      >
        <StatCard
          title="Stock crítico"
          icon={TriangleAlert}
          color="#ef4444"
          loading={lowStockLoading || stocksLoading}
          value={criticalStockCount()}
        />

        <StatCard
          title="Pedidos pendientes"
          icon={ClockAlert}
          color="#f59e0b"
          loading={ordersLoading}
          value={ordersData?.supplyOrders?.length ?? 0}
        />

        <StatCard
          title="Lotes por vencer (3 días)"
          icon={Calendar}
          color="#ea580c"
          loading={expiringLoading}
          value={expiringData?.expiringBatches?.length ?? 0}
        />
      </div>

      {/* ── Errores de API ── */}
      {(ordersError || expiringError || lowStockError) && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.75rem",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            color: "#dc2626",
            fontSize: "0.875rem",
          }}
        >
          <TriangleAlert size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} /> Algunos datos no pudieron cargarse. Verifica que el
          gateway esté corriendo en el puerto 4000.
        </div>
      )}

      {/* ── Gráfico de barras ── */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <h3
          style={{
            margin: "0 0 1.5rem 0",
            fontSize: "1rem",
            fontWeight: "600",
            color: "#1a1a2e",
          }}
        >
          Nivel de stock por ingrediente
        </h3>

        {stocksLoading || ingredientsLoading ? (
          // Skeleton del gráfico mientras carga
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <div
                  style={{
                    width: "6rem",
                    height: "0.75rem",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "0.25rem",
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    height: "1.5rem",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "0.25rem",
                  }}
                />
              </div>
            ))}
          </div>
        ) : chartData().length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
            No hay datos de stock disponibles.
          </p>
        ) : (
          // El gráfico real
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {chartData().map((item) => (
              <div
                key={item.name}
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                {/* Nombre del ingrediente */}
                <div
                  style={{
                    width: "8rem",
                    fontSize: "0.8rem",
                    color: "#374151",
                    textAlign: "right",
                    flexShrink: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.name}
                </div>

                {/* Barra */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: "#f3f4f6",
                    borderRadius: "9999px",
                    height: "1.5rem",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      // El ancho de la barra es proporcional al máximo
                      width: `${(item.quantity / maxQuantity) * 100}%`,
                      height: "100%",
                      backgroundColor: "#ea580c",
                      borderRadius: "9999px",
                      transition: "width 0.5s ease",
                      minWidth: "0.25rem",
                    }}
                  />
                </div>

                {/* Cantidad */}
                <div
                  style={{
                    width: "4rem",
                    fontSize: "0.8rem",
                    color: "#6b7280",
                    flexShrink: 0,
                  }}
                >
                  {item.quantity} {item.unit}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
