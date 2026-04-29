import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, Boolean, Float
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class LoyaltyAccount(Base):
    """
    Cuenta de lealtad de un cliente.
    customer_id referencia lógicamente a users.id del customer-service
    (no FK física — bases de datos independientes por diseño de microservicios).
    El tier se recalcula automáticamente cada vez que cambian los puntos.
    """
    __tablename__ = "loyalty_accounts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    customer_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    tier: Mapped[str] = mapped_column(String(20), default="bronze")  # bronze|silver|gold|platinum
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PointHistory(Base):
    """
    Auditoría de cada movimiento de puntos (earn/redeem).
    Vital para resolver disputas y mostrar el historial al cliente.
    """
    __tablename__ = "point_history"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    loyalty_account_id: Mapped[str] = mapped_column(String(36), index=True)
    action_type: Mapped[str] = mapped_column(String(20))  # earn | redeem
    points: Mapped[int] = mapped_column(Integer)           # positivo (earn) o negativo (redeem)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Promotion(Base):
    """
    Promociones creadas por el administrador (ej. '2x1 los martes', '15% descuento').
    El cliente las ve en su panel. El admin las activa/desactiva.
    """
    __tablename__ = "promotions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    discount_percent: Mapped[float] = mapped_column(Float, default=0.0)
    branch: Mapped[str | None] = mapped_column(String(50), nullable=True) # null = global
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Reward(Base):
    """
    Catálogo de premios canjeables con puntos (ej. 'Hamburguesa gratis — 200 pts').
    El admin crea los premios; el cliente los canjea vía redeemPoints mutation.
    """
    __tablename__ = "rewards"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    points_cost: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
