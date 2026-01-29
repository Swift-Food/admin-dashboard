import { useState, useEffect, useCallback } from "react";
import type {
  CateringMealSession,
  MealSessionDeliveryStatus,
} from "../types/catering-session.types";
import cateringSessionService from "../services/catering-session.service";
import { Modal } from "../components/Modal";

// Status configuration
const STATUS_CONFIG: Record<
  MealSessionDeliveryStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  finding_driver: {
    label: "Finding Driver",
    color: "text-yellow-800",
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-300",
  },
  driver_assigned: {
    label: "Driver Assigned",
    color: "text-blue-800",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
  },
  awaiting_pickup: {
    label: "Awaiting Pickup",
    color: "text-orange-800",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-300",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "text-purple-800",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-300",
  },
  at_collection_point: {
    label: "At Collection Point",
    color: "text-indigo-800",
    bgColor: "bg-indigo-100",
    borderColor: "border-indigo-300",
  },
  delivered: {
    label: "Delivered",
    color: "text-green-800",
    bgColor: "bg-green-100",
    borderColor: "border-green-300",
  },
};

// Tab configuration
const TABS = [
  {
    id: "available",
    label: "Available",
    statuses: ["finding_driver"] as MealSessionDeliveryStatus[],
  },
  {
    id: "in_progress",
    label: "In Progress",
    statuses: [
      "driver_assigned",
      "awaiting_pickup",
      "out_for_delivery",
      "at_collection_point",
    ] as MealSessionDeliveryStatus[],
  },
  {
    id: "completed",
    label: "Completed",
    statuses: ["delivered"] as MealSessionDeliveryStatus[],
  },
];

