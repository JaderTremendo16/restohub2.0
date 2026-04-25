import React from "react";
import { useQuery } from "@apollo/client/react";
import { GET_CLOUDINARY_IMAGES } from "../graphql/menu";

export default function CloudinaryGallery({ onClose, onSelect }) {
  const { data, loading, error } = useQuery(GET_CLOUDINARY_IMAGES, {
    fetchPolicy: "network-only",
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "1.5rem",
          width: "100%",
          maxWidth: "800px",
          height: "80vh",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            borderBottom: "1px solid #f1f5f9",
            paddingBottom: "1rem",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: "800",
              color: "#1e293b",
            }}
          >
            Galería de Imágenes Cloudinary
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: "0.5rem" }}>
          {loading && <p>Cargando imágenes...</p>}
          {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
          {!loading && !error && data?.cloudinaryImages?.length === 0 && (
            <p>No hay imágenes subidas aún.</p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "1rem",
            }}
          >
            {data?.cloudinaryImages?.map((img) => (
              <div
                key={img.public_id}
                onClick={() => onSelect(img.secure_url)}
                style={{
                  cursor: "pointer",
                  borderRadius: "1rem",
                  overflow: "hidden",
                  border: "2px solid transparent",
                  transition: "transform 0.2s, border-color 0.2s",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.borderColor = "#ea580c";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <img
                  src={img.secure_url}
                  alt={img.public_id}
                  style={{
                    width: "100%",
                    height: "150px",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
