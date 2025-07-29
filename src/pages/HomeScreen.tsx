import React, { useEffect, useState } from "react";
import orderService from "../services/order.service";
import { driverId } from "../constants";
import OrderColumn from "../components/OrderColumn";

const HomeScreen = () => {
    // const [orders, setOrders] = useState([]);

    // useEffect(() => {
    //   getOrders();
    // }, []);

    // const getOrders = () => {
    //   const response = orderService.getOrdersbyDriver(driverId).then(setOrders);
    //   console.log("Orders", response);
    // };

  const orders = [
    {
      id: "ORD001",
      customerName: "Rahul Menon",
      status: "FINDING_DRIVER",
      items: [
        { name: "Chicken Biryani", quantity: 1 },
        { name: "Pepsi", quantity: 2 },
      ],
      totalPrice: 320,
      address: "MG Road, Kochi",
      timestamp: "2025-07-09T10:30:00Z",
    },
    {
      id: "ORD002",
      customerName: "Anjali Raj",
      status: "PREPARING",
      items: [{ name: "Masala Dosa", quantity: 2 }],
      totalPrice: 160,
      address: "Palarivattom, Kochi",
      timestamp: "2025-07-09T10:35:00Z",
    },
    {
      id: "ORD003",
      customerName: "Jithin Varghese",
      status: "OUT_FOR_DELIVERY",
      items: [
        { name: "Veg Thali", quantity: 1 },
        { name: "Butter Naan", quantity: 2 },
      ],
      totalPrice: 270,
      address: "Kaloor, Kochi",
      timestamp: "2025-07-09T10:20:00Z",
    },
    {
      id: "ORD004",
      customerName: "Sneha Nair",
      status: "FINDING_DRIVER",
      items: [{ name: "Chicken Shawarma", quantity: 3 }],
      totalPrice: 360,
      address: "Edappally, Kochi",
      timestamp: "2025-07-09T10:25:00Z",
    },
    {
      id: "ORD005",
      customerName: "Vishnu Prasad",
      status: "PREPARING",
      items: [
        { name: "Paneer Butter Masala", quantity: 1 },
        { name: "Jeera Rice", quantity: 1 },
      ],
      totalPrice: 250,
      address: "Kadavanthra, Kochi",
      timestamp: "2025-07-09T10:40:00Z",
    },
  ];

  const statusMap = {
    FINDING_DRIVER: [],
    PREPARING: [],
    OUT_FOR_DELIVERY: [],
  };

  orders.forEach((order) => {
    if (statusMap[order.status]) {
      statusMap[order.status].push(order);
    }
  });

   return (
    <div className="p-4 h-screen bg-gray-300">
      <h1 className="text-xl font-bold mb-4">Orders</h1>
      <div className="flex gap-4">
        <OrderColumn title="Finding Driver" orders={statusMap.FINDING_DRIVER} />
        <OrderColumn title="Preparing" orders={statusMap.PREPARING} />
        <OrderColumn title="Out for Delivery" orders={statusMap.OUT_FOR_DELIVERY} />
      </div>
    </div>
  );
};

export default HomeScreen;
