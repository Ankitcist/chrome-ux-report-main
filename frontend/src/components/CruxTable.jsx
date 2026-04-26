import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import MetricFilterControl from "./MetricFilterControl";
import { metricFilterConfig } from "../constants/filters";
import {
  computeAggregate,
  formatMetric,
  statusToChipColor,
  toNumberOrNull
} from "../utils/metrics";

function CruxTable({ rows }) {
  const [filters, setFilters] = useState({
    lcp: { operator: "gt", value: "" },
    inp: { operator: "gt", value: "" },
    cls: { operator: "gt", value: "" }
  });

  const numericThresholds = useMemo(() => {
    return {
      lcp: toNumberOrNull(filters.lcp.value),
      inp: toNumberOrNull(filters.inp.value),
      cls: toNumberOrNull(filters.cls.value)
    };
  }, [filters]);

  const handleOperatorChange = (metricKey, operator) => {
    setFilters((prev) => ({
      ...prev,
      [metricKey]: { ...prev[metricKey], operator }
    }));
  };

  const handleThresholdChange = (metricKey, value) => {
    setFilters((prev) => ({
      ...prev,
      [metricKey]: { ...prev[metricKey], value }
    }));
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      for (const config of metricFilterConfig) {
        const metricKey = config.key;
        const thresholdNumber = numericThresholds[metricKey];
        if (thresholdNumber !== null) {
          const metricValue = row[metricKey];
          if (typeof metricValue !== "number") {
            return false;
          }
          const operator = filters[metricKey].operator;
          const metricPasses =
            operator === "gt"
              ? metricValue > thresholdNumber
              : metricValue < thresholdNumber;
          if (!metricPasses) {
            return false;
          }
        }
      }

      return true;
    });
  }, [rows, filters, numericThresholds]);

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
          {metricFilterConfig.map((config) => (
            <MetricFilterControl
              key={config.key}
              metricKey={config.key}
              metricLabel={config.label}
              unit={config.unit}
              operator={filters[config.key].operator}
              thresholdValue={filters[config.key].value}
              onOperatorChange={handleOperatorChange}
              onThresholdChange={handleThresholdChange}
            />
          ))}
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
