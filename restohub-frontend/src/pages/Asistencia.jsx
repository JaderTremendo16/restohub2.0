import QRScanner from "../components/QRScanner";
import { useAttendance } from "../hooks/useAttendance";

const Asistencia = () => {
  const { handleScanSuccess, scanResult, isLoading } = useAttendance();

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Módulo de Asistencia</h1>
        <p className="text-gray-600 mt-2">Escanea tu código QR para marcar entrada o salida.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna del Escáner */}
        <div className="lg:col-span-1">
          <QRScanner 
            onScanSuccess={handleScanSuccess} 
            isLoading={isLoading} 
          />
        </div>

        {/* Columna de Resultados y Feedback */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Último Escaneo</h3>
          
          {!scanResult && !isLoading && (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p className="mt-4">Esperando escaneo de código QR...</p>
            </div>
          )}

          {scanResult && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              scanResult.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {/* Icono condicional (Check o X) */}
              <span className={`text-2xl ${scanResult.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {scanResult.type === 'success' ? '✓' : '✕'}
              </span>
              <div>
                <p className={`font-semibold ${scanResult.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {scanResult.type === 'success' ? 'Marcación Exitosa' : 'Error de Marcación'}
                </p>
                <p className={`text-sm ${scanResult.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                  {scanResult.message}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Asistencia;