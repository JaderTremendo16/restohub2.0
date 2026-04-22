import { useMutation, gql } from "@apollo/client";
import { useState } from "react";

// 1. Definimos la mutación GraphQL según tu schema.js
const CHECK_IN_OUT = gql`
  mutation CheckInOut($qrCode: String!) {
    checkInOut(qr_code: $qrCode) {
      id
      name
      status # 'in' o 'out'
    }
  }
`;

export const useAttendance = () => {
  const [scanResult, setScanResult] = useState(null);

  // 2. Configuramos la mutación con Apollo Client
  const [performCheckInOut, { loading, error }] = useMutation(CHECK_IN_OUT, {
    onCompleted: (data) => {
      // Lógica al completar con éxito
      const { name, status } = data.checkInOut;
      setScanResult({
        type: "success",
        message: `${name} ha marcado ${status === "in" ? "ENTRADA" : "SALIDA"} correctamente.`,
      });
      // Sugerencia: Aquí podrías disparar un refetch de la query de 'activeStaff'
    },
    onError: (err) => {
      // Lógica si hay un error (QR inválido, etc.)
      setScanResult({
        type: "error",
        message: err.message || "Error al procesar el código QR.",
      });
    },
  });

  // 3. Esta función se llamará cuando el escáner detecte un código
  const handleScanSuccess = (decodedText) => {
    if (!loading) {
      // Evitamos envíos duplicados mientras carga
      setScanResult(null); // Limpiamos resultado previo
      performCheckInOut({ variables: { qrCode: decodedText } });
    }
  };

  return {
    handleScanSuccess,
    scanResult,
    isLoading: loading,
    error,
  };
};
