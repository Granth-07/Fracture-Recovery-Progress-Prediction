"""
alembic/env.py — Alembic environment configuration.

DATABASE_URL is read exclusively from the environment variable.
Never hardcode connection strings here.
"""
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# ---------------------------------------------------------------------------
# Alembic Config object
# ---------------------------------------------------------------------------
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---------------------------------------------------------------------------
# Import models so Alembic can detect changes for autogenerate
# ---------------------------------------------------------------------------
# Add the backend/ directory to path so `app` is importable
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import Base  # noqa: E402
import app.models  # noqa: E402, F401 — ensure all models are registered on Base

target_metadata = Base.metadata

# ---------------------------------------------------------------------------
# Read DATABASE_URL from environment — never hardcode
# ---------------------------------------------------------------------------
def get_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL environment variable is not set. "
            "Copy backend/.env.example to backend/.env and fill in the value."
        )
    return url


# ---------------------------------------------------------------------------
# Run migrations
# ---------------------------------------------------------------------------

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no live DB connection required)."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode with an active connection."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
