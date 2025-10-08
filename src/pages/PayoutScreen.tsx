import { Clock, X, User, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Payout } from "../types/payout.types";
import payoutService from "../services/payout.service";


const PayoutTimer = ({ createdAt }: { createdAt: string }) => {
    const [timeElapsed, setTimeElapsed] = useState("");
  
    useEffect(() => {
      const updateTimer = () => {
        const now = new Date().getTime();
        const payoutTime = new Date(createdAt).getTime();
        const diff = now - payoutTime;
  
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
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
  
  // Payout Details Modal
  const PayoutDetailsModal = ({
    payout,
    isOpen,
    onClose,
    onPayoutUpdated,
  }: {
    payout: Payout | null;
    isOpen: boolean;
    onClose: () => void;
    onPayoutUpdated?: () => void;
  }) => {
    const [isCompleting, setIsCompleting] = useState(false);
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
    const [showFailModal, setShowFailModal] = useState(false);
    const [adminNote, setAdminNote] = useState("");
    const [failForm, setFailForm] = useState({ errorMessage: "", refund: true });
  
    if (!isOpen || !payout) return null;
  
    const formatCurrency = (amount?: number | string) => {
      const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
      if (typeof numAmount === "number" && !isNaN(numAmount)) {
        return `£${numAmount.toFixed(2)}`;
      }
      return "N/A";
    };
  
    const canComplete = payout.status === "pending";
    const canFail = payout.status === "pending";
  
    const handleComplete = async () => {
      setIsCompleting(true);
      try {
        await payoutService.completePayout(payout.id, adminNote || undefined);
        setShowCompleteConfirm(false);
        onClose();
        if (onPayoutUpdated) onPayoutUpdated();
        alert('Payout completed successfully!');
      } catch (error) {
        console.error("Error completing payout:", error);
        alert("Failed to complete payout. Please try again.");
      } finally {
        setIsCompleting(false);
      }
    };
  
    const handleFail = async () => {
      if (!failForm.errorMessage.trim()) {
        alert('Please provide an error message');
        return;
      }
      
      try {
        await payoutService.failPayout(payout.id, failForm.errorMessage, failForm.refund);
        setShowFailModal(false);
        onClose();
        if (onPayoutUpdated) onPayoutUpdated();
        alert('Payout marked as failed!');
      } catch (error) {
        console.error("Error failing payout:", error);
        alert("Failed to update payout. Please try again.");
      }
    };
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-3xl max-h-[90vh] overflow-y-auto w-full">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Payout Details</h2>
              <p className="text-gray-600">{payout.transactionReference}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
  
          <div className="p-6 space-y-6">
            {/* Status & Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border ${
                payout.status === 'completed' ? 'bg-green-50 border-green-200' :
                payout.status === 'failed' ? 'bg-red-50 border-red-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <h3 className="font-semibold text-gray-900">Status</h3>
                <p className={`capitalize font-medium ${
                  payout.status === 'completed' ? 'text-green-700' :
                  payout.status === 'failed' ? 'text-red-700' :
                  'text-yellow-700'
                }`}>
                  {payout.status}
                </p>
                <div className="mt-2">
                  <PayoutTimer createdAt={payout.createdAt} />
                </div>
              </div>
  
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900">Amount</h3>
                <p className="text-blue-700 text-2xl font-bold">
                  {formatCurrency(payout.amount)}
                </p>
                <p className="text-blue-600 text-sm">{payout.currency}</p>
              </div>
            </div>
  
            {/* Driver Information */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h3 className="font-semibold mb-3 text-gray-900 flex items-center">
                <User size={18} className="mr-2" />
                Driver Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <p><span className="font-medium text-gray-900">Email:</span> {payout.driver.user.email}</p>
                  <p><span className="font-medium text-gray-900">Phone:</span> {payout.driver.user.phoneNumber}</p>
                  <p><span className="font-medium text-gray-900">Driver ID:</span> {payout.driverId}</p>
                </div>
                <div>
                  <p><span className="font-medium text-gray-900">Available Balance:</span> {formatCurrency(payout.driver.availableBalance)}</p>
                  {payout.driver.lastPayoutDate && (
                    <p><span className="font-medium text-gray-900">Last Payout:</span> {new Date(payout.driver.lastPayoutDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
  
            {/* Payment Method */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h3 className="font-semibold mb-3 text-gray-900 flex items-center">
                <CreditCard size={18} className="mr-2" />
                Payment Method
              </h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium text-gray-900">Type:</span> {payout.paymentMethodSnapshot?.type || 'N/A'}</p>
                <p><span className="font-medium text-gray-900">Account Holder:</span> {payout.paymentMethodSnapshot?.accountHolderName || 'N/A'}</p>
                <p><span className="font-medium text-gray-900">Account Number:</span> {
                  payout.paymentMethodSnapshot?.accountNumber 
                    ? `****${payout.paymentMethodSnapshot.accountNumber.slice(-4)}` 
                    : 'N/A'
                }</p>
                <p><span className="font-medium text-gray-900">Sort Code:</span> {payout.paymentMethodSnapshot?.sortCode || 'N/A'}</p>
              </div>
            </div>
  
            {/* Timestamps */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3 text-gray-900">Timeline</h3>
              <div className="text-sm text-gray-700 space-y-2">
                <p><span className="font-medium text-gray-900">Created:</span> {new Date(payout.createdAt).toLocaleString()}</p>
                {payout.completedAt && (
                  <p><span className="font-medium text-green-700">Completed:</span> {new Date(payout.completedAt).toLocaleString()}</p>
                )}
                {payout.failedAt && (
                  <p><span className="font-medium text-red-700">Failed:</span> {new Date(payout.failedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
  
            {/* Error Message */}
            {payout.errorMessage && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                <h3 className="font-semibold text-red-900 mb-2 flex items-center">
                  <AlertCircle size={18} className="mr-2" />
                  Error Message
                </h3>
                <p className="text-sm text-red-800">{payout.errorMessage}</p>
              </div>
            )}
  
            {/* Admin Notes */}
            {payout.worldpayResponse?.adminNote && (
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold mb-2 text-gray-900">Admin Notes</h3>
                <p className="text-sm text-gray-800">{payout.worldpayResponse.adminNote}</p>
              </div>
            )}
  
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="flex-1 min-w-[120px] bg-gray-200 hover:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
  
              {canComplete && (
                <button
                  onClick={() => setShowCompleteConfirm(true)}
                  disabled={isCompleting}
                  className="flex-1 min-w-[120px] bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-green-300 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <CheckCircle size={18} className="mr-2" />
                  {isCompleting ? "Processing..." : "Complete Payout"}
                </button>
              )}
  
              {canFail && (
                <button
                  onClick={() => setShowFailModal(true)}
                  className="flex-1 min-w-[120px] bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Mark as Failed
                </button>
              )}
            </div>
          </div>
        </div>
  
        {/* Complete Confirmation */}
        {showCompleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
              <h3 className="text-lg font-bold mb-4 text-gray-900">Complete Payout</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Note (Optional)
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="E.g., Processed via bank transfer on..."
                />
              </div>
  
              <p className="text-gray-700 mb-6">
                Mark this payout of <strong>{formatCurrency(payout.amount)}</strong> to {payout.driver.user.email} as completed?
              </p>
  
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompleteConfirm(false)}
                  disabled={isCompleting}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-green-300"
                >
                  {isCompleting ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
  
        {/* Fail Modal */}
        {showFailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
              <h3 className="text-lg font-bold mb-4 text-gray-900">Mark Payout as Failed</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Error Message *
                  </label>
                  <textarea
                    value={failForm.errorMessage}
                    onChange={(e) => setFailForm({...failForm, errorMessage: e.target.value})}
                    className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    placeholder="E.g., Invalid bank details, Account closed..."
                    required
                  />
                </div>
  
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="refund"
                    checked={failForm.refund}
                    onChange={(e) => setFailForm({...failForm, refund: e.target.checked})}
                    className="mr-2 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="refund" className="text-sm text-gray-700">
                    Refund amount to driver's balance
                  </label>
                </div>
              </div>
  
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFailModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFail}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Mark as Failed
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Payout Card Component
  const PayoutCard = ({
    payout,
    onClick,
  }: {
    payout: Payout;
    onClick: () => void;
  }) => {
    const getStatusColor = (status: string) => {
      const colors: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
        completed: "bg-green-100 text-green-800 border-green-300",
        failed: "bg-red-100 text-red-800 border-red-300",
      };
      return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
    };
  
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
            <p className="font-medium text-sm text-gray-900">#{payout.transactionReference}</p>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(payout.status)}`}>
              {payout.status.toUpperCase()}
            </span>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-gray-900">{formatCurrency(payout.amount)}</p>
            <p className="text-xs text-gray-600">{payout.currency}</p>
          </div>
        </div>
  
        <div className="mb-3 border-t border-gray-200 pt-3">
          <p className="text-sm font-medium text-gray-900">{payout.driver.user.email}</p>
          <p className="text-xs text-gray-600">{payout.driver.user.phoneNumber}</p>
          <p className="text-xs text-gray-500 mt-1">Balance: {formatCurrency(payout.driver.availableBalance)}</p>
        </div>
  
        <div className="flex justify-between items-center">
          <PayoutTimer createdAt={payout.createdAt} />
          <p className="text-xs text-gray-600">
            {new Date(payout.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  };
  
  // Column Component
  const PayoutColumn = ({
    title,
    payouts,
    onRefresh,
  }: {
    title: string;
    payouts: Payout[];
    onRefresh: () => void;
  }) => {
    const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  
    return (
      <div className="flex-shrink-0 w-96 bg-gray-100 rounded-lg p-4 border border-gray-300">
        <div className="mb-4 text-center">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <div className="mt-2">
            <span className="inline-block px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-800 border border-gray-300">
              {payouts.length} payouts
            </span>
          </div>
        </div>
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
          {payouts.map((payout) => (
            <PayoutCard
              key={payout.id}
              payout={payout}
              onClick={() => setSelectedPayout(payout)}
            />
          ))}
          {payouts.length === 0 && (
            <div className="text-center text-gray-600 py-8">
              No payouts in this status
            </div>
          )}
        </div>
  
        <PayoutDetailsModal
          payout={selectedPayout}
          isOpen={!!selectedPayout}
          onClose={() => setSelectedPayout(null)}
          onPayoutUpdated={onRefresh}
        />
      </div>
    );
  };
  
  // Main Screen Component
  const DriverPayoutsScreen = () => {
    const [allPayouts, setAllPayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
    const fetchAllPayouts = useCallback(async () => {
      try {
        const payouts = await payoutService.getAllPayouts();
        setAllPayouts(payouts);
        setError(undefined);
        setLastUpdated(new Date());
      } catch (e: any) {
        console.error("Failed to fetch payouts:", e);
        setError(e?.message || "Failed to load payouts");
      } finally {
        setLoading(false);
      }
    }, []);
  
    useEffect(() => {
      fetchAllPayouts();
      const interval = setInterval(fetchAllPayouts, 30000);
      return () => clearInterval(interval);
    }, [fetchAllPayouts]);
  
    const buckets: Record<string, Payout[]> = {
      PENDING: [],
      COMPLETED: [],
      FAILED: [],
    };
  
    allPayouts.forEach((payout) => {
      const status = payout.status?.toLowerCase() || '';
      
      switch (status) {
        case "pending":
          buckets.PENDING.push(payout);
          break;
        case "completed":
          buckets.COMPLETED.push(payout);
          break;
        case "failed":
          buckets.FAILED.push(payout);
          break;
        default:
          buckets.PENDING.push(payout);
      }
    });
  
    Object.keys(buckets).forEach((key) => {
      buckets[key].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });
  
    const totalPayouts = allPayouts.length;
    const totalAmount = allPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingAmount = buckets.PENDING.reduce((sum, p) => sum + Number(p.amount), 0);
  
    if (loading) {
      return (
        <div className="flex items-center justify-center h-screen bg-white">
          <div className="text-lg text-gray-900">Loading payouts...</div>
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
  
    return (
      <div className="p-4 h-screen bg-[#e8f4f8]">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2 text-gray-900">Driver Payouts Overview</h1>
          <div className="flex gap-6 text-sm text-gray-700">
            <span>Total Payouts: <strong className="text-gray-900">{totalPayouts}</strong></span>
            <span>Pending: <strong className="text-yellow-600">{buckets.PENDING.length}</strong></span>
            <span>Completed: <strong className="text-green-600">{buckets.COMPLETED.length}</strong></span>
            <span>Failed: <strong className="text-red-600">{buckets.FAILED.length}</strong></span>
            <span className="mx-2">|</span>
            <span>Total Amount: <strong className="text-gray-900">£{totalAmount.toFixed(2)}</strong></span>
            <span>Pending Amount: <strong className="text-yellow-600">£{pendingAmount.toFixed(2)}</strong></span>
            <span className="ml-auto">
              Last Updated: <strong className="text-gray-900">{lastUpdated.toLocaleTimeString()}</strong>
            </span>
          </div>
        </div>
  
        <div className="flex gap-4 overflow-x-auto h-full">
          <PayoutColumn
            title={`Pending (${buckets.PENDING.length})`}
            payouts={buckets.PENDING}
            onRefresh={fetchAllPayouts}
          />
          <PayoutColumn
            title={`Completed (${buckets.COMPLETED.length})`}
            payouts={buckets.COMPLETED}
            onRefresh={fetchAllPayouts}
          />
          <PayoutColumn
            title={`Failed (${buckets.FAILED.length})`}
            payouts={buckets.FAILED}
            onRefresh={fetchAllPayouts}
          />
        </div>
      </div>
    );
  };
  
  export default DriverPayoutsScreen;