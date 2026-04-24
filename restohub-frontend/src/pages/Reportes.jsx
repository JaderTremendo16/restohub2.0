import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { MONTHLY_REPORT } from "../graphql/reportes";
import { GET_LOCATIONS, GET_COUNTRIES, GET_USERS } from "../graphql/location";
import { useAuth } from "../context/AuthContext";

const YEARS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);

function exportCSV(data, filename = "reporte_mensual.csv") {
  const header = [
    "Año",
    "Mes",
    "Pedidos",
    "Ingresos",
    "Ticket Promedio",
  ];
  const rows = data.map((r) => [
    r.year,
    r.monthName,
    r.totalOrders,
    r.totalRevenue.toFixed(2),
    r.averageTicket.toFixed(2),
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportExcel(data) {
  const rows = data
    .map(
      (r) => `
    <Row>
      <Cell><Data ss:Type="Number">${r.year}</Data></Cell>
      <Cell><Data ss:Type="String">${r.monthName}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.totalOrders}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.totalRevenue.toFixed(2)}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.averageTicket.toFixed(2)}</Data></Cell>
    </Row>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Reporte Mensual">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Año</Data></Cell>
        <Cell><Data ss:Type="String">Mes</Data></Cell>
        <Cell><Data ss:Type="String">Pedidos</Data></Cell>
        <Cell><Data ss:Type="String">Ingresos</Data></Cell>
        <Cell><Data ss:Type="String">Ticket Promedio</Data></Cell>
      </Row>
      ${rows}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reporte_mensual.xls";
  a.click();
  URL.revokeObjectURL(url);
}

function StatCard({ label, value, sub, accent }) {
  const accentColors = {
    blue: { bg: "#1a73e8" },
    green: { bg: "#1e8e3e" },
    amber: { bg: "#b06000" },
    purple: { bg: "#6200ea" },
  };
  const color = accentColors[accent] || accentColors.blue;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e8eaed",
        borderRadius: 12,
        padding: "1.25rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        borderLeft: `4px solid ${color.bg}`,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#5f6368",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#1a1a2e",
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
      {sub && <span style={{ fontSize: 12, color: "#80868b" }}>{sub}</span>}
    </div>
  );
}

function BarChart({ data }) {
  if (!data.length) return null;

  const WIDTH = 600;
  const HEIGHT = 200;
  const PAD = { top: 24, right: 16, bottom: 36, left: 56 };
  const W = WIDTH - PAD.left - PAD.right;
  const H = HEIGHT - PAD.top - PAD.bottom;

  const maxRevenue = Math.max(...data.map((d) => d.totalRevenue), 1);
  const maxOrders = Math.max(...data.map((d) => d.totalOrders), 1);
  const barW = Math.min((W / data.length) * 0.6, 32);
  const xStep = W / data.length;
  const cx = (i) => PAD.left + i * xStep + xStep / 2;

  const orderPoints = data.map((d, i) => ({
    x: cx(i),
    y: PAD.top + H - (d.totalOrders / maxOrders) * H,
  }));

  const toPath = (pts) =>
    pts
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
      )
      .join(" ");

  const toArea = (pts) =>
    `${toPath(pts)} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + H).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD.top + H).toFixed(1)} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: PAD.top + H - pct * H,
    label:
      maxRevenue * pct >= 1000
        ? `${((maxRevenue * pct) / 1000).toFixed(0)}k`
        : `${(maxRevenue * pct).toFixed(0)}`,
  }));

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: "100%", maxHeight: 220, display: "block" }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a73e8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1a73e8" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5a623" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f5a623" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={g.y}
              x2={PAD.left + W}
              y2={g.y}
              stroke="#e8eaed"
              strokeWidth="0.5"
              strokeDasharray="3,3"
            />
            <text
              x={PAD.left - 6}
              y={g.y + 4}
              textAnchor="end"
              fontSize="9"
              fill="#9aa0a6"
            >
              {g.label}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const barH = Math.max((d.totalRevenue / maxRevenue) * H, 2);
          return (
            <rect
              key={i}
              x={cx(i) - barW / 2}
              y={PAD.top + H - barH}
              width={barW}
              height={barH}
              fill="url(#gradBar)"
              rx="3"
            />
          );
        })}

        <path d={toArea(orderPoints)} fill="url(#gradArea)" />
        <path
          d={toPath(orderPoints)}
          fill="none"
          stroke="#f5a623"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={orderPoints[i].x}
              cy={orderPoints[i].y}
              r="3"
              fill="#f5a623"
            />
            <text
              x={cx(i)}
              y={PAD.top + H + 16}
              textAnchor="middle"
              fontSize="9"
              fill="#9aa0a6"
            >
              {d.monthName.slice(0, 3)}
            </text>
            <text
              x={cx(i)}
              y={PAD.top + H + 26}
              textAnchor="middle"
              fontSize="8"
              fill="#c5c8cc"
            >
              {d.year}
            </text>
          </g>
        ))}
      </svg>

      <div
        style={{
          display: "flex",
          gap: 20,
          justifyContent: "center",
          marginTop: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#5f6368",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              backgroundColor: "#1a73e8",
              borderRadius: 3,
              opacity: 0.8,
            }}
          />
          Ingresos
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#5f6368",
          }}
        >
          <div
            style={{
              width: 20,
              height: 2,
              background: "#f5a623",
              borderRadius: 2,
            }}
          />
          Pedidos
        </div>
      </div>
    </div>
  );
}

