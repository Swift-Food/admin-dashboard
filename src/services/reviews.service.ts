import http from "./http";
import type {
  ReviewListParams,
  ReviewListResponse,
} from "../types/reviews.types";

const getReviews = async (
  params: ReviewListParams
): Promise<ReviewListResponse> => {
  const res = await http.get<ReviewListResponse>("admin/order-reviews", {
    params,
  });
  return res.data;
};

export default { getReviews };
