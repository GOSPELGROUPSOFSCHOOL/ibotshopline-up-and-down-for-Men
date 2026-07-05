import React, { useState, useEffect, useRef } from "react";
import { 
  auth 
} from "../lib/firebase";
import { 
  signOut, onAuthStateChanged, User, signInWithEmailAndPassword
} from "firebase/auth";
import { 
  db 
} from "../lib/firebase";
import { 
  collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs,
  getDoc, setDoc
} from "firebase/firestore";
import { 
  Order, OrderStatus, CRMStats 
} from "../types";
import { 
  Lock, LogOut, Search, Filter, Phone, PhoneCall, Trash2, CheckCircle2, 
  Truck, CheckSquare, XCircle, Clock, RefreshCw, BarChart3, Download, MapPin, Info,
  Mail, Key, Bell, Volume2, VolumeX, Sparkles
} from "lucide-react";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface CRMSectionProps {
  onBackToLanding: () => void;
}

interface AdminNotification {
  id: string;
  type: "new" | "updated";
  title: string;
  message: string;
  timestamp: Date;
}

export default function CRMSection({ onBackToLanding }: CRMSectionProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Real-time Notification States
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const isInitialLoad = useRef(true);

  // Synthesize elegant double-chime merchant sound using Web Audio API
  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
      };
      
      // Crisp commercial sound (ascending tones)
      playTone(523.25, now, 0.22, 0.12);        // C5
      playTone(659.25, now + 0.08, 0.22, 0.12); // E5
      playTone(783.99, now + 0.16, 0.22, 0.12); // G5
      playTone(1046.50, now + 0.24, 0.35, 0.15); // C6 (crisp, final tone)
    } catch (e) {
      console.warn("Audio Context playback failed or blocked by autoplay policy", e);
    }
  };

  const triggerNotification = (notif: AdminNotification) => {
    setNotifications((prev) => [notif, ...prev].slice(0, 5));
    if (soundEnabled) {
      playNotificationSound();
    }
    // Auto-dismiss after 6 seconds to prevent clutter
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    }, 6000);
  };
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [stateFilter, setStateFilter] = useState<string>("All");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Custom modal-driven order deletion states
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stats
  const [stats, setStats] = useState<CRMStats>({
    totalOrders: 0,
    pending: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
    deliverySuccessRate: 0
  });

  const ADMIN_EMAIL = "ibotshopline@gmail.com";

  // Admin login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Watch Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const lowerEmail = currentUser.email?.toLowerCase();
        if (lowerEmail === ADMIN_EMAIL) {
          setIsAdmin(true);
        } else {
          // Check if this email is in 'admins' collection
          try {
            const adminDocRef = doc(db, "admins", lowerEmail || "");
            const adminDoc = await getDoc(adminDocRef);
            if (adminDoc.exists()) {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } catch (e) {
            console.error("Checking admin collection failed", e);
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setIsAuthenticating(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync Orders from Firestore Real-time
  useEffect(() => {
    if (!isAdmin) return;

    setIsRefreshing(true);
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Process real-time notifications for active sessions
      if (!isInitialLoad.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const referenceId = data.referenceId || "REF-NEW";
            const fullName = data.fullName || "A customer";
            const totalPrice = data.totalPrice || 78000;
            
            triggerNotification({
              id: change.doc.id,
              type: "new",
              title: "🆕 New Order Received!",
              message: `${fullName} placed an order (${referenceId}) worth ₦${totalPrice.toLocaleString()}`,
              timestamp: new Date()
            });
          } else if (change.type === "modified") {
            const data = change.doc.data();
            const referenceId = data.referenceId || "REF-UPD";
            const fullName = data.fullName || "Customer";
            const status = data.status || "Pending";
            
            triggerNotification({
              id: change.doc.id,
              type: "updated",
              title: `⚙️ Order Status Updated`,
              message: `Order ${referenceId} (${fullName}) is now "${status}"`,
              timestamp: new Date()
            });
          }
        });
      } else {
        isInitialLoad.current = false;
      }

      const ordersList: Order[] = [];
      let totalRev = 0;
      let pendingCount = 0;
      let confirmedCount = 0;
      let shippedCount = 0;
      let deliveredCount = 0;
      let cancelledCount = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const ord: Order = {
          id: docSnap.id,
          fullName: data.fullName || "",
          address: data.address || "",
          whatsappNo: data.whatsappNo || "",
          phoneNo: data.phoneNo || "",
          state: data.state || "",
          city: data.city || "",
          status: data.status || "Pending",
          notes: data.notes || "",
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          referenceId: data.referenceId || "REF-ERR",
          itemQuantity: data.itemQuantity || 1,
          totalPrice: data.totalPrice || 78000
        };
        ordersList.push(ord);

        // Calculate metrics
        if (ord.status === "Pending") pendingCount++;
        else if (ord.status === "Confirmed") confirmedCount++;
        else if (ord.status === "Shipped") shippedCount++;
        else if (ord.status === "Delivered") {
          deliveredCount++;
          totalRev += ord.totalPrice;
        } else if (ord.status === "Cancelled") cancelledCount++;
      });

      setOrders(ordersList);

      const totalOrd = ordersList.length;
      const successRate = (deliveredCount + cancelledCount) > 0 
        ? Math.round((deliveredCount / (deliveredCount + cancelledCount)) * 100) 
        : 0;

      setStats({
        totalOrders: totalOrd,
        pending: pendingCount,
        confirmed: confirmedCount,
        shipped: shippedCount,
        delivered: deliveredCount,
        cancelled: cancelledCount,
        totalRevenue: totalRev,
        deliverySuccessRate: successRate
      });
      setIsRefreshing(false);
    }, (error) => {
      console.error("Firestore sync failed:", error);
      setIsRefreshing(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Handle Email Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("Please fill in all fields.");
      return;
    }
    try {
      setIsAuthenticating(true);
      setAuthError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Email login failed:", err);
      let errorMessage = "Invalid email or password.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        errorMessage = "Incorrect email or password. Please verify your credentials.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      }
      setAuthError(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  // Update Status in Pipeline (Customer Action Closing to Delivery Action Point)
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const orderDoc = doc(db, "orders", orderId);
      await updateDoc(orderDoc, { status: newStatus });
    } catch (e) {
      alert("Error updating order status: " + e);
    }
  };

  // Update notes
  const handleUpdateNotes = async (orderId: string, notes: string) => {
    try {
      const orderDoc = doc(db, "orders", orderId);
      await updateDoc(orderDoc, { notes });
    } catch (e) {
      console.error("Error updating notes:", e);
    }
  };

  // Delete Order (Safety check)
  const handleDeleteOrder = (order: Order) => {
    setDeletingOrder(order);
    setDeleteError(null);
  };

  const confirmDeleteOrder = async () => {
    if (!deletingOrder) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteDoc(doc(db, "orders", deletingOrder.id));
      setDeletingOrder(null);
    } catch (e: any) {
      console.error("Error deleting order:", e);
      setDeleteError(e?.message || "Permission denied or network error.");
      try {
        handleFirestoreError(e, OperationType.DELETE, `orders/${deletingOrder.id}`);
      } catch (err) {
        // Log details but don't crash UI thread
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Get status color representation
  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case "Pending":
        return "bg-slate-100 text-slate-800 border-slate-200";
      case "Confirmed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Shipped":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Out for Delivery":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Delivered":
        return "bg-green-50 text-green-700 border-green-200";
      case "Cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-850 border-slate-200";
    }
  };

  // Filter & Search Logic
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phoneNo.includes(searchQuery) ||
      order.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    const matchesState = stateFilter === "All" || order.state === stateFilter;

    return matchesSearch && matchesStatus && matchesState;
  });

  // Extract unique states from current orders for state filter
  const uniqueStates = Array.from(new Set(orders.map((o) => o.state)));

  // Generate WhatsApp text for Admin to follow-up/close deal
  const getWhatsAppFollowUpLink = (order: Order) => {
    let rawNum = order.whatsappNo.replace(/\D/g, "");
    if (rawNum.startsWith("0")) {
      rawNum = "234" + rawNum.substring(1);
    } else if (!rawNum.startsWith("234") && rawNum.length === 10) {
      rawNum = "234" + rawNum;
    }

    let msg = "";
    if (order.status === "Pending") {
      msg = `Hello ${order.fullName},\n\nI am the Shipping Manager from the *7-Piece Watch Luxury Store*.\n\nWe received your order for *${order.itemQuantity} Box(es)* of the watch gift set (Total: ₦${order.totalPrice.toLocaleString()}) to be delivered to *${order.city}, ${order.state}*.\n\nKindly reply to this message to *CONFIRM* your address so we can dispatch your box immediately. Thank you!`;
    } else if (order.status === "Confirmed") {
      msg = `Hello ${order.fullName},\n\nGreat news! Your order of the *7-Piece Watch Gift Set* is now *CONFIRMED*.\n\nOur packaging team is boxing your order with reference *${order.referenceId}*. We will send your tracking code once shipped.\n\nThank you for choosing us!`;
    } else if (order.status === "Shipped") {
      msg = `Hello ${order.fullName},\n\nYour *7-Piece Watch Gift Set* has been dispatched and is currently in transit to your address in *${order.state}*.\n\nOur delivery agent will call you shortly on *${order.phoneNo}* to coordinate drop-off. Please keep your phone reachable. Thank you!`;
    } else {
      msg = `Hello ${order.fullName},\n\nThis is regarding your order *${order.referenceId}* for the *7-Piece Watch Gift Set*. We want to follow up on your delivery experience!`;
    }

    return `https://wa.me/${rawNum}?text=${encodeURIComponent(msg)}`;
  };

  // Export orders to CSV
  const exportToCSV = () => {
    if (filteredOrders.length === 0) return;
    
    const headers = ["Reference ID", "Full Name", "Phone No", "WhatsApp No", "State", "City", "Delivery Address", "Quantity", "Total Price", "Status", "Notes", "Created At"];
    const rows = filteredOrders.map((o) => [
      o.referenceId,
      o.fullName,
      o.phoneNo,
      o.whatsappNo,
      o.state,
      o.city,
      o.address.replace(/"/g, '""'),
      o.itemQuantity,
      o.totalPrice,
      o.status,
      (o.notes || "").replace(/"/g, '""'),
      o.createdAt.toISOString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `watch_orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="crm-section-container" className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Header and Logout */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
        <div>
          <button
            onClick={onBackToLanding}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 transition flex items-center gap-1 mb-2 uppercase tracking-widest"
          >
            &larr; Back to Landing Page
          </button>
          <h1 className="font-display text-3xl font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
            📊 Watch Sales & Order CRM
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Fulfill orders, track delivery pipelines, and manage customer communications.
          </p>
        </div>

        {user && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-start md:self-auto">
            {/* Realtime Sound Controller */}
            <button
              onClick={() => {
                const newSoundState = !soundEnabled;
                setSoundEnabled(newSoundState);
                if (newSoundState) {
                  playNotificationSound();
                }
              }}
              className={`flex items-center justify-between gap-2.5 border px-3.5 py-2.5 rounded-lg text-xs font-bold transition shadow-sm font-sans cursor-pointer ${
                soundEnabled
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
              }`}
              title={soundEnabled ? "Mute notification sounds" : "Unmute notification sounds"}
            >
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <>
                    <Volume2 size={16} className="text-emerald-600 animate-bounce" />
                    <span>Live Chimes: ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX size={16} className="text-slate-400" />
                    <span>Live Chimes: MUTED</span>
                  </>
                )}
              </div>
              {soundEnabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
            </button>

            {/* User Profile and Sign out */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-lg shadow-sm font-sans">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-950 block">{user.displayName || "Admin User"}</span>
                <span className="text-[10px] text-slate-400 block">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-50 hover:bg-red-100 text-red-600 p-2.5 rounded-md transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LOGIN VIEW SECURED BY AUTHORIZED ADMIN EMAIL */}
      {!user ? (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-8 my-12">
          <div>
            <div className="text-center mb-6">
              <div className="bg-slate-50 text-slate-800 p-4 rounded-full border border-slate-200 w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Lock size={28} className="text-slate-700" />
              </div>
              <h2 className="font-display text-2xl font-black text-slate-900 mb-1 uppercase tracking-tight">Authorized CRM Login</h2>
              <p className="text-slate-500 text-xs leading-relaxed font-sans">
                Enter your administrative credentials below to access the management panel.
              </p>
            </div>

            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg mb-4 font-sans flex items-start gap-2">
                <span className="font-bold">Error:</span>
                <p className="flex-1">{authError}</p>
              </div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="e.g., ibotshopline@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-lg outline-none transition text-sm text-slate-900 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Key size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-lg outline-none transition text-sm text-slate-900 font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-black py-3 px-6 rounded-lg shadow transition disabled:opacity-50 uppercase tracking-wider text-xs cursor-pointer"
              >
                {isAuthenticating ? "Verifying..." : "Sign In & Enter CRM"}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 text-[10px] text-slate-400 text-center font-mono">
            Authorized Email: ibotshopline@gmail.com
          </div>
        </div>
      ) : !isAdmin ? (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center my-12 font-sans">
          <div className="bg-red-50 text-red-600 p-4 rounded-full border border-red-150 w-16 h-16 flex items-center justify-center mx-auto mb-6">
            <Lock size={28} />
          </div>
          <h2 className="font-display text-2xl font-black text-red-950 mb-2 uppercase tracking-tight">Access Denied</h2>
          <p className="text-slate-600 text-xs md:text-sm mb-6 leading-relaxed">
            Your Google Account (<span className="font-bold text-slate-950">{user.email}</span>) is not authorized to manage this CRM. Please log out and sign in with the merchant administrator's Google account.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded transition shadow-md uppercase tracking-wider text-xs cursor-pointer"
            >
              Sign Out & Try Again
            </button>
            <button
              onClick={onBackToLanding}
              className="w-full text-xs text-slate-500 hover:text-slate-900 font-bold uppercase tracking-widest py-2 transition"
            >
              Return to Landing Page
            </button>
          </div>
        </div>
      ) : (
        /* CRM MAIN DASHBOARD VIEW */
        <div className="space-y-8 font-sans">
          
          {/* Key Metrics Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            
            {/* Metric 1 */}
            <div className="bg-white p-5 rounded border border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Submissions</span>
                <span className="text-2xl md:text-3xl font-black text-slate-950 mt-1 block font-display tracking-tight">{stats.totalOrders}</span>
              </div>
              <div className="bg-slate-100 text-slate-800 p-3 rounded"><BarChart3 size={20} /></div>
            </div>
 
            {/* Metric 2 */}
            <div className="bg-white p-5 rounded border border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] md:text-xs text-yellow-600 font-bold uppercase tracking-wider block">Unconfirmed</span>
                <span className="text-2xl md:text-3xl font-black text-yellow-700 mt-1 block font-display tracking-tight">{stats.pending}</span>
              </div>
              <div className="bg-yellow-50 text-yellow-700 p-3 rounded"><Clock size={20} /></div>
            </div>
 
            {/* Metric 3 */}
            <div className="bg-white p-5 rounded border border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] md:text-xs text-slate-600 font-bold uppercase tracking-wider block">In Transit Pipeline</span>
                <span className="text-2xl md:text-3xl font-black text-slate-950 mt-1 block font-display tracking-tight">{stats.confirmed + stats.shipped}</span>
              </div>
              <div className="bg-slate-50 text-slate-700 p-3 rounded"><Truck size={20} /></div>
            </div>
 
            {/* Metric 4 */}
            <div className="bg-white p-5 rounded border border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] md:text-xs text-emerald-600 font-bold uppercase tracking-wider block">Revenue (Delivered)</span>
                <span className="text-xl md:text-2xl font-black text-emerald-700 mt-1 block font-display tracking-tight">₦{stats.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded"><CheckCircle2 size={20} /></div>
            </div>
 
          </div>

          {/* CRM Controls & Pipelines */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            
            {/* Filter and search panel */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 font-sans">
              
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search orders by Name, Ref Code, Phone, or City..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 focus:border-slate-900 rounded outline-none transition text-xs text-slate-900"
                />
              </div>

              {/* Status and State Dropdowns */}
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <Filter size={13} className="text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="All">All Pipeline Stages</option>
                    <option value="Pending">Pending Validation</option>
                    <option value="Confirmed">Confirmed (Closing Action)</option>
                    <option value="Shipped">Dispatched (Shipping)</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered (Fulfillment Point)</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* State Filter */}
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="All">All Nigerian States</option>
                  {uniqueStates.map((st, i) => (
                    <option key={i} value={st}>{st}</option>
                  ))}
                </select>

                {/* Export Button */}
                <button
                  onClick={exportToCSV}
                  disabled={filteredOrders.length === 0}
                  className="bg-slate-900 hover:bg-slate-850 disabled:opacity-40 text-white text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} /> Export CSV
                </button>

              </div>

            </div>

            {/* Pipeline Content List */}
            {isRefreshing ? (
              <div className="p-16 text-center font-sans">
                <RefreshCw size={28} className="animate-spin text-slate-900 mx-auto mb-4" />
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Synchronizing database...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2 font-sans">
                <Info size={32} className="mx-auto text-slate-300" />
                <p className="font-bold text-slate-700 text-sm uppercase tracking-wider">No orders found</p>
                <p className="text-xs text-slate-500">Try relaxing your search terms or filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                      <th className="py-3.5 px-6">Order Details</th>
                      <th className="py-3.5 px-4">Contact Info</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Pipeline Status (Closing &rarr; Delivery)</th>
                      <th className="py-3.5 px-4">Admin Notes</th>
                      <th className="py-3.5 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-neutral-50/50 transition">
                        
                        {/* Column 1: Order Details */}
                        <td className="py-4.5 px-6 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-900 bg-neutral-100 px-2 py-0.5 rounded text-xs">
                              {order.referenceId}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {order.createdAt.toLocaleDateString()} {order.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <div className="font-bold text-gray-950 text-base">{order.fullName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <span>Quantity: {order.itemQuantity} Set Box{order.itemQuantity > 1 ? "es" : ""}</span>
                            <span>&bull;</span>
                            <span className="font-bold text-gray-800">Total: ₦{order.totalPrice.toLocaleString()}</span>
                          </div>
                        </td>

                        {/* Column 2: Contact Info */}
                        <td className="py-4.5 px-4 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Phone size={13} className="text-gray-400" />
                            <a href={`tel:${order.phoneNo}`} className="font-medium hover:underline text-blue-600">
                              {order.phoneNo}
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {/* WhatsApp Direct */}
                            <svg className="w-3.5 h-3.5 text-emerald-500 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.852.002-2.63-1.013-5.101-2.859-6.95-1.847-1.849-4.305-2.868-6.942-2.869-5.438 0-9.863 4.419-9.867 9.851-.001 1.762.481 3.483 1.398 5.013l-.998 3.647 3.73-.978z" />
                            </svg>
                            <a 
                              href={getWhatsAppFollowUpLink(order)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-emerald-600 hover:underline flex items-center gap-0.5 text-xs"
                            >
                              Message Customer
                            </a>
                          </div>
                        </td>

                        {/* Column 3: Location */}
                        <td className="py-4.5 px-4 space-y-1">
                          <div className="font-semibold text-gray-900 flex items-center gap-1">
                            <MapPin size={13} className="text-red-500 shrink-0" />
                            <span>{order.state}</span>
                          </div>
                          <div className="text-xs text-gray-600">{order.city}</div>
                          <div className="text-[11px] text-gray-500 max-w-[200px] truncate" title={order.address}>
                            {order.address}
                          </div>
                        </td>

                        {/* Column 4: Pipeline Status Transitions (Closing Action to Delivery Action Point) */}
                        <td className="py-4.5 px-4 font-sans">
                          <div className="space-y-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold border tracking-wider ${getStatusStyle(order.status)}`}>
                              {order.status === "Pending" ? "⏳ Pending Dispatch" : order.status}
                            </span>
                            
                            {/* Actions pipeline drop */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {order.status === "Pending" && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, "Confirmed")}
                                  className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold px-2 py-1 rounded border border-slate-200 transition cursor-pointer"
                                  title="Mark order as confirmed (Closing Action)"
                                >
                                  🤝 Close & Confirm
                                </button>
                              )}
                              
                              {order.status === "Confirmed" && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, "Shipped")}
                                  className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold px-2 py-1 rounded border border-slate-200 transition cursor-pointer"
                                  title="Dispatch to transit courier"
                                >
                                  🚀 Dispatch Ship
                                </button>
                              )}

                              {(order.status === "Shipped" || order.status === "Confirmed") && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, "Out for Delivery")}
                                  className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold px-2 py-1 rounded border border-slate-200 transition cursor-pointer"
                                >
                                  🏍️ Out for Delivery
                                </button>
                              )}

                              {(order.status === "Out for Delivery" || order.status === "Shipped") && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, "Delivered")}
                                  className="text-[10px] bg-green-50 hover:bg-green-100 text-green-800 font-bold px-2 py-1 rounded border border-green-200 transition cursor-pointer"
                                  title="Fulfillment complete (Delivery Point)"
                                >
                                  ✅ Mark Delivered
                                </button>
                              )}

                              {order.status !== "Delivered" && order.status !== "Cancelled" && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, "Cancelled")}
                                  className="text-[10px] bg-red-50 hover:bg-red-100 text-red-800 font-bold px-2 py-1 rounded border border-red-200 transition cursor-pointer"
                                >
                                  🚫 Cancel Order
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 5: Admin Notes */}
                        <td className="py-4.5 px-4 font-sans">
                          <textarea
                             value={order.notes}
                             placeholder="Add notes (e.g. Call back at 5pm, driver obinna..."
                             onChange={(e) => handleUpdateNotes(order.id, e.target.value)}
                             rows={2}
                             className="w-full min-w-[140px] px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded outline-none transition resize-none text-slate-800 font-sans"
                          ></textarea>
                        </td>

                        {/* Column 6: Delete action */}
                        <td className="py-4.5 px-6 text-right">
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="text-slate-300 hover:text-red-600 p-2 rounded transition cursor-pointer"
                            title="Delete order permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total pipeline status card */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between text-xs text-slate-500 gap-3 font-sans">
              <div>
                Showing <span className="font-bold text-slate-800">{filteredOrders.length}</span> of <span className="font-bold text-slate-800">{orders.length}</span> total orders.
              </div>
              <div className="flex gap-4">
                <span>Success Delivery Rate: <strong className="text-slate-800">{stats.deliverySuccessRate}%</strong></span>
                <span>Active Pipeline (Confirmed + Transit): <strong className="text-slate-800">{stats.confirmed + stats.shipped}</strong></span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Custom Confirmation Modal for Order Deletion */}
      {deletingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="bg-red-50 border-b border-red-100 p-5 flex items-start gap-3.5">
              <div className="p-2.5 bg-red-100 rounded-full text-red-600 shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-display font-black text-slate-950 text-base uppercase tracking-tight">Confirm Order Deletion</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  This action is permanent and cannot be reversed. Are you absolutely sure you want to delete this customer record?
                </p>
              </div>
            </div>

            {/* Content info block */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 space-y-2.5 font-sans">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Customer:</span>
                <span className="text-slate-900 font-extrabold">{deletingOrder.fullName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Ref ID:</span>
                <span className="text-slate-900 font-mono font-bold bg-slate-200 px-1.5 py-0.5 rounded">{deletingOrder.referenceId}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Value:</span>
                <span className="text-slate-900 font-extrabold">₦{deletingOrder.totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Location:</span>
                <span className="text-slate-700 font-medium">{deletingOrder.city}, {deletingOrder.state}</span>
              </div>
            </div>

            {/* Error messaging */}
            {deleteError && (
              <div className="p-4 bg-red-50 border-b border-red-100 text-xs text-red-700 font-sans font-semibold">
                ⚠️ Error: {deleteError}
              </div>
            )}

            {/* Actions Footer */}
            <div className="p-4 flex gap-3 justify-end bg-slate-50/50">
              <button
                onClick={() => setDeletingOrder(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteOrder}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs rounded-lg shadow-sm hover:shadow transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Visual Signal Notifications (Floating Stack) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {notifications.map((notif) => (
          <div
            key={notif.id + "-" + notif.timestamp.getTime()}
            className="pointer-events-auto bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700/50 p-4 flex items-start gap-3 animate-slide-in relative overflow-hidden"
          >
            {/* Ambient gold/green pulsing indicator at the side */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${notif.type === "new" ? "bg-amber-500" : "bg-blue-500"}`} />
            
            <div className={`p-2 rounded-lg shrink-0 ${notif.type === "new" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"}`}>
              {notif.type === "new" ? <Bell size={18} className="animate-bounce" /> : <Sparkles size={18} className="animate-pulse" />}
            </div>
            
            <div className="flex-1 min-w-0 pr-4">
              <h4 className="font-sans font-bold text-sm text-slate-100 flex items-center gap-1.5">
                {notif.title}
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
              </h4>
              <p className="font-sans text-xs text-slate-300 mt-1 leading-relaxed">
                {notif.message}
              </p>
              <span className="font-mono text-[9px] text-slate-400 mt-1 block">
                {notif.timestamp.toLocaleTimeString()}
              </span>
            </div>

            <button
              onClick={() => {
                setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
              }}
              className="text-slate-400 hover:text-white rounded p-1 hover:bg-slate-800 transition shrink-0 self-start cursor-pointer"
            >
              <XCircle size={14} />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
