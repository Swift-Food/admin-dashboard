import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, X, Eye, EyeOff, Copy, CheckCircle, ShoppingBag, Clock } from 'lucide-react';

const RestaurantAdminDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [copiedField, setCopiedField] = useState(null);
  const [restaurantOrders, setRestaurantOrders] = useState({});
  const [loadingOrders, setLoadingOrders] = useState({});

  // Fetch restaurants on component mount
  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://swiftfoods-32981ec7b5a4.herokuapp.com/restaurant');
      if (!response.ok) throw new Error('Failed to fetch restaurants');
      const data = await response.json();
      setRestaurants(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async (id, isOpen) => {
    try {
      setUpdatingId(id);
      const response = await fetch(`https://swiftfoods-32981ec7b5a4.herokuapp.com/restaurant/${id}/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isOpen,
          deviceToken: null
        }),
      });

      if (!response.ok) throw new Error('Failed to update availability');

      // Update local state
      setRestaurants(restaurants.map(r => 
        r.id === id ? { ...r, isOpen } : r
      ));
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const togglePasswordVisibility = (id) => {
    setShowPassword(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchRestaurantOrders = async (restaurantId) => {
    if (restaurantOrders[restaurantId]) {
      return; // Already fetched
    }

    try {
      setLoadingOrders(prev => ({ ...prev, [restaurantId]: true }));
      const response = await fetch(
        `https://swiftfoods-32981ec7b5a4.herokuapp.com/restaurant/getOrders/${restaurantId}`
      );
      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      
      // Extract orders from nested structure
      const orders = [];
      Object.values(data).forEach(restaurantOrders => {
        Object.values(restaurantOrders).forEach(order => {
          orders.push(order);
        });
      });
      
      setRestaurantOrders(prev => ({
        ...prev,
        [restaurantId]: orders
      }));
    } catch (err) {
      console.error('Error fetching orders:', err);
      setRestaurantOrders(prev => ({
        ...prev,
        [restaurantId]: []
      }));
    } finally {
      setLoadingOrders(prev => ({ ...prev, [restaurantId]: false }));
    }
  };

  const handleExpandRestaurant = (restaurantId) => {
    const newExpandedId = expandedId === restaurantId ? null : restaurantId;
    setExpandedId(newExpandedId);
    
    if (newExpandedId && !restaurantOrders[restaurantId]) {
      fetchRestaurantOrders(restaurantId);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PREPARING: 'bg-blue-100 text-blue-800',
      READY: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600" size={24} />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Data</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchRestaurants}
            className="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Restaurant Management</h1>
          <p className="text-gray-600 mt-2">Manage restaurant availability and view login credentials</p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Restaurant</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Market</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {restaurants.map((restaurant) => (
                  <React.Fragment key={restaurant.id}>
                    <tr className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{restaurant.restaurant_name}</div>
                          {restaurant.featured && (
                            <span className="inline-block mt-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                              Featured
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {restaurant.restaurantType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {restaurant.market?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{restaurant.phoneNumber || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{restaurant.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${restaurant.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className={`text-sm font-medium ${restaurant.isOpen ? 'text-green-700' : 'text-red-700'}`}>
                            {restaurant.isOpen ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateAvailability(restaurant.id, !restaurant.isOpen)}
                            disabled={updatingId === restaurant.id}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                              restaurant.isOpen
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {updatingId === restaurant.id ? (
                              <span className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Updating...
                              </span>
                            ) : restaurant.isOpen ? (
                              'Close'
                            ) : (
                              'Open'
                            )}
                          </button>
                          <button
                            onClick={() => handleExpandRestaurant(restaurant.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                          >
                            {expandedId === restaurant.id ? 'Hide' : 'Show'} Details
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === restaurant.id && (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            {/* Login Credentials Section */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h3 className="font-semibold text-gray-900 mb-3">Login Credentials</h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={restaurant.owner?.username || 'N/A'}
                                      readOnly
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                                    />
                                    <button
                                      onClick={() => copyToClipboard(restaurant.owner?.username, `username-${restaurant.id}`)}
                                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                                      title="Copy username"
                                    >
                                      {copiedField === `username-${restaurant.id}` ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                      ) : (
                                        <Copy size={18} className="text-gray-600" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type={showPassword[restaurant.id] ? 'text' : 'password'}
                                      value={restaurant.owner?.password || 'N/A'}
                                      readOnly
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                                    />
                                    <button
                                      onClick={() => togglePasswordVisibility(restaurant.id)}
                                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                                      title={showPassword[restaurant.id] ? 'Hide password' : 'Show password'}
                                    >
                                      {showPassword[restaurant.id] ? (
                                        <EyeOff size={18} className="text-gray-600" />
                                      ) : (
                                        <Eye size={18} className="text-gray-600" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(restaurant.owner?.password, `password-${restaurant.id}`)}
                                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                                      title="Copy password"
                                    >
                                      {copiedField === `password-${restaurant.id}` ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                      ) : (
                                        <Copy size={18} className="text-gray-600" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin OTP</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type={showPassword[`otp-${restaurant.id}`] ? 'text' : 'password'}
                                      value={restaurant.owner?.adminOtp || 'N/A'}
                                      readOnly
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                                    />
                                    <button
                                      onClick={() => togglePasswordVisibility(`otp-${restaurant.id}`)}
                                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                                      title={showPassword[`otp-${restaurant.id}`] ? 'Hide OTP' : 'Show OTP'}
                                    >
                                      {showPassword[`otp-${restaurant.id}`] ? (
                                        <EyeOff size={18} className="text-gray-600" />
                                      ) : (
                                        <Eye size={18} className="text-gray-600" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(restaurant.owner?.adminOtp, `otp-${restaurant.id}`)}
                                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                                      title="Copy OTP"
                                    >
                                      {copiedField === `otp-${restaurant.id}` ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                      ) : (
                                        <Copy size={18} className="text-gray-600" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Rating:</span>
                                    <span className="ml-2 font-medium">{restaurant.averageRating}/5</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Commission:</span>
                                    <span className="ml-2 font-medium">{restaurant.commission}%</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Restaurant #:</span>
                                    <span className="ml-2 font-medium">{restaurant.restaurantNumber || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">FSA:</span>
                                    <span className="ml-2 font-medium">{restaurant.fsa || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Ongoing Orders Section */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <ShoppingBag size={20} className="text-gray-700" />
                                  <h3 className="font-semibold text-gray-900">Ongoing Orders</h3>
                                </div>
                                {loadingOrders[restaurant.id] && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                    Loading...
                                  </div>
                                )}
                              </div>

                              {restaurantOrders[restaurant.id]?.length > 0 ? (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                  {restaurantOrders[restaurant.id].map((order) => (
                                    <div key={order.orderId} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition">
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <div className="font-medium text-gray-900">Order #{order.orderId.slice(0, 8)}</div>
                                          <div className="flex items-center gap-2 mt-1">
                                            <Clock size={14} className="text-gray-500" />
                                            <span className="text-xs text-gray-600">{formatDate(order.timestamp)}</span>
                                          </div>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                                          {order.status}
                                        </span>
                                      </div>

                                      <div className="space-y-1 mb-2">
                                        {order.items.map((item, idx) => (
                                          <div key={idx} className="flex justify-between text-sm">
                                            <span className="text-gray-700">
                                              {item.quantity}x {item.name}
                                            </span>
                                            <span className="text-gray-900 font-medium">
                                              ${(item.price * item.quantity).toFixed(2)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>

                                      {order.specialInstructions && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                                          <p className="text-xs text-yellow-800">
                                            <span className="font-medium">Special Instructions:</span> {order.specialInstructions}
                                          </p>
                                        </div>
                                      )}

                                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                        <div className="text-sm">
                                          {order.prepTimeMinutes && (
                                            <span className="text-gray-600">Prep Time: {order.prepTimeMinutes} min</span>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm text-gray-600">Total: <span className="font-semibold text-gray-900">${order.totalPrice.toFixed(2)}</span></div>
                                          <div className="text-xs text-gray-500">Restaurant Cost: ${order.restaurantCost.toFixed(2)}</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-6 text-gray-500">
                                  {loadingOrders[restaurant.id] ? 'Loading orders...' : 'No ongoing orders'}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {restaurants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No restaurants found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantAdminDashboard;