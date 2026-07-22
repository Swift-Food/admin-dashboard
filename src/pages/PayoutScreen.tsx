import { Clock, X, User, CreditCard, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { withdrawalService } from "../services/withdrawal.service";
import { Modal } from "../components/Modal";

// Types
const WithdrawalStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

const UserType = {
  RESTAURANT: 'restaurant',
  DRIVER: 'driver',
} as const;

type WithdrawalStatusType = typeof WithdrawalStatus[keyof typeof WithdrawalStatus];
type UserTypeType = typeof UserType[keyof typeof UserType];

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userType: UserTypeType;
  stripeAccountId: string;
  amount: string;
  feeCharged: string;
  netAmount: string;
  status: WithdrawalStatusType;
  notes?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  stripePayoutId?: string;
  isInstantPayout: boolean;
  requestedAt: string;
  updatedAt: string;
}

// Mock Service (replace with actual API calls)


// Timer Component
const WithdrawalTimer = ({ requestedAt }: { requestedAt: string }) => {
  const [timeElapsed, setTimeElapsed] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const requestTime = new Date(requestedAt).getTime();
      const diff = now - requestTime;

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
  }, [requestedAt]);

  return (
    <div className="flex items-center text-sm text-gray-600">
      <Clock size={14} className="mr-1" />
      {timeElapsed} ago
    </div>
  );
};

