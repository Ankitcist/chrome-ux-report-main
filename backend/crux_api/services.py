from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict
from urllib.parse import urlparse

import requests
from django.conf import settings

from .exceptions import CruxDataUnavailableError, CruxValidationError


@dataclass(frozen=True)
class CruxMetricResult:
    origin: str
    lcp: float
    inp: float | None
    cls: float
    status: str
    recommendation: str


class CruxClient:
    """HTTP client for the CrUX API."""

    def __init__(self, timeout_seconds: int = 12) -> None:
        self._timeout_seconds = timeout_seconds
        self._api_url = settings.CRUX_API_URL
        self._session = requests.Session()

    def query_origin(self, origin: str) -> Dict[str, Any]:
        payload = {"origin": origin}
        response = self._session.post(
            self._api_url,
            json=payload,
            timeout=self._timeout_seconds,
        )

        if response.status_code == 404:
            raise CruxDataUnavailableError("No CrUX data found for this URL.")

        if response.status_code == 400:
            raise CruxValidationError("Invalid URL format for CrUX origin query.")

        response.raise_for_status()
        return response.json()


class CruxMetricsService:
    """Application service for validating URLs and extracting key metrics."""

    def __init__(self, client: CruxClient | None = None) -> None:
        self._client = client or CruxClient()

    def fetch_metrics_for_url(self, raw_url: str) -> CruxMetricResult:
        origin = self._normalize_origin(raw_url)
        response = self._client.query_origin(origin)

        record = response.get("record", {})
        metrics = record.get("metrics", {})

        lcp = self._extract_percentile(metrics, "largest_contentful_paint")
        inp = self._extract_optional_percentile(metrics, "interaction_to_next_paint")
        cls = self._extract_percentile(metrics, "cumulative_layout_shift")

        status = "success" if inp is not None else "partial_success"

        return CruxMetricResult(
            origin=origin,
            lcp=lcp,
            inp=inp,
            cls=cls,
            status=status,
            recommendation=self._build_recommendation(lcp=lcp, inp=inp, cls=cls),
        )

    @staticmethod
    def _normalize_origin(raw_url: str) -> str:
        candidate = (raw_url or "").strip()
        if not candidate:
            raise CruxValidationError("URL is empty.")

        parsed = urlparse(candidate)
        if not parsed.scheme:
            candidate = f"https://{candidate}"
            parsed = urlparse(candidate)

        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise CruxValidationError("URL must include a valid host.")

        # CrUX expects origin-level input (scheme + host + optional port).
        return f"{parsed.scheme}://{parsed.netloc}"

    @staticmethod
    def _extract_percentile(metrics: Dict[str, Any], key: str) -> float:
        try:
            return float(metrics[key]["percentiles"]["p75"])
        except (KeyError, TypeError, ValueError) as exc:
            raise CruxDataUnavailableError(
                f"Missing percentile data for metric: {key}."
            ) from exc

    @staticmethod
    def _extract_optional_percentile(metrics: Dict[str, Any], key: str) -> float | None:
        try:
            return float(metrics[key]["percentiles"]["p75"])
        except (KeyError, TypeError, ValueError):
            return None

    @staticmethod
    def _build_recommendation(lcp: float, inp: float | None, cls: float) -> str:
        recommendations = []

        if lcp > 2500:
            recommendations.append("Needs Improvement: optimize images and server response.")
        if inp is None:
            recommendations.append("Note: INP is unavailable for this origin in current CrUX data.")
        elif inp > 500:
            recommendations.append("Poor INP: optimize event handlers and reduce long main-thread tasks.")
        elif inp > 200:
            recommendations.append("Needs Improvement INP: improve interaction responsiveness.")
        if cls > 0.1:
            recommendations.append("Needs Improvement: reserve layout space for media/components.")

        if not recommendations:
            return "Good: Core Web Vitals are within recommended thresholds."

        return " ".join(recommendations)
