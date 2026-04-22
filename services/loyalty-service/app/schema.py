import uuid
from typing import Optional, List

import strawberry
from strawberry.federation import Schema

from app.database import SessionLocal
from app.models import LoyaltyAccount, PointHistory, Promotion, Reward
from app.events.publisher import publish_event


# ─── Types ─────────────────────────────────────────────────────────────────

@strawberry.type
class LoyaltyAccountType:
    id: strawberry.ID
    customer_id: str
    total_points: int
    tier: str
    created_at: str


@strawberry.type
class PointHistoryType:
    id: strawberry.ID
    loyalty_account_id: str
    action_type: str   # earn | redeem
    points: int
    description: Optional[str]
    created_at: str


@strawberry.type
class PromotionType:
    id: strawberry.ID
    title: str
    description: Optional[str]
    discount_percent: float
    branch: Optional[str]
    is_active: bool
    created_at: str


@strawberry.type
class RewardType:
    id: strawberry.ID
    name: str
    description: Optional[str]
    points_cost: int
    is_active: bool
    stock: int
    created_at: str


@strawberry.type
class RedeemResult:
    success: bool
    message: str
    remaining_points: int


# ─── Federation: extiende el tipo User de customer-service ─────────────────

@strawberry.federation.type(keys=["id"], extend=True)
class UserType:
    """
    Extensión federada del tipo User definido en customer-service.
    Añade el campo 'loyalty' que el Gateway puede resolver en una sola query.
    """
    id: strawberry.ID = strawberry.federation.field(external=True)

    @classmethod
    def resolve_reference(cls, id: strawberry.ID) -> "UserType":
        """
        Apollo Gateway llama este método cuando necesita resolver
        el campo 'loyalty' para un User que vino de customer-service.
        """
        return cls(id=id)

    @strawberry.field
    def loyalty(self) -> Optional[LoyaltyAccountType]:
        db = SessionLocal()
        acc = db.query(LoyaltyAccount).filter(
            LoyaltyAccount.customer_id == str(self.id)
        ).first()
        db.close()
        return _map_account(acc) if acc else None


# ─── Helpers ───────────────────────────────────────────────────────────────

def _compute_tier(points: int) -> str:
    if points >= 1000:
        return "platinum"
    elif points >= 500:
        return "gold"
    elif points >= 100:
        return "silver"
    return "bronze"


def _map_account(a: LoyaltyAccount) -> LoyaltyAccountType:
    return LoyaltyAccountType(
        id=strawberry.ID(a.id),
        customer_id=a.customer_id,
        total_points=a.total_points,
        tier=a.tier,
        created_at=a.created_at.isoformat(),
    )


def _map_history(h: PointHistory) -> PointHistoryType:
    return PointHistoryType(
        id=strawberry.ID(h.id),
        loyalty_account_id=h.loyalty_account_id,
        action_type=h.action_type,
        points=h.points,
        description=h.description,
        created_at=h.created_at.isoformat(),
    )


def _map_promotion(p: Promotion) -> PromotionType:
    return PromotionType(
        id=strawberry.ID(p.id),
        title=p.title,
        description=p.description,
        discount_percent=p.discount_percent,
        branch=p.branch,
        is_active=p.is_active,
        created_at=p.created_at.isoformat(),
    )


def _map_reward(r: Reward) -> RewardType:
    return RewardType(
        id=strawberry.ID(r.id),
        name=r.name,
        description=r.description,
        points_cost=r.points_cost,
        is_active=r.is_active,
        stock=r.stock,
        created_at=r.created_at.isoformat(),
    )


# ─── Queries ───────────────────────────────────────────────────────────────

@strawberry.type
class Query:
    @strawberry.field
    def loyalty_account(self, customer_id: str) -> Optional[LoyaltyAccountType]:
        """Cuenta de lealtad de un cliente específico."""
        db = SessionLocal()
        acc = db.query(LoyaltyAccount).filter(
            LoyaltyAccount.customer_id == customer_id
        ).first()
        db.close()
        return _map_account(acc) if acc else None

    @strawberry.field
    def all_loyalty_accounts(self) -> List[LoyaltyAccountType]:
        """Todas las cuentas de lealtad (uso admin)."""
        db = SessionLocal()
        result = [_map_account(a) for a in db.query(LoyaltyAccount).all()]
        db.close()
        return result

    @strawberry.field
    def point_history(self, customer_id: str) -> List[PointHistoryType]:
        """Historial de movimientos de puntos de un cliente (más reciente primero)."""
        db = SessionLocal()
        acc = db.query(LoyaltyAccount).filter(
            LoyaltyAccount.customer_id == customer_id
        ).first()
        if not acc:
            db.close()
            return []
        history = (
            db.query(PointHistory)
            .filter(PointHistory.loyalty_account_id == acc.id)
            .order_by(PointHistory.created_at.desc())
            .all()
        )
        result = [_map_history(h) for h in history]
        db.close()
        return result

    @strawberry.field
    def promotions(self, active_only: bool = False, branch: Optional[str] = None) -> List[PromotionType]:
        """Lista de promociones. active_only=true filtra solo las activas."""
        db = SessionLocal()
        q = db.query(Promotion)
        if active_only:
            q = q.filter(Promotion.is_active == True)
        if branch:
            from sqlalchemy import or_
            q = q.filter(or_(Promotion.branch == branch, Promotion.branch == None))
            
        result = [_map_promotion(p) for p in q.all()]
        db.close()
        return result

    @strawberry.field
    def rewards(self, active_only: bool = False) -> List[RewardType]:
        """Catálogo de premios canjeables."""
        db = SessionLocal()
        q = db.query(Reward)
        if active_only:
            q = q.filter(Reward.is_active == True)
        result = [_map_reward(r) for r in q.all()]
        db.close()
        return result


