"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-29 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Enum types ──────────────────────────────────────────────────────────
    offer_type_enum = postgresql.ENUM(
        "FREELANCE", "CDI", "CDD",
        name="offer_type_enum",
        create_type=False,
    )
    offer_type_enum.create(op.get_bind(), checkfirst=True)

    remote_type_enum = postgresql.ENUM(
        "FULL_REMOTE", "HYBRID", "ON_SITE",
        name="remote_type_enum",
        create_type=False,
    )
    remote_type_enum.create(op.get_bind(), checkfirst=True)

    offer_status_enum = postgresql.ENUM(
        "NEW", "ANALYZED", "APPLIED", "INTERVIEW", "REJECTED", "OFFER", "ARCHIVED",
        name="offer_status_enum",
        create_type=False,
    )
    offer_status_enum.create(op.get_bind(), checkfirst=True)

    application_status_enum = postgresql.ENUM(
        "SENT", "VIEWED", "INTERVIEW_SCHEDULED", "INTERVIEW_DONE",
        "REJECTED", "OFFER_RECEIVED", "ACCEPTED", "WITHDRAWN",
        name="application_status_enum",
        create_type=False,
    )
    application_status_enum.create(op.get_bind(), checkfirst=True)

    document_type_enum = postgresql.ENUM(
        "CV", "COVER_LETTER",
        name="document_type_enum",
        create_type=False,
    )
    document_type_enum.create(op.get_bind(), checkfirst=True)

    # ── Table: job_offers ────────────────────────────────────────────────────
    op.create_table(
        "job_offers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("company", sa.String(255), nullable=False),
        sa.Column("source", sa.String(100), nullable=False),
        sa.Column("source_url", sa.String(2048), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "type",
            sa.Enum(
                "FREELANCE", "CDI", "CDD",
                name="offer_type_enum",
                create_constraint=False,
            ),
            nullable=False,
        ),
        sa.Column("tjm_min", sa.Integer(), nullable=True),
        sa.Column("tjm_max", sa.Integer(), nullable=True),
        sa.Column("salary_min", sa.Integer(), nullable=True),
        sa.Column("salary_max", sa.Integer(), nullable=True),
        sa.Column(
            "remote_type",
            sa.Enum(
                "FULL_REMOTE", "HYBRID", "ON_SITE",
                name="remote_type_enum",
                create_constraint=False,
            ),
            nullable=False,
        ),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("contract_duration", sa.String(100), nullable=True),
        sa.Column("compatibility_score", sa.Integer(), nullable=True),
        sa.Column(
            "score_details",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "keywords",
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "strengths",
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "warnings",
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "status",
            sa.Enum(
                "NEW", "ANALYZED", "APPLIED", "INTERVIEW",
                "REJECTED", "OFFER", "ARCHIVED",
                name="offer_status_enum",
                create_constraint=False,
            ),
            nullable=False,
            server_default="NEW",
        ),
        sa.Column(
            "is_favorite",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("found_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_job_offers")),
    )

    op.create_index(
        op.f("ix_job_offers_status"), "job_offers", ["status"], unique=False
    )
    op.create_index(
        op.f("ix_job_offers_company"), "job_offers", ["company"], unique=False
    )
    op.create_index(
        op.f("ix_job_offers_type"), "job_offers", ["type"], unique=False
    )
    op.create_index(
        op.f("ix_job_offers_is_favorite"), "job_offers", ["is_favorite"], unique=False
    )

    # ── Table: applications ──────────────────────────────────────────────────
    op.create_table(
        "applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("job_offer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "cover_letter_sent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("cv_version_sent", sa.String(255), nullable=True),
        sa.Column("contact_name", sa.String(255), nullable=True),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column("contact_linkedin", sa.String(500), nullable=True),
        sa.Column("follow_up_date", sa.Date(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "SENT", "VIEWED", "INTERVIEW_SCHEDULED", "INTERVIEW_DONE",
                "REJECTED", "OFFER_RECEIVED", "ACCEPTED", "WITHDRAWN",
                name="application_status_enum",
                create_constraint=False,
            ),
            nullable=False,
            server_default="SENT",
        ),
        sa.Column("interview_notes", sa.Text(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["job_offer_id"],
            ["job_offers.id"],
            name=op.f("fk_applications_job_offer_id_job_offers"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_applications")),
    )

    op.create_index(
        op.f("ix_applications_job_offer_id"),
        "applications",
        ["job_offer_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_applications_status"), "applications", ["status"], unique=False
    )

    # ── Table: documents ─────────────────────────────────────────────────────
    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("job_offer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "CV", "COVER_LETTER",
                name="document_type_enum",
                create_constraint=False,
            ),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "model_used",
            sa.String(100),
            nullable=False,
            server_default="claude-sonnet-4-6",
        ),
        sa.Column("prompt_used", sa.Text(), nullable=True),
        sa.Column(
            "version",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        sa.Column(
            "is_validated",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("file_path", sa.String(1000), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["job_offer_id"],
            ["job_offers.id"],
            name=op.f("fk_documents_job_offer_id_job_offers"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_documents")),
    )

    op.create_index(
        op.f("ix_documents_job_offer_id"),
        "documents",
        ["job_offer_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_documents_type"), "documents", ["type"], unique=False
    )

    # ── Trigger: updated_at auto-update ──────────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    for table in ("job_offers", "applications"):
        op.execute(f"""
            CREATE TRIGGER trigger_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """)


def downgrade() -> None:
    # Drop triggers
    for table in ("job_offers", "applications"):
        op.execute(f"DROP TRIGGER IF EXISTS trigger_{table}_updated_at ON {table};")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column();")

    # Drop tables (order respects FK constraints)
    op.drop_table("documents")
    op.drop_table("applications")
    op.drop_table("job_offers")

    # Drop enum types
    for enum_name in (
        "document_type_enum",
        "application_status_enum",
        "offer_status_enum",
        "remote_type_enum",
        "offer_type_enum",
    ):
        op.execute(f"DROP TYPE IF EXISTS {enum_name};")
