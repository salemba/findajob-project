"""
Unit tests for ClaudeService.

All Anthropic API calls are mocked — no real API key required.
Run with: pytest tests/test_claude_service.py -v
"""
import json
import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.services.claude_service import ClaudeService
from app.models.job_offer import JobOffer, OfferType, RemoteType, OfferStatus
from app.models.document import Document, DocumentType


# ── helpers ──────────────────────────────────────────────────────────────────

def make_offer(
    title: str = "Lead Architecte IA",
    company: str = "FinTech Innova",
    offer_type: OfferType = OfferType.FREELANCE,
    remote_type: RemoteType = RemoteType.FULL_REMOTE,
    tjm_min: int | None = 650,
    tjm_max: int | None = 750,
    raw_text: str = (
        "Nous cherchons un architecte IA senior pour concevoir des agents LLM. "
        "Stack : Python, LangChain, Azure AI Foundry, N8N, Kubernetes."
    ),
) -> JobOffer:
    offer = JobOffer()
    offer.id = uuid4()
    offer.title = title
    offer.company = company
    offer.source = "linkedin"
    offer.raw_text = raw_text
    offer.type = offer_type
    offer.remote_type = remote_type
    offer.tjm_min = tjm_min
    offer.tjm_max = tjm_max
    offer.salary_min = None
    offer.salary_max = None
    offer.location = "Paris"
    offer.contract_duration = None
    offer.status = OfferStatus.NEW
    offer.is_favorite = False
    offer.score_details = {}
    offer.keywords = []
    offer.strengths = []
    offer.warnings = []
    return offer


def make_document(
    doc_type: DocumentType = DocumentType.CV,
    content: str = "CV Salem BEN AFIA v1 — Banque de France …",
    version: int = 1,
) -> Document:
    doc = Document()
    doc.id = uuid4()
    doc.job_offer_id = uuid4()
    doc.type = doc_type
    doc.content = content
    doc.version = version
    doc.model_used = "claude-sonnet-4-6"
    doc.is_validated = False
    doc.job_offer = make_offer()  # attach a related offer
    return doc


def _mock_response(text: str) -> MagicMock:
    """Build a minimal Anthropic message mock."""
    content_block = MagicMock()
    content_block.text = text
    message = MagicMock()
    message.content = [content_block]
    return message


# ── analyze_offer ─────────────────────────────────────────────────────────────

class TestAnalyzeOffer:

    @pytest.mark.asyncio
    async def test_returns_valid_structure(self):
        """analyze_offer should return a dict with score, score_details, keywords, strengths, warnings."""
        fake_json = json.dumps({
            "score": 88,
            "score_details": {
                "technical_match": 90,
                "experience_match": 85,
                "remote_match": 100,
                "compensation_match": 80,
                "domain_match": 88,
                "comment": "Très bonne adéquation technique et remote.",
            },
            "keywords": ["LangChain", "Azure AI", "Python", "LLM"],
            "strengths": ["Full remote", "LLM souverains", "TJM marché"],
            "warnings": ["Durée mission non précisée"],
        })

        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            MockCls.return_value.messages.create.return_value = _mock_response(fake_json)
            service = ClaudeService()
            result = await service.analyze_offer(make_offer())

        assert result["score"] == 88
        assert "score_details" in result
        assert "technical_match" in result["score_details"]
        assert isinstance(result["keywords"], list)
        assert len(result["keywords"]) > 0
        assert isinstance(result["strengths"], list)
        assert isinstance(result["warnings"], list)

    @pytest.mark.asyncio
    async def test_invalid_json_raises(self):
        """analyze_offer should raise json.JSONDecodeError when Claude returns non-JSON."""
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            MockCls.return_value.messages.create.return_value = _mock_response(
                "Désolé, je ne peux pas répondre maintenant."
            )
            service = ClaudeService()
            with pytest.raises(json.JSONDecodeError):
                await service.analyze_offer(make_offer())

    @pytest.mark.asyncio
    async def test_prompt_contains_offer_data(self):
        """The prompt sent to Claude should contain the offer's title and company."""
        stub = json.dumps({
            "score": 75,
            "score_details": {},
            "keywords": [],
            "strengths": [],
            "warnings": [],
        })

        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            mock_create = MockCls.return_value.messages.create
            mock_create.return_value = _mock_response(stub)
            service = ClaudeService()
            await service.analyze_offer(make_offer(title="Architecte Cloud AWS", company="BNP Paribas"))

        call_kwargs = mock_create.call_args.kwargs
        user_content = call_kwargs["messages"][0]["content"]
        assert "Architecte Cloud AWS" in user_content
        assert "BNP Paribas" in user_content

    @pytest.mark.asyncio
    async def test_api_error_propagates(self):
        """analyze_offer should propagate Anthropic API exceptions as-is."""
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            MockCls.return_value.messages.create.side_effect = Exception("API rate limit exceeded")
            service = ClaudeService()
            with pytest.raises(Exception, match="API rate limit exceeded"):
                await service.analyze_offer(make_offer())


