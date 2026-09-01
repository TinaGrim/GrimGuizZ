from motor.motor_asyncio import AsyncIOMotorClient

from .config import settings

client: AsyncIOMotorClient | None = None


def get_db():
    """Return the Motor database, connecting lazily on first use."""
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.mongo_url)
    return client[settings.mongo_db]


async def close_db():
    global client
    if client is not None:
        client.close()
        client = None
