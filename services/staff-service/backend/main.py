from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, timezone
import qrcode
import io
import base64

# --- CONFIGURACIÓN DE LA BASE DE DATOS (SQLite) ---
DATABASE_URL = "sqlite:///./restohub.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# --- MODELO DE BASE DE DATOS ---
class EmployeeDB(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    location = Column(Integer, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    base_hours = Column(Integer, default=8)
    qr_code = Column(String, nullable=False)


# --- NUEVO MODELO: HISTORIAL DE TURNOS ---
class WorkShift(Base):
    __tablename__ = "work_shifts"
    id = Column(Integer, primary_key=True, index=True)
    emp_id = Column(Integer, nullable=False)
    emp_name = Column(String, nullable=False)
    location_id = Column(Integer, nullable=False)
    date = Column(String, nullable=False)  # Fecha: "YYYY-MM-DD"
    start_time = Column(String, nullable=False)  # Hora inicio: "HH:MM:SS"
    end_time = Column(String, nullable=False)  # Hora fin: "HH:MM:SS"
    hours_worked = Column(Float, nullable=False)
    base_hours = Column(Integer, default=8)
    overtime_hours = Column(Float, default=0.0)  # Horas extras (>= 0)


# Crear las tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RestoHub Staff Service")

# CONFIGURACIÓN DE CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- BASE DE DATOS TEMPORAL EN MEMORIA solo para turnos activos ---
attendance = {}  # {emp_id: hora_inicio}


# --- DEPENDENCIA DE SESIÓN ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- HELPER: Convertir objeto DB a dict ---
def emp_to_dict(e: EmployeeDB) -> dict:
    return {
        "id": e.id,
        "name": e.name,
        "country": e.country,
        "location_id": e.location,
        "phone": e.phone,
        "email": e.email,
        "active": e.active,
        "base_hours": e.base_hours,
        "qr_code": e.qr_code,
    }


# --- RUTAS DE GESTIÓN DE EMPLEADOS ---


@app.get("/employees")
def get_all_employees(location_id: int = None, db: Session = Depends(get_db)):
    """Retorna la lista completa de empleados (Activos e Inactivos)"""
    query = db.query(EmployeeDB)
    if location_id:
        query = query.filter(EmployeeDB.location == location_id)
    employees = query.all()
    return [emp_to_dict(e) for e in employees]


@app.post("/employees/create")
def create_employee(
    name: str,
    country: str,
    location_id: int = None,
    phone: str = None,
    email: str = None,
    db: Session = Depends(get_db),
):
    """Crea un empleado, genera su QR fijo y asigna las 8h por defecto"""
    last = db.query(EmployeeDB).order_by(EmployeeDB.id.desc()).first()
    new_id = (last.id + 1) if last else 1

    qr_content = f"STAFF_ID_{new_id}"
    img = qrcode.make(qr_content)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    new_emp = EmployeeDB(
        id=new_id,
        name=name,
        country=country,
        location=location_id,
        phone=phone,
        email=email,
        active=True,
        base_hours=8,
        qr_code=qr_b64,
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    return emp_to_dict(new_emp)


@app.put("/employees/toggle/{emp_id}")
def toggle_employee_status(emp_id: int, db: Session = Depends(get_db)):
    """Activa o desactiva (despido) a un empleado"""
    emp = db.query(EmployeeDB).filter(EmployeeDB.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    emp.active = not emp.active
    db.commit()
    db.refresh(emp)
    return emp_to_dict(emp)


# --- RUTAS DE ASISTENCIA Y CÁMARA ---

@app.post("/attendance/scan/{emp_id}")
def scan_attendance(emp_id: int, db: Session = Depends(get_db)):
    """Lógica de la cámara: Si no está trabajando inicia turno, si ya está finaliza"""
    # Siempre usamos UTC con zona horaria explícita
    now = datetime.now(timezone.utc)

    emp = db.query(EmployeeDB).filter(EmployeeDB.id == emp_id).first()
    if not emp or not emp.active:
        raise HTTPException(status_code=400, detail="Empleado no encontrado o inactivo")

    # Check-out: cerrar turno
    if emp_id in attendance:
        start_time = attendance.pop(emp_id)
        
        # Ambos son 'aware' (con zona horaria), la resta funcionará
        duration = now - start_time
        hours_worked = round(duration.total_seconds() / 3600, 2)

        overtime = round(max(0.0, hours_worked - emp.base_hours), 2)

        shift = WorkShift(
            emp_id=emp.id,
            emp_name=emp.name,
            location_id=emp.location,
            date=start_time.strftime("%Y-%m-%d"),
            start_time=start_time.strftime("%H:%M:%S"),
            end_time=now.strftime("%H:%M:%S"),
            hours_worked=hours_worked,
            base_hours=emp.base_hours,
            overtime_hours=overtime,
        )
        db.add(shift)
        db.commit()

        return {
            "status": "Turno Finalizado",
            "employee": emp.name,
            "hours": hours_worked,
            "overtime": overtime,
            "message": f"Jornada completada: {hours_worked} horas."
            + (f" ¡{overtime}h extras!" if overtime > 0 else ""),
        }

    # Check-in: abrir turno
    else:
        attendance[emp_id] = now  # Se guarda con info de zona horaria
        return {
            "status": "Turno Iniciado",
            "employee": emp.name,
            "time": now.isoformat(),
            "message": "Entrada registrada exitosamente.",
        }


@app.get("/attendance/active")
def get_active_staff(db: Session = Depends(get_db)):
    """Retorna la lista de empleados que están trabajando actualmente"""
    active_list = []
    # CORRECCIÓN AQUÍ: Agregamos timezone.utc para que coincida con lo guardado
    now = datetime.now(timezone.utc)

    for emp_id, start_time in attendance.items():
        emp = db.query(EmployeeDB).filter(EmployeeDB.id == emp_id).first()
        if emp:
            # Ahora ambos tienen zona horaria, la resta no dará error
            duration = now - start_time
            hours_so_far = round(duration.total_seconds() / 3600, 2)
            
            active_list.append(
                {
                    "id": emp_id,
                    "name": emp.name,
                    # Enviamos el timestamp en milisegundos para que React lo entienda fácil
                    "start": start_time.isoformat(),
                    "current_hours": hours_so_far,
                }
            )
    return active_list


# --- NUEVA RUTA: HISTORIAL DE TURNOS ---

@app.get("/history")
# AGREGAMOS location_id: int = None para que FastAPI lo reconozca
def get_work_history(location_id: int = None, db: Session = Depends(get_db)):
    """Retorna el historial filtrado por sede si se recibe el ID"""
    
    # Iniciamos la consulta
    query = db.query(WorkShift)
    
    # AHORA SÍ: location_id ya existe en este contexto
    if location_id is not None:
        query = query.filter(WorkShift.location_id == location_id)
        
    shifts = query.order_by(WorkShift.id.desc()).all()
    
    return [
        {
            "id": s.id,
            "emp_id": s.emp_id,
            "emp_name": s.emp_name,
            "location_id": s.location_id,
            "date": s.date,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "hours_worked": s.hours_worked,
            "base_hours": s.base_hours,
            "overtime_hours": s.overtime_hours,
        }
        for s in shifts
    ]


# --- RUTA DE PREDICCIÓN (DEMANDA) ---
@app.get("/alerts/demand")
def get_demand_prediction():
    """Simulación de integración con Order Service para alertas de personal"""
    return {
        "status": "Alerta",
        "message": "Se prevé alta demanda por evento local. Se recomienda activar más personal en Colombia.",
        "level": "Alta",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