// Details Modal
const WithdrawalDetailsModal = ({
  withdrawal,
  isOpen,
  onClose,
  onWithdrawalUpdated,
}: {
  withdrawal: WithdrawalRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onWithdrawalUpdated?: () => void;
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [payoutInfo, setPayoutInfo] = useState<any>(null);

  useEffect(() => {
    if (withdrawal?.stripePayoutId) {
      withdrawalService.getPayoutInfo(withdrawal.id)
        .then(setPayoutInfo)
        .catch(console.error);
    }
  }, [withdrawal]);

  if (!isOpen || !withdrawal) return null;

  const canApprove = withdrawal.status === WithdrawalStatus.PENDING;
  const canReject = withdrawal.status === WithdrawalStatus.PENDING;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await withdrawalService.approveWithdrawal(withdrawal.id);
      setShowApproveConfirm(false);
      onClose();
      if (onWithdrawalUpdated) onWithdrawalUpdated();
      alert('Withdrawal approved successfully!');
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      alert("Failed to approve withdrawal. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    
    setIsProcessing(true);
    try {
      await withdrawalService.rejectWithdrawal(withdrawal.id, rejectionReason);
      setShowRejectModal(false);
      onClose();
      if (onWithdrawalUpdated) onWithdrawalUpdated();
      alert('Withdrawal rejected!');
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      alert("Failed to reject withdrawal. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} overlayOpacity={50}>
      <div className="bg-white rounded-lg max-w-3xl max-h-[90vh] overflow-y-auto w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Withdrawal Request Details</h2>
            <p className="text-gray-600">ID: {withdrawal.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border ${
              withdrawal.status === WithdrawalStatus.COMPLETED ? 'bg-green-50 border-green-200' :
              withdrawal.status === WithdrawalStatus.APPROVED ? 'bg-blue-50 border-blue-200' :
              withdrawal.status === WithdrawalStatus.FAILED || withdrawal.status === WithdrawalStatus.REJECTED ? 'bg-red-50 border-red-200' :
              'bg-yellow-50 border-yellow-200'
            }`}>
              <h3 className="font-semibold text-gray-900">Status</h3>
              <p className={`capitalize font-medium ${
                withdrawal.status === WithdrawalStatus.COMPLETED ? 'text-green-700' :
                withdrawal.status === WithdrawalStatus.APPROVED ? 'text-blue-700' :
                withdrawal.status === WithdrawalStatus.FAILED || withdrawal.status === WithdrawalStatus.REJECTED ? 'text-red-700' :
                'text-yellow-700'
              }`}>
                {withdrawal.status}
              </p>
              <div className="mt-2">
                <WithdrawalTimer requestedAt={withdrawal.requestedAt} />
              </div>
              {withdrawal.isInstantPayout ? <p className="mt-2 text-sm text-purple-600 font-medium">⚡ Instant Payout</p> : null}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900">Amount Details</h3>
              <p className="text-blue-700 text-2xl font-bold">
                £{withdrawal.amount}
              </p>
              {withdrawal.feeCharged ? <>
                  <p className="text-red-600 text-sm">Fee: -£{withdrawal.feeCharged}</p>
                  <p className="text-green-600 text-lg font-semibold">Net: £{withdrawal.netAmount}</p>
                </> : null}
            </div>
          </div>

          {/* User Information */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h3 className="font-semibold mb-3 text-gray-900 flex items-center">
              <User size={18} className="mr-2" />
              User Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <p><span className="font-medium text-gray-900">User ID:</span> {withdrawal.userId}</p>
                <p><span className="font-medium text-gray-900">User Type:</span> <span className="capitalize">{withdrawal.userType}</span></p>
                <p><span className="font-medium text-gray-900">Stripe Account:</span> {withdrawal.stripeAccountId.substring(0, 20)}...</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {withdrawal.notes ? <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-2 text-gray-900">User Notes</h3>
              <p className="text-sm text-gray-800">{withdrawal.notes}</p>
            </div> : null}

          {/* Stripe Payout Info */}
          {withdrawal.stripePayoutId ? <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h3 className="font-semibold mb-3 text-gray-900 flex items-center">
                <CreditCard size={18} className="mr-2" />
                Stripe Payout Information
              </h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium text-gray-900">Payout ID:</span> {withdrawal.stripePayoutId}</p>
                {payoutInfo ? <>
                    <p><span className="font-medium text-gray-900">Status:</span> {payoutInfo.status}</p>
                    <p><span className="font-medium text-gray-900">Method:</span> {payoutInfo.method}</p>
                    {payoutInfo.arrivalDate ? <p><span className="font-medium text-gray-900">Arrival Date:</span> {new Date(payoutInfo.arrivalDate * 1000).toLocaleDateString()}</p> : null}
                  </> : null}
              </div>
            </div> : null}

          {/* Timeline */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold mb-3 text-gray-900">Timeline</h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p><span className="font-medium text-gray-900">Requested:</span> {new Date(withdrawal.requestedAt).toLocaleString()}</p>
              {withdrawal.reviewedAt ? <p><span className="font-medium text-blue-700">Reviewed:</span> {new Date(withdrawal.reviewedAt).toLocaleString()}</p> : null}
              {withdrawal.reviewedBy ? <p><span className="font-medium text-gray-900">Reviewed By:</span> {withdrawal.reviewedBy}</p> : null}
            </div>
          </div>

          {/* Rejection Reason */}
          {withdrawal.rejectionReason ? <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <h3 className="font-semibold text-red-900 mb-2 flex items-center">
                <AlertCircle size={18} className="mr-2" />
                Rejection Reason
              </h3>
              <p className="text-sm text-red-800">{withdrawal.rejectionReason}</p>
            </div> : null}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 min-w-[120px] bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Close
            </button>

            {canApprove ? <button
                onClick={() => setShowApproveConfirm(true)}
                disabled={isProcessing}
                className="flex-1 min-w-[120px] bg-green-500 hover:bg-green-600 text-black font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-green-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <CheckCircle size={18} className="mr-2" />
                {isProcessing ? "Processing..." : "Approve"}
              </button> : null}

            {canReject ? <button
                onClick={() => setShowRejectModal(true)}
                disabled={isProcessing}
                className="flex-1 min-w-[120px] bg-red-500 hover:bg-red-600 text-black font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-red-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <XCircle size={18} className="mr-2" />
                Reject
              </button> : null}
          </div>
        </div>
      </div>

      {/* Approve Confirmation */}
      <Modal open={showApproveConfirm} onClose={() => setShowApproveConfirm(false)} overlayOpacity={60}>
        <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
            <h3 className="text-lg font-bold mb-4 text-gray-900">Approve Withdrawal</h3>
            
            <p className="text-gray-700 mb-6">
              Approve withdrawal of <strong>£{withdrawal.netAmount}</strong> for {withdrawal.userType} user?
              {withdrawal.isInstantPayout ? <span className="block mt-2 text-purple-600 font-medium">⚡ This is an instant payout (arrives in ~30 minutes)</span> : null}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveConfirm(false)}
                disabled={isProcessing}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 bg-green-500 hover:bg-green-600 text-black font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-green-300"
              >
                {isProcessing ? "Processing..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </Modal>

      {/* Reject Modal */}
      <Modal open={showRejectModal} onClose={() => setShowRejectModal(false)} overlayOpacity={60}>
        <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
            <h3 className="text-lg font-bold mb-4 text-gray-900">Reject Withdrawal</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
                placeholder="E.g., Insufficient documentation, suspicious activity..."
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={isProcessing}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 bg-red-500 hover:bg-red-600 text-black font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-red-300"
              >
                {isProcessing ? "Processing..." : "Reject"}
              </button>
            </div>
          </div>
        </Modal>
    </Modal>
  );
};

// Card Component
const WithdrawalCard = ({
  withdrawal,
  onClick,
}: {
  withdrawal: WithdrawalRequest;
  onClick: () => void;
}) => {
  const getStatusColor = (status: WithdrawalStatusType) => {
    const colors: Record<string, string> = {
      [WithdrawalStatus.PENDING]: "bg-yellow-100 text-yellow-800 border-yellow-300",
      [WithdrawalStatus.APPROVED]: "bg-blue-100 text-blue-800 border-blue-300",
      [WithdrawalStatus.COMPLETED]: "bg-green-100 text-green-800 border-green-300",
      [WithdrawalStatus.REJECTED]: "bg-red-100 text-red-800 border-red-300",
      [WithdrawalStatus.FAILED]: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 hover:shadow-md transition-shadow cursor-pointer w-80 mb-3"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-medium text-sm text-gray-900 mb-1">ID: {withdrawal.id.substring(0, 8)}...</p>
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(withdrawal.status)}`}>
            {withdrawal.status.toUpperCase()}
          </span>
          {withdrawal.isInstantPayout ? <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
              ⚡ INSTANT
            </span> : null}
        </div>
        <div className="text-right">
          <p className="font-bold text-lg text-gray-900">£{withdrawal.amount}</p>
          {withdrawal.feeCharged ? <p className="text-xs text-red-600">Fee: £{withdrawal.feeCharged}</p> : null}
          <p className="text-sm font-semibold text-green-600">£{withdrawal.netAmount}</p>
        </div>
      </div>

      <div className="mb-3 border-t border-gray-200 pt-3">
        <p className="text-sm font-medium text-gray-900 capitalize">{withdrawal.userType}</p>
        <p className="text-xs text-gray-600">User: {withdrawal.userId.substring(0, 12)}...</p>
      </div>

      <div className="flex justify-between items-center">
        <WithdrawalTimer requestedAt={withdrawal.requestedAt} />
        <p className="text-xs text-gray-600">
          {new Date(withdrawal.requestedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

// Column Component
const WithdrawalColumn = ({
  title,
  withdrawals,
  onRefresh,
}: {
  title: string;
  withdrawals: WithdrawalRequest[];
  onRefresh: () => void;
}) => {
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);

  return (
    <div className="flex-shrink-0 w-96 bg-gray-100 rounded-lg p-4 border border-gray-300">
      <div className="mb-4 text-center">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="mt-2">
          <span className="inline-block px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-800 border border-gray-300">
            {withdrawals.length} requests
          </span>
        </div>
      </div>
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
        {withdrawals.map((withdrawal) => (
          <WithdrawalCard
            key={withdrawal.id}
            withdrawal={withdrawal}
            onClick={() => setSelectedWithdrawal(withdrawal)}
          />
        ))}
        {withdrawals.length === 0 && (
          <div className="text-center text-gray-600 py-8">
            No withdrawal requests
          </div>
        )}
      </div>

      <WithdrawalDetailsModal
        withdrawal={selectedWithdrawal}
        isOpen={!!selectedWithdrawal}
        onClose={() => setSelectedWithdrawal(null)}
        onWithdrawalUpdated={onRefresh}
      />
    </div>
  );
};

// Main Screen Component
const WithdrawalAdminDashboard = () => {
  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAllWithdrawals = useCallback(async () => {
    try {
      const withdrawals = await withdrawalService.getAllWithdrawals();
      setAllWithdrawals(withdrawals);
      setError(undefined);
      setLastUpdated(new Date());
    } catch (e: any) {
      console.error("Failed to fetch withdrawals:", e);
      setError(e?.message || "Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllWithdrawals();
    const interval = setInterval(fetchAllWithdrawals, 30000);
    return () => clearInterval(interval);
  }, [fetchAllWithdrawals]);

  const buckets: Record<string, WithdrawalRequest[]> = {
    PENDING: [],
    APPROVED: [],
    COMPLETED: [],
    REJECTED_FAILED: [],
  };

  allWithdrawals.forEach((withdrawal) => {
    const status = withdrawal.status?.toLowerCase() || '';
    
    switch (status) {
      case WithdrawalStatus.PENDING:
        buckets.PENDING.push(withdrawal);
        break;
      case WithdrawalStatus.APPROVED:
        buckets.APPROVED.push(withdrawal);
        break;
      case WithdrawalStatus.COMPLETED:
        buckets.COMPLETED.push(withdrawal);
        break;
      case WithdrawalStatus.REJECTED:
      case WithdrawalStatus.FAILED:
        buckets.REJECTED_FAILED.push(withdrawal);
        break;
      default:
        buckets.PENDING.push(withdrawal);
    }
  });

  Object.keys(buckets).forEach((key) => {
    buckets[key].sort((a, b) => {
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
  });

  const totalWithdrawals = allWithdrawals.length;
  const totalAmount = allWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
  const pendingAmount = buckets.PENDING.reduce((sum, w) => sum + Number(w.netAmount), 0);
  const totalFees = allWithdrawals.reduce((sum, w) => sum + Number(w.feeCharged), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-lg text-gray-900">Loading withdrawal requests...</div>
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
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Withdrawal Requests Admin</h1>
        <div className="flex gap-6 text-sm text-gray-700 flex-wrap">
          <span>Total Requests: <strong className="text-gray-900">{totalWithdrawals}</strong></span>
          <span>Pending: <strong className="text-yellow-600">{buckets.PENDING.length}</strong></span>
          <span>Approved: <strong className="text-blue-600">{buckets.APPROVED.length}</strong></span>
          <span>Completed: <strong className="text-green-600">{buckets.COMPLETED.length}</strong></span>
          <span>Rejected/Failed: <strong className="text-red-600">{buckets.REJECTED_FAILED.length}</strong></span>
          <span className="mx-2">|</span>
          <span>Total Amount: <strong className="text-gray-900">£{totalAmount.toFixed(2)}</strong></span>
          <span>Pending Amount: <strong className="text-yellow-600">£{pendingAmount.toFixed(2)}</strong></span>
          <span>Total Fees: <strong className="text-gray-900">£{totalFees.toFixed(2)}</strong></span>
          <span className="ml-auto">
            Last Updated: <strong className="text-gray-900">{lastUpdated.toLocaleTimeString()}</strong>
          </span>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto h-full">
        <WithdrawalColumn
          title={`Pending (${buckets.PENDING.length})`}
          withdrawals={buckets.PENDING}
          onRefresh={fetchAllWithdrawals}
        />
        <WithdrawalColumn
          title={`Approved (${buckets.APPROVED.length})`}
          withdrawals={buckets.APPROVED}
          onRefresh={fetchAllWithdrawals}
        />
        <WithdrawalColumn
          title={`Completed (${buckets.COMPLETED.length})`}
          withdrawals={buckets.COMPLETED}
          onRefresh={fetchAllWithdrawals}
        />
        <WithdrawalColumn
          title={`Rejected/Failed (${buckets.REJECTED_FAILED.length})`}
          withdrawals={buckets.REJECTED_FAILED}
          onRefresh={fetchAllWithdrawals}
        />
      </div>
    </div>
  );
};

export default WithdrawalAdminDashboard;