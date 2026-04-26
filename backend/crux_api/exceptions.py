class CruxServiceError(Exception):
    """Base exception for CrUX service errors."""


class CruxValidationError(CruxServiceError):
    """Raised when a URL is invalid."""


class CruxDataUnavailableError(CruxServiceError):
    """Raised when CrUX data is unavailable for a URL."""
