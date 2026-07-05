export type OrderStatus = "Pending" | "Confirmed" | "Shipped" | "Out for Delivery" | "Delivered" | "Cancelled";

export interface Order {
  id: string;
  fullName: string;
  address: string;
  whatsappNo: string;
  phoneNo: string;
  state: string;
  city: string;
  status: OrderStatus;
  notes: string;
  createdAt: any; // Date or Firebase Timestamp
  referenceId: string;
  itemQuantity: number;
  totalPrice: number;
}

export interface CRMStats {
  totalOrders: number;
  pending: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
  deliverySuccessRate: number; // Delivered / (Delivered + Cancelled)
}
