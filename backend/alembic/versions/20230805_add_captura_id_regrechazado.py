"""Add captura_id column to regrechazado table

Revision ID: 20230805_add_captura_id_regrechazado
Revises: None
Create Date: 2026-08-05 17:35:00.000000
"""

# revision identifiers, used by Alembic.
revision = "20230805_add_captura_id_regrechazado"
down_revision = None
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa

def upgrade() -> None:
    # Add captura_id column (nullable) to regrechazado table
    op.add_column('regrechazado', sa.Column('captura_id', sa.Integer(), nullable=True))
    # Create foreign key to firmas.oid with RESTRICT on delete.
    op.create_foreign_key(
        "fk_regrechazado_captura_id_firmas",
        "regrechazado",
        "firmas",
        ["captura_id"],
        ["oid"],
        ondelete="RESTRICT",
    )

def downgrade() -> None:
    # Drop foreign key and column
    op.drop_constraint("fk_regrechazado_captura_id_firmas", "regrechazado", type_="foreignkey")
    op.drop_column('regrechazado', 'captura_id')
