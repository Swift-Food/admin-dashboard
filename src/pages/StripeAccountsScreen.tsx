import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  User,
  ExternalLink,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { stripeAccountsService, type StripeConnectAccount } from "../services/stripeAccounts.service";

// Status Badge Component
const StatusBadge = ({
  label,
  active
}: {
  label: string;
  active: boolean;
}) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
    active
      ? 'bg-green-100 text-green-800 border border-green-300'
      : 'bg-gray-100 text-gray-600 border border-gray-300'
  }`}>
    {active ? <CheckCircle size={12} /> : <XCircle size={12} />}
    {label}
  </span>
);

// Delete Confirmation Modal
const DeleteConfirmModal = ({
  account,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: {
  account: StripeConnectAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) => {
  if (!isOpen || !account) return null;

  return (
    <Modal open={true} onClose={onClose} overlayOpacity={50}>
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Delete Stripe Account</h2>
        </div>

        <p className="text-gray-700 mb-4">
          Are you sure you want to delete the Stripe Connect account for:
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <p className="font-medium text-gray-900">{account.email || 'No email'}</p>
          <p className="text-sm text-gray-600">{account.username || 'No username'}</p>
          <p className="text-xs text-gray-500 mt-2 font-mono">{account.stripeAccountId}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Warning:</strong> This will permanently delete the Stripe Connect account.
            The user will need to complete onboarding again to receive payments.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-red-300 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Account
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Account Card Component
const AccountCard = ({
  account,
  onDelete,
}: {
  account: StripeConnectAccount;
  onDelete: (account: StripeConnectAccount) => void;
}) => {
  const isComplete = account.onboardingComplete && account.chargesEnabled && account.payoutsEnabled;

  return (
    <div className={`bg-white p-5 rounded-lg shadow-sm border ${
      isComplete ? 'border-green-200' : 'border-amber-200'
    } hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isComplete ? 'bg-green-100' : 'bg-amber-100'}`}>
            <CreditCard className={`w-5 h-5 ${isComplete ? 'text-green-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{account.email || 'No email'}</p>
            <p className="text-sm text-gray-600">{account.username || 'No username'}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isComplete
            ? 'bg-green-100 text-green-800'
            : 'bg-amber-100 text-amber-800'
        }`}>
          {isComplete ? 'Active' : 'Incomplete'}
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <StatusBadge label="Onboarded" active={account.onboardingComplete} />
        <StatusBadge label="Charges" active={account.chargesEnabled} />
        <StatusBadge label="Payouts" active={account.payoutsEnabled} />
        <StatusBadge label="Details" active={account.detailsSubmitted} />
      </div>

      {/* Account Details */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">User ID:</span>
            <span className="text-gray-900 font-mono text-xs truncate">{account.userId}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Stripe:</span>
            <span className="text-gray-900 font-mono text-xs truncate">{account.stripeAccountId}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Created: {new Date(account.createdAt).toLocaleDateString()}
        </p>
        <div className="flex gap-2">
          <a
            href={`https://dashboard.stripe.com/connect/accounts/${account.stripeAccountId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Stripe
          </a>
          <button
            onClick={() => onDelete(account)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Screen Component
const StripeAccountsScreen = () => {
  const [accounts, setAccounts] = useState<StripeConnectAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [deleteTarget, setDeleteTarget] = useState<StripeConnectAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await stripeAccountsService.getAllStripeAccounts();
      setAccounts(data);
      setError(undefined);
      setLastUpdated(new Date());
    } catch (e: any) {
      console.error("Failed to fetch Stripe accounts:", e);
      setError(e?.message || "Failed to load Stripe accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await stripeAccountsService.deleteStripeAccount(deleteTarget.userId);
      setDeleteTarget(null);
      await fetchAccounts();
      alert('Stripe account deleted successfully');
    } catch (e: any) {
      console.error("Failed to delete Stripe account:", e);
      alert(e?.message || "Failed to delete Stripe account");
    } finally {
      setIsDeleting(false);
    }
  };

  // Stats
  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter(a => a.onboardingComplete && a.chargesEnabled && a.payoutsEnabled).length;
  const incompleteAccounts = totalAccounts - activeAccounts;

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f5f7fa]">
        <div className="flex items-center gap-3 text-lg text-gray-700">
          <RefreshCw className="w-6 h-6 animate-spin" />
          Loading Stripe accounts...
        </div>
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f5f7fa]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={fetchAccounts}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <CreditCard className="w-7 h-7 text-blue-600" />
              Stripe Connect Accounts
            </h1>
            <p className="text-gray-600 mt-1">Manage event organizer payment accounts</p>
          </div>
          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap gap-6 text-sm bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Total Accounts:</span>
            <span className="font-bold text-gray-900">{totalAccounts}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Active:</span>
            <span className="font-bold text-green-600">{activeAccounts}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Incomplete:</span>
            <span className="font-bold text-amber-600">{incompleteAccounts}</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-gray-500">
            <span>Last updated:</span>
            <span className="font-medium">{lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Stripe Accounts</h3>
          <p className="text-gray-600">No event organizers have connected their Stripe accounts yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.eventUserId}
              account={account}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        account={deleteTarget}
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default StripeAccountsScreen;
