from __future__ import annotations

from typing import Any, Dict, List

from django.conf import settings
from requests import RequestException
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .exceptions import CruxDataUnavailableError, CruxValidationError
from .services import CruxMetricsService


class CruxMetricsView(APIView):
    """POST endpoint to query CrUX metrics for multiple URLs."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self._service = CruxMetricsService()

    def post(self, request, *args, **kwargs):  # type: ignore[no-untyped-def]
        if not settings.CRUX_API_KEY:
            return Response(
                {"detail": "CRUX_API_KEY is not configured in backend environment."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        urls = request.data.get("urls")
        if not isinstance(urls, list):
            return Response(
                {"detail": "Payload must include 'urls' as an array of URL strings."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results: List[Dict[str, Any]] = []
        for url in urls:
            raw_value = str(url or "").strip()
            if not raw_value:
                results.append(
                    {
                        "url": raw_value,
                        "status": "error",
                        "error": "URL is empty.",
                    }
                )
                continue

            try:
                metric_result = self._service.fetch_metrics_for_url(raw_value)
                results.append(
                    {
                        "url": metric_result.origin,
                        "lcp": metric_result.lcp,
                        "inp": metric_result.inp,
                        "cls": metric_result.cls,
                        "status": metric_result.status,
                        "recommendation": metric_result.recommendation,
                    }
                )
            except (CruxValidationError, CruxDataUnavailableError) as exc:
                results.append(
                    {
                        "url": raw_value,
                        "status": "error",
                        "error": str(exc),
                    }
                )
            except RequestException:
                results.append(
                    {
                        "url": raw_value,
                        "status": "error",
                        "error": "External CrUX API request failed. Try again later.",
                    }
                )
            except Exception:
                results.append(
                    {
                        "url": raw_value,
                        "status": "error",
                        "error": "Unexpected server error while processing URL.",
                    }
                )

        return Response({"results": results}, status=status.HTTP_200_OK)
