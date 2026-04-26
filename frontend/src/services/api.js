import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

export const fetchCruxMetrics = async (urls) => {
  const response = await apiClient.post("/api/crux/", { urls });
  return response.data;
};

export default apiClient;
