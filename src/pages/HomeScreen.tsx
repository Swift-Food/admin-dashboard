import React, { useEffect, useState } from "react";
import orderService from "../services/order.service";
import { driverId } from "../constants";
import OrderColumn from "../components/OrderColumn";
import type {DriverOrder} from "../types/order.types";
import OrderCard from "../components/OrderCard";

const HomeScreen = () => {
    const [orders, setOrders] = useState<DriverOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();

    useEffect(() => {
      orderService.getOrdersbyDriver(driverId)
      .then(setOrders)
      .catch(err => setError(err.message || "Failed to load"))
      .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading orders...</div>;
    if (error) return <div className="text-red-500">Error: {error}</div>;

    const getOrders = () => {
      const response = orderService.getOrdersbyDriver(driverId).then(setOrders);
      console.log("Orders", response);
    };

    //mapping to each column 
    const buckets: Record<string, DriverOrder[]> = {
      FINDING_DRIVER: [],
      PREPARING: [],
      OUT_FOR_DELIVERY: [],
    };

    orders.forEach(o => { 
      switch (o.status) {
        case "placed": 
        case "confirmed": 
        case "preparing": 
          buckets.PREPARING.push(o); 
          break;

        case "ready_for_pickup": 
        case "driver_assigned": 
          buckets.FINDING_DRIVER.push(o); 
          break;

        case "out_for_delivery":   
          buckets.OUT_FOR_DELIVERY.push(o); 
          break;
      }
});

   return (
    <div className="p-4 h-screen bg-[#ccdaf5]">
      <h1 className="text-xl font-bold mb-4">Orders</h1>
      <div className="flex gap-4">
        <OrderColumn title="Preparing" orders={buckets.PREPARING} />
        <OrderColumn title="Finding Driver" orders={buckets.FINDING_DRIVER} />
        <OrderColumn title="Out for Delivery" orders={buckets.OUT_FOR_DELIVERY} />
      </div>
    </div>
  );
};

export default HomeScreen;
