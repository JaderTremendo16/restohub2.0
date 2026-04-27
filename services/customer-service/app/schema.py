import uuid
from typing import Optional, List

import strawberry
from strawberry.federation import Schema

from app.database import SessionLocal
from app.models import User, Rating, Order
from app.auth import hash_password, verify_password
from app.events.publisher import publish_event


# ─── Federation Types ──────────────────────────────────────────────────────

@strawberry.federation.type(keys=["id"])
class UserType:
    """
    Tipo federado. customer-service es el propietario de este tipo.
    loyalty-service lo extiende para añadir el campo 'loyalty'.
    NOTA: Este tipo representa CLIENTES, distinto del User de location-service (admins/staff).
    """
    id: strawberry.ID
    auth0_id: str
    name: str
    email: str
    phone: Optional[str]
    role: str
    preferences: Optional[str]
    country: str
    city: Optional[str]
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    branch: Optional[str]
    created_at: str

    @classmethod
    def resolve_reference(cls, id: strawberry.ID) -> "UserType":
        """Apollo Gateway llama este método para resolver entidades por clave."""
        db = SessionLocal()
        user = db.query(User).filter(User.id == str(id)).first()
        db.close()
        if not user:
            raise ValueError(f"User {id} not found")
        return _map_user(user)


@strawberry.type
class RatingType:
    id: strawberry.ID
    customer_id: strawberry.ID
    customer_name: str
    item_name: str
    stars: int
    comment: Optional[str]
    created_at: str


@strawberry.type
class OrderType:
    id: strawberry.ID
    customer_id: str
    items: str
    total_price: float
    branch: str
    created_at: str


@strawberry.type
class CustomerAuthPayload:
    user: UserType
    message: str


@strawberry.type
class CartAddressType:
    raw: str
    formatted: str
    lat: Optional[float]
    lng: Optional[float]

@strawberry.type
class CartItemType:
    product_id: str
    name: str
    price: float
    quantity: int
    is_reward: bool

@strawberry.type
class CartType:
    customer_id: str
    items: List[CartItemType]
    delivery_address: CartAddressType


# ─── Helpers ───────────────────────────────────────────────────────────────

def _map_user(u: User) -> UserType:
    return UserType(
        id=strawberry.ID(u.id),
        auth0_id=u.auth0_id,
        name=u.name,
        email=u.email,
        phone=u.phone,
        role=u.role,
        preferences=u.preferences,
        country=u.country,
        city=u.city,
        address=u.address,
        latitude=u.latitude,
        longitude=u.longitude,
        branch=u.branch,
        created_at=u.created_at.isoformat(),
    )


def _map_rating(r: Rating, customer_name: str = "Usuario Desconocido") -> RatingType:
    return RatingType(
        id=strawberry.ID(r.id),
        customer_id=strawberry.ID(r.customer_id),
        customer_name=customer_name,
        item_name=r.item_name,
        stars=r.stars,
        comment=r.comment,
        created_at=r.created_at.isoformat(),
    )


def _map_order(o: Order) -> OrderType:
    return OrderType(
        id=strawberry.ID(o.id),
        customer_id=o.customer_id,
        items=o.items,
        total_price=o.total_price,
        branch=o.branch,
        created_at=o.created_at.isoformat(),
    )

def _map_cart(c: dict) -> CartType:
    return CartType(
        customer_id=c["customer_id"],
        items=[
            CartItemType(
                product_id=i["product_id"],
                name=i["name"],
                price=i["price"],
                quantity=i["quantity"],
                is_reward=i.get("is_reward", False)
            ) for i in c["items"]
        ],
        delivery_address=CartAddressType(
            raw=c["delivery_address"].get("raw", ""),
            formatted=c["delivery_address"].get("formatted", ""),
            lat=c["delivery_address"].get("lat"),
            lng=c["delivery_address"].get("lng")
        )
    )


# ─── Queries ───────────────────────────────────────────────────────────────

