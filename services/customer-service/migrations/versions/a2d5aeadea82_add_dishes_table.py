"""add_dishes_table

Revision ID: a2d5aeadea82
Revises: e085b2c858b8
Create Date: 2026-04-12 18:37:18.189906

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a2d5aeadea82'
down_revision: Union[str, None] = 'e085b2c858b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('dishes',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('price', sa.Float(), nullable=False),
    sa.Column('emoji', sa.String(length=10), nullable=False),
    sa.Column('category', sa.String(length=50), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('orders',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('customer_id', sa.String(length=36), nullable=False),
    sa.Column('items', sa.Text(), nullable=False),
    sa.Column('total_price', sa.Float(), nullable=False),
    sa.Column('branch', sa.String(length=50), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_dishes_name'), 'dishes', ['name'], unique=True)
    op.create_index(op.f('ix_orders_customer_id'), 'orders', ['customer_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_orders_customer_id'), table_name='orders')
    op.drop_index(op.f('ix_dishes_name'), table_name='dishes')
    op.drop_table('orders')
    op.drop_table('dishes')
