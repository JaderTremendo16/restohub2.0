from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, timezone
import qrcode
import io
import base64
import bcrypt

# --- CONFIGURACIÓN DE LA BASE DE DATOS (SQLite) ---
DATABASE_URL = "sqlite:///./restohub.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Funciones de seguridad manuales con bcrypt
def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8')[:72], hashed_password.encode('utf-8'))
    except:
        return False

# --- MODELO DE BASE DE DATOS ---
class EmployeeDB(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    location = Column(Integer, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    on_shift = Column(Boolean, default=False)
    base_hours = Column(Integer, default=8)
    qr_code = Column(String, nullable=False)
    role = Column(String, nullable=False, default="cajero")
    password = Column(String, nullable=True)

class WorkShift(Base):
    __tablename__ = "work_shifts"
    id = Column(Integer, primary_key=True, index=True)
    emp_id = Column(Integer, nullable=False)
    emp_name = Column(String, nullable=False)
    location_id = Column(Integer, nullable=False)
    date = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    hours_worked = Column(Float, nullable=False)
    base_hours = Column(Integer, default=8)
    overtime_hours = Column(Float, default=0.0)
    role = Column(String, nullable=True)

# Crear las tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RestoHub Staff Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

attendance = {}

def emp_to_dict(e: EmployeeDB) -> dict:
    return {
        "id": e.id,
        "name": e.name,
        "country": e.country,
        "location_id": e.location,
        "phone": e.phone,
        "email": e.email,
        "active": e.active,
        "on_shift": e.on_shift,
        "base_hours": e.base_hours,
        "qr_code": e.qr_code,
        "role": e.role if e.role else "cajero",
    }

@app.get("/employees")
def get_all_employees(location_id: int = None, db: Session = Depends(get_db)):
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
    password: str = None,
    role: str = "cajero",
    db: Session = Depends(get_db),
):
    if role not in ("cajero", "cocinero"):
        raise HTTPException(status_code=400, detail="Rol inválido.")

    hashed_password = None
    if password:
        try:
            hashed_password = hash_password(password)
        except Exception as e:
            print(f"Error hashing: {e}")
            raise HTTPException(status_code=500, detail="Error de seguridad.")

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
        role=role,
        password=hashed_password
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    return emp_to_dict(new_emp)

@app.put("/employees/toggle/{emp_id}")
def toggle_employee_status(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(EmployeeDB).filter(EmployeeDB.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="No encontrado")
    
    # NUEVA REGLA: No se puede desactivar si está en turno
    if emp.active and emp.on_shift:
        raise HTTPException(
            status_code=400, 
            detail="No se puede desactivar al empleado mientras su turno esté activo. Debe finalizar el turno primero."
        )

    emp.active = not emp.active
    db.commit()
    db.refresh(emp)
    return emp_to_dict(emp)

@app.post("/login")
def login_staff(email: str, password: str, db: Session = Depends(get_db)):
    emp = db.query(EmployeeDB).filter(EmployeeDB.email == email).first()
    if not emp or not emp.password:
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")
    
    print(f"LOGIN ATTEMPT: {emp.name} | Active: {emp.active} | OnShift: {emp.on_shift}")

    if not emp.active:
        raise HTTPException(status_code=403, detail="Tu usuario ha sido desactivado por el administrador.")

    if not emp.on_shift:
        raise HTTPException(status_code=403, detail="Tu turno no ha iniciado. Escanea el QR de asistencia para entrar.")

    if not verify_password(password, emp.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")
    
    return {
        "id": emp.id,
        "name": emp.name,
        "role": emp.role,
        "location_id": emp.location,
        "email": emp.email
    }

@app.post("/attendance/scan/{emp_id}")
def scan_attendance(emp_id: int, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    emp = db.query(EmployeeDB).filter(EmployeeDB.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    if not emp.active:
        raise HTTPException(status_code=403, detail="Tu usuario está desactivado por el administrador.")

    if emp.on_shift:
        # Finalizar turno
        start_time = attendance.pop(emp_id, None)
        if not start_time:
             # Si no estaba en memoria (reinicio), usamos una hora estimada o error
             # Por simplicidad, asumimos 8 horas si se reinició el servidor
             start_time = now
        
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
            role=emp.role
        )
        db.add(shift)
        emp.on_shift = False
        db.commit()
        return {"status": "Turno Finalizado", "employee": emp.name, "hours": hours_worked}
    else:
        # Iniciar turno
        attendance[emp_id] = now
        emp.on_shift = True
        db.commit()
        return {"status": "Turno Iniciado", "employee": emp.name, "time": now.isoformat()}

@app.get("/attendance/active")
def get_active_staff(location_id: int = None, db: Session = Depends(get_db)):
    active_list = []
    now = datetime.now(timezone.utc)
    for emp_id, start_time in attendance.items():
        emp = db.query(EmployeeDB).filter(EmployeeDB.id == emp_id).first()
        if emp and (not location_id or emp.location == location_id):
            duration = now - start_time
            active_list.append({"id": emp_id, "name": emp.name, "start": start_time.isoformat(), "current_hours": round(duration.total_seconds() / 3600, 2)})
    return active_list

@app.get("/history")
def get_work_history(location_id: int = None, db: Session = Depends(get_db)):
    query = db.query(WorkShift)
    if location_id is not None:
        query = query.filter(WorkShift.location_id == location_id)
    shifts = query.order_by(WorkShift.id.desc()).all()
    return [
        {
            "id": s.id, "emp_id": s.emp_id, "emp_name": s.emp_name, "location_id": s.location_id,
            "date": s.date, "start_time": s.start_time, "end_time": s.end_time,
            "hours_worked": s.hours_worked, "base_hours": s.base_hours,
            "overtime_hours": s.overtime_hours, "role": s.role
        }
        for s in shifts
    ]

@app.get("/alerts/demand")
def get_demand_prediction():
    return {"status": "Alerta", "message": "Alta demanda prevista."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
