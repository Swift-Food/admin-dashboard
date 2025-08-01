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

    // //mapping to each column 
    // const buckets: Record<string, DriverOrder[]> = {
    //   FINDING_DRIVER:   [],
    //   // PREPARING:        [],
    //   // OUT_FOR_DELIVERY: [],
    // };

    // orders.forEach(o => {
    //   o.status: buckets.FINDING_DRIVER.push(o);
    //   // switch (o.status) {
    //     // o.status:   buckets.FINDING_DRIVER.push(o); break;
    //     // case "preparing":          buckets.PREPARING.push(o);      break;
    //     // case "out_for_delivery":   buckets.OUT_FOR_DELIVERY.push(o); break;
    //     // // ignore delivered/cancelled
    //   }
    // );

  // const orders = [
  //   {
  //     id: "ORD001",
  //     customerName: "Rahul Menon",
  //     status: "FINDING_DRIVER",
  //     items: [
  //       { name: "Chicken Biryani", quantity: 1 },
  //       { name: "Pepsi", quantity: 2 },
  //     ],
  //     totalPrice: 320,
  //     address: "MG Road, Kochi",
  //     timestamp: "2025-07-09T10:30:00Z",
  //   },
  //   {
  //     id: "ORD002",
  //     customerName: "Anjali Raj",
  //     status: "PREPARING",
  //     items: [{ name: "Masala Dosa", quantity: 2 }],
  //     totalPrice: 160,
  //     address: "Palarivattom, Kochi",
  //     timestamp: "2025-07-09T10:35:00Z",
  //   },
  //   {
  //     id: "ORD003",
  //     customerName: "Jithin Varghese",
  //     status: "OUT_FOR_DELIVERY",
  //     items: [
  //       { name: "Veg Thali", quantity: 1 },
  //       { name: "Butter Naan", quantity: 2 },
  //     ],
  //     totalPrice: 270,
  //     address: "Kaloor, Kochi",
  //     timestamp: "2025-07-09T10:20:00Z",
  //   },
  //   {
  //     id: "ORD004",
  //     customerName: "Sneha Nair",
  //     status: "FINDING_DRIVER",
  //     items: [{ name: "Chicken Shawarma", quantity: 3 }],
  //     totalPrice: 360,
  //     address: "Edappally, Kochi",
  //     timestamp: "2025-07-09T10:25:00Z",
  //   },
  //   {
  //     id: "ORD005",
  //     customerName: "Vishnu Prasad",
  //     status: "PREPARING",
  //     items: [
  //       { name: "Paneer Butter Masala", quantity: 1 },
  //       { name: "Jeera Rice", quantity: 1 },
  //     ],
  //     totalPrice: 250,
  //     address: "Kadavanthra, Kochi",
  //     timestamp: "2025-07-09T10:40:00Z",
  //   },
  // ];

  // const statusMap = {
  //   FINDING_DRIVER: [],
  //   PREPARING: [],
  //   OUT_FOR_DELIVERY: [],
  // };

  // orders.forEach((order) => {
  //   if (statusMap[order.status]) {
  //     statusMap[order.status].push(order);
  //   }
  // });

   return (
    <div className="p-4 h-screen bg-[#ccdaf5]">
      <h1 className="text-xl font-bold mb-4">Orders</h1>
      <div className="flex gap-4">
        {/* <OrderColumn title="Total Number of Orders" orders={buckets.FINDING_DRIVER} />
        <OrderColumn title="Preparing" orders={buckets.PREPARING} /> */}
        <OrderColumn title="Total Orders" orders={orders} />
      </div>
    </div>
  );
};

export default HomeScreen;
