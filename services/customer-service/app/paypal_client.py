import os
import httpx
import logging

logger = logging.getLogger(__name__)

PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET")
PAYPAL_MODE = os.environ.get("PAYPAL_MODE", "sandbox")

PAYPAL_API_URL = "https://api-m.sandbox.paypal.com" if PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"

class PayPalClient:
    @staticmethod
    async def get_access_token():
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{PAYPAL_API_URL}/v1/oauth2/token",
                auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
                data={"grant_type": "client_credentials"},
            )
            if response.status_code != 200:
                logger.error(f"Failed to get PayPal token: {response.text}")
                return None
            return response.json()["access_token"]

    @staticmethod
    async def create_order(amount: float, reference_id: str):
        token = await PayPalClient.get_access_token()
        if not token:
            return None
        
        async with httpx.AsyncClient() as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }
            body = {
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "reference_id": reference_id,
                        "amount": {"currency_code": "USD", "value": f"{amount:.2f}"},
                    }
                ],
            }
            response = await client.post(
                f"{PAYPAL_API_URL}/v2/checkout/orders",
                headers=headers,
                json=body,
            )
            return response.json() if response.status_code in [200, 201] else None

    @staticmethod
    async def capture_order(paypal_order_id: str):
        token = await PayPalClient.get_access_token()
        if not token:
            return None
        
        async with httpx.AsyncClient() as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }
            response = await client.post(
                f"{PAYPAL_API_URL}/v2/checkout/orders/{paypal_order_id}/capture",
                headers=headers,
                json={},
            )
            return response.json() if response.status_code in [200, 201] else None
