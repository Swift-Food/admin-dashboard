import http from "./http";
import type {
  FinancialMetricsParams,
  FinancialMetricsResponse,
} from "../types/catering-financials.types";

const getFinancialMetrics = async (
  params: FinancialMetricsParams
): Promise<FinancialMetricsResponse> => {
  const res = await http.get<FinancialMetricsResponse>(
    "admin/catering-orders/financial-metrics",
    { params }
  );
  return res.data;
};

export default { getFinancialMetrics };
