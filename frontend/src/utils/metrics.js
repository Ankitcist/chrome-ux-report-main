export const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatMetric = (value, fractionDigits = 2) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(fractionDigits);
};

export const statusToChipColor = (status) => {
  if (status === "success") {
    return "success";
  }
  if (status === "partial_success") {
    return "warning";
  }
  return "error";
};

export const computeAggregate = (rows, key) => {
  const metricValues = rows
    .map((row) => row[key])
    .filter((metric) => typeof metric === "number" && !Number.isNaN(metric));

  if (!metricValues.length) {
    return { sum: 0, average: 0 };
  }

  const sum = metricValues.reduce((acc, curr) => acc + curr, 0);
  return { sum, average: sum / metricValues.length };
};
