import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CruxTable from "./components/CruxTable";
import { fetchCruxMetrics } from "./services/api";

const parseInputUrls = (rawInput) => {
  return rawInput
    .split(/[\n,]+/)
    .map((url) => url.trim())
    .filter(Boolean);
};

function App() {
  const [urlInput, setUrlInput] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalCount = rows.length;
  const successCount = useMemo(
    () => rows.filter((row) => row.status === "success").length,
    [rows]
  );
  const partialCount = useMemo(
    () => rows.filter((row) => row.status === "partial_success").length,
    [rows]
  );
  const errorCount = totalCount - successCount - partialCount;

  const handleSearch = async () => {
    const parsedUrls = parseInputUrls(urlInput);
    if (!parsedUrls.length) {
      setError("Please provide at least one URL.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const response = await fetchCruxMetrics(parsedUrls);
      const mappedRows = (response.results || []).map((result, index) => ({
        id: `${result.url}-${index}`,
        url: result.url,
        lcp: typeof result.lcp === "number" ? result.lcp : null,
        inp: typeof result.inp === "number" ? result.inp : null,
        cls: typeof result.cls === "number" ? result.cls : null,
        status: result.status || "error",
        recommendation: result.recommendation || result.error || "-"
      }));
      setRows(mappedRows);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "Failed to query backend API. Verify backend server and API key."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Chrome UX Report Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Query CrUX origin metrics and inspect Core Web Vitals across URLs.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="URLs (one per line or comma-separated)"
              multiline
              minRows={4}
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              placeholder={"https://developer.intuit.com\nhttps://web.dev"}
              fullWidth
            />
            <Box>
              <Button
                variant="contained"
                onClick={handleSearch}
                startIcon={loading ? <CircularProgress size={18} /> : <SearchIcon />}
                disabled={loading}
              >
                {loading ? "Searching..." : "Search"}
              </Button>
            </Box>
          </Stack>
        </Paper>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Alert severity="info">Total: {totalCount}</Alert>
          <Alert severity="success">Success: {successCount}</Alert>
          <Alert severity={partialCount ? "warning" : "success"}>
            Partial: {partialCount}
          </Alert>
          <Alert severity={errorCount ? "warning" : "success"}>Errors: {errorCount}</Alert>
        </Stack>

        <CruxTable rows={rows} />
      </Stack>
    </Container>
  );
}

export default App;
