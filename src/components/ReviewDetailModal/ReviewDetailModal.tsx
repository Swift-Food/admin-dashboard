import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Modal } from "../Modal";
import { Stars } from "../Stars";
import type { ReviewItemEntry, ReviewRow } from "../../types/reviews.types";

interface ReviewDetailModalProps {
  review: ReviewRow | null;
  onClose: () => void;
}

interface RestaurantTab {
  key: string;
  label: string;
  labelIsMono: boolean;
  score: number | null;
  comment: string | null;
  dishes: ReviewItemEntry[];
}

const TAB_OVERALL = "__overall__";
const TAB_OTHER = "__other__";

export function ReviewDetailModal({ review, onClose }: ReviewDetailModalProps) {
  const [activeTab, setActiveTab] = useState<string>(TAB_OVERALL);

  useEffect(() => {
    setActiveTab(TAB_OVERALL);
  }, [review?.submissionId]);

  const { restaurantTabs, otherItems } = useMemo(() => {
    if (!review) {
      return { restaurantTabs: [] as RestaurantTab[], otherItems: [] as ReviewItemEntry[] };
    }

    const tabs = new Map<string, RestaurantTab>();
    for (const r of review.restaurants) {
      tabs.set(r.restaurantId, {
        key: r.restaurantId,
        label: r.restaurantName,
        labelIsMono: false,
        score: r.score,
        comment: r.comment,
        dishes: [],
      });
    }

    const others: ReviewItemEntry[] = [];
    for (const item of review.items) {
      if (item.restaurantId === null) {
        others.push(item);
        continue;
      }
      let tab = tabs.get(item.restaurantId);
      if (!tab) {
        const id = item.restaurantId;
        tab = {
          key: id,
          label: id.length > 0 ? id.slice(0, 8) : "Unknown restaurant",
          labelIsMono: id.length > 0,
          score: null,
          comment: null,
          dishes: [],
        };
        tabs.set(id, tab);
      }
      tab.dishes.push(item);
    }

    return { restaurantTabs: Array.from(tabs.values()), otherItems: others };
  }, [review]);

  if (!review) return null;

  const hasOther = otherItems.length > 0;
  const activeRestaurant = restaurantTabs.find((t) => t.key === activeTab);

  const tabButtonClass = (isActive: boolean) =>
    `w-full text-left px-4 py-3 border-l-4 transition-colors ${
      isActive
        ? "bg-blue-50 border-blue-500"
        : "border-transparent hover:bg-gray-50"
    }`;

  return (
    <Modal open={!!review} onClose={onClose}>
      <div className="w-[92vw] max-w-6xl min-h-[28rem] max-h-[85vh] bg-white rounded-xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <span className="font-mono text-xs text-gray-500 whitespace-nowrap">
              {(review.orderReference ?? review.orderId).slice(0, 8)}
            </span>
            <span className="text-sm font-semibold text-gray-900 truncate">
              {review.reviewerName ?? review.reviewerEmail ?? "Guest"}
            </span>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {new Date(review.submittedAt).toLocaleDateString("en-GB")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
          {/* Tab list */}
          <div className="w-56 border-r border-gray-200 overflow-y-auto shrink-0">
            <button
              onClick={() => setActiveTab(TAB_OVERALL)}
              className={tabButtonClass(activeTab === TAB_OVERALL)}
            >
              <p className="text-sm font-medium text-gray-900">Overall</p>
              <div className="mt-1">
                <Stars score={review.orderScore} />
              </div>
            </button>

            {restaurantTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={tabButtonClass(activeTab === tab.key)}
              >
                <p
                  className={`text-sm font-medium text-gray-900 truncate ${
                    tab.labelIsMono ? "font-mono" : ""
                  }`}
                >
                  {tab.label}
                </p>
                <div className="mt-1">
                  {tab.score === null ? (
                    <span className="text-xs text-gray-400">No rating</span>
                  ) : (
                    <Stars score={tab.score} />
                  )}
                </div>
              </button>
            ))}

            {hasOther ? (
              <button
                onClick={() => setActiveTab(TAB_OTHER)}
                className={tabButtonClass(activeTab === TAB_OTHER)}
              >
                <p className="text-sm font-medium text-gray-900">Other</p>
                <span className="text-xs text-gray-400">No rating</span>
              </button>
            ) : null}
          </div>

          {/* Detail pane */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {activeTab === TAB_OVERALL && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Overall
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <Stars score={review.orderScore} size="lg" />
                  <span className="text-lg font-semibold text-gray-900">
                    {review.orderScore ?? "No rating"}
                  </span>
                </div>
                {review.orderComment ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {review.orderComment}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">No comment left</p>
                )}
              </div>
            )}

            {activeTab === TAB_OTHER && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Other
                </p>
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {otherItems.map((item) => (
                    <div key={item.menuItemId} className="py-3">
                      <p className="text-sm font-medium text-gray-800">
                        {item.menuItemName}
                      </p>
                      <Stars score={item.score} />
                      {item.comment ? (
                        <p className="mt-1 text-sm text-gray-700">{item.comment}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeRestaurant ? (
              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ${
                    activeRestaurant.labelIsMono ? "font-mono" : ""
                  }`}
                >
                  {activeRestaurant.label}
                </p>
                <div className="flex items-center gap-3 mb-2">
                  {activeRestaurant.score === null ? (
                    <span className="text-sm text-gray-400">No rating</span>
                  ) : (
                    <>
                      <Stars score={activeRestaurant.score} size="lg" />
                      <span className="text-lg font-semibold text-gray-900">
                        {activeRestaurant.score}
                      </span>
                    </>
                  )}
                </div>
                {activeRestaurant.comment ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mb-6">
                    {activeRestaurant.comment}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 mb-6">No comment left</p>
                )}

                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Dishes
                </p>
                {activeRestaurant.dishes.length === 0 ? (
                  <p className="text-sm text-gray-400">No dish ratings</p>
                ) : (
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {activeRestaurant.dishes.map((item) => (
                      <div key={item.menuItemId} className="py-3">
                        <p className="text-sm font-medium text-gray-800">
                          {item.menuItemName}
                        </p>
                        <Stars score={item.score} />
                        {item.comment ? (
                          <p className="mt-1 text-sm text-gray-700">{item.comment}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ReviewDetailModal;
