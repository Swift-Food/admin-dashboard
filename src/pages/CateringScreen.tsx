import { Clock, X, Calendar, Users } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { CateringOrder, PricingOrderItem, CateringOrderItem } from "../types/catering.types";
import cateringService, {
  type SendPaymentLinkDto,
} from "../services/catering.service";

const OrderTimer = ({ createdAt }: { createdAt: string }) => {
  const [timeElapsed, setTimeElapsed] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const orderTime = new Date(createdAt).getTime();
      const diff = now - orderTime;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );

      if (days > 0) {
        setTimeElapsed(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeElapsed(`${hours}h`);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        setTimeElapsed(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <div className="flex items-center text-sm text-gray-600">
      <Clock size={14} className="mr-1" />
      {timeElapsed} ago
    </div>
  );
};

const CateringOrderDetailsModal = ({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
}: {
  order: CateringOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated?: () => void;
}) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSendingPaymentLink, setIsSendingPaymentLink] = useState(false);
  const [showSendPaymentModal, setShowSendPaymentModal] = useState(false);
  const [paymentLinkForm, setPaymentLinkForm] = useState({
    daysUntilDue: 7,
    ccEmails: "",
    publicNote: "",
    internalNote: "",
    preview: false,
  });
  const [previewHtml, setPreviewHtml] = useState<string>("");

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    finalTotal: "",
    depositAmount: "",
    adminNotes: "",
    collectionTime: "",
    reviewedBy: "admin-user-id", // Replace with actual admin ID
  });

  if (!isOpen || !order) return null;

  const formatCurrency = (amount?: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (typeof numAmount === "number" && !isNaN(numAmount)) {
      return `£${numAmount.toFixed(2)}`;
    }
    return "N/A";
  };

  const canCancelOrder = !["confirmed", "cancelled"].includes(order.status);
  const canReview = order.status === "pending_review";
  const canSendPaymentLink =
    order.status === "restaurant_reviewed" ||
    order.status === "payment_link_sent";

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      await cateringService.cancelOrder(order.id);
      setShowCancelConfirm(false);
      onClose();
      if (onOrderUpdated) onOrderUpdated();
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("Failed to cancel order. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!order) return;
    setIsConfirming(true);
    try {
      await cateringService.completeOrder(order.id);
      onClose();
      if (onOrderUpdated) onOrderUpdated();
      alert("Order confirmed successfully!");
    } catch (error) {
      console.error("Error confirming order:", error);
      alert("Failed to confirm order. Please try again.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReviewSubmit = async () => {
    try {
      // Use the form value if provided, otherwise fall back to order's estimated/final total
      const finalTotal = reviewForm.finalTotal
        ? parseFloat(reviewForm.finalTotal)
        : parseFloat(
            (order.estimatedTotal || order.finalTotal || 0).toString()
          );

      if (!finalTotal || finalTotal <= 0) {
        alert("Please enter a valid final total amount");
        return;
      }

      console.log("final total:", finalTotal);

      await cateringService.reviewOrder({
        orderId: order.id,
        finalTotal: finalTotal,
        collectionTime: reviewForm.collectionTime,
        depositAmount: reviewForm.depositAmount
          ? parseFloat(reviewForm.depositAmount)
          : undefined,
        adminNotes: reviewForm.adminNotes || undefined,
        reviewedBy: reviewForm.reviewedBy,
      });

      setShowReviewModal(false);
      onClose();
      if (onOrderUpdated) onOrderUpdated();
      alert("Order reviewed successfully!");
    } catch (error) {
      console.error("Error reviewing order:", error);
      alert("Failed to review order. Please try again.");
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

      const response = await cateringService.sendPaymentLink(payload);

      // If preview mode, show HTML preview instead of sending
      if (paymentLinkForm.preview) {
        setPreviewHtml(response.previewHtml || "");
        return;
      }

      // Normal send flow
      onClose();
      if (onOrderUpdated) onOrderUpdated();
      alert("Payment link sent successfully!");
      setShowSendPaymentModal(false);
    } catch (err: any) {
      console.error("Error sending payment link:", err);
      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to send payment link. Please try again.";
      alert(`Failed to send payment link: ${serverMessage}`);
    } finally {
      setIsSendingPaymentLink(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Catering Order Details
            </h2>
            <p className="text-gray-600">Order ID: {order.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Key Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900">Status</h3>
              <p className="text-blue-700 capitalize font-medium">
                {order.status.replace(/_/g, " ")}
              </p>
              <div className="mt-2">
                <OrderTimer createdAt={order.createdAt} />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900">Event Date</h3>
              <p className="text-green-700 flex items-center">
                <Calendar size={16} className="mr-1" />
                {new Date(order.eventDate).toLocaleDateString()}
              </p>
              <p className="text-green-600 text-sm">{order.eventTime}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900">Guest Count</h3>
              <p className="text-purple-700 text-xl font-bold flex items-center">
                <Users size={20} className="mr-2" />
                {order.guestCount}
              </p>
            </div>
          </div>

          {/* Customer Information */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h3 className="font-semibold mb-3 text-gray-900">
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <p>
                  <span className="font-medium text-gray-900">Name:</span>{" "}
                  {order.customerName}
                </p>
                <p>
                  <span className="font-medium text-gray-900">Email:</span>{" "}
                  {order.customerEmail}
                </p>
                <p>
                  <span className="font-medium text-gray-900">Phone:</span>{" "}
                  {order.customerPhone}
                </p>
              </div>
              <div>
                <p>
                  <span className="font-medium text-gray-900">Event Type:</span>{" "}
                  {order.eventType || "Not specified"}
                </p>
                <p>
                  <span className="font-medium text-gray-900">Delivery:</span>{" "}
                  {typeof order.deliveryAddress === "string"
                    ? order.deliveryAddress
                    : `${order.deliveryAddress?.street || ""}, ${
                        order.deliveryAddress?.city || ""
                      }, ${order.deliveryAddress?.postcode || ""}`}
                </p>
              </div>
            </div>
          </div>

          {/* Special Requirements */}
          {order.specialRequirements && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">
                Special Requirements
              </h3>
              <p className="text-sm text-yellow-800">
                {order.specialRequirements}
              </p>
            </div>
          )}

          {/* Order Items */}
          {(() => {
            // Get order items from either 'restaurants' (new) or 'orderItems' (legacy)
            const items: (PricingOrderItem | CateringOrderItem)[] =
              order.restaurants || order.orderItems || [];

            if (items.length === 0) return null;

            return (
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h3 className="font-semibold mb-4 text-gray-900">Order Items</h3>
                <div className="space-y-4">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="border-l-4 border-blue-300 pl-4 py-2 bg-blue-50"
                    >
                      <h4 className="font-medium text-blue-900 mb-2">
                        {item.restaurantName}
                      </h4>
                      {item.menuItems && item.menuItems.length > 0 && (
                        <div className="space-y-1">
                          {item.menuItems
                            .filter((menuItem) => menuItem != null) // Filter out null/undefined items
                            .map((menuItem, menuIdx) => {
                            // Handle both PricingMenuItem and legacy format
                            const price = menuItem && 'customerTotalPrice' in menuItem
                              ? menuItem.customerTotalPrice
                              : menuItem && 'totalPrice' in menuItem
                              ? menuItem.totalPrice
                              : 0;

                            return (
                              <div
                                key={menuIdx}
                                className="text-sm text-gray-800 flex justify-between"
                              >
                                <span>
                                  {menuItem.quantity}x {menuItem.menuItemName}
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(price)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {item.specialInstructions && (
                        <div className="mt-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                          <p className="text-sm text-yellow-900 italic">
                            {item.specialInstructions}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Payment Summary */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h3 className="font-semibold mb-4 text-gray-900">
              Payment Summary
            </h3>
            <div className="space-y-2 text-gray-700">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Service Charge:</span>
                <span className="font-medium">
                  {formatCurrency(order.serviceCharge)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span className="font-medium">
                  {formatCurrency(order.deliveryFee)}
                </span>
              </div>
              {parseFloat(order.promoDiscount as string) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Promo Discount:</span>
                  <span className="font-medium">
                    -{formatCurrency(order.promoDiscount)}
                  </span>
                </div>
              )}
              {parseFloat(order.depositAmount as string) > 0 && (
                <div className="flex justify-between text-blue-700">
                  <span>Deposit Paid:</span>
                  <span className="font-medium">
                    {formatCurrency(order.depositAmount)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-lg text-gray-900">
                <span>Final Total:</span>
                <span>
                  {formatCurrency(order.finalTotal || order.estimatedTotal)}
                </span>
              </div>
            </div>

            {order.paymentLinkUrl && (
              <div className="mt-4 bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  Payment Link
                </p>
                <a
                  href={order.paymentLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 text-sm underline break-all hover:text-blue-800"
                >
                  {order.paymentLinkUrl}
                </a>
                {order.paymentLinkSentAt && (
                  <p className="text-xs text-gray-600 mt-1">
                    Sent: {new Date(order.paymentLinkSentAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {order.paidAt && (
              <div className="mt-2 text-sm text-green-700 font-medium">
                Paid: {new Date(order.paidAt).toLocaleString()}
              </div>
            )}
          </div>

          {/* Admin Notes */}
          {order.adminNotes && (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-2 text-gray-900">Admin Notes</h3>
              <p className="text-sm text-gray-800">{order.adminNotes}</p>
              {order.reviewedBy && order.reviewedAt && (
                <p className="text-xs text-gray-600 mt-2">
                  Reviewed by {order.reviewedBy} on{" "}
                  {new Date(order.reviewedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 min-w-[120px] bg-gray-200 hover:bg-gray-300 text-black font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Close
            </button>

            {canReview && (
              <button
                onClick={() => {
                  // Initialize form with current values when opening
                  setReviewForm({
                    finalTotal: (
                      order.estimatedTotal ||
                      order.finalTotal ||
                      ""
                    ).toString(),
                    collectionTime: order.collectionTime,
                    depositAmount: "",
                    adminNotes: "",
                    reviewedBy: "admin-user-id",
                  });
                  setShowReviewModal(true);
                }}
                className="flex-1 min-w-[120px] bg-blue-500 hover:bg-blue-600 text-black font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Review Order
              </button>
            )}

            {/* Confirm Order for paid orders */}
            {order.status === "paid" && (
              <button
                onClick={handleConfirmOrder}
                disabled={isConfirming}
                className="flex-1 min-w-[120px] bg-green-500 hover:bg-green-600 text-black font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-green-300 disabled:cursor-not-allowed"
              >
                {isConfirming ? "Confirming..." : "Confirm Order"}
              </button>
            )}

            {canSendPaymentLink && (
              <button
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
                className="flex-1 min-w-[120px] bg-purple-500 hover:bg-purple-600 text-black font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Send Payment Link
              </button>
            )}
            {canCancelOrder && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                disabled={isCancelling}
                className="flex-1 min-w-[120px] bg-red-500 hover:bg-red-600 text-black font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {isCancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            )}

            {showSendPaymentModal && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
                <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 w-full max-h-[90vh] overflow-y-auto">
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

                    {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentLinkForm.preview}
                          onChange={(e) =>
                            setPaymentLinkForm({
                              ...paymentLinkForm,
                              preview: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          Preview Only
                        </span>
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        Check to preview HTML before sending
                      </p>
                    </div> */}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowSendPaymentModal(false);
                        setPreviewHtml("");
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendPaymentLink}
                      disabled={isSendingPaymentLink}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-black font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-purple-300 disabled:cursor-not-allowed"
                    >
                      {paymentLinkForm.preview
                        ? "Generate Preview"
                        : isSendingPaymentLink
                        ? "Sending..."
                        : "Send Payment Link"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Modal - shows when preview is generated */}
            {previewHtml && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
                <div className="bg-white rounded-lg max-w-4xl mx-4 w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">
                      Invoice Preview
                    </h3>
                    <button
                      onClick={() => setPreviewHtml("")}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="p-6">
                    <div
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                      className="bg-white"
                    />
                  </div>
                  <div className="flex gap-3 p-4 border-t border-gray-200">
                    <button
                      onClick={() => setPreviewHtml("")}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Back to Edit
                    </button>
                    <button
                      onClick={() => {
                        setPaymentLinkForm({
                          ...paymentLinkForm,
                          preview: false,
                        });
                        setPreviewHtml("");
                        handleSendPaymentLink();
                      }}
                      disabled={isSendingPaymentLink}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-black font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-purple-300 disabled:cursor-not-allowed"
                    >
                      {isSendingPaymentLink
                        ? "Sending..."
                        : "Send This Invoice"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
            <h3 className="text-lg font-bold mb-4 text-gray-900">
              Review Order
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Final Total (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={
                    reviewForm.finalTotal ||
                    order.estimatedTotal?.toString() ||
                    order.finalTotal?.toString() ||
                    ""
                  }
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, finalTotal: e.target.value })
                  }
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Time
                </label>
                <input
                  type="datetime-local"
                  value={reviewForm.collectionTime || ""}
                  onChange={(e) =>
                    setReviewForm({
                      ...reviewForm,
                      collectionTime: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-black font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={
                  !reviewForm.finalTotal &&
                  !(order.estimatedTotal || order.finalTotal)
                }
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-black font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold mb-2 text-gray-900">
              Cancel Catering Order?
            </h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to cancel this catering order for{" "}
              {order.customerName}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 bg-red-500 hover:bg-red-600 text-black font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-red-300"
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CateringOrderCard = ({
  order,
  onClick,
}: {
  order: CateringOrder;
  onClick: () => void;
}) => {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_review: "bg-yellow-100 text-yellow-800 border-yellow-300",
      admin_reviewed: "bg-orange-100 text-orange-800 border-orange-300",
      restaurant_reviewed: "bg-blue-100 text-blue-800 border-blue-300",
      payment_link_sent: "bg-purple-100 text-purple-800 border-purple-300",
      paid: "bg-green-100 text-green-800 border-green-300",
      confirmed: "bg-green-100 text-green-800 border-green-300",
      completed: "bg-gray-100 text-gray-800 border-gray-300",
      cancelled: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const normalizedEventDate = order.eventDate.replace(" ", "T");

  const formatCurrency = (amount?: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (typeof numAmount === "number" && !isNaN(numAmount)) {
      return `£${numAmount.toFixed(2)}`;
    }
    return "N/A";
  };

  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 hover:shadow-md transition-shadow cursor-pointer w-80 mb-3"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-medium text-sm text-gray-900">
            #{order.id.slice(0, 4).toUpperCase()}
          </p>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
              order.status
            )}`}
          >
            {order.status.replace(/_/g, " ").toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900">
            {formatCurrency(order.finalTotal || order.estimatedTotal)}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm font-medium text-gray-900">
          {order.customerName}
        </p>
        <p className="text-xs text-gray-600">{order.customerEmail}</p>
        <p className="text-xs text-gray-600">{order.customerPhone}</p>
      </div>

      <div className="mb-3 bg-blue-50 p-2 rounded border border-blue-200">
        <div className="flex items-center text-sm text-gray-800">
          <Calendar size={14} className="mr-1 text-blue-600" />
          <span className="font-medium">
            {/* {new Date(order.eventDate).toLocaleDateString()} */}
            {new Date(normalizedEventDate).toLocaleDateString()}
          </span>
          <span className="mx-2">•</span>
          <span>{order.eventTime}</span>
        </div>
        <div className="flex items-center text-sm mt-1 text-gray-800">
          <Users size={14} className="mr-1 text-blue-600" />
          <span>{order.guestCount} guests</span>
          {order.eventType && (
            <>
              <span className="mx-2">•</span>
              <span className="text-xs">{order.eventType}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <OrderTimer createdAt={order.createdAt} />
        <p className="text-xs text-gray-600">
          {new Date(order.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

const CateringOrderColumn = ({
  title,
  orders,
  onRefresh,
}: {
  title: string;
  orders: CateringOrder[];
  onRefresh: () => void;
}) => {
  const [selectedOrder, setSelectedOrder] = useState<CateringOrder | null>(
    null
  );

  return (
    <div className="flex-shrink-0 w-96 bg-gray-100 rounded-lg p-4 border border-gray-300">
      <div className="mb-4 text-center">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="mt-2">
          <span className="inline-block px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-800 border border-gray-300">
            {orders.length} orders
          </span>
        </div>
      </div>
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
        {orders.map((order) => (
          <CateringOrderCard
            key={order.id}
            order={order}
            onClick={() => setSelectedOrder(order)}
          />
        ))}
        {orders.length === 0 && (
          <div className="text-center text-gray-600 py-8">
            No orders in this status
          </div>
        )}
      </div>

      <CateringOrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={onRefresh}
      />
    </div>
  );
};

const CateringOrdersScreen = () => {
  const [allOrders, setAllOrders] = useState<CateringOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<string>("ACTIVE");

  const fetchAllOrders = useCallback(async () => {
    try {
      const orders = await cateringService.getOrders();
      setAllOrders(orders);
      setError(undefined);
      setLastUpdated(new Date());
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

  const buckets: Record<string, CateringOrder[]> = {
    PENDING_REVIEW: [],
    ADMIN_REVIEWED: [],
    RESTAURANT_REVIEWED: [],
    PAYMENT_LINK_SENT: [],
    PAID: [],
    CONFIRMED: [],
    COMPLETED: [],
    CANCELLED: [],
  };

  allOrders.forEach((order) => {
    console.log("Processing order:", order.id, "Status:", order.status);

    const status = order.status?.toLowerCase() || "";

    switch (status) {
      case "pending_review":
      case "pending review":
        buckets.PENDING_REVIEW.push(order);
        break;
      case "admin_reviewed":
      case "admin reviewed":
        buckets.ADMIN_REVIEWED.push(order);
        break;
      case "restaurant_reviewed":
      case "restaurant reviewed":
        buckets.RESTAURANT_REVIEWED.push(order);
        break;
      case "payment_link_sent":
      case "payment link sent":
        buckets.PAYMENT_LINK_SENT.push(order);
        break;
      case "paid":
        buckets.PAID.push(order);
        break;
      case "confirmed":
        buckets.CONFIRMED.push(order);
        break;
      case "completed":
        buckets.COMPLETED.push(order);
        break;
      case "cancelled":
        buckets.CANCELLED.push(order);
        break;
      default:
        console.warn("Unknown status:", order.status, "for order:", order.id);
        buckets.PENDING_REVIEW.push(order);
    }
  });

  Object.keys(buckets).forEach((key) => {
    buckets[key].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  const totalOrders = allOrders.length;
  const activeOrders =
    totalOrders -
    buckets.CANCELLED.length -
    buckets.CONFIRMED.length -
    buckets.COMPLETED.length;

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

  const tabs = [
    {
      id: "ACTIVE",
      label: "Active",
      columns: [
        { key: "PENDING_REVIEW", label: "Pending Review" },
        { key: "ADMIN_REVIEWED", label: "Admin Reviewed" },
        { key: "RESTAURANT_REVIEWED", label: "Restaurant Reviewed" },
        { key: "PAYMENT_LINK_SENT", label: "Payment Link Sent" },
        { key: "PAID", label: "Paid" },
      ],
    },
    {
      id: "COMPLETED",
      label: "Completed",
      columns: [
        { key: "CONFIRMED", label: "Confirmed" },
        { key: "COMPLETED", label: "Completed" },
        { key: "CANCELLED", label: "Cancelled" },
      ],
    },
  ];

  const activeTabData = tabs.find((t) => t.id === activeTab);

  return (
    <div className="p-4 h-screen bg-[#e8f4f8] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">
          Catering Orders Overview
        </h1>
        <div className="flex gap-6 text-sm text-gray-700 mb-4">
          <span>
            Total Orders:{" "}
            <strong className="text-gray-900">{totalOrders}</strong>
          </span>
          <span>
            Active Orders:{" "}
            <strong className="text-gray-900">{activeOrders}</strong>
          </span>
          <span>
            Confirmed:{" "}
            <strong className="text-gray-900">
              {buckets.CONFIRMED.length}
            </strong>
          </span>
          <span>
            Cancelled:{" "}
            <strong className="text-gray-900">
              {buckets.CANCELLED.length}
            </strong>
          </span>
          <span className="ml-auto">
            Last Updated:{" "}
            <strong className="text-gray-900">
              {lastUpdated.toLocaleTimeString()}
            </strong>
          </span>
        </div>

        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto flex-1">
        {activeTabData?.columns.map((col) => (
          <CateringOrderColumn
            key={col.key}
            title={`${col.label} (${buckets[col.key].length})`}
            orders={buckets[col.key]}
            onRefresh={fetchAllOrders}
          />
        ))}
      </div>
    </div>
  );
};

export default CateringOrdersScreen;
