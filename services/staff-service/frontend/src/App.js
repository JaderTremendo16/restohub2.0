import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from "html5-qrcode";

function App() {
    const [employees, setEmployees] = useState([]);
    const [activeStaff, setActiveStaff] = useState([]);
    const [workHistory, setWorkHistory] = useState([]);
    const [name, setName] = useState('');
    const [country, setCountry] = useState('Colombia');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    const fetchData = async () => {
        try {
            const resEmp = await fetch('http://127.0.0.1:8000/employees');
            setEmployees(await resEmp.json());
            const resActive = await fetch('http://127.0.0.1:8000/attendance/active');
            setActiveStaff(await resActive.json());
            const resHistory = await fetch('http://127.0.0.1:8000/history');
            const histData = await resHistory.json();
            setWorkHistory(Array.isArray(histData) ? histData : []);
        } catch (e) { console.error("Error cargando datos"); }
    };

    const handleCreate = async () => {
        if (!name.trim()) return alert("El nombre es obligatorio.");
        if (!phone.trim()) return alert("El telefono es obligatorio.");
        if (!email.trim()) return alert("El correo es obligatorio.");
        if (!/^\d{7,15}$/.test(phone)) return alert("El telefono debe tener entre 7 y 15 digitos numericos.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert("El correo no tiene un formato valido. Ej: nombre@correo.com");

        await fetch(
            `http://127.0.0.1:8000/employees/create?name=${encodeURIComponent(name)}&country=${encodeURIComponent(country)}&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}`,
            { method: 'POST' }
        );
        setName('');
        setPhone('');
        setEmail('');
        fetchData();
    };

    const toggleStatus = async (id) => {
        await fetch(`http://127.0.0.1:8000/employees/toggle/${id}`, { method: 'PUT' });
        fetchData();
    };

    useEffect(() => {
        fetchData();
        const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        scanner.render(async (decodedText) => {
            const id = decodedText.split("_").pop();
            const res = await fetch(`http://127.0.0.1:8000/attendance/scan/${id}`, { method: 'POST' });
            const result = await res.json();
            alert(result.status + (result.hours ? ` - Horas: ${result.hours}` + (result.overtime > 0 ? ` (${result.overtime}h EXTRAS)` : '') : ""));
            fetchData();
        }, () => { });

        return () => scanner.clear();
    }, []);

    // Formatear fecha "YYYY-MM-DD" a "DD/MM/YYYY"
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <div style={{ padding: '30px', backgroundColor: '#1a202c', color: 'white', minHeight: '100vh', fontFamily: 'Arial' }}>
            <h1 style={{ color: '#63b3ed' }}>RestoHub: Staff Service (Panel Unificado)</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>

                {/* BLOQUE 1: CAMARA Y CONTROL EN VIVO */}
                <div style={{ background: '#2d3748', padding: '20px', borderRadius: '15px' }}>
                    <h3>Control de Asistencia (Escanear QR)</h3>
                    <div id="reader" style={{ width: '100%', background: 'white', marginBottom: '20px' }}></div>
                    <h4>Empleados en Servicio Ahora</h4>
                    {activeStaff.length === 0 ? <p>Nadie trabajando.</p> : (
                        <ul>
                            {activeStaff.map((st, i) => (
                                <li key={i}>{st.name} - Entro: {st.start} ({st.current_hours}h transcurridas)</li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* BLOQUE 2: CREACION DE EMPLEADOS */}
                <div style={{ background: '#2d3748', padding: '20px', borderRadius: '15px' }}>
                    <h3>Registrar Nuevo Empleado</h3>

                    <input
                        style={{ padding: '10px', marginBottom: '10px', width: '90%', display: 'block' }}
                        placeholder="Nombre Completo *"
                        value={name}
                        maxLength={80}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <input
                        style={{ padding: '10px', marginBottom: '10px', width: '90%', display: 'block' }}
                        placeholder="Numero de Telefono * (7-15 digitos)"
                        value={phone}
                        maxLength={15}
                        inputMode="numeric"
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    />

                    <input
                        style={{ padding: '10px', marginBottom: '10px', width: '90%', display: 'block' }}
                        placeholder="Correo Electronico * (ej: nombre@correo.com)"
                        type="email"
                        value={email}
                        maxLength={100}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <select
                        style={{ padding: '10px', width: '95%', marginBottom: '10px', display: 'block' }}
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                    >
                        <option value="Colombia">Colombia</option>
                        <option value="Mexico">Mexico</option>
                        <option value="Espana">Espana</option>
                    </select>

                    <button
                        onClick={handleCreate}
                        style={{ width: '95%', padding: '10px', background: '#3182ce', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
                    >
                        Guardar Empleado
                    </button>
                </div>
            </div>

            {/* BLOQUE 3: LISTA GENERAL Y QRS */}
            <h3 style={{ marginTop: '40px' }}>Listado de Personal y QRs Fijos</h3>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {employees.map(emp => (
                    <div key={emp.id} style={{ background: 'white', color: 'black', padding: '15px', borderRadius: '10px', textAlign: 'center', width: '200px' }}>
                        <h4 style={{ margin: 0 }}>{emp.name}</h4>
                        <p style={{ fontSize: '12px', margin: '4px 0' }}>{emp.country} (8h)</p>
                        {emp.phone && <p style={{ fontSize: '11px', margin: '2px 0', color: '#555' }}>{emp.phone}</p>}
                        {emp.email && <p style={{ fontSize: '11px', margin: '2px 0', color: '#555', wordBreak: 'break-all' }}>{emp.email}</p>}
                        <img src={`data:image/png;base64,${emp.qr_code}`} alt="QR" width="120" />
                        <div style={{ margin: '10px 0', fontWeight: 'bold', color: emp.active ? 'green' : 'red' }}>
                            {emp.active ? 'ACTIVO' : 'INACTIVO'}
                        </div>
                        <button onClick={() => toggleStatus(emp.id)} style={{ fontSize: '10px', cursor: 'pointer' }}>
                            {emp.active ? 'Desactivar' : 'Activar'}
                        </button>
                    </div>
                ))}
            </div>

            {/* ================================================================ */}
            {/* BLOQUE 4: HISTORIAL DE TURNOS                                    */}
            {/* ================================================================ */}
            <h3 style={{ marginTop: '50px', color: '#63b3ed', borderBottom: '2px solid #4a5568', paddingBottom: '10px' }}>
                📋 Historial de Turnos Trabajados
            </h3>

            {workHistory.length === 0 ? (
                <p style={{ color: '#a0aec0', fontStyle: 'italic' }}>
                    Aún no hay turnos registrados. Los turnos aparecerán aquí al hacer check-out.
                </p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        background: '#2d3748',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        fontSize: '14px',
                    }}>
                        <thead>
                            <tr style={{ background: '#4a5568', textAlign: 'left' }}>
                                <th style={{ padding: '12px 16px' }}>#</th>
                                <th style={{ padding: '12px 16px' }}>Empleado</th>
                                <th style={{ padding: '12px 16px' }}>Fecha</th>
                                <th style={{ padding: '12px 16px' }}>Entrada</th>
                                <th style={{ padding: '12px 16px' }}>Salida</th>
                                <th style={{ padding: '12px 16px' }}>Horas Trabajadas</th>
                                <th style={{ padding: '12px 16px' }}>Horas Extras</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workHistory.map((shift, index) => {
                                const hasOvertime = shift.overtime_hours > 0;
                                return (
                                    <tr
                                        key={shift.id}
                                        style={{
                                            borderTop: '1px solid #4a5568',
                                            background: hasOvertime
                                                ? 'rgba(236, 153, 75, 0.08)'   // fondo suave naranja si hay extras
                                                : index % 2 === 0 ? '#2d3748' : '#323d4f',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        {/* ID del turno */}
                                        <td style={{ padding: '12px 16px', color: '#718096' }}>
                                            {shift.id}
                                        </td>

                                        {/* Nombre del empleado */}
                                        <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#e2e8f0' }}>
                                            {shift.emp_name}
                                        </td>

                                        {/* Fecha formateada */}
                                        <td style={{ padding: '12px 16px', color: '#a0aec0' }}>
                                            {formatDate(shift.date)}
                                        </td>

                                        {/* Hora de entrada */}
                                        <td style={{ padding: '12px 16px', color: '#68d391' }}>
                                            🟢 {shift.start_time}
                                        </td>

                                        {/* Hora de salida */}
                                        <td style={{ padding: '12px 16px', color: '#fc8181' }}>
                                            🔴 {shift.end_time}
                                        </td>

                                        {/* Total de horas */}
                                        <td style={{ padding: '12px 16px', color: '#63b3ed', fontWeight: 'bold' }}>
                                            {shift.hours_worked}h
                                        </td>

                                        {/* Horas extras con badge */}
                                        <td style={{ padding: '12px 16px' }}>
                                            {hasOvertime ? (
                                                <span style={{
                                                    background: '#dd6b20',
                                                    color: 'white',
                                                    padding: '3px 10px',
                                                    borderRadius: '999px',
                                                    fontWeight: 'bold',
                                                    fontSize: '12px',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    ⚡ +{shift.overtime_hours}h extras
                                                </span>
                                            ) : (
                                                <span style={{ color: '#718096', fontSize: '12px' }}>
                                                    — Sin extras
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>

                        {/* PIE DE TABLA: resumen rápido */}
                        <tfoot>
                            <tr style={{ background: '#4a5568', fontWeight: 'bold' }}>
                                <td colSpan={5} style={{ padding: '12px 16px', color: '#a0aec0' }}>
                                    Total de turnos registrados: {workHistory.length}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#63b3ed' }}>
                                    {workHistory.reduce((sum, s) => sum + s.hours_worked, 0).toFixed(2)}h
                                </td>
                                <td style={{ padding: '12px 16px', color: '#ed8936' }}>
                                    ⚡ {workHistory.reduce((sum, s) => sum + s.overtime_hours, 0).toFixed(2)}h extras
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}

export default App;