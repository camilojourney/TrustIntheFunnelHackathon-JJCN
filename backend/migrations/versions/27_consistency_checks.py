"""Source-consistency checks and application history columns."""
from alembic import op
import sqlalchemy as sa

revision = "27_consistency_checks"
down_revision = "26_person4_trace_events"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    metadata = sa.MetaData()
    table = sa.Table("consistency_checks", metadata,
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("candidate_id", sa.String(), nullable=False, index=True),
        sa.Column("claim_id", sa.String(), nullable=True),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("outcome", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("source_label", sa.String(), nullable=False),
        sa.Column("source_url", sa.String(), nullable=True),
        sa.Column("excerpt", sa.Text(), nullable=True),
        sa.Column("limitations", sa.Text(), nullable=False),
        sa.Column("recruiter_questions", sa.JSON()),
        sa.Column("mode", sa.String(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
    )
    table.create(bind, checkfirst=True)

    existing = {column["name"] for column in sa.inspect(bind).get_columns("applications")}
    with op.batch_alter_table("applications") as batch:
        if "role_title" not in existing:
            batch.add_column(sa.Column("role_title", sa.String(), nullable=True))
        if "created_at" not in existing:
            batch.add_column(sa.Column("created_at", sa.String(), nullable=True))
        if "identity_hints" not in existing:
            batch.add_column(sa.Column("identity_hints", sa.JSON(), nullable=True))


def downgrade():
    op.drop_table("consistency_checks")
    with op.batch_alter_table("applications") as batch:
        batch.drop_column("identity_hints")
        batch.drop_column("created_at")
        batch.drop_column("role_title")
