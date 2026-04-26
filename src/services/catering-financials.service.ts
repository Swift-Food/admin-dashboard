import http from "./http";
import type {
  FinancialMetricsParams,
  FinancialMetricsResponse,
  UpdateMscFeesResponse,
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

const updateMscFees = async (
  fees: Record<string, number>
): Promise<UpdateMscFeesResponse> => {
  const res = await http.post<UpdateMscFeesResponse>(
    "admin/catering-orders/financial-metrics/msc-fees",
    fees
  );
  return res.data;
};

export default { getFinancialMetrics, updateMscFees };
