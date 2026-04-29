// Props que recibe este componente:
// - title: el texto descriptivo ("Stock crítico")
// - value: el número a mostrar (5)
// - icon: emoji o símbolo ("⚠️")
// - color: color del acento ("naranja", "rojo", "verde")

function StatCard({
  title,
  value,
  icon: Icon,
  color = "#ea580c",
  loading = false,
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "1rem",
        padding: "1.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        flex: 1,
      }}
    >
      {/* Ícono con fondo de color */}
      <div
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "0.75rem",
          backgroundColor: `${color}18`, // 18 en hex = 10% de opacidad
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
          flexShrink: 0,
        }}
      >
        {typeof Icon === "function" ||
        (typeof Icon === "object" && Icon !== null) ? (
          <Icon size={24} strokeWidth={2.5} />
        ) : (
          <span style={{ fontSize: "1.5rem" }}>{Icon}</span>
        )}
      </div>

      {/* Texto */}
      <div>
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: "#6b7280",
            fontWeight: "500",
          }}
        >
          {title}
        </p>

        {/* Si está cargando mostramos un bloque gris animado */}
        {loading ? (
          <div
            style={{
              width: "3rem",
              height: "1.75rem",
              backgroundColor: "#e5e7eb",
              borderRadius: "0.25rem",
              marginTop: "0.25rem",
              animation: "pulse 1.5s infinite",
            }}
          />
        ) : (
          <p
            style={{
              margin: "0.25rem 0 0 0",
              fontSize: "1.75rem",
              fontWeight: "700",
              color: "#1a1a2e",
              lineHeight: 1,
            }}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

export default StatCard;
