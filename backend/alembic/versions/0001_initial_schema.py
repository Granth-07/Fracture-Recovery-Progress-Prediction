"""Initial schema — patients, checkins, reps tables.

Revision ID: 0001
Revises:
Create Date: 2026-09-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Enum types -----------------------------------------------------------
    injury_type_enum = sa.Enum("wrist", "ankle", "elbow", name="injury_type_enum")
    side_enum = sa.Enum("left", "right", name="side_enum")
    deviation_type_enum = sa.Enum(
        "none", "compensation", "overextend", "speed",
        name="deviation_type_enum",
    )
    trend_flag_enum = sa.Enum(
        "on_track", "plateaued", "insufficient_data",
        name="trend_flag_enum",
    )

    # --- patients -------------------------------------------------------------
    op.create_table(
        "patients",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("injury_type", injury_type_enum, nullable=False),
        sa.Column("injury_date", sa.String(10), nullable=False),
        sa.Column("side", side_enum, nullable=False),
        sa.Column("rom_baseline", sa.Float, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # --- checkins -------------------------------------------------------------
    op.create_table(
        "checkins",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "patient_id",
            sa.String(36),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("exercise_id", sa.String(100), nullable=False),
        sa.Column("rom_score", sa.Float, nullable=False),
        sa.Column("form_quality_pct", sa.Float, nullable=False),
        sa.Column("adherence_streak", sa.Integer, nullable=False, server_default="0"),
        sa.Column("trend_flag", trend_flag_enum, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_checkins_patient_id", "checkins", ["patient_id"])
    op.create_index("ix_checkins_created_at", "checkins", ["created_at"])

    # --- reps -----------------------------------------------------------------
    op.create_table(
        "reps",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "checkin_id",
            sa.String(36),
            sa.ForeignKey("checkins.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("rep_index", sa.Integer, nullable=False),
        sa.Column("max_angle", sa.Float, nullable=False),
        sa.Column("duration_sec", sa.Float, nullable=False),
        sa.Column("deviation_score", sa.Float, nullable=False),
        sa.Column("deviation_type", deviation_type_enum, nullable=False),
    )
    op.create_index("ix_reps_checkin_id", "reps", ["checkin_id"])


def downgrade() -> None:
    op.drop_table("reps")
    op.drop_table("checkins")
    op.drop_table("patients")

    # Drop enum types (Postgres-specific)
    sa.Enum(name="trend_flag_enum").drop(op.get_bind())
    sa.Enum(name="deviation_type_enum").drop(op.get_bind())
    sa.Enum(name="side_enum").drop(op.get_bind())
    sa.Enum(name="injury_type_enum").drop(op.get_bind())
