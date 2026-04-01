"""Unique note title per owner

Revision ID: 8f2a4c1b7c3d
Revises: c898505bc58a
Create Date: 2026-03-31 22:15:00

"""

from typing import Sequence, Union

from alembic import op


revision: str = "8f2a4c1b7c3d"
down_revision: Union[str, None] = "c898505bc58a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint("uq_note_owner_title", "note", ["owner_id", "title"])


def downgrade() -> None:
    op.drop_constraint("uq_note_owner_title", "note", type_="unique")