export default function Reportes() {
  const currentYear = new Date().getFullYear();
  const [fromYear, setFromYear] = useState(currentYear - 1);
  const [toYear, setToYear] = useState(currentYear);
  const [filterYear, setFilterYear] = useState("todos");

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "general_manager";

  const [selectedBranch, setSelectedBranch] = useState(isAdmin ? user?.locationId : "all");

  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const { data: countriesData } = useQuery(GET_COUNTRIES);
  const { data: usersData } = useQuery(GET_USERS, { skip: !isManager });

  const [selectedCountry, setSelectedCountry] = useState(null);

  useMemo(() => {
    if (isManager && !selectedCountry && countriesData?.countries?.length > 0) {
      setSelectedCountry(countriesData.countries[0].id);
    }
  }, [isManager, selectedCountry, countriesData]);

  const locationsInCountry = useMemo(() => {
    if (!locationsData?.locations) return [];
    if (!isManager) return locationsData.locations;
    return locationsData.locations.filter((l) => String(l.countryId) === String(selectedCountry));
  }, [locationsData, selectedCountry, isManager]);

  const getRestaurantIdsForQuery = () => {
    if (!isManager) return String(user?.locationId);
    if (selectedBranch === "all") {
      const ids = locationsInCountry.map((l) => l.id).join(",");
      return ids || "NONE";
    }
    return String(selectedBranch);
  };

  const sedeActual = locationsData?.locations?.find(
    (l) => String(l.id) === String(isManager ? selectedBranch : user?.locationId)
  );
  const paisActual = countriesData?.countries?.find(
    (c) => String(c.id) === String(isManager ? selectedCountry : sedeActual?.countryId)
  );

  const selectedLocation = locationsData?.locations?.find(
    (l) => String(l.id) === String(selectedBranch)
  );

  const branchAdmin = usersData?.users?.find(
    (u) => String(u.locationId) === String(selectedBranch) && u.role === "admin"
  );

  const formatCurrency = (val) => {
    const locale = paisActual?.locale || "es-CO";
    const currency = paisActual?.currencyCode || "COP";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
      }).format(val || 0);
    } catch (e) {
      return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
      }).format(val || 0);
    }
  };

  const { data, loading, error } = useQuery(MONTHLY_REPORT, {
    variables: { 
      fromYear, 
      toYear,
      restaurant_id: getRestaurantIdsForQuery()
    },
    fetchPolicy: "cache-and-network",
  });

  const rows = useMemo(() => {
    const orders = data?.monthlyReport || [];
    const pos = data?.posMonthlyReport || [];

    const map = {};
    [...orders, ...pos].forEach((r) => {
      const key = `${r.year}-${r.month}`;
      if (!map[key]) {
        map[key] = {
          year: r.year,
          month: r.month,
          monthName: r.monthName,
          totalOrders: 0,
          totalRevenue: 0,
        };
      }
      map[key].totalOrders += r.totalOrders;
      map[key].totalRevenue += r.totalRevenue;
    });

    const combined = Object.values(map)
      .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))
      .map((r) => ({
        ...r,
        averageTicket: r.totalOrders > 0 ? r.totalRevenue / r.totalOrders : 0,
      }));

    return filterYear === "todos"
      ? combined
      : combined.filter((r) => r.year === parseInt(filterYear));
  }, [data, filterYear]);

  const totals = useMemo(() => {
    if (!rows.length)
      return { orders: 0, revenue: 0, avgTicket: 0, bestMonth: null };
    const totalOrders = rows.reduce((s, r) => s + r.totalOrders, 0);
    const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
    const bestMonth = rows.reduce(
      (best, r) => (r.totalRevenue > (best?.totalRevenue || 0) ? r : best),
      null,
    );
    return {
      orders: totalOrders,
      revenue: totalRevenue,
      avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      bestMonth,
    };
  }, [rows]);

  const availableYears = useMemo(() => {
    const allYears = [
      ...(data?.monthlyReport || []),
      ...(data?.posMonthlyReport || []),
    ].map((r) => r.year);
    return [...new Set(allYears)].sort((a, b) => b - a);
  }, [data]);

  let headerTitle = "📊 Reportes Mensuales";
  let headerSubtitle = "Ingresos y pedidos por período — Orders + POS";

  if (isAdmin) {
    headerTitle = `Sede administrada por ${user?.firstName} ${user?.lastName} - ${sedeActual?.name || ""}`;
  } else if (isManager) {
    const countryName = paisActual?.name || "Desconocido";
    if (selectedBranch === "all") {
      headerTitle = `Reporte General - País: ${countryName} (Consolidado de Sedes)`;
    } else {
      const adminName = branchAdmin ? `${branchAdmin.firstName} ${branchAdmin.lastName}` : "Sin administrador asignado";
      headerTitle = `País: ${countryName} | Sede administrada por ${adminName} - ${selectedLocation?.name || ""}`;
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f9fa",
        fontFamily: "'Google Sans', 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e8eaed",
          padding: "1.25rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "#1a1a2e",
            }}
          >
            {headerTitle}
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#5f6368" }}>
            {headerSubtitle}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {isManager && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 13, color: "#5f6368" }}>País:</label>
                <select
                  value={selectedCountry || ""}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value);
                    setSelectedBranch("all");
                  }}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #dadce0",
                    borderRadius: 8,
                    fontSize: 14,
                    background: "#fff",
                    color: "#1a1a2e",
                    cursor: "pointer",
                  }}
                >
                  {countriesData?.countries?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 13, color: "#5f6368" }}>Sede:</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #dadce0",
                    borderRadius: 8,
                    fontSize: 14,
                    background: "#fff",
                    color: "#1a1a2e",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">Todas las sedes (Consolidado)</option>
                  {locationsInCountry.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, color: "#5f6368" }}>Desde:</label>
            <select
              value={fromYear}
              onChange={(e) => setFromYear(parseInt(e.target.value))}
              style={{
                padding: "6px 12px",
                border: "1px solid #dadce0",
                borderRadius: 8,
                fontSize: 14,
                background: "#fff",
                color: "#1a1a2e",
                cursor: "pointer",
              }}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, color: "#5f6368" }}>Hasta:</label>
            <select
              value={toYear}
              onChange={(e) => setToYear(parseInt(e.target.value))}
              style={{
                padding: "6px 12px",
                border: "1px solid #dadce0",
                borderRadius: 8,
                fontSize: 14,
                background: "#fff",
                color: "#1a1a2e",
                cursor: "pointer",
              }}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => exportCSV(rows)}
            disabled={!rows.length}
            style={{
              padding: "7px 16px",
              background: rows.length ? "#1e8e3e" : "#ccc",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: rows.length ? "pointer" : "not-allowed",
            }}
          >
            ⬇ CSV
          </button>
          <button
            onClick={() => exportExcel(rows)}
            disabled={!rows.length}
            style={{
              padding: "7px 16px",
              background: rows.length ? "#1a73e8" : "#ccc",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: rows.length ? "pointer" : "not-allowed",
            }}
          >
            ⬇ Excel
          </button>
        </div>
      </div>

      <div style={{ padding: "1.5rem 2rem", maxWidth: 1200, margin: "0 auto" }}>
        {loading && (
          <div
            style={{ textAlign: "center", padding: "3rem", color: "#5f6368" }}
          >
            Cargando reporte...
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fce8e6",
              border: "1px solid #f5c6c3",
              borderRadius: 10,
              padding: "1rem 1.5rem",
              color: "#c5221f",
              marginBottom: 24,
            }}
          >
            ⚠️ Error al cargar el reporte: {error.message}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "#5f6368",
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #e8eaed",
            }}
          >
            No hay datos para el período seleccionado.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
                marginBottom: 28,
              }}
            >
              <StatCard
                label="Total Pedidos"
                value={totals.orders.toLocaleString()}
                sub="pedidos entregados"
                accent="blue"
              />
              <StatCard
                label="Ingresos Totales"
                value={formatCurrency(totals.revenue)}
                sub="suma de facturas"
                accent="green"
              />
              <StatCard
                label="Ticket Promedio"
                value={formatCurrency(totals.avgTicket)}
                sub="por pedido"
                accent="amber"
              />
              {totals.bestMonth && (
                <StatCard
                  label="Mejor Mes"
                  value={`${totals.bestMonth.monthName} ${totals.bestMonth.year}`}
                  sub={`${formatCurrency(totals.bestMonth.totalRevenue)} en ingresos`}
                  accent="purple"
                />
              )}
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #e8eaed",
                borderRadius: 12,
                padding: "1.5rem",
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#1a1a2e",
                  }}
                >
                  Ingresos por mes
                </h2>
                {availableYears.length > 0 && (
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    style={{
                      padding: "5px 10px",
                      border: "1px solid #dadce0",
                      borderRadius: 6,
                      fontSize: 13,
                      background: "#fff",
                      color: "#1a1a2e",
                      cursor: "pointer",
                    }}
                  >
                    <option value="todos">Todos los años</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <BarChart data={rows} />
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #e8eaed",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.5rem",
                  borderBottom: "1px solid #e8eaed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#1a1a2e",
                  }}
                >
                  Detalle mensual
                </h2>
                <span style={{ fontSize: 13, color: "#5f6368" }}>
                  {rows.length} meses
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 14,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f8f9fa" }}>
                      {[
                        "Año",
                        "Mes",
                        "Pedidos",
                        "Ingresos",
                        "Ticket Prom.",
                        "% del Total",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 16px",
                            textAlign:
                              h === "Año" || h === "Mes" ? "left" : "right",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#5f6368",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            borderBottom: "1px solid #e8eaed",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const pct =
                        totals.revenue > 0
                          ? (r.totalRevenue / totals.revenue) * 100
                          : 0;
                      const isBest =
                        totals.bestMonth &&
                        r.year === totals.bestMonth.year &&
                        r.month === totals.bestMonth.month;
                      return (
                        <tr
                          key={i}
                          style={{
                            background: isBest
                              ? "#e8f0fe"
                              : i % 2 === 0
                                ? "#fff"
                                : "#fafafa",
                            borderBottom: "1px solid #e8eaed",
                          }}
                        >
                          <td
                            style={{
                              padding: "11px 16px",
                              color: "#5f6368",
                              fontWeight: 500,
                            }}
                          >
                            {r.year}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              fontWeight: isBest ? 700 : 500,
                              color: "#1a1a2e",
                            }}
                          >
                            {r.monthName}
                            {isBest && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: 10,
                                  background: "#1a73e8",
                                  color: "#fff",
                                  padding: "2px 8px",
                                  borderRadius: 20,
                                  fontWeight: 600,
                                }}
                              >
                                MEJOR
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              textAlign: "right",
                              fontWeight: 600,
                              color: "#1a1a2e",
                            }}
                          >
                            {r.totalOrders.toLocaleString()}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: "#1e8e3e",
                            }}
                          >
                            {formatCurrency(r.totalRevenue)}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              textAlign: "right",
                              color: "#5f6368",
                            }}
                          >
                            {formatCurrency(r.averageTicket)}
                          </td>
                          <td
                            style={{ padding: "11px 16px", textAlign: "right" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 60,
                                  height: 6,
                                  background: "#e8eaed",
                                  borderRadius: 3,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    height: "100%",
                                    background: "#1a73e8",
                                    borderRadius: 3,
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "#5f6368",
                                  minWidth: 32,
                                  textAlign: "right",
                                }}
                              >
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        background: "#f8f9fa",
                        borderTop: "2px solid #e8eaed",
                      }}
                    >
                      <td
                        colSpan={2}
                        style={{
                          padding: "12px 16px",
                          fontWeight: 700,
                          color: "#1a1a2e",
                        }}
                      >
                        TOTAL
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#1a1a2e",
                        }}
                      >
                        {totals.orders.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#1e8e3e",
                        }}
                      >
                        $
                        {totals.revenue.toLocaleString("es-CO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#1a1a2e",
                        }}
                      >
                        ${totals.avgTicket.toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#1a1a2e",
                        }}
                      >
                        100%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
