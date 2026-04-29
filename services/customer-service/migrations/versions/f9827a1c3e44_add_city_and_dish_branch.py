"""add_city_and_dish_branch

Revision ID: f9827a1c3e44
Revises: e085b2c858b8
Create Date: 2026-04-12 18:12:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'f9827a1c3e44'
down_revision: Union[str, None] = 'a2d5aeadea82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add city column to users
    op.add_column('users', sa.Column('city', sa.String(length=50), nullable=True))
    # Add branch column to dishes
    op.add_column('dishes', sa.Column('branch', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('dishes', 'branch')
    op.drop_column('users', 'city')