# ── generate_cv ───────────────────────────────────────────────────────────────

class TestGenerateCV:

    @pytest.mark.asyncio
    async def test_returns_non_empty_string(self):
        """generate_cv should return a non-empty string."""
        fake_cv = (
            "SALEM BEN AFIA\nArchitecte IA / Data\n\n"
            "BANQUE DE FRANCE — 2024-présent\nArchitecte IA senior\n"
            "• Déploiement agents N8N/Airflow sur GPU H100/A100\n"
        )
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            MockCls.return_value.messages.create.return_value = _mock_response(fake_cv)
            result = await ClaudeService().generate_cv(make_offer())

        assert isinstance(result, str)
        assert len(result) > 50

    @pytest.mark.asyncio
    async def test_prompt_includes_offer_title(self):
        """Prompt sent to Claude for CV generation must include the offer title."""
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            mock_create = MockCls.return_value.messages.create
            mock_create.return_value = _mock_response("CV content here")
            await ClaudeService().generate_cv(make_offer(title="Lead MLOps Engineer"))

        user_content = mock_create.call_args.kwargs["messages"][0]["content"]
        assert "Lead MLOps Engineer" in user_content

    @pytest.mark.asyncio
    async def test_prompt_mentions_banque_de_france_first(self):
        """The prompt should instruct Claude to place BdF missions at the top."""
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            mock_create = MockCls.return_value.messages.create
            mock_create.return_value = _mock_response("CV here")
            await ClaudeService().generate_cv(make_offer())

        user_content = mock_create.call_args.kwargs["messages"][0]["content"]
        assert "Banque de France" in user_content

    @pytest.mark.asyncio
    async def test_api_error_propagates(self):
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            MockCls.return_value.messages.create.side_effect = Exception("Connection timeout")
            with pytest.raises(Exception, match="Connection timeout"):
                await ClaudeService().generate_cv(make_offer())


# ── generate_cover_letter ─────────────────────────────────────────────────────

class TestGenerateCoverLetter:

    @pytest.mark.asyncio
    async def test_returns_non_empty_string(self):
        """generate_cover_letter should return a non-empty string."""
        fake_letter = (
            "En 2024, j'ai déployé des agents IA à la Banque de France sur GPU H100.\n"
            "Votre offre pour {company} retient mon attention pour trois raisons précises.\n"
            "Cordialement, Salem BEN AFIA"
        )
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            MockCls.return_value.messages.create.return_value = _mock_response(fake_letter)
            result = await ClaudeService().generate_cover_letter(make_offer())

        assert isinstance(result, str)
        assert len(result) > 50

    @pytest.mark.asyncio
    async def test_prompt_contains_company_name(self):
        """Prompt for cover letter must embed the company name for personalisation."""
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            mock_create = MockCls.return_value.messages.create
            mock_create.return_value = _mock_response("Lettre ici")
            await ClaudeService().generate_cover_letter(
                make_offer(company="Crédit Agricole Technologies")
            )

        user_content = mock_create.call_args.kwargs["messages"][0]["content"]
        assert "Crédit Agricole Technologies" in user_content

    @pytest.mark.asyncio
    async def test_prompt_enforces_word_count_constraint(self):
        """Prompt should mention the 300-350 word constraint."""
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            mock_create = MockCls.return_value.messages.create
            mock_create.return_value = _mock_response("Lettre ici")
            await ClaudeService().generate_cover_letter(make_offer())

        user_content = mock_create.call_args.kwargs["messages"][0]["content"]
        assert "300" in user_content
        assert "350" in user_content

    @pytest.mark.asyncio
    async def test_api_error_propagates(self):
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            MockCls.return_value.messages.create.side_effect = RuntimeError("Server error")
            with pytest.raises(RuntimeError, match="Server error"):
                await ClaudeService().generate_cover_letter(make_offer())