# ─── Mutations ─────────────────────────────────────────────────────────────

@strawberry.type
class Mutation:
    @strawberry.mutation
    async def redeem_points(self, customer_id: str, reward_id: str) -> RedeemResult:
        """
        El cliente canjea un premio usando sus puntos acumulados.
        Publica el evento 'points.redeemed' → customer-service lo registra.
        """
        db = SessionLocal()
        try:
            acc = db.query(LoyaltyAccount).filter(
                LoyaltyAccount.customer_id == customer_id
            ).first()
            reward = db.query(Reward).filter(Reward.id == reward_id).first()

            if not acc:
                return RedeemResult(success=False, message="Cuenta de lealtad no encontrada.", remaining_points=0)
            if not reward or not reward.is_active:
                return RedeemResult(success=False, message="Premio no disponible.", remaining_points=acc.total_points)
            if reward.stock <= 0:
                return RedeemResult(success=False, message="Premio sin stock disponible.", remaining_points=acc.total_points)
            if acc.total_points < reward.points_cost:
                return RedeemResult(
                    success=False,
                    message=f"Puntos insuficientes. Tienes {acc.total_points}, necesitas {reward.points_cost}.",
                    remaining_points=acc.total_points,
                )

            acc.total_points -= reward.points_cost
            acc.tier = _compute_tier(acc.total_points)
            reward.stock -= 1

            db.add(PointHistory(
                id=str(uuid.uuid4()),
                loyalty_account_id=acc.id,
                action_type="redeem",
                points=-reward.points_cost,
                description=f"Canje: {reward.name}",
            ))
            db.commit()

            # ✅ Guardar en variables locales ANTES de cerrar la sesión
            # para evitar DetachedInstanceError de SQLAlchemy
            reward_name = str(reward.name)
            points_used = int(reward.points_cost)
            remaining   = int(acc.total_points)
        except Exception as exc:
            db.rollback()
            return RedeemResult(success=False, message=f"Error interno: {exc}", remaining_points=0)
        finally:
            db.close()

        await publish_event(
            "points.redeemed",
            {"customer_id": customer_id, "reward": reward_name, "points_used": points_used},
        )
        return RedeemResult(success=True, message=f"Canje exitoso: {reward_name}.", remaining_points=remaining)

    @strawberry.mutation
    def create_promotion(
        self,
        title: str,
        discount_percent: float,
        description: Optional[str] = None,
        branch: Optional[str] = None,
    ) -> PromotionType:
        """Admin crea una nueva promoción."""
        db = SessionLocal()
        promo = Promotion(
            id=str(uuid.uuid4()),
            title=title,
            description=description,
            discount_percent=discount_percent,
            branch=branch,
        )
        db.add(promo)
        db.commit()
        db.refresh(promo)
        result = _map_promotion(promo)
        db.close()
        return result

    @strawberry.mutation
    def toggle_promotion(self, promotion_id: str) -> PromotionType:
        """Admin activa o desactiva una promoción."""
        db = SessionLocal()
        promo = db.query(Promotion).filter(Promotion.id == promotion_id).first()
        if not promo:
            db.close()
            raise ValueError("Promoción no encontrada.")
        promo.is_active = not promo.is_active
        db.commit()
        db.refresh(promo)
        result = _map_promotion(promo)
        db.close()
        return result

    @strawberry.mutation
    def create_reward(
        self,
        name: str,
        points_cost: int,
        stock: int,
        description: Optional[str] = None,
    ) -> RewardType:
        """Admin añade un nuevo premio al catálogo."""
        db = SessionLocal()
        reward = Reward(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            points_cost=points_cost,
            stock=stock,
        )
        db.add(reward)
        db.commit()
        db.refresh(reward)
        result = _map_reward(reward)
        db.close()
        return result

    @strawberry.mutation
    def toggle_reward(self, reward_id: str) -> RewardType:
        """Admin activa o desactiva un premio del catálogo."""
        db = SessionLocal()
        reward = db.query(Reward).filter(Reward.id == reward_id).first()
        if not reward:
            db.close()
            raise ValueError("Premio no encontrado.")
        reward.is_active = not reward.is_active
        db.commit()
        db.refresh(reward)
        result = _map_reward(reward)
        db.close()
        return result

    @strawberry.mutation
    def update_reward(
        self,
        reward_id: str,
        name: str,
        points_cost: int,
        stock: int,
        description: Optional[str] = None,
    ) -> RewardType:
        """Admin edita los datos de un premio existente."""
        db = SessionLocal()
        reward = db.query(Reward).filter(Reward.id == reward_id).first()
        if not reward:
            db.close()
            raise ValueError("Premio no encontrado.")
        reward.name = name
        reward.points_cost = points_cost
        reward.stock = stock
        reward.description = description
        db.commit()
        db.refresh(reward)
        result = _map_reward(reward)
        db.close()
        return result


# ─── Schema ────────────────────────────────────────────────────────────────

schema = Schema(
    query=Query,
    mutation=Mutation,
    types=[UserType],
    enable_federation_2=False,
)
