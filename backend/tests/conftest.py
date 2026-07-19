"""Shared fixtures for Twin IQ backend tests."""
import os
import asyncio
from datetime import datetime, timezone, timedelta

import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load backend env for MONGO_URL / DB_NAME
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8001").rstrip("/")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

TEST_USER_ID = "user_test001"
TEST_EMAIL = "test@twiniq.dev"
TEST_TOKEN = "test_token_abc123"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def token():
    return TEST_TOKEN


@pytest.fixture(scope="session")
def auth_headers():
    return {"Authorization": f"Bearer {TEST_TOKEN}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session", autouse=True)
def seed_test_user():
    """Seed a test user + session in MongoDB, cleanup after all tests."""
    async def _seed():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        # Clean any prior test data
        await db.users.delete_many({"user_id": TEST_USER_ID})
        await db.user_sessions.delete_many({"user_id": TEST_USER_ID})
        await db.missions.delete_many({"user_id": TEST_USER_ID})
        await db.roadmaps.delete_many({"user_id": TEST_USER_ID})
        await db.checkins.delete_many({"user_id": TEST_USER_ID})
        await db.coach_messages.delete_many({"user_id": TEST_USER_ID})

        await db.users.insert_one({
            "user_id": TEST_USER_ID,
            "email": TEST_EMAIL,
            "name": "Test Student",
            "picture": None,
            "created_at": datetime.now(timezone.utc),
            "onboarded": False,
            "profile": {},
            "xp": 0,
            "level": 1,
            "streak": 0,
            "last_active_date": None,
            "productivity_score": 0,
            "focus_score": 0,
            "badges": [],
        })
        await db.user_sessions.insert_one({
            "session_token": TEST_TOKEN,
            "user_id": TEST_USER_ID,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc),
        })
        client.close()

    async def _cleanup():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        await db.users.delete_many({"user_id": TEST_USER_ID})
        await db.user_sessions.delete_many({"user_id": TEST_USER_ID})
        await db.missions.delete_many({"user_id": TEST_USER_ID})
        await db.roadmaps.delete_many({"user_id": TEST_USER_ID})
        await db.checkins.delete_many({"user_id": TEST_USER_ID})
        await db.coach_messages.delete_many({"user_id": TEST_USER_ID})
        client.close()

    asyncio.run(_seed())
    yield
    asyncio.run(_cleanup())
