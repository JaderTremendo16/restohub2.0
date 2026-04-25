import json
import os
import redis
from typing import Optional, List, Dict, Any

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Conexión persistente a Redis
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

class CartManager:
    """
    Gestiona la persistencia del carrito de compras en Redis.
    Estructura de la clave: "cart:{customer_id}"
    TTL: 1 hora (3600 segundos)
    """
    
    @staticmethod
    def get_cart_key(customer_id: str) -> str:
        return f"cart:{customer_id}"

    @classmethod
    def get_cart(cls, customer_id: str) -> Dict[str, Any]:
        key = cls.get_cart_key(customer_id)
        data = redis_client.get(key)
        if data:
            return json.loads(data)
        return {
            "customer_id": customer_id,
            "items": [],
            "delivery_address": {
                "raw": "",
                "formatted": "",
                "lat": None,
                "lng": None
            }
        }

    @classmethod
    def save_cart(cls, customer_id: str, cart_data: Dict[str, Any]):
        key = cls.get_cart_key(customer_id)
        redis_client.setex(key, 3600, json.dumps(cart_data))

    @classmethod
    def add_item(cls, customer_id: str, product_data: Dict[str, Any]):
        cart = cls.get_cart(customer_id)
        
        # Buscar si el producto ya existe en el carrito
        existing_item = next((item for item in cart["items"] if item["product_id"] == product_data["product_id"]), None)
        
        if existing_item:
            # Si existe y no es un premio, sumamos cantidad. 
            # Los premios se manejan como items separados normalmente o según lógica de negocio.
            if not product_data.get("is_reward", False):
                existing_item["quantity"] += product_data.get("quantity", 1)
            else:
                # Si es premio y ya está, podemos elegir sumarlo o dejarlo como item único
                existing_item["quantity"] += product_data.get("quantity", 1)
        else:
            cart["items"].append(product_data)
            
        cls.save_cart(customer_id, cart)
        return cart

    @classmethod
    def remove_item(cls, customer_id: str, product_id: str):
        cart = cls.get_cart(customer_id)
        cart["items"] = [item for item in cart["items"] if item["product_id"] != product_id]
        cls.save_cart(customer_id, cart)
        return cart

    @classmethod
    def update_quantity(cls, customer_id: str, product_id: str, quantity: int):
        cart = cls.get_cart(customer_id)
        for item in cart["items"]:
            if item["product_id"] == product_id:
                item["quantity"] = quantity
                break
        
        # Eliminar items con cantidad 0 o menos
        cart["items"] = [item for item in cart["items"] if item["quantity"] > 0]
        
        cls.save_cart(customer_id, cart)
        return cart

    @classmethod
    def update_address(cls, customer_id: str, address_data: Dict[str, Any]):
        cart = cls.get_cart(customer_id)
        cart["delivery_address"].update(address_data)
        cls.save_cart(customer_id, cart)
        return cart

    @classmethod
    def clear_cart(cls, customer_id: str):
        key = cls.get_cart_key(customer_id)
        redis_client.delete(key)
        return True
