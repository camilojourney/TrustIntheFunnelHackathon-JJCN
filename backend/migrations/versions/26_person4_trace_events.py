"""Persistent local session execution events."""
from alembic import op
import sqlalchemy as sa

revision = "26_person4_trace_events"
down_revision = "1703f375b0bc"
branch_labels = None
depends_on = None


def upgrade():
    metadata = sa.MetaData()
    table = sa.Table("trace_events", metadata,
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("session_id", sa.String(), nullable=False, index=True),
        sa.Column("candidate_id", sa.String(), index=True),
        sa.Column("stage", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("details", sa.JSON()),
    )
    table.create(op.get_bind(), checkfirst=True)


def downgrade():
    op.drop_table("trace_events")
