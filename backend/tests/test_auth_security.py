from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest

from app.core.config import settings
from app.security.auth import ALGORITHM, create_access_token, hash_password, verify_password


def test_password_hash_is_one_way_and_verifies():
    encoded = hash_password("a-long-test-password")
    assert encoded != "a-long-test-password"
    assert verify_password("a-long-test-password", encoded)
    assert not verify_password("wrong-password", encoded)


def test_access_token_contains_user_and_expiry():
    user = SimpleNamespace(id=uuid4(), role="citizen")
    token = create_access_token(user)
    claims = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    assert claims["sub"] == str(user.id)
    assert claims["role"] == "citizen"
    assert claims["exp"] > claims["iat"]


def test_expired_access_token_is_rejected():
    expired = jwt.encode(
        {"sub": str(uuid4()), "iat": datetime.now(UTC) - timedelta(hours=2), "exp": datetime.now(UTC) - timedelta(hours=1)},
        settings.secret_key,
        algorithm=ALGORITHM,
    )
    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(expired, settings.secret_key, algorithms=[ALGORITHM])