# ── regenerate_document ───────────────────────────────────────────────────────

class TestRegenerateDocument:

    @pytest.mark.asyncio
    async def test_cv_returns_new_content_string(self):
        """regenerate_document for CV should return a string."""
        improved = "CV AMÉLIORÉ v2 — SALEM BEN AFIA\n..."
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            MockCls.return_value.messages.create.return_value = _mock_response(improved)
            result = await ClaudeService().regenerate_document(
                make_document(doc_type=DocumentType.CV, content="CV original v1", version=1)
            )

        assert isinstance(result, str)
        assert len(result) > 10

    @pytest.mark.asyncio
    async def test_cover_letter_returns_new_content_string(self):
        """regenerate_document for COVER_LETTER should return a string."""
        improved = "Lettre améliorée v3 …"
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            MockCls.return_value.messages.create.return_value = _mock_response(improved)
            result = await ClaudeService().regenerate_document(
                make_document(doc_type=DocumentType.COVER_LETTER, content="Lettre v2", version=2)
            )

        assert isinstance(result, str)
        assert len(result) > 5

    @pytest.mark.asyncio
    async def test_prompt_contains_current_version(self):
        """Prompt for regeneration should mention the current version number."""
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            mock_create = MockCls.return_value.messages.create
            mock_create.return_value = _mock_response("Improved content")
            await ClaudeService().regenerate_document(
                make_document(doc_type=DocumentType.CV, content="Original", version=3)
            )

        user_content = mock_create.call_args.kwargs["messages"][0]["content"]
        assert "3" in user_content  # version 3 must appear

    @pytest.mark.asyncio
    async def test_prompt_contains_existing_content(self):
        """Prompt should embed the existing document content for context."""
        unique_text = "UNIQUE_MARKER_CONTENT_XYZ"
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            mock_create = MockCls.return_value.messages.create
            mock_create.return_value = _mock_response("New content")
            await ClaudeService().regenerate_document(
                make_document(doc_type=DocumentType.CV, content=unique_text, version=1)
            )

        user_content = mock_create.call_args.kwargs["messages"][0]["content"]
        assert unique_text in user_content

    @pytest.mark.asyncio
    async def test_cover_letter_prompt_enforces_word_count(self):
        """Cover letter regeneration prompt should mention 300-350 word constraint."""
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            mock_create = MockCls.return_value.messages.create
            mock_create.return_value = _mock_response("Lettre améliorée")
            await ClaudeService().regenerate_document(
                make_document(doc_type=DocumentType.COVER_LETTER, content="Lettre v1", version=1)
            )

        user_content = mock_create.call_args.kwargs["messages"][0]["content"]
        assert "300" in user_content
        assert "350" in user_content

    @pytest.mark.asyncio
    async def test_api_error_propagates(self):
        with patch("app.services.claude_service.anthropic.Anthropic") as MockCls:
            MockCls.return_value.messages.create.side_effect = Exception("Overloaded")
            with pytest.raises(Exception, match="Overloaded"):
                await ClaudeService().regenerate_document(
                    make_document(content="Some content", version=1)
                )