// Session Detail Modal
const SessionDetailModal = ({
  session,
  isOpen,
  onClose,
}: {
  session: CateringMealSession | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen || !session) return null;

  const statusConfig = STATUS_CONFIG[session.deliveryStatus];

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  // Get customer info from nested cateringOrder
  const customerName = session.cateringOrder?.customerName || "N/A";
  const customerEmail = session.cateringOrder?.customerEmail;
  const customerPhone = session.cateringOrder?.customerPhone;
  const deliveryAddress = session.cateringOrder?.deliveryAddress || "N/A";

  return (
    <Modal open={true} onClose={onClose} overlayOpacity={50}>
      <div className="bg-white rounded-xl w-[80vw] max-w-[1100px] max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Session Details</h2>
              <p className="text-indigo-100 mt-1">
                {session.sessionName} - #{session.id.slice(0, 8).toUpperCase()}
              </p>
              <div className="mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-indigo-200 transition-colors"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
              {/* Session Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-5 rounded-xl border-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Session Info
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium text-gray-600">Date:</span>{" "}
                      <span className="text-gray-900">
                        {new Date(session.sessionDate).toLocaleDateString()}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-gray-600">
                        Event Time:
                      </span>{" "}
                      <span className="text-gray-900">
                        {session.eventTime || "N/A"}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-gray-600">
                        Collection Time:
                      </span>{" "}
                      <span className="text-gray-900">
                        {session.collectionTime || "N/A"}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-gray-600">
                        Guest Count:
                      </span>{" "}
                      <span className="text-gray-900">
                        {session.guestCount || session.cateringOrder?.guestCount || "N/A"}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-gray-600">
                        Session Total:
                      </span>{" "}
                      <span className="text-gray-900 font-semibold">
                        £{session.sessionTotal}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 p-5 rounded-xl border-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                    Customer
                  </h3>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-gray-900">
                      {customerName}
                    </p>
                    {customerEmail && (
                      <p className="text-sm text-gray-600">{customerEmail}</p>
                    )}
                    {customerPhone && (
                      <p className="text-sm text-gray-600">{customerPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Driver Info */}
              {session.driverId && (
                <div className="bg-blue-50 p-5 rounded-xl border-2 border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                    </svg>
                    Assigned Driver
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xl">
                      {session.driverName?.charAt(0).toUpperCase() || "D"}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {session.driverName || "Unknown Driver"}
                      </p>
                      {session.deliveryMethod && (
                        <p className="text-sm text-gray-500">
                          {session.deliveryMethod}
                        </p>
                      )}
                      {session.driverAssignedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Assigned: {formatDateTime(session.driverAssignedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Destination */}
              <div className="bg-green-50 p-5 rounded-xl border-2 border-green-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Delivery Destination
                </h3>
                <div className="space-y-2">
                  <p className="text-base text-gray-900">{deliveryAddress}</p>
                  {session.cateringOrder?.specialRequirements && (
                    <div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-500 rounded-r">
                      <p className="text-sm text-yellow-900">
                        {session.cateringOrder.specialRequirements}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Restaurant Orders */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Restaurants ({session.orderItems.length})
                </h3>
                <div className="space-y-3">
                  {session.orderItems.map((item, idx) => (
                    <div
                      key={item.restaurantId}
                      className="p-4 rounded-xl border-2 bg-white border-gray-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-500">
                              #{idx + 1}
                            </span>
                            <p className="font-semibold text-gray-900">
                              {item.restaurantName}
                            </p>
                          </div>
                          {item.collectionTime && (
                            <p className="text-xs text-gray-500 mt-1">
                              Collection: {item.collectionTime}
                            </p>
                          )}
                          <div className="mt-2 space-y-1">
                            {item.menuItems.map((menuItem, menuIdx) => (
                              <p key={menuIdx} className="text-sm text-gray-600">
                                {menuItem.quantity}x {menuItem.menuItemName} - £
                                {menuItem.customerTotalPrice.toFixed(2)}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            £{item.customerTotal.toFixed(2)}
                          </p>
                          <span
                            className={`mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                              item.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-gray-50 p-5 rounded-xl border-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Timeline
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium text-gray-600">Created:</span>{" "}
                    {formatDateTime(session.createdAt)}
                  </p>
                  {session.driverAssignedAt && (
                    <p>
                      <span className="font-medium text-gray-600">
                        Driver Assigned:
                      </span>{" "}
                      {formatDateTime(session.driverAssignedAt)}
                    </p>
                  )}
                  {session.pickupStartedAt && (
                    <p>
                      <span className="font-medium text-gray-600">
                        Pickup Started:
                      </span>{" "}
                      {formatDateTime(session.pickupStartedAt)}
                    </p>
                  )}
                  {session.outForDeliveryAt && (
                    <p>
                      <span className="font-medium text-gray-600">
                        Out for Delivery:
                      </span>{" "}
                      {formatDateTime(session.outForDeliveryAt)}
                    </p>
                  )}
                  {session.arrivedAtDestinationAt && (
                    <p>
                      <span className="font-medium text-gray-600">
                        Arrived at Destination:
                      </span>{" "}
                      {formatDateTime(session.arrivedAtDestinationAt)}
                    </p>
                  )}
                  {session.deliveredAt && (
                    <p className="text-green-700 font-semibold">
                      <span className="font-medium">Delivered:</span>{" "}
                      {formatDateTime(session.deliveredAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Proof Images */}
              {(session.pickupProofImageUrl || session.deliveryProofImageUrl) && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Proof Images
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {session.pickupProofImageUrl && (
                      <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
                        <img
                          src={session.pickupProofImageUrl}
                          alt="Pickup proof"
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">
                          <p className="text-sm font-semibold">Pickup Proof</p>
                        </div>
                      </div>
                    )}
                    {session.deliveryProofImageUrl && (
                      <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
                        <img
                          src={session.deliveryProofImageUrl}
                          alt="Delivery proof"
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">
                          <p className="text-sm font-semibold">Delivery Proof</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-colors text-lg shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Main Screen Component
const CateringSessionsScreen = () => {
  const [allSessions, setAllSessions] = useState<CateringMealSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [activeTab, setActiveTab] = useState<string>("in_progress");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [driverFilter, setDriverFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedSession, setSelectedSession] =
    useState<CateringMealSession | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const sessions = await cateringSessionService.getAllSessions({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setAllSessions(sessions);
      setError(undefined);
    } catch (e: unknown) {
      console.error("Failed to fetch catering sessions:", e);
      setError(e instanceof Error ? e.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Initial fetch and polling
  useEffect(() => {
    fetchSessions();
    // const interval = setInterval(fetchSessions, 30000); // Poll every 30 seconds
    // return () => clearInterval(interval);
  }, [fetchSessions]);

  // Get unique drivers for filter dropdown
  const uniqueDrivers = Array.from(
    new Map(
      allSessions
        .filter((s) => s.driverId && s.driverName)
        .map((s) => [s.driverId!, { id: s.driverId!, name: s.driverName! }])
    ).values()
  );

  // Filter sessions based on active tab and filters
  const filteredSessions = allSessions.filter((session) => {
    // Tab filter
    const currentTab = TABS.find((t) => t.id === activeTab);
    if (currentTab && !currentTab.statuses.includes(session.deliveryStatus)) {
      return false;
    }

    // Status filter
    if (statusFilter !== "ALL" && session.deliveryStatus !== statusFilter) {
      return false;
    }

    // Driver filter
    if (driverFilter && session.driverId !== driverFilter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        session.sessionName.toLowerCase().includes(search) ||
        session.id.toLowerCase().includes(search) ||
        session.cateringOrder?.customerName?.toLowerCase().includes(search) ||
        session.cateringOrderId?.toLowerCase().includes(search) ||
        session.driverName?.toLowerCase().includes(search) ||
        session.orderItems.some((item) =>
          item.restaurantName.toLowerCase().includes(search)
        );
      if (!matchesSearch) return false;
    }

    return true;
  });

  // Sort by scheduled time (most recent first for completed, soonest first for others)
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    const dateA = new Date(a.sessionDate).getTime();
    const dateB = new Date(b.sessionDate).getTime();
    return activeTab === "completed" ? dateB - dateA : dateA - dateB;
  });

  // Count sessions per tab
  const tabCounts = TABS.reduce((acc, tab) => {
    acc[tab.id] = allSessions.filter((s) =>
      tab.statuses.includes(s.deliveryStatus)
    ).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-lg text-gray-900">Loading catering sessions...</div>
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
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Catering Sessions
          </h1>
          <p className="text-lg text-gray-600">
            Monitor and track all catering meal session deliveries
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setStatusFilter("ALL");
              }}
              className={`px-6 py-3 rounded-xl font-bold text-base transition-all ${
                activeTab === tab.id
                  ? tab.id === "available"
                    ? "bg-yellow-600 text-white shadow-lg"
                    : tab.id === "in_progress"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-green-600 text-white shadow-lg"
                  : "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300"
              }`}
            >
              {tab.label} ({tabCounts[tab.id]})
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8 p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = allSessions.filter(
                (s) => s.deliveryStatus === status
              ).length;
              return (
                <div
                  key={status}
                  className={`p-4 rounded-xl border-2 ${config.borderColor} ${config.bgColor}`}
                >
                  <p
                    className={`text-xs font-semibold uppercase ${config.color}`}
                  >
                    {config.label}
                  </p>
                  <p className={`text-2xl font-bold ${config.color}`}>{count}</p>
                </div>
              );
            })}
          </div>

          {/* Filter Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search sessions, orders, customers, drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all text-gray-900"
            >
              <option value="ALL">All Statuses</option>
              {TABS.find((t) => t.id === activeTab)?.statuses.map((status) => (
                <option key={status} value={status}>
                  {STATUS_CONFIG[status].label}
                </option>
              ))}
            </select>

            {/* Driver Filter */}
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all text-gray-900"
            >
              <option value="">All Drivers</option>
              {uniqueDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>

            {/* Date Filters */}
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-3 py-3 text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-3 py-3 text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="End Date"
              />
            </div>
          </div>

          {/* Results Count */}
          {filteredSessions.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Showing{" "}
              <span className="font-bold text-gray-900">
                {filteredSessions.length}
              </span>{" "}
              of{" "}
              <span className="font-bold text-gray-900">
                {allSessions.length}
              </span>{" "}
              sessions
            </div>
          )}
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Session
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Scheduled Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Restaurants
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedSessions.map((session) => {
                  const statusConfig = STATUS_CONFIG[session.deliveryStatus];
                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-blue-50 transition-colors border-b border-gray-100"
                    >
                      {/* Session ID */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {session.sessionName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          #{session.id.slice(0, 8).toUpperCase()}
                        </div>
                        {session.cateringOrder?.customerName && (
                          <div className="text-xs text-blue-600 mt-1">
                            {session.cateringOrder.customerName}
                          </div>
                        )}
                      </td>

                      {/* Scheduled Time */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(session.sessionDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {session.eventTime || "N/A"}
                        </div>
                      </td>

                      {/* Restaurants */}
                      <td className="px-6 py-5">
                        {session.orderItems.length === 0 ? (
                          <span className="text-sm text-gray-400">
                            No restaurants
                          </span>
                        ) : session.orderItems.length === 1 ? (
                          <div className="text-sm font-medium text-gray-900">
                            {session.orderItems[0].restaurantName}
                          </div>
                        ) : (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {session.orderItems[0].restaurantName}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              +{session.orderItems.length - 1} more
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Destination */}
                      <td className="px-6 py-5">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {session.cateringOrder?.deliveryAddress || "N/A"}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span
                          className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* Driver */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        {session.driverName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                              {session.driverName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {session.driverName}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">
                            Not assigned
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedSession(session)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {sortedSessions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No sessions found matching your criteria
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Session Detail Modal */}
      <SessionDetailModal
        session={selectedSession}
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    </div>
  );
};

export default CateringSessionsScreen;
