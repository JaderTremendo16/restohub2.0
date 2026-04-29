"""add_branch_to_promotions

Revision ID: f2a3c4d5e6f7
Revises: d5ea4bbb1701
Create Date: 2026-04-12 18:13:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'f2a3c4d5e6f7'
down_revision: Union[str, None] = 'd5ea4bbb1701'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('promotions', sa.Column('branch', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('promotions', 'branch')
