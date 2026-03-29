from typing import Optional

from app.models.job_offer import JobOffer

# Default IT architect profile configuration
ARCHITECT_PROFILE = {
    "target_roles": [
        "Architecte Solutions", "Architecte Enterprise", "Lead Architect",
        "Principal Engineer", "CTO", "VP Engineering", "Head of Architecture",
    ],
    "must_have_skills": [
        "Architecture logicielle", "Cloud", "API", "Microservices",
        "DDD", "DevOps", "Leadership technique",
    ],
    "preferred_technologies": [
        "AWS", "Azure", "GCP", "Kubernetes", "Docker", "Kafka", "Python",
        "Java", "TypeScript", "PostgreSQL", "MongoDB", "Terraform",
    ],
    "preferred_domains": [
        "Finance", "FinTech", "Digital", "SaaS", "Data", "E-commerce",
    ],
    "preferred_work_modes": ["Hybride", "Télétravail"],
    "preferred_contract_types": ["CDI", "Freelance"],
    "min_seniority": ["Senior", "Lead", "Principal", "Architecte", "Directeur"],
    "salary_target_min": 90000,
    "preferred_locations": ["Paris", "Île-de-France", "Remote"],
}


class ScoringService:
    """Rule-based scoring for job offers (fast, no API call needed)."""

    def score_offer(self, offer: JobOffer) -> tuple[float, dict]:
        details: dict = {}
        scores: dict[str, float] = {}

        # 1. Title match (20 pts)
        title_score = self._score_title(offer.title, details)
        scores["title"] = title_score

        # 2. Tech stack match (25 pts)
        tech_score = self._score_tech(offer.tech_stack or [], details)
        scores["tech"] = tech_score

        # 3. Work mode (15 pts)
        work_mode_score = self._score_work_mode(offer.work_mode, details)
        scores["work_mode"] = work_mode_score

        # 4. Contract type (10 pts)
        contract_score = self._score_contract(offer.contract_type, details)
        scores["contract"] = contract_score

        # 5. Seniority (15 pts)
        seniority_score = self._score_seniority(offer.seniority_level, details)
        scores["seniority"] = seniority_score

        # 6. Salary (15 pts)
        salary_score = self._score_salary(offer.salary_min, offer.salary_max, details)
        scores["salary"] = salary_score

        # Weighted total
        total = (
            scores["title"] * 0.20
            + scores["tech"] * 0.25
            + scores["work_mode"] * 0.15
            + scores["contract"] * 0.10
            + scores["seniority"] * 0.15
            + scores["salary"] * 0.15
        )

        details["scores"] = scores
        details["total"] = round(total, 1)
        details["recommendation"] = self._get_recommendation(total)

        return round(total, 1), details

    def _score_title(self, title: str, details: dict) -> float:
        title_lower = title.lower()
        for role in ARCHITECT_PROFILE["target_roles"]:
            if any(word.lower() in title_lower for word in role.split()):
                details["title_match"] = f"Correspondance trouvée: '{role}'"
                return 100.0
        # Partial match
        if any(kw in title_lower for kw in ["senior", "lead", "principal", "chief", "head"]):
            details["title_match"] = "Niveau senior détecté"
            return 70.0
        details["title_match"] = "Pas de correspondance directe"
        return 30.0

    def _score_tech(self, tech_stack: list[str], details: dict) -> float:
        if not tech_stack:
            details["tech_match"] = "Stack non renseignée"
            return 50.0
        preferred = [t.lower() for t in ARCHITECT_PROFILE["preferred_technologies"]]
        offer_tech = [t.lower() for t in tech_stack]
        matches = [t for t in offer_tech if any(p in t or t in p for p in preferred)]
        score = min(100.0, len(matches) / max(len(preferred), 1) * 200)
        details["tech_match"] = f"{len(matches)}/{len(tech_stack)} technologies préférées"
        details["matched_tech"] = matches[:10]
        return round(score, 1)

    def _score_work_mode(self, work_mode, details: dict) -> float:
        if work_mode is None:
            details["work_mode_match"] = "Non renseigné"
            return 50.0
        wm = str(work_mode.value if hasattr(work_mode, "value") else work_mode)
        if wm in ARCHITECT_PROFILE["preferred_work_modes"]:
            details["work_mode_match"] = f"Mode préféré: {wm}"
            return 100.0
        details["work_mode_match"] = f"Mode non préféré: {wm}"
        return 25.0

    def _score_contract(self, contract_type, details: dict) -> float:
        if contract_type is None:
            details["contract_match"] = "Non renseigné"
            return 50.0
        ct = str(contract_type.value if hasattr(contract_type, "value") else contract_type)
        if ct in ARCHITECT_PROFILE["preferred_contract_types"]:
            details["contract_match"] = f"Contrat préféré: {ct}"
            return 100.0
        details["contract_match"] = f"Contrat non préféré: {ct}"
        return 30.0

    def _score_seniority(self, seniority_level, details: dict) -> float:
        if seniority_level is None:
            details["seniority_match"] = "Non renseigné"
            return 60.0
        sl = str(seniority_level.value if hasattr(seniority_level, "value") else seniority_level)
        if sl in ARCHITECT_PROFILE["min_seniority"]:
            details["seniority_match"] = f"Niveau correspondant: {sl}"
            return 100.0
        details["seniority_match"] = f"Niveau insuffisant: {sl}"
        return 20.0

    def _score_salary(
        self, salary_min: Optional[float], salary_max: Optional[float], details: dict
    ) -> float:
        target = ARCHITECT_PROFILE["salary_target_min"]
        if salary_max is None and salary_min is None:
            details["salary_match"] = "Salaire non renseigné"
            return 50.0
        ref = salary_max or salary_min
        if ref >= target:
            details["salary_match"] = f"Salaire au-dessus du minimum ({ref:,.0f}€ >= {target:,.0f}€)"
            return 100.0
        elif ref >= target * 0.85:
            details["salary_match"] = f"Salaire proche du minimum ({ref:,.0f}€)"
            return 70.0
        details["salary_match"] = f"Salaire en dessous du minimum ({ref:,.0f}€ < {target:,.0f}€)"
        return 20.0

    def _get_recommendation(self, score: float) -> str:
        if score >= 80:
            return "Fortement recommandé"
        elif score >= 65:
            return "Recommandé"
        elif score >= 50:
            return "Neutre"
        else:
            return "Déconseillé"
