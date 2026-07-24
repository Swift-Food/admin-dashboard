import { useState, useEffect, useCallback } from "react";
import type { CateringOrder } from "../types/catering.types";
import cateringService, { type SendPaymentLinkDto } from "../services/catering.service";
import { Modal } from "../components/Modal";
import { RefundModal } from "../components/refund/RefundModal";
import { RefundHistoryList } from "../components/refund/RefundHistoryList";
import { BulkDownloadsModal } from "../components/BulkDownloadsModal";

const CateringOrderDetailsModal = ({ order, isOpen, onClose, onOrderUpdated }: { order: CateringOrder | null; isOpen: boolean; onClose: () => void; onOrderUpdated?: () => void }) => {
  
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmReview, setShowConfirmReview] = useState(false);
  const [isSendingPaymentLink, setIsSendingPaymentLink] = useState(false);
  const [showSendPaymentModal, setShowSendPaymentModal] = useState(false);
  const [isLoadingVATPreview, setIsLoadingVATPreview] = useState(false);
  const [paymentLinkForm, setPaymentLinkForm] = useState({
    daysUntilDue: 7,
    ccEmails: "",
    publicNote: "",
    internalNote: "",
    preview: false,
  });
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundHistoryToken, setRefundHistoryToken] = useState(0);
  const [reviewForm, setReviewForm] = useState<{
    finalTotal: string;
    collectionTime: string;
    sessionCollectionTimes: {
      [sessionId: string]: string;
    };
    sessionDeliveryFeeOverrides: {
      [sessionId: string]: string;
    };
    depositAmount: string;
    adminNotes: string;
    reviewedBy: string;
  }>({
    finalTotal: "",
    collectionTime: "",
    sessionCollectionTimes: {},
    sessionDeliveryFeeOverrides: {},
    depositAmount: "",
    adminNotes: "",
    reviewedBy: "admin",
  });

  useEffect(() => {
    if (order && showConfirmReview) {
      const sessionTimes: { [sessionId: string]: string } = {};
      const deliveryFeeOverrides: { [sessionId: string]: string } = {};

      if (order.mealSessions && order.mealSessions.length > 0) {
        order.mealSessions.forEach((session) => {
          sessionTimes[session.id] =
            session.collectionTime ||
            order.collectionTime ||
            "";
          deliveryFeeOverrides[session.id] = (
            session.deliveryFeeOverride != null
              ? session.deliveryFeeOverride
              : session.deliveryFee
          )?.toString() || "0";
        });
      } else {
        sessionTimes["default"] = order.collectionTime || "";
      }

      setReviewForm((prev) => ({
        ...prev,
        sessionCollectionTimes: sessionTimes,
        sessionDeliveryFeeOverrides: deliveryFeeOverrides,
      }));
    }
  }, [order, showConfirmReview]);

  if (!isOpen || !order) return null;

  // Compute auto-updating total from delivery fee overrides
  const computedTotal = (() => {
    if (!order.mealSessions || order.mealSessions.length === 0) {
      return order.customerFinalTotal || order.finalTotal || order.estimatedTotal || 0;
    }
    // Sum session totals, replacing delivery fees with overrides where provided
    let total = 0;
    for (const session of order.mealSessions) {
      const overrideStr = reviewForm.sessionDeliveryFeeOverrides[session.id];
      const overrideFee = overrideStr !== undefined && overrideStr !== "" ? parseFloat(overrideStr) : null;
      const deliveryFee = overrideFee !== null && !isNaN(overrideFee) ? overrideFee : Number(session.deliveryFee || 0);
      const sessionTotal = Number(session.subtotal || 0) + deliveryFee
        + Number(session.serviceCharge || 0)
        - Number(session.promoDiscount || 0)
        - Number(session.promotionDiscount || 0);
      total += sessionTotal;
    }
    // Venue Service Fee (partner commission) is order-level and part of finalTotal
    total += Number(order.partnerCommissionFee || 0);
    return total;
  })();

  const formatCurrency = (amount?: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (typeof numAmount === "number" && !isNaN(numAmount)) {
      return `£${numAmount.toFixed(2)}`;
    }
    return "N/A";
  };

  const handleCompleteOrder = async () => {
    setIsCompleting(true);
    try {
      await cateringService.completeOrder(order.id);
      setShowConfirmComplete(false);
      if (onOrderUpdated) {
        await onOrderUpdated();
      }
      onClose();
    } catch (error: any) {
      console.error("Failed to complete order:", error);
      alert(error?.response?.data?.message || "Failed to complete order");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      await cateringService.cancelOrder(order.id);
      setShowConfirmCancel(false);
      if (onOrderUpdated) {
        await onOrderUpdated();
      }
      onClose();
    } catch (error: any) {
      console.error("Failed to cancel order:", error);
      alert(error?.response?.data?.message || "Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReviewOrder = async () => {
    // Validate collection times are before event times
    if (order.mealSessions && order.mealSessions.length > 0) {
      for (const session of order.mealSessions) {
        const collectionTime = reviewForm.sessionCollectionTimes[session.id];
        if (collectionTime && session.eventTime && collectionTime >= session.eventTime) {
          alert(`Collection time (${collectionTime}) must be before event time (${session.eventTime}) for "${session.sessionName}"`);
          return;
        }
      }
    } else if (reviewForm.sessionCollectionTimes["default"] && order.eventTime) {
      if (reviewForm.sessionCollectionTimes["default"] >= order.eventTime) {
        alert(`Collection time (${reviewForm.sessionCollectionTimes["default"]}) must be before event time (${order.eventTime})`);
        return;
      }
    }

    setIsReviewing(true);
    try {
      // Only send a finalTotal when the admin explicitly typed a custom one.
      // The backend derives the total (incl. Venue Service Fee) itself; sending
      // the client-side computed total would be pinned as a manualAdjustment.
      const finalTotal = reviewForm.finalTotal
        ? parseFloat(reviewForm.finalTotal)
        : undefined;
  
      // Convert single session time to per-restaurant format for the backend
      const sessionRestaurantCollectionTimes: { [sessionId: string]: { [restaurantId: string]: string } } = {};
      Object.entries(reviewForm.sessionCollectionTimes).forEach(([sessionId, time]) => {
        if (time) {
          sessionRestaurantCollectionTimes[sessionId] = {};
          if (order.mealSessions && order.mealSessions.length > 0) {
            const session = order.mealSessions.find((s) => s.id === sessionId);
            session?.orderItems.forEach((restaurant) => {
              sessionRestaurantCollectionTimes[sessionId][restaurant.restaurantId] = time;
            });
          } else {
            order.restaurants?.forEach((restaurant) => {
              sessionRestaurantCollectionTimes[sessionId][restaurant.restaurantId] = time;
            });
          }
        }
      });

      // Build delivery fee overrides — only include sessions where admin changed the fee
      const sessionDeliveryFeeOverrides: { [sessionId: string]: number } = {};
      if (order.mealSessions && order.mealSessions.length > 0) {
        for (const session of order.mealSessions) {
          const overrideStr = reviewForm.sessionDeliveryFeeOverrides[session.id];
          if (overrideStr !== undefined && overrideStr !== "") {
            const overrideVal = parseFloat(overrideStr);
            const originalFee = Number(session.deliveryFeeOverride ?? session.deliveryFee ?? 0);
            if (!isNaN(overrideVal) && Math.abs(overrideVal - originalFee) > 0.001) {
              sessionDeliveryFeeOverrides[session.id] = overrideVal;
            }
          }
        }
      }

      await cateringService.reviewOrder({
        orderId: order.id,
        finalTotal,
        collectionTime: reviewForm.collectionTime || undefined,
        sessionRestaurantCollectionTimes,
        sessionDeliveryFeeOverrides: Object.keys(sessionDeliveryFeeOverrides).length > 0
          ? sessionDeliveryFeeOverrides
          : undefined,
        depositAmount: reviewForm.depositAmount ? parseFloat(reviewForm.depositAmount) : undefined,
        adminNotes: reviewForm.adminNotes || undefined,
        reviewedBy: reviewForm.reviewedBy,
      });
      
      setShowConfirmReview(false);
      if (onOrderUpdated) {
        await onOrderUpdated();
      }
      onClose();
    } catch (error: any) {
      console.error("Failed to review order:", error);
      alert(error?.response?.data?.message || "Failed to review order");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleSendPaymentLink = async () => {
    setIsSendingPaymentLink(true);
    try {
      // Normalize / validate CC emails before sending
      const ccEmailsArray = (paymentLinkForm.ccEmails || "")
        .split(/[;,]+/) // split on commas or semicolons
        .map((email) => email.trim())
        .map((email) => email.replace(/\s+/g, "")) // remove stray internal whitespace
        .filter((email) => email.length > 0)
        .map((email) => email.toLowerCase());

      // dedupe
      const uniqueCcEmails = Array.from(new Set(ccEmailsArray));

      // basic email validation
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalid = uniqueCcEmails.filter((e) => !emailRe.test(e));

      if (invalid.length > 0) {
        setIsSendingPaymentLink(false);
        alert(`Invalid CC email(s): ${invalid.join(", ")}`);
        return;
      }

      const payload: SendPaymentLinkDto = {
        orderId: order.id,
        daysUntilDue: paymentLinkForm.daysUntilDue || undefined,
        ccEmails: uniqueCcEmails.length > 0 ? uniqueCcEmails : undefined,
        publicNote: paymentLinkForm.publicNote || undefined,
        internalNote: paymentLinkForm.internalNote || undefined,
        preview: paymentLinkForm.preview,
      };

      await cateringService.sendPaymentLink(payload);

      // Success
      setIsSendingPaymentLink(false);
      onClose();
      if (onOrderUpdated) onOrderUpdated();
      alert("Payment link sent successfully!");
      setShowSendPaymentModal(false);
    } catch (err: any) {
      console.error("Error sending payment link:", err);

      // Check if this is a network timeout - the operation likely succeeded
      const isNetworkError = err?.code === "ERR_NETWORK" || err?.message === "Network Error";

      if (isNetworkError) {
        alert(
          "Request timed out, but the invoice may have been sent successfully. " +
          "Please check your email and refresh the page before trying again."
        );
        // Keep button disabled for 30s on network errors since operation likely succeeded
        setTimeout(() => setIsSendingPaymentLink(false), 30000);
        return;
      }

      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to send payment link. Please try again.";
      alert(`Failed to send payment link: ${serverMessage}`);
      setIsSendingPaymentLink(false);
    }
  };

  const handleRefundIssued = () => {
    setRefundHistoryToken((n) => n + 1);
    if (onOrderUpdated) onOrderUpdated();
  };

  const canSendPaymentLink =
    order.status === "restaurant_reviewed" ||
    order.status === "payment_link_sent";
  const canPreviewVAT = !["pending_review", "cancelled"].includes(order.status);
  const canRefund =
    order.status !== "cancelled" &&
    (order.restaurants || []).some((r) => !r.hasRefund);
  const canShowOtherActionButtons =
    !showConfirmComplete && !showConfirmCancel && !showConfirmReview &&
    (!["completed", "cancelled"].includes(order.status) || canRefund);

  const handlePreviewVAT = async () => {
    setIsLoadingVATPreview(true);
    try {
      const blob = await cateringService.fetchPreviewVatPdf(order.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err: any) {
      alert(
        `Failed to load VAT preview: ${
          err?.response?.data?.message || err?.message || "unknown error"
        }`,
      );
    } finally {
      setIsLoadingVATPreview(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} overlayOpacity={50}>
      <div className="bg-white rounded-2xl w-[70vw] max-w-[1000px] max-h-[90vh] overflow-y-auto shadow-2xl flex-shrink-0">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-bold tracking-tight">Catering Order Details</h2>
              <span className="text-purple-200 text-sm font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Customer & Event Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
                Customer
              </h3>
              <p className="text-base font-semibold text-gray-900">{order.customerName}</p>
              <p className="text-sm text-gray-600 mt-1">{order.customerEmail}</p>
              <p className="text-sm text-gray-600">{order.customerPhone}</p>
              <div className="mt-3 pt-3 border-t border-gray-200/80">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Embed Partner</p>
                {order.partnerSpace ? (
                  <span className="inline-block mt-1.5 px-2 py-0.5 text-xs font-semibold rounded-md bg-indigo-100 text-indigo-700">
                    {order.partnerSpace.name}
                  </span>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">Direct (no partner)</p>
                )}
              </div>
            </div>
            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
                Event Details
              </h3>
              <p className="text-base font-semibold text-gray-900">{new Date(order.eventDate).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600 mt-1">{order.eventTime} · {(order.restaurants || order.orderItems || []).reduce((total, item) => total + (item.menuItems || []).reduce((sum, mi) => sum + (mi?.quantity || 0), 0), 0)} portions</p>
              {order.eventType ? <p className="text-sm text-gray-600 mt-0.5">{order.eventType}</p> : null}
            </div>
          </div>

          {/* Delivery Address */}
          {(typeof order.deliveryAddress === 'string' ? order.deliveryAddress : order.deliveryAddress && `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.postcode}`) ? <div className="bg-blue-50/60 px-4 py-3 rounded-xl mb-3 border border-blue-200/70 flex items-start gap-2.5">
              <svg className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider mb-0.5">Delivery Address</p>
                <p className="text-sm text-gray-800">
                  {typeof order.deliveryAddress === 'string'
                    ? order.deliveryAddress
                    : `${order.deliveryAddress?.street}, ${order.deliveryAddress?.city}, ${order.deliveryAddress?.postcode}`}
                </p>
              </div>
            </div> : null}

          {/* Customer Dashboard Access */}
          {order.sharedAccessUsers && order.sharedAccessUsers.length > 0 ? <div className="bg-purple-50/60 border border-purple-200/70 rounded-xl px-4 py-3 mb-3">
              <h3 className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider mb-2">Customer Dashboard Access</h3>
              <div className="space-y-2">
                {order.sharedAccessUsers.map((u, idx) => (
                  <div key={u.accessToken || u.email || idx} className="flex items-center justify-between gap-3 bg-white border border-purple-100 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.name || u.email}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {u.email}
                        {u.role ? <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-purple-100 text-purple-700">{u.role}</span> : null}
                      </p>
                    </div>
                    {u.accessToken ? (
                      <a
                        href={`https://swiftfood.uk/event-order/view/${u.accessToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        View Customer Dashboard
                      </a>
                    ) : (
                      <span className="flex-shrink-0 text-xs text-gray-400">No access link</span>
                    )}
                  </div>
                ))}
              </div>
            </div> : null}

          {/* Refunds */}
          <div className="mb-6">
            <h3 className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-3">Refunds</h3>
            <RefundHistoryList
              orderId={order.id}
              reloadToken={refundHistoryToken}
              emptyMessage="No refunds issued on this order."
            />
          </div>

          {/* Financial Summary */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50/60 p-4 rounded-xl mb-3 border border-emerald-200/70">
            <h3 className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-3">Financial Summary</h3>

            {/* Promo Codes Display */}
            {order.promoCodes && order.promoCodes.length > 0 ? <div className="mb-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-emerald-900">Promo Codes:</span>
                {order.promoCodes.map((code, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-700 text-white">
                    {code}
                  </span>
                ))}
              </div> : null}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] text-emerald-700/80 font-semibold uppercase tracking-wider mb-0.5">Customer Paid</p>
                <p className="text-xl font-bold text-emerald-900 tabular-nums">
                  {formatCurrency(order.customerFinalTotal || order.finalTotal || order.estimatedTotal)}
                </p>
                {Number(order.promoDiscount) > 0 && (
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    Was {formatCurrency((order.customerFinalTotal || order.finalTotal || order.estimatedTotal || 0) + Number(order.promoDiscount))}
                  </p>
                )}
                {Number(order.partnerCommissionFee) > 0 && (
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    incl. Venue Service Fee {formatCurrency(order.partnerCommissionFee)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] text-emerald-700/80 font-semibold uppercase tracking-wider mb-0.5">Net Commission</p>
                <p className="text-xl font-bold text-emerald-900 tabular-nums">
                  {formatCurrency(
                    Number(order.promoDiscount) > 0
                      ? (Number(order.platformCommissionRevenue || 0) - Number(order.promoDiscount))
                      : order.platformCommissionRevenue
                  )}
                </p>
                {Number(order.promoDiscount) > 0 && (
                  <p className="text-[11px] font-semibold text-red-600 mt-0.5">
                    Absorbed {formatCurrency(order.promoDiscount)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] text-emerald-700/80 font-semibold uppercase tracking-wider mb-0.5">Restaurant Gross</p>
                <p className="text-xl font-bold text-emerald-900 tabular-nums">{formatCurrency(order.restaurantsTotalGross)}</p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-700/80 font-semibold uppercase tracking-wider mb-0.5">Restaurant Net</p>
                <p className="text-xl font-bold text-emerald-900 tabular-nums">{formatCurrency(order.restaurantsTotalNet)}</p>
              </div>
            </div>

            {/* Manual payout adjustments (e.g. self-delivery reimbursement) — already
                included in Restaurant Net above; shown here so it's clear why. */}
            {order.restaurants?.some((r) => r.payoutAdjustments?.length) ? (
              <div className="mt-3 pt-3 border-t border-emerald-200">
                <p className="text-[10px] text-emerald-700/80 font-semibold uppercase tracking-wider mb-1.5">
                  Adjustments (incl. above)
                </p>
                <div className="space-y-1">
                  {order.restaurants
                    .filter((r) => r.payoutAdjustments?.length)
                    .flatMap((r) =>
                      (r.payoutAdjustments ?? []).map((adj, idx) => (
                        <div key={`${r.restaurantId}-${idx}`} className="flex items-start justify-between gap-3 text-xs">
                          <span className="text-emerald-800">
                            <span className="font-semibold">{r.restaurantName}:</span>{" "}
                            {adj.note || adj.type}
                          </span>
                          <span className={`font-semibold tabular-nums whitespace-nowrap ${adj.amount >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                            {adj.amount >= 0 ? "+" : ""}
                            {formatCurrency(adj.amount)}
                          </span>
                        </div>
                      )),
                    )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Special Requirements */}
          {order.specialRequirements ? <div className="bg-amber-50/70 border-l-2 border-amber-500 px-4 py-3 rounded-r-lg mb-3">
              <h3 className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider mb-1">⚠ Special Requirements</h3>
              <p className="text-sm text-amber-900 leading-relaxed">{order.specialRequirements}</p>
            </div> : null}

          {/* Admin Notes */}
          {order.adminNotes ? <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl px-4 py-3 mb-3">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Admin Notes</h3>
              <p className="text-sm text-gray-800 leading-relaxed">{order.adminNotes}</p>
            </div> : null}

          {/* Payment Link */}
          {order.paymentLinkUrl ? <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl px-4 py-3 mb-3">
              <h3 className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider mb-1.5">Payment Link</h3>
              <a
                href={order.paymentLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-900 text-sm underline break-all"
              >
                {order.paymentLinkUrl}
              </a>
              <div className="mt-1 space-y-0.5">
                {order.paymentLinkSentAt ? <p className="text-xs text-gray-600">
                    Sent {new Date(order.paymentLinkSentAt).toLocaleString()}
                  </p> : null}
                {order.paid && order.paidAt ? <p className="text-xs text-emerald-700 font-semibold">
                    ✓ Paid {new Date(order.paidAt).toLocaleString()}
                  </p> : null}
              </div>
            </div> : null}

          {/* Order Items — grouped by meal session if available */}
          <div>
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Order Items</h3>
            {order.mealSessions && order.mealSessions.length > 0 ? (
              <div className="space-y-3">
                {order.mealSessions.map((session: any, sIdx: number) => (
                  <div key={session.id || sIdx} className="border border-gray-200/80 rounded-xl overflow-hidden">
                    <div className="bg-purple-50/70 px-4 py-2.5 border-b border-gray-200/80">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">{session.sessionName || `Session ${sIdx + 1}`}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {session.sessionDate ? new Date(session.sessionDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
                            {session.eventTime ? ` at ${session.eventTime}` : ''}
                            {session.collectionTime ? ` · Collection ${session.collectionTime}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          {session.deliveryFee != null && (
                            <div className="text-[11px] text-gray-500">
                              Delivery{" "}
                              <span className="font-semibold text-gray-700 tabular-nums">
                                {formatCurrency(session.deliveryFeeOverride ?? session.deliveryFee)}
                              </span>
                              {session.deliveryFeeOverride != null && (
                                <span className="ml-1 text-purple-600">(overridden)</span>
                              )}
                            </div>
                          )}
                          {session.subtotal != null && (
                            <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(Number(session.subtotal))}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      {(session.orderItems || []).map((item: any, rIdx: number) => (
                        <div key={rIdx} className="bg-white border border-gray-100 rounded-lg p-3">
                          <h5 className="font-semibold text-gray-900 mb-2 text-sm">{item.restaurantName}</h5>
                          <div className="space-y-2">
                            {(item.menuItems || []).filter((m: any) => m != null).map((menuItem: any, mIdx: number) => {
                              const price = menuItem.customerTotalPrice ?? menuItem.totalPrice ?? 0;
                              const addons = menuItem.selectedAddons || menuItem.addons || [];
                              return (
                                <div key={mIdx}>
                                  <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                                    <span className="text-sm text-gray-900">
                                      <span className="font-bold text-purple-600">{menuItem.quantity}x</span> {menuItem.menuItemName}
                                    </span>
                                    <span className="font-bold text-sm text-gray-900">{formatCurrency(price)}</span>
                                  </div>
                                  {addons.length > 0 && (
                                    <div className="ml-6 mt-1 mb-2 space-y-0.5">
                                      {addons.map((addon: any, aIdx: number) => (
                                        <div key={aIdx} className="flex justify-between text-xs text-purple-700">
                                          <span>+ {addon.name}{addon.quantity > 1 ? ` ×${addon.quantity}` : ''}</span>
                                          {addon.customerUnitPrice > 0 && (
                                            <span>{formatCurrency(addon.customerUnitPrice * (addon.quantity || 1))}</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback for orders without meal sessions */
              <div className="space-y-3">
                {(order.restaurants || order.orderItems || []).map((item: any, idx: number) => (
                  <div key={idx} className="bg-white border border-gray-200/80 rounded-xl p-4">
                    <h4 className="font-semibold text-base text-gray-900 mb-2">{item.restaurantName}</h4>
                    {item.menuItems && item.menuItems.length > 0 ? <div className="space-y-2">
                        {item.menuItems.filter((menuItem: any) => menuItem != null).map((menuItem: any, menuIdx: number) => {
                          const price = menuItem.customerTotalPrice ?? menuItem.totalPrice ?? 0;
                          const addons = menuItem.selectedAddons || menuItem.addons || [];
                          return (
                            <div key={menuIdx}>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                <span className="text-base text-gray-900">
                                  <span className="font-bold text-purple-600">{menuItem.quantity}x</span> {menuItem.menuItemName}
                                </span>
                                <span className="font-bold text-lg text-gray-900">{formatCurrency(price)}</span>
                              </div>
                              {addons.length > 0 && (
                                <div className="ml-6 mt-1 mb-2 space-y-0.5">
                                  {addons.map((addon: any, aIdx: number) => (
                                    <div key={aIdx} className="flex justify-between text-xs text-purple-700">
                                      <span>+ {addon.name}{addon.quantity > 1 ? ` ×${addon.quantity}` : ''}</span>
                                      {addon.customerUnitPrice > 0 && (
                                        <span>{formatCurrency(addon.customerUnitPrice * (addon.quantity || 1))}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div> : null}
                    {item.specialInstructions ? <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-r">
                        <p className="text-sm text-yellow-900 italic">Note: {item.specialInstructions}</p>
                      </div> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200/80 px-5 py-3 rounded-b-2xl">
          {/* Confirmation dialogs */}
          {/* Review Modal */}
          <Modal open={showConfirmReview} onClose={() => setShowConfirmReview(false)} overlayOpacity={60} closeOnOverlayClick={false}>
            <div className="bg-white rounded-xl w-[65vw] max-w-[900px] max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Review & Approve Order</h2>
                    <p className="text-purple-200 mt-1">#{order.id.slice(0, 8).toUpperCase()} — {order.customerName}</p>
                  </div>
                  <button onClick={() => setShowConfirmReview(false)} className="text-white hover:text-purple-200 transition-colors">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Per-Session Pricing Breakdown */}
                {order.mealSessions && order.mealSessions.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Session Pricing & Delivery</h3>
                    <div className="space-y-3">
                      {order.mealSessions.map((session) => {
                        const overrideStr = reviewForm.sessionDeliveryFeeOverrides[session.id];
                        const currentFee = overrideStr !== undefined && overrideStr !== "" ? parseFloat(overrideStr) : Number(session.deliveryFee || 0);
                        const sessionTotal = Number(session.subtotal || 0) + (isNaN(currentFee) ? 0 : currentFee)
                          + Number(session.serviceCharge || 0)
                          - Number(session.promoDiscount || 0)
                          - Number(session.promotionDiscount || 0);

                        return (
                          <div key={session.id} className={`p-4 rounded-xl border-2 ${session.requiresCustomQuote ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-bold text-gray-900">{session.sessionName}</h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {new Date(session.sessionDate).toLocaleDateString()} at {session.eventTime}
                                  {" — "}
                                  {session.orderItems.length} restaurant{session.orderItems.length !== 1 ? "s" : ""}
                                  {session.totalDeliveryPortions ? ` — ${session.totalDeliveryPortions} delivery portions` : ""}
                                </p>
                                {session.requiresCustomQuote ? <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                                    Custom quote needed (&gt;5 miles)
                                  </span> : null}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Session Total</p>
                                <p className="text-lg font-bold text-gray-900">{formatCurrency(sessionTotal)}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-gray-500">Subtotal</p>
                                <p className="font-semibold text-gray-900">{formatCurrency(session.subtotal)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">
                                  Delivery Fee
                                  {session.deliveryFeeOverride != null && (
                                    <span className="ml-1 text-purple-600">(overridden)</span>
                                  )}
                                </p>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={reviewForm.sessionDeliveryFeeOverrides[session.id] ?? ""}
                                  onChange={(e) =>
                                    setReviewForm({
                                      ...reviewForm,
                                      sessionDeliveryFeeOverrides: {
                                        ...reviewForm.sessionDeliveryFeeOverrides,
                                        [session.id]: e.target.value,
                                      },
                                    })
                                  }
                                  className={`w-full px-2 py-1 text-sm border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                    session.requiresCustomQuote ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'
                                  }`}
                                />
                              </div>
                              {(Number(session.promoDiscount || 0) + Number(session.promotionDiscount || 0)) > 0 && (
                                <div>
                                  <p className="text-xs text-gray-500">Discount</p>
                                  <p className="font-semibold text-gray-900">
                                    {formatCurrency(Number(session.promoDiscount || 0) + Number(session.promotionDiscount || 0))}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Collection Time for this session */}
                            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-3">
                              <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Collection Time:</label>
                              <input
                                type="time"
                                value={reviewForm.sessionCollectionTimes[session.id] || ""}
                                onChange={(e) =>
                                  setReviewForm({
                                    ...reviewForm,
                                    sessionCollectionTimes: {
                                      ...reviewForm.sessionCollectionTimes,
                                      [session.id]: e.target.value,
                                    },
                                  })
                                }
                                className="px-2 py-1 text-sm border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                              <span className="text-xs text-gray-400">Event at {session.eventTime}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Single-session order: simple collection time */
                  <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Collection Time</h3>
                    <div className="flex items-center gap-3">
                      <input
                        type="time"
                        value={reviewForm.sessionCollectionTimes["default"] || ""}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            sessionCollectionTimes: {
                              ...reviewForm.sessionCollectionTimes,
                              default: e.target.value,
                            },
                          })
                        }
                        className="px-3 py-2 text-sm border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-500">
                        Applies to all {order.restaurants?.length || 0} restaurant{(order.restaurants?.length || 0) !== 1 ? "s" : ""}
                        {order.eventTime ? ` — Event at ${order.eventTime}` : null}
                      </span>
                    </div>
                  </div>
                )}

                {/* Venue Hire Fee (coworking orders only) */}
                {(order as any).coworkingOrder && Number((order as any).coworkingOrder.venueHireFee || 0) > 0 ? <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border-2 border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-purple-800 uppercase">Event Hire Fee</h3>
                        <p className="text-xs text-purple-600 mt-0.5">Venue hire charge for this event</p>
                      </div>
                      <p className="text-2xl font-bold text-purple-900">{formatCurrency(Number((order as any).coworkingOrder.venueHireFee))}</p>
                    </div>
                  </div> : null}

                {/* Grand Total */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border-2 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-green-800 uppercase">Calculated Total</h3>
                      <p className="text-xs text-green-600 mt-0.5">Auto-updates when delivery fees change</p>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{formatCurrency(computedTotal + ((order as any).coworkingOrder ? Number((order as any).coworkingOrder.venueHireFee || 0) : 0))}</p>
                  </div>
                </div>

                {/* Final Total Override + Deposit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      Final Total Override (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={reviewForm.finalTotal}
                      onChange={(e) =>
                        setReviewForm({ ...reviewForm, finalTotal: e.target.value })
                      }
                      placeholder={computedTotal.toFixed(2)}
                      className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank to use calculated total</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      Deposit Amount (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={reviewForm.depositAmount}
                      onChange={(e) =>
                        setReviewForm({
                          ...reviewForm,
                          depositAmount: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional deposit requirement</p>
                  </div>
                </div>

                {/* Admin Notes */}
                <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Admin Notes
                  </label>
                  <textarea
                    value={reviewForm.adminNotes}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        adminNotes: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    placeholder="Internal notes about this order..."
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-5 rounded-b-xl flex gap-3">
                <button
                  onClick={handleReviewOrder}
                  disabled={isReviewing}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:bg-purple-300 text-lg shadow-lg"
                >
                  {isReviewing ? "Approving..." : "Approve Order"}
                </button>
                <button
                  onClick={() => setShowConfirmReview(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl transition-colors text-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>

          {showConfirmComplete ? <div className="mb-4 bg-green-50 border-2 border-green-300 rounded-xl p-4">
              <p className="text-green-900 font-semibold mb-3">Are you sure you want to mark this order as completed?</p>
              <div className="flex gap-3">
                <button
                  onClick={handleCompleteOrder}
                  disabled={isCompleting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-green-300"
                >
                  {isCompleting ? "Completing..." : "Yes, Complete"}
                </button>
                <button
                  onClick={() => setShowConfirmComplete(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div> : null}

          {showConfirmCancel ? <div className="mb-4 bg-red-50 border-2 border-red-300 rounded-xl p-4">
              <p className="text-red-900 font-semibold mb-3">Are you sure you want to cancel this order?</p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-red-300"
                >
                  {isCancelling ? "Cancelling..." : "Yes, Cancel Order"}
                </button>
                <button
                  onClick={() => setShowConfirmCancel(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  No, Keep Order
                </button>
              </div>
            </div> : null}

          {/* Action buttons */}
          <div className="flex gap-2">
            {!["completed", "cancelled"].includes(order.status) && !showConfirmComplete && !showConfirmCancel && !showConfirmReview && (
              <>
                {/* Approve/Review button - only for pending_review status */}
                {order.status === "pending_review" && (
                  <button
                    onClick={() => setShowConfirmReview(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm shadow-sm"
                  >
                    Approve Order
                  </button>
                )}

                {/* Complete button - only for paid or confirmed orders */}
                {(order.status === "paid" || order.status === "confirmed") && (
                  <button
                    onClick={() => setShowConfirmComplete(true)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm shadow-sm"
                  >
                    Mark as Completed
                  </button>
                )}

                {/* Cancel button - available for all non-completed orders */}
                <button
                  onClick={() => setShowConfirmCancel(true)}
                  className="flex-1 bg-white border border-red-300 text-red-700 hover:bg-red-50 font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
                >
                  Cancel Order
                </button>

                {/* Send Payment Link button */}
                {canSendPaymentLink ? <button
                    onClick={() => {
                      setPaymentLinkForm({
                        daysUntilDue: 7,
                        ccEmails: "",
                        publicNote: "",
                        internalNote: "",
                        preview: false,
                      });
                      setShowSendPaymentModal(true);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm shadow-sm"
                  >
                    Send Payment Link
                  </button> : null}

                {/* Preview VAT PDF button */}
                {canPreviewVAT ? <button
                    onClick={handlePreviewVAT}
                    disabled={isLoadingVATPreview}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm shadow-sm disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {isLoadingVATPreview ? "Loading..." : "Preview VAT PDF"}
                  </button> : null}
              </>
            )}

            {/* Refund button - available for any order with restaurants to
                refund, including completed ones (that's typically exactly
                when a refund is needed - cancelled orders are excluded since
                they were never fulfilled). */}
            {canRefund &&
              !showConfirmComplete && !showConfirmCancel && !showConfirmReview ? <button
                  onClick={() => setShowRefundModal(true)}
                  className="flex-1 bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
                >
                  Refund
                </button> : null}

            <button
              onClick={onClose}
              className={`${canShowOtherActionButtons ? "flex-1" : "w-full"} bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm shadow-sm`}
            >
              Close
            </button>
          </div>
        </div>

        {/* Send Payment Link Modal */}
        <Modal open={showSendPaymentModal} onClose={() => setShowSendPaymentModal(false)} overlayOpacity={60} closeOnOverlayClick={false}>
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 my-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4 text-gray-900">
                Send Payment Link
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days Until Due
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={paymentLinkForm.daysUntilDue}
                    onChange={(e) =>
                      setPaymentLinkForm({
                        ...paymentLinkForm,
                        daysUntilDue: parseInt(e.target.value) || 7,
                      })
                    }
                    className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="7"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    How many days until payment is due (shown on invoice)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CC Emails (Accounts Payable)
                  </label>
                  <input
                    type="text"
                    value={paymentLinkForm.ccEmails}
                    onChange={(e) =>
                      setPaymentLinkForm({
                        ...paymentLinkForm,
                        ccEmails: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="email1@example.com, email2@example.com"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Comma-separated emails to CC on invoice
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Public Note
                  </label>
                  <textarea
                    value={paymentLinkForm.publicNote}
                    onChange={(e) =>
                      setPaymentLinkForm({
                        ...paymentLinkForm,
                        publicNote: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={2}
                    placeholder="Shown to customer on invoice and email (e.g., 'Please include PO# in payment')"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Visible to customer
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Note
                  </label>
                  <textarea
                    value={paymentLinkForm.internalNote}
                    onChange={(e) =>
                      setPaymentLinkForm({
                        ...paymentLinkForm,
                        internalNote: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={2}
                    placeholder="Admin-only note (not sent to customer)"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Admin-only, not shared with customer
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSendPaymentModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendPaymentLink}
                  disabled={isSendingPaymentLink}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-purple-300 disabled:cursor-not-allowed"
                >
                  {isSendingPaymentLink ? "Sending..." : "Send Payment Link"}
                </button>
              </div>
            </div>
          </Modal>

        <RefundModal
          order={order as any}
          open={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          onIssued={handleRefundIssued}
        />
      </div>
    </Modal>
  );
};

type SortColumn = "orderId" | "customer" | "restaurant" | "eventDate" | "guests" | "total" | "status" | "payment" | "createdAt";
type SortDirection = "asc" | "desc";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const CalendarView = ({
  orders,
  onOrderClick,
  getStatusColor,
  formatCurrency,
}: {
  orders: CateringOrder[];
  onOrderClick: (order: CateringOrder) => void;
  getStatusColor: (status: string) => string;
  formatCurrency: (amount?: number | string) => string;
}) => {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Build a map of date string (YYYY-MM-DD) -> orders
  const ordersByDate = orders.reduce<Record<string, CateringOrder[]>>((acc, order) => {
    if (!order.eventDate) return acc;
    const key = order.eventDate.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(order);
    return acc;
  }, {});

  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  };

  const selectedOrders = selectedDay ? (ordersByDate[selectedDay] || []) : [];

  // Build grid cells: nulls for leading blanks, then day numbers
  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex gap-4" style={{ minHeight: "520px" }}>
      {/* Left: Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex-shrink-0" style={{ width: "480px" }}>
        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-xl leading-none transition-colors">‹</button>
          <span className="text-lg font-bold text-gray-900">{MONTH_NAMES[calMonth]} {calYear}</span>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-xl leading-none transition-colors">›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wide py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`blank-${idx}`} />;
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayOrders = ordersByDate[dateStr] || [];
            const count = dayOrders.length;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDay;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                className={`flex flex-col items-center justify-center rounded-xl py-2 transition-all
                  ${isSelected ? "bg-blue-600 shadow-md" : isToday ? "bg-blue-50 border-2 border-blue-400" : count > 0 ? "hover:bg-blue-50" : "hover:bg-gray-50"}
                `}
                style={{ minHeight: "56px" }}
              >
                <span className={`text-base font-bold leading-tight
                  ${isSelected ? "text-white" : isToday ? "text-blue-700" : count > 0 ? "text-gray-900" : "text-gray-400"}
                `}>
                  {day}
                </span>
                {count > 0 && (
                  <span className={`mt-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-bold leading-none
                    ${isSelected ? "bg-blue-400 text-white" : "bg-blue-600 text-white"}
                  `}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="font-bold text-blue-600">3</span> = orders on date</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-blue-50 border border-blue-300 inline-block" /> = today</span>
        </div>
      </div>

      {/* Right: Orders for selected day */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          {selectedDay ? (
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {new Date(selectedDay + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">{selectedOrders.length} order{selectedOrders.length !== 1 ? "s" : ""}</p>
            </div>
          ) : (
            <div>
              <h3 className="text-base font-bold text-gray-400">Select a date</h3>
              <p className="text-sm text-gray-400 mt-0.5">Click a date on the calendar to see orders</p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selectedDay && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
              <span className="text-4xl mb-3">📅</span>
              <p className="text-sm">No date selected</p>
            </div>
          )}

          {selectedDay && selectedOrders.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
              <span className="text-4xl mb-3">📭</span>
              <p className="text-sm">No orders on this date</p>
              {!ordersByDate[selectedDay] && <p className="text-xs mt-1">(filtered out by current view settings)</p>}
            </div> : null}

          {selectedOrders.length > 0 && (
            <div className="divide-y divide-gray-100">
              {selectedOrders.map(order => {
                const restaurants = order.restaurants || order.orderItems || [];
                return (
                  <div
                    key={order.id}
                    onClick={() => onOrderClick(order)}
                    className="px-5 py-4 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</span>
                          {order.orderReference ? <span className="text-xs text-gray-500">{order.orderReference}</span> : null}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-sm font-semibold text-gray-800">{order.customerName}</span>
                          {!!(order as any).isCoworkingOrder && (
                            <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-700 border border-purple-300">Coworking</span>
                          )}
                          {order.partnerSpace ? <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-300">{order.partnerSpace.name}</span> : null}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{order.customerEmail}</div>
                        {restaurants.length > 0 && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {restaurants[0].restaurantName}{restaurants.length > 1 ? ` +${restaurants.length - 1} more` : ""}
                          </div>
                        )}
                        {order.eventTime ? <div className="text-xs text-gray-500 mt-0.5">🕐 {order.eventTime}</div> : null}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(order.customerFinalTotal)}</span>
                        {order.paid ? (
                          <span className="text-xs font-semibold text-green-700">✓ Paid</span>
                        ) : (
                          <span className="text-xs font-semibold text-gray-500">⏳ Unpaid</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CateringOrdersScreen = () => {
  const [allOrders, setAllOrders] = useState<CateringOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<CateringOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"active" | "completed" | "all">("active");
  const [displayView, setDisplayView] = useState<"table" | "calendar">("table");
  const [sortColumn, setSortColumn] = useState<SortColumn>("status");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [notesSaved, setNotesSaved] = useState<Record<string, string>>({});
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showBulkDownloadsModal, setShowBulkDownloadsModal] = useState(false);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortHeader = ({ column, label }: { column: SortColumn; label: string }) => (
    <th
      className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={sortColumn === column ? "text-blue-600" : "text-gray-400"}>
          {sortColumn === column ? (
            sortDirection === "asc" ? "▲" : "▼"
          ) : (
            "⇅"
          )}
        </span>
      </div>
    </th>
  );

  const fetchAllOrders = useCallback(async () => {
    try {
      const orders = await cateringService.getOrders();
      setAllOrders(orders);
      setError(undefined);
    } catch (e: any) {
      console.error("Failed to fetch catering orders:", e);
      setError(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllOrders();
    const interval = setInterval(fetchAllOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchAllOrders]);

  useEffect(() => {
    setNotesDraft(prev => {
      const next = { ...prev };
      allOrders.forEach(order => {
        if (!(order.id in next)) {
          next[order.id] = order.adminNotes || "";
        }
      });
      return next;
    });
    setNotesSaved(prev => {
      const next = { ...prev };
      allOrders.forEach(order => {
        next[order.id] = order.adminNotes || "";
      });
      return next;
    });
  }, [allOrders]);

  const dirtyNoteOrders = allOrders.filter(
    order => (notesDraft[order.id] ?? "") !== (notesSaved[order.id] ?? "")
  );

  const handleSaveNotes = async () => {
    const ordersToUpdate = dirtyNoteOrders.map(order => {
      const draft = notesDraft[order.id] ?? "";
      return draft ? { orderId: order.id, adminNotes: draft } : { orderId: order.id };
    });
    if (ordersToUpdate.length === 0) return;
    setIsSavingNotes(true);
    try {
      await cateringService.bulkUpdateAdminNotes(ordersToUpdate);
      setNotesSaved(prev => {
        const next = { ...prev };
        ordersToUpdate.forEach(({ orderId, adminNotes }) => {
          next[orderId] = adminNotes || "";
        });
        return next;
      });
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to save notes");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleOrderClick = async (order: CateringOrder) => {
    setSelectedOrder(order);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_review: "bg-yellow-100 text-yellow-800",
      admin_reviewed: "bg-orange-100 text-orange-800",
      restaurant_reviewed: "bg-blue-100 text-blue-800",
      payment_link_sent: "bg-purple-100 text-purple-800",
      paid: "bg-green-100 text-green-800",
      confirmed: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount?: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (typeof numAmount === "number" && !isNaN(numAmount)) {
      return `£${numAmount.toFixed(2)}`;
    }
    return "N/A";
  };

  const filteredOrders = allOrders.filter((order) => {
    // View mode filter
    const activeStatuses = ["pending_review", "admin_reviewed", "restaurant_reviewed", "payment_link_sent", "paid", "confirmed"];
    const completedStatuses = ["completed", "cancelled"];

    let matchesViewMode = true;
    if (viewMode === "active") {
      matchesViewMode = activeStatuses.includes(order.status);
    } else if (viewMode === "completed") {
      matchesViewMode = completedStatuses.includes(order.status);
    }

    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
    const matchesSearch =
      searchTerm === "" ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesViewMode && matchesStatus && matchesSearch;
  });

  const statusPriority: Record<string, number> = {
    pending_review: 1,
    admin_reviewed: 2,
    restaurant_reviewed: 3,
    payment_link_sent: 4,
    paid: 5,
    confirmed: 6,
    completed: 7,
    cancelled: 8,
  };

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let comparison = 0;

    switch (sortColumn) {
      case "orderId":
        comparison = a.id.localeCompare(b.id);
        break;
      case "customer":
        comparison = a.customerName.localeCompare(b.customerName);
        break;
      case "restaurant": {
        const aRestaurant = (a.restaurants || a.orderItems || [])[0]?.restaurantName || "";
        const bRestaurant = (b.restaurants || b.orderItems || [])[0]?.restaurantName || "";
        comparison = aRestaurant.localeCompare(bRestaurant);
        break;
      }
      case "eventDate":
        comparison = new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        break;
      case "guests":
        comparison = (a.guestCount || 0) - (b.guestCount || 0);
        break;
      case "total": {
        const aTotal = typeof a.customerFinalTotal === "string" ? parseFloat(a.customerFinalTotal) : (a.customerFinalTotal || 0);
        const bTotal = typeof b.customerFinalTotal === "string" ? parseFloat(b.customerFinalTotal) : (b.customerFinalTotal || 0);
        comparison = aTotal - bTotal;
        break;
      }
      case "status":
        comparison = (statusPriority[a.status] || 999) - (statusPriority[b.status] || 999);
        break;
      case "payment":
        comparison = (a.paid ? 1 : 0) - (b.paid ? 1 : 0);
        break;
      case "createdAt":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      default:
        comparison = 0;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const statusCounts: Record<string, number> = {};
  allOrders.forEach((order) => {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-lg text-gray-900">Loading catering orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-red-600 text-lg">Error: {error}</div>
      </div>
    );
  }

  const activeCount = allOrders.filter(o => ["pending_review", "admin_reviewed", "restaurant_reviewed", "payment_link_sent", "paid", "confirmed"].includes(o.status)).length;
  const completedCount = allOrders.filter(o => ["completed", "cancelled"].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-5">
        <div className="mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Catering Orders</h1>
          <p className="text-sm text-gray-600">Manage and track all catering event orders</p>
        </div>

        {/* Quick View Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setViewMode("active"); setStatusFilter("ALL"); }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              viewMode === "active"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300"
            }`}
          >
            🔥 Active Orders ({activeCount})
          </button>
          <button
            onClick={() => { setViewMode("completed"); setStatusFilter("ALL"); }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              viewMode === "completed"
                ? "bg-green-600 text-white shadow-md"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300"
            }`}
          >
            ✅ Completed ({completedCount})
          </button>
          <button
            onClick={() => { setViewMode("all"); setStatusFilter("ALL"); }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              viewMode === "all"
                ? "bg-purple-600 text-white shadow-md"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300"
            }`}
          >
            📋 All Orders ({allOrders.length})
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 p-4">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200 shadow-sm">
              <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-blue-900">{allOrders.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200 shadow-sm">
              <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-900">{statusCounts["completed"] || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg border border-orange-200 shadow-sm">
              <p className="text-xs text-orange-700 font-semibold uppercase tracking-wide mb-1">Pending Review</p>
              <p className="text-2xl font-bold text-orange-900">{statusCounts["pending_review"] || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-700 font-semibold uppercase tracking-wide mb-1">Cancelled</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts["cancelled"] || 0}</p>
            </div>
          </div>

          <div className="flex gap-3 mb-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search by customer name, email, order ID, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                style={{ color: "#000" }}
              />
            </div>
            {dirtyNoteOrders.length > 0 && (
              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg transition-colors shadow-sm whitespace-nowrap"
              >
                {isSavingNotes ? "Saving..." : `Save Notes (${dirtyNoteOrders.length})`}
              </button>
            )}
            <button
              onClick={() => setShowBulkDownloadsModal(true)}
              className="px-4 py-2 text-sm font-semibold bg-white border-2 border-gray-300 hover:border-purple-400 text-gray-700 rounded-lg transition-all whitespace-nowrap"
            >
              📦 Bulk Downloads
            </button>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all"
              style={{ color: "#000", minWidth: "180px" }}
            >
              <option value="ALL">All Statuses</option>
              {viewMode === "active" && (
                <>
                  <option value="pending_review">⏳ Pending Review</option>
                  <option value="admin_reviewed">👤 Admin Reviewed</option>
                  <option value="restaurant_reviewed">🍽️ Restaurant Reviewed</option>
                  <option value="payment_link_sent">📧 Payment Link Sent</option>
                  <option value="paid">💰 Paid</option>
                  <option value="confirmed">✅ Confirmed</option>
                </>
              )}
              {viewMode === "completed" && (
                <>
                  <option value="completed">✔️ Completed</option>
                  <option value="cancelled">❌ Cancelled</option>
                </>
              )}
              {viewMode === "all" && (
                <>
                  <option value="pending_review">⏳ Pending Review</option>
                  <option value="admin_reviewed">👤 Admin Reviewed</option>
                  <option value="restaurant_reviewed">🍽️ Restaurant Reviewed</option>
                  <option value="payment_link_sent">📧 Payment Link Sent</option>
                  <option value="paid">💰 Paid</option>
                  <option value="confirmed">✅ Confirmed</option>
                  <option value="completed">✔️ Completed</option>
                  <option value="cancelled">❌ Cancelled</option>
                </>
              )}
            </select>
          </div>

          {filteredOrders.length > 0 && (
            <div className="text-xs text-gray-600 mt-2">
              Showing <span className="font-bold text-gray-900">{filteredOrders.length}</span> of <span className="font-bold text-gray-900">{allOrders.length}</span> orders
            </div>
          )}
        </div>

        {/* Display view toggle */}
        <div className="flex items-center mb-2">
          <div className="flex gap-1 bg-white border-2 border-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => setDisplayView("table")}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                displayView === "table"
                  ? "bg-gray-800 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ☰ Table
            </button>
            <button
              onClick={() => setDisplayView("calendar")}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                displayView === "calendar"
                  ? "bg-gray-800 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📅 Calendar
            </button>
          </div>
        </div>

        {displayView === "calendar" && (
          <CalendarView
            orders={filteredOrders}
            onOrderClick={handleOrderClick}
            getStatusColor={getStatusColor}
            formatCurrency={formatCurrency}
          />
        )}

        {displayView === "table" && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <tr>
                  <SortHeader column="orderId" label="Order ID" />
                  <SortHeader column="customer" label="Customer" />
                  <SortHeader column="restaurant" label="Restaurants" />
                  <SortHeader column="eventDate" label="Event Date" />
                  <SortHeader column="total" label="Total" />
                  <SortHeader column="status" label="Status" />
                  <SortHeader column="payment" label="Payment" />
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedOrders.map((order) => (
                  <tr key={order.id} onClick={() => handleOrderClick(order)} className="hover:bg-blue-50 transition-colors border-b border-gray-100 cursor-pointer">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(order.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-semibold text-gray-900">{order.customerName}</div>
                        {!!(order as any).isCoworkingOrder && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-700 border border-purple-300 whitespace-nowrap">Coworking</span>
                        )}
                        {order.partnerSpace ? <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-300 whitespace-nowrap" title="Embed partner">
                            {order.partnerSpace.name}
                          </span> : null}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{order.customerEmail}</div>
                    </td>
                    <td className="px-6 py-5">
                      {(() => {
                        const restaurants = order.restaurants || order.orderItems || [];
                        if (restaurants.length === 0) return <span className="text-sm text-gray-400">No restaurants</span>;
                        if (restaurants.length === 1) {
                          return <div className="text-sm font-medium text-gray-900">{restaurants[0].restaurantName}</div>;
                        }
                        return (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{restaurants[0].restaurantName}</div>
                            <div className="text-xs text-gray-500 mt-1">+{restaurants.length - 1} more</div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{new Date(order.eventDate).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500 mt-1">{order.eventTime}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-base font-bold text-gray-900">
                        {formatCurrency(order.customerFinalTotal)}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {order.paid ? (
                        <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-800 border border-green-300">✓ PAID</span>
                      ) : (
                        <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full bg-gray-100 text-gray-700 border border-gray-300">⏳ UNPAID</span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <textarea
                        value={notesDraft[order.id] ?? ""}
                        onChange={e => setNotesDraft(prev => ({ ...prev, [order.id]: e.target.value }))}
                        className={`w-full text-xs border rounded-lg px-2 py-1.5 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 ${
                          (notesDraft[order.id] ?? "") !== (notesSaved[order.id] ?? "")
                            ? "border-amber-400 bg-amber-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                        rows={2}
                        placeholder="Add notes..."
                        style={{ minWidth: "180px" }}
                      />
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">
                      <button onClick={(e) => { e.stopPropagation(); handleOrderClick(order); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No orders found matching your criteria</p>
            </div>
          )}
        </div>
        )}
      </div>

      <CateringOrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={fetchAllOrders}
      />

      <BulkDownloadsModal open={showBulkDownloadsModal} onClose={() => setShowBulkDownloadsModal(false)} />
    </div>
  );
};

export default CateringOrdersScreen;
