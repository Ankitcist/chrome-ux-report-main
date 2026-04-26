import {
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from "@mui/material";
import { filterOperators } from "../constants/filters";

function MetricFilterControl({
  metricKey,
  metricLabel,
  unit,
  operator,
  thresholdValue,
  onOperatorChange,
  onThresholdChange
}) {
  const labelId = `${metricKey}-op-label`;

  return (
    <>
      <FormControl sx={{ minWidth: 130 }}>
        <InputLabel id={labelId}>Filter</InputLabel>
        <Select
          labelId={labelId}
          label="Filter"
          value={operator}
          onChange={(event) => onOperatorChange(metricKey, event.target.value)}
        >
          {filterOperators.map((operatorOption) => (
            <MenuItem key={operatorOption.value} value={operatorOption.value}>
              {`${metricLabel} ${operatorOption.label}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Threshold"
        type="number"
        value={thresholdValue}
        onChange={(event) => onThresholdChange(metricKey, event.target.value)}
        InputProps={
          unit
            ? {
                endAdornment: <InputAdornment position="end">{unit}</InputAdornment>
              }
            : undefined
        }
        helperText={`${metricLabel} filter (empty = ignore)`}
      />
    </>
  );
}

export default MetricFilterControl;
