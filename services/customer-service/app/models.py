import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, Boolean, Float
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    """
    Tabla principal de usuarios del sistema.
    El campo `role` determina si el usuario ve el panel de Admin o el de Cliente.
    El campo `auth0_id` es un identificador único simulado (formato: local|email).
    """
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    auth0_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="customer")  # admin | customer
    password_hash: Mapped[str] = mapped_column(String(200))
    preferences: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str] = mapped_column(String(50), default="Colombia")
    city: Mapped[str | None] = mapped_column(String(50), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Order(Base):
    """
    Historial de pedidos de los clientes.
    """
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    customer_id: Mapped[str] = mapped_column(String(36), index=True)
    items: Mapped[str] = mapped_column(Text)  # JSON-string format
    total_price: Mapped[float] = mapped_column(Float, default=0.0)
    branch: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Rating(Base):
    """
    Reseñas y calificaciones de platos por parte de los clientes.
    El administrador las consulta para analítica.
    """
    __tablename__ = "ratings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    customer_id: Mapped[str] = mapped_column(String(36), index=True)  # FK lógica a users.id
    item_name: Mapped[str] = mapped_column(String(100))
    stars: Mapped[int] = mapped_column(Integer)  # 1-5
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Dish(Base):
    """
    Catálogo de platos del menú.
    Permite al administrador activar/desactivar opciones.
    """
    __tablename__ = "dishes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Float)
    emoji: Mapped[str] = mapped_column(String(10))
    category: Mapped[str] = mapped_column(String(50)) # Entradas, Platos Fuertes, Bebidas
    branch: Mapped[str | None] = mapped_column(String(50), nullable=True) # Si es null, disponible en todas
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
