"""Cover letter text on applications."""
from alembic import op
import sqlalchemy as sa

revision = "28_cover_letter"
down_revision = "27_consistency_checks"
branch_labels = None
depends_on = None


def upgrade():
    existing = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("applications")}
    if "cover_letter_text" not in existing:
        with op.batch_alter_table("applications") as batch:
            batch.add_column(sa.Column("cover_letter_text", sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table("applications") as batch:
        batch.drop_column("cover_letter_text")
