import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const thresholdOperators = [
  { value: "gt", label: "LCP >" },
  { value: "lt", label: "LCP <" }
];

const inpThresholdOperators = [
  { value: "gt", label: "INP >" },
  { value: "lt", label: "INP <" }
];

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMetric = (value, fractionDigits = 2) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(fractionDigits);
};

const statusToChipColor = (status) => {
  if (status === "success") {
    return "success";
  }
  if (status === "partial_success") {
    return "warning";
  }
  return "error";
};

const computeAggregate = (rows, key) => {
  const metricValues = rows
    .map((row) => row[key])
    .filter((metric) => typeof metric === "number" && !Number.isNaN(metric));
  if (!metricValues.length) {
    return { sum: 0, average: 0 };
  }
  const sum = metricValues.reduce((acc, curr) => acc + curr, 0);
  return { sum, average: sum / metricValues.length };
};

function CruxTable({ rows }) {
  const [thresholdOperator, setThresholdOperator] = useState("gt");
  const [thresholdValue, setThresholdValue] = useState("");
  const [inpThresholdOperator, setInpThresholdOperator] = useState("gt");
  const [inpThresholdValue, setInpThresholdValue] = useState("");

  const thresholdNumber = toNumberOrNull(thresholdValue);
  const inpThresholdNumber = toNumberOrNull(inpThresholdValue);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (thresholdNumber !== null) {
        if (typeof row.lcp !== "number") {
          return false;
        }
        const lcpPasses =
          thresholdOperator === "gt"
            ? row.lcp > thresholdNumber
            : row.lcp < thresholdNumber;
        if (!lcpPasses) {
          return false;
        }
      }

      if (inpThresholdNumber !== null) {
        if (typeof row.inp !== "number") {
          return false;
        }
        const inpPasses =
          inpThresholdOperator === "gt"
            ? row.inp > inpThresholdNumber
            : row.inp < inpThresholdNumber;
        if (!inpPasses) {
          return false;
        }
      }

      return true;
    });
  }, [
    rows,
    thresholdNumber,
    thresholdOperator,
    inpThresholdNumber,
    inpThresholdOperator
  ]);

  const summary = useMemo(() => {
    return {
      lcp: computeAggregate(filteredRows, "lcp"),
      inp: computeAggregate(filteredRows, "inp"),
      cls: computeAggregate(filteredRows, "cls")
    };
  }, [filteredRows]);

  const columns = [
    { field: "url", headerName: "URL", flex: 1.3, minWidth: 220, sortable: true },
    {
      field: "lcp",
      headerName: "LCP (ms)",
      width: 130,
      sortable: true,
      valueFormatter: (value) => formatMetric(value)
    },
    {
      field: "inp",
      headerName: "INP (ms)",
      width: 130,
      sortable: true,
      valueFormatter: (value) => formatMetric(value)
    },
    {
      field: "cls",
      headerName: "CLS",
      width: 120,
      sortable: true,
      valueFormatter: (value) => formatMetric(value, 3)
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      sortable: true,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value}
          color={statusToChipColor(params.value)}
          variant="outlined"
        />
      )
    },
    {
      field: "recommendation",
      headerName: "Insight",
      flex: 1.4,
      minWidth: 280,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title={params.value || "No recommendation available"}>
          <Typography variant="body2" noWrap>
            {params.value || "-"}
          </Typography>
        </Tooltip>
      )
    }
  ];

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl sx={{ minWidth: 130 }}>
            <InputLabel id="lcp-op-label">Filter</InputLabel>
            <Select
              labelId="lcp-op-label"
              label="Filter"
              value={thresholdOperator}
              onChange={(event) => setThresholdOperator(event.target.value)}
            >
              {thresholdOperators.map((operator) => (
                <MenuItem key={operator.value} value={operator.value}>
                  {operator.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Threshold"
            type="number"
            value={thresholdValue}
            onChange={(event) => setThresholdValue(event.target.value)}
            InputProps={{
              endAdornment: <InputAdornment position="end">ms</InputAdornment>
            }}
            helperText="LCP filter (empty = ignore)"
          />

          <FormControl sx={{ minWidth: 130 }}>
            <InputLabel id="inp-op-label">Filter</InputLabel>
            <Select
              labelId="inp-op-label"
              label="Filter"
              value={inpThresholdOperator}
              onChange={(event) => setInpThresholdOperator(event.target.value)}
            >
              {inpThresholdOperators.map((operator) => (
                <MenuItem key={operator.value} value={operator.value}>
                  {operator.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Threshold"
            type="number"
            value={inpThresholdValue}
            onChange={(event) => setInpThresholdValue(event.target.value)}
            InputProps={{
              endAdornment: <InputAdornment position="end">ms</InputAdornment>
            }}
            helperText="INP filter (empty = ignore)"
          />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ height: 450, width: "100%" }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          pageSizeOptions={[5, 10, 25]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
            sorting: { sortModel: [{ field: "lcp", sort: "asc" }] }
          }}
          disableRowSelectionOnClick
        />
      </Paper>

      {rows.length > 0 && filteredRows.length === 0 ? (
        <Alert severity="info">
          No rows match the current filter. Adjust the threshold to view data.
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Summary (Currently Displayed Rows)
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
          <Box>
            <Typography variant="subtitle2">LCP</Typography>
            <Typography variant="body2">Sum: {formatMetric(summary.lcp.sum)} ms</Typography>
            <Typography variant="body2">
              Average: {formatMetric(summary.lcp.average)} ms
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2">INP</Typography>
            <Typography variant="body2">Sum: {formatMetric(summary.inp.sum)} ms</Typography>
            <Typography variant="body2">
              Average: {formatMetric(summary.inp.average)} ms
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2">CLS</Typography>
            <Typography variant="body2">Sum: {formatMetric(summary.cls.sum, 3)}</Typography>
            <Typography variant="body2">
              Average: {formatMetric(summary.cls.average, 3)}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default CruxTable;
