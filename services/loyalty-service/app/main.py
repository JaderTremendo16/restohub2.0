import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from app.database import engine
from app.models import Base
from app.schema import schema
from app.events.consumer import start_consumer
from app.seed import seed_initial_data

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    task = asyncio.create_task(start_consumer())
    logger.info("[loyalty-service] Listo en http://0.0.0.0:8001")
    yield
    task.cancel()


app = FastAPI(
    title="RestoHub — Loyalty Service",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "loyalty-service", "version": "2.0.0"}