@strawberry.type
class Query:
    # ✅ FIX: Renombrado de users → customers
    # para evitar colisión con Query.users del location-service
    @strawberry.field
    def customers(self, branch: Optional[str] = None) -> List[UserType]:
        """Retorna los clientes filtrados por sede."""
        db = SessionLocal()
        query = db.query(User)
        if branch is not None and branch != "":
            query = query.filter(User.branch == branch)
        result = [_map_user(u) for u in query.all()]
        db.close()
        return result

    @strawberry.field
    def customer(self, id: str) -> Optional[UserType]:
        """Retorna un cliente por ID."""
        db = SessionLocal()
        u = db.query(User).filter(User.id == id).first()
        db.close()
        return _map_user(u) if u else None

    @strawberry.field
    def ratings(self, customer_id: str) -> List[RatingType]:
        """Retorna las reseñas de un cliente específico."""
        db = SessionLocal()
        result = [
            _map_rating(r)
            for r in db.query(Rating).filter(Rating.customer_id == customer_id).all()
        ]
        db.close()
        return result

    @strawberry.field
    def all_ratings(self, branch: Optional[str] = None) -> List[RatingType]:
        """Retorna todas las reseñas con el nombre del cliente."""
        db = SessionLocal()
        query = db.query(Rating, User.name).join(User, Rating.customer_id == User.id)
        if branch:
            query = query.filter(User.branch == branch)
        results = []
        for r, name in query.all():
            results.append(_map_rating(r, name))
        db.close()
        return results

    @strawberry.field
    def rating_for_dish(self, customer_id: str, item_name: str) -> Optional[RatingType]:
        """Retorna la reseña del cliente para un plato específico (si existe)."""
        db = SessionLocal()
        r = db.query(Rating).filter(
            Rating.customer_id == customer_id,
            Rating.item_name == item_name
        ).first()
        db.close()
        return _map_rating(r) if r else None

    @strawberry.field
    def customer_orders(self, customer_id: str) -> List[OrderType]:
        """Retorna el historial de pedidos de un cliente."""
        db = SessionLocal()
        orders = db.query(Order).filter(Order.customer_id == customer_id).order_by(Order.created_at.desc()).all()
        result = [_map_order(o) for o in orders]
        db.close()
        return result

    @strawberry.field
    def cart(self, customer_id: str) -> CartType:
        """Retorna el carrito actual desde Redis."""
        from app.redis_client import CartManager
        return _map_cart(CartManager.get_cart(customer_id))


# ─── Mutations ─────────────────────────────────────────────────────────────

@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_user(
        self,
        name: str,
        email: str,
        password: str,
        phone: Optional[str] = None,
        role: str = "customer",
        preferences: Optional[str] = None,
        country: Optional[str] = None,
        city: Optional[str] = None,
        address: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        branch: Optional[str] = None,
    ) -> UserType:
        """Registra un nuevo cliente en el sistema."""
        db = SessionLocal()
        
        # Verificar si el usuario ya existe
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            db.close()
            raise ValueError(f"El email {email} ya se encuentra registrado.")

        user = User(
            id=str(uuid.uuid4()),
            auth0_id=f"local|{email}",
            name=name,
            email=email,
            phone=phone,
            role=role,
            password_hash=hash_password(password),
            preferences=preferences,
            country=country or "Colombia",
            city=city,
            address=address,
            latitude=latitude,
            longitude=longitude,
            branch=branch,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        result = _map_user(user)
        db.close()
        return result

    # ✅ FIX: Renombrado de login_user para que retorne CustomerAuthPayload
    @strawberry.mutation
    def login_user(self, email: str, password: str) -> CustomerAuthPayload:
        """
        Autentica al cliente con email y contraseña.
        El frontend usa el campo 'role' del payload para redirigir al panel correspondiente.
        """
        db = SessionLocal()
        user = db.query(User).filter(User.email == email).first()
        db.close()
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Credenciales inválidas. Verifica tu email y contraseña.")
        return CustomerAuthPayload(user=_map_user(user), message="Login exitoso")

    @strawberry.mutation
    def create_rating(
        self,
        customer_id: str,
        item_name: str,
        stars: int,
        comment: Optional[str] = None,
    ) -> RatingType:
        """El cliente deja una reseña de un plato (1 por plato por usuario)."""
        if not (1 <= stars <= 5):
            raise ValueError("Las estrellas deben estar entre 1 y 5.")
        db = SessionLocal()
        existing = db.query(Rating).filter(
            Rating.customer_id == customer_id,
            Rating.item_name == item_name
        ).first()
        if existing:
            db.close()
            raise ValueError("Ya tienes una reseña para este plato. Puedes editarla o eliminarla.")
        rating = Rating(
            id=str(uuid.uuid4()),
            customer_id=customer_id,
            item_name=item_name,
            stars=stars,
            comment=comment,
        )
        db.add(rating)
        db.commit()
        db.refresh(rating)
        result = _map_rating(rating)
        db.close()
        return result

    @strawberry.mutation
    def update_rating(
        self,
        id: str,
        stars: int,
        comment: Optional[str] = None,
    ) -> RatingType:
        """El cliente edita su reseña existente."""
        if not (1 <= stars <= 5):
            raise ValueError("Las estrellas deben estar entre 1 y 5.")
        db = SessionLocal()
        rating = db.query(Rating).filter(Rating.id == id).first()
        if not rating:
            db.close()
            raise ValueError("Reseña no encontrada.")
        rating.stars = stars
        rating.comment = comment
        db.commit()
        db.refresh(rating)
        result = _map_rating(rating)
        db.close()
        return result

    @strawberry.mutation
    def delete_rating(self, id: str) -> str:
        """El cliente elimina su reseña."""
        db = SessionLocal()
        rating = db.query(Rating).filter(Rating.id == id).first()
        if not rating:
            db.close()
            raise ValueError("Reseña no encontrada.")
        db.delete(rating)
        db.commit()
        db.close()
        return "Reseña eliminada correctamente."

    @strawberry.mutation
    def update_user_profile(
        self,
        id: str,
        name: str,
        email: str,
        phone: Optional[str] = None,
        country: Optional[str] = None,
        city: Optional[str] = None,
        address: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        branch: Optional[str] = None,
    ) -> UserType:
        """Actualiza los datos del perfil del cliente."""
        db = SessionLocal()
        user = db.query(User).filter(User.id == id).first()
        if not user:
            db.close()
            raise ValueError("Usuario no encontrado")
        user.name = name
        user.email = email
        user.phone = phone
        if country: user.country = country
        if city: user.city = city
        if address: user.address = address
        if latitude is not None: user.latitude = latitude
        if longitude is not None: user.longitude = longitude
        if branch: user.branch = branch
        db.commit()
        db.refresh(user)
        result = _map_user(user)
        db.close()
        return result

    @strawberry.mutation
    async def complete_order(
        self,
        customer_id: str,
        items: str = "[]",
        total_price: float = 0.0,
        branch: str = "General",
        orderId: Optional[str] = None,
    ) -> str:
        """
        [CONVENIENCE] Finaliza un pedido desde el menú digital y lo guarda localmente
        para el historial del cliente. (Los puntos reales se asignan pagando en la caja POS).
        """
        db = SessionLocal()
        try:
            new_order = Order(
                id=orderId if orderId else str(uuid.uuid4()),
                customer_id=customer_id,
                items=items,
                total_price=total_price,
                branch=branch
            )
            db.add(new_order)
            db.commit()
            
            # Al completar, limpiamos el carrito de Redis
            from app.redis_client import CartManager
            CartManager.clear_cart(customer_id)
            
            return "Orden sincronizada en tu historial."
        except Exception as e:
            db.rollback()
            raise ValueError(f"Error al completar orden: {str(e)}")
        finally:
            db.close()

    @strawberry.mutation
    def add_to_cart(
        self,
        customer_id: str,
        product_id: str,
        name: str,
        price: float,
        quantity: int = 1,
        is_reward: bool = False
    ) -> CartType:
        from app.redis_client import CartManager
        item = {
            "product_id": product_id,
            "name": name,
            "price": price,
            "quantity": quantity,
            "is_reward": is_reward
        }
        return _map_cart(CartManager.add_item(customer_id, item))

    @strawberry.mutation
    def remove_from_cart(self, customer_id: str, product_id: str) -> CartType:
        from app.redis_client import CartManager
        return _map_cart(CartManager.remove_item(customer_id, product_id))

    @strawberry.mutation
    def update_cart_quantity(self, customer_id: str, product_id: str, quantity: int) -> CartType:
        from app.redis_client import CartManager
        return _map_cart(CartManager.update_quantity(customer_id, product_id, quantity))

    @strawberry.mutation
    def clear_cart(self, customer_id: str) -> bool:
        from app.redis_client import CartManager
        return CartManager.clear_cart(customer_id)


# ─── Schema ────────────────────────────────────────────────────────────────

# ✅ FIX: enable_federation_2=True para compatibilidad con Apollo Federation v2
schema = Schema(query=Query, mutation=Mutation, enable_federation_2=True)