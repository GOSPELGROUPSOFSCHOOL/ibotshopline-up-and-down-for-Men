import React, { useState, useEffect } from "react";
import { 
  Flame, Clock, ShoppingCart, ShieldCheck, Truck, Star, Check, HelpCircle, 
  ChevronLeft, ChevronRight, MessageSquare, AlertCircle, Phone, Info, Award,
  Sparkles, Layers, Eye, Smile, Compass, Coins
} from "lucide-react";
import { Order } from "../types";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// List of Nigerian States for Checkout Select
const NIGERIAN_STATES = [
  "Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Anambra", "Delta", "Kaduna", "Kano", "Edo", "Ogun",
  "Abia", "Adamawa", "Akwa Ibom", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Ebonyi",
  "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Katsina", "Kebbi", "Kogi", "Kwara", "Nasarawa",
  "Niger", "Ondo", "Osun", "Plateau", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

interface LandingPageProps {
  onOrderSuccess: (order: Order) => void;
  onGoToAdmin: () => void;
}

export default function LandingPage({ onOrderSuccess, onGoToAdmin }: LandingPageProps) {
  // Image gallery state
  const [images, setImages] = useState<string[]>([
    "https://i.ibb.co/hxpsJqm7/IMG-20260601-WA0022.jpg",
    "https://i.ibb.co/zVRk3pgx/IMG-20260601-WA0017.jpg",
    "https://i.ibb.co/WvBSPf1B/IMG-20260601-WA0012.jpg"
  ]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Countdown timer state (hours, minutes, seconds)
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 24, seconds: 45 });

  // Form states
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [whatsappNo, setWhatsappNo] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [deliveryState, setDeliveryState] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const unitPrice = 78000; // Price in Naira
  const regularPrice = 110000;
  const totalPrice = unitPrice * quantity;

  // Load images from backend album API
  useEffect(() => {
    async function fetchAlbum() {
      try {
        const res = await fetch("/api/album");
        const data = await res.json();
        if (data && data.success && data.images && data.images.length > 0) {
          setImages(data.images);
        } else {
          setImages([
            "https://i.ibb.co/hxpsJqm7/IMG-20260601-WA0022.jpg",
            "https://i.ibb.co/zVRk3pgx/IMG-20260601-WA0017.jpg",
            "https://i.ibb.co/WvBSPf1B/IMG-20260601-WA0012.jpg"
          ]);
        }
      } catch (e) {
        console.error("Error fetching images, loading templates:", e);
        setImages([
          "https://i.ibb.co/hxpsJqm7/IMG-20260601-WA0022.jpg",
          "https://i.ibb.co/zVRk3pgx/IMG-20260601-WA0017.jpg",
          "https://i.ibb.co/WvBSPf1B/IMG-20260601-WA0012.jpg"
        ]);
      } finally {
        setIsLoadingImages(false);
      }
    }
    fetchAlbum();
  }, []);

  // Countdown timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          // Reset timer for demo urgency feel
          return { hours: 12, minutes: 45, seconds: 30 };
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Submit Order to Firestore
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    // Simple validation
    if (!fullName.trim()) return setSubmitError("Please enter your full name.");
    if (!address.trim()) return setSubmitError("Please enter your detailed delivery address.");
    if (!whatsappNo.trim()) return setSubmitError("Please enter your WhatsApp phone number.");
    if (!phoneNo.trim()) return setSubmitError("Please enter your active call phone number.");
    if (!deliveryState) return setSubmitError("Please select your delivery state.");
    if (!deliveryCity.trim()) return setSubmitError("Please enter your delivery city.");

    setIsSubmitting(true);

    try {
      // Generate a unique 8-character numeric/alpha order reference code
      const randHex = Math.floor(100000 + Math.random() * 900000).toString();
      const referenceId = `WT-${randHex}`;

      const orderData = {
        fullName: fullName.trim(),
        address: address.trim(),
        whatsappNo: whatsappNo.trim(),
        phoneNo: phoneNo.trim(),
        state: deliveryState,
        city: deliveryCity.trim(),
        status: "Pending" as const,
        notes: "",
        createdAt: serverTimestamp(),
        referenceId,
        itemQuantity: quantity,
        totalPrice: totalPrice
      };

      // Store in Firestore collection "orders"
      const docRef = await addDoc(collection(db, "orders"), orderData);
      
      // Call parent success trigger
      onOrderSuccess({
        id: docRef.id,
        ...orderData,
        createdAt: new Date() // local representation
      });

    } catch (err: any) {
      console.error("Order submit failed:", err);
      setSubmitError("Failed to register your order. Please check your internet connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scroll to checkout form smoothly
  const scrollToForm = () => {
    const el = document.getElementById("checkout-form-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const nextImage = () => {
    if (images.length === 0) return;
    setActiveImageIdx(prev => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length === 0) return;
    setActiveImageIdx(prev => (prev - 1 + images.length) % images.length);
  };

  // Curated product features
  const features = [
    {
      title: "Elegant Luxury Design",
      desc: "Turn heads wherever you go with a sophisticated timepiece that adds a touch of class to both casual and formal outfits.",
      iconName: "Sparkles",
      colorClass: "bg-amber-500/10 border-amber-500/20 text-amber-500"
    },
    {
      title: "Precision Quartz Movement",
      desc: "Enjoy accurate and dependable timekeeping powered by a high-quality quartz movement that keeps you on schedule every day.",
      iconName: "Clock",
      colorClass: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
    },
    {
      title: "Premium Durable Construction",
      desc: "Built with quality materials to withstand daily wear while maintaining its stylish appearance for years to come.",
      iconName: "ShieldCheck",
      colorClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
    },
    {
      title: "Comfortable Adjustable Strap",
      desc: "Designed with an ergonomic, adjustable strap that provides a secure and comfortable fit for all-day wear.",
      iconName: "Smile",
      colorClass: "bg-rose-500/10 border-rose-500/20 text-rose-400"
    },
    {
      title: "Scratch-Resistant Glass",
      desc: "The durable watch crystal helps protect the dial from scratches, keeping your watch looking new for longer.",
      iconName: "Layers",
      colorClass: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
    },
    {
      title: "Lightweight & Comfortable",
      desc: "Engineered to be lightweight, allowing you to wear it throughout the day without discomfort or wrist fatigue.",
      iconName: "Compass",
      colorClass: "bg-violet-500/10 border-violet-500/20 text-violet-400"
    },
    {
      title: "Easy-to-Read Display",
      desc: "Features a clear, well-designed dial with bold markers, making it effortless to check the time at a glance.",
      iconName: "Eye",
      colorClass: "bg-teal-500/10 border-teal-500/20 text-teal-400"
    },
    {
      title: "Perfect for Every Occasion",
      desc: "Whether you're attending a business meeting, party, wedding, or simply going out, this watch complements every style and occasion.",
      iconName: "Award",
      colorClass: "bg-amber-500/15 border-amber-500/30 text-yellow-500"
    },
    {
      title: "Exceptional Value for Money",
      desc: "Get the premium appearance and reliable performance of a luxury watch without paying a premium price—making it an excellent choice for yourself or as a thoughtful gift.",
      iconName: "Coins",
      colorClass: "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
    }
  ];

  const getFeatureIcon = (name: string) => {
    switch (name) {
      case "Sparkles": return <Sparkles size={20} />;
      case "Clock": return <Clock size={20} />;
      case "ShieldCheck": return <ShieldCheck size={20} />;
      case "Smile": return <Smile size={20} />;
      case "Layers": return <Layers size={20} />;
      case "Compass": return <Compass size={20} />;
      case "Eye": return <Eye size={20} />;
      case "Award": return <Award size={20} />;
      case "Flame": return <Flame size={20} />;
      case "Coins": return <Coins size={20} />;
      default: return <Check size={20} />;
    }
  };

  return (
    <div id="landing-page-root" className="pb-20">
      
      {/* Dynamic Urgency Promo Header */}
      <div className="bg-red-700 text-white text-center py-2 px-4 font-bold text-xs md:text-sm flex items-center justify-center gap-2.5 sticky top-0 z-50 shadow-md uppercase tracking-wider">
        <Flame size={15} className="text-yellow-400 shrink-0" />
        <span>PROMO ENDS SOON - GET 30% OFF TODAY! TIME LEFT:</span>
        <div className="bg-slate-900 text-white px-2 py-0.5 rounded font-mono text-xs font-bold shrink-0">
          {String(timeLeft.hours).padStart(2, "0")}h : {String(timeLeft.minutes).padStart(2, "0")}m : {String(timeLeft.seconds).padStart(2, "0")}s
        </div>
      </div>

      {/* Brand Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 py-4 px-6 sticky top-[38px] z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="text-amber-500" size={20} />
            <span 
              onClick={onGoToAdmin}
              className="font-display text-xl font-black text-slate-900 tracking-widest uppercase select-none cursor-default"
            >
              IBOTSHOPLINE
            </span>
          </div>
          <button 
            onClick={scrollToForm}
            className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded transition shadow-sm font-sans shrink-0 cursor-pointer"
          >
            ORDER NOW 📦
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 pt-10">
        
        {/* Main Title Badge */}
        <div className="text-center mb-8">
          <span className="text-red-600 font-bold text-xs md:text-sm tracking-widest mb-3 italic block uppercase">
            #1 BEST SELLER BY IBOTSHOPLINE IN NIGERIA • ULTIMATE MEN'S CORPORATE & NATIVE GIFT COLLECTION
          </span>
          <h1 className="font-display text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight md:leading-tight uppercase">
            Step Out Like A King! Get The New <span className="text-red-600 underline decoration-red-600/35 decoration-wavy">7-Piece Luxury Men's Gift Watches Set</span>
          </h1>
          <p className="text-slate-600 mt-4 text-base md:text-lg max-w-2xl mx-auto font-sans leading-relaxed">
            Upgrade your style or give the ultimate gift of honor. Majestic Box includes a premium Watch, Adjustable Belt, Sleek Wallet, Aviator Sunglasses, Elegant Bracelet, Steel Ring, & Miniature Pocket Perfume.
          </p>
        </div>

        {/* Product Grid (Gallery + Core Action) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          
          {/* Gallery Column */}
          <div className="lg:col-span-7 bg-white rounded-xl p-4 md:p-6 shadow-md border border-slate-200">
            {isLoadingImages ? (
              <div className="aspect-[4/3] bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">
                <span className="text-slate-400 font-medium">Loading high definition photos...</span>
              </div>
            ) : (
              <div>
                {/* Active Image Box */}
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200 shadow-sm">
                  <img
                    src={images[activeImageIdx]}
                    alt={`Watch Gift Box Image ${activeImageIdx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Left-Right Nav */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2 rounded shadow-md transition"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2 rounded shadow-md transition"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}

                  {/* Discount Badge */}
                  <div className="absolute top-4 left-4 bg-red-600 text-white font-bold text-xs px-3.5 py-1.5 rounded shadow-sm uppercase tracking-wider">
                    30% OFF TODAY
                  </div>
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2.5 mt-4 overflow-x-auto pb-2 scrollbar-none justify-center">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                          idx === activeImageIdx ? "border-slate-900 scale-105 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={img} alt="Thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Quick Benefits Badges */}
            <div className="grid grid-cols-3 gap-3 mt-6 text-center">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <Truck className="text-slate-800 mx-auto mb-1" size={18} />
                <span className="block text-[11px] md:text-xs font-bold text-slate-900 uppercase">FREE DELIVERY</span>
                <span className="block text-[9px] text-slate-500 uppercase tracking-tight">NATIONWIDE</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <ShieldCheck className="text-slate-800 mx-auto mb-1" size={18} />
                <span className="block text-[11px] md:text-xs font-bold text-slate-900 uppercase">PAY ON DELIVERY</span>
                <span className="block text-[9px] text-slate-500 uppercase tracking-tight">NO DEPOSIT</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <Award className="text-slate-800 mx-auto mb-1" size={18} />
                <span className="block text-[11px] md:text-xs font-bold text-slate-900 uppercase">100% PREMIUM</span>
                <span className="block text-[9px] text-slate-500 uppercase tracking-tight">QUALITY FIT</span>
              </div>
            </div>
          </div>

          {/* Core Action panel */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl"></div>
            
            <div className="mb-5">
              <span className="bg-red-900/45 text-red-400 font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded border border-red-700/30">
                🔥 FLASH PROMO DEAL
              </span>
            </div>

            <h3 className="font-display text-2xl font-bold mb-4 text-yellow-500 uppercase tracking-tight">
              Men's New 7-Piece Premium Gift Watches Collection
            </h3>

            {/* Pricing Panel */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 mb-6 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase tracking-widest">Regular Price</span>
                <span className="text-lg text-slate-400 line-through font-semibold">₦110,000</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-yellow-500 block uppercase tracking-widest font-black">Promo Price Today</span>
                <span className="text-3xl md:text-4xl font-extrabold text-white font-display">₦78,000</span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-6 font-sans">
              Skip the expensive individual purchases. Buying these items separately in Lagos or Abuja malls costs over ₦110,000. Get our curated high-demand 7-Piece Majestic Box today for just <span className="font-bold text-white">₦78,000</span>! 
            </p>

            <ul className="space-y-3 mb-8 text-sm text-slate-200">
              <li className="flex items-center gap-2.5"><Check size={15} className="text-emerald-500 shrink-0" /> Free Shipping to any Nigerian State</li>
              <li className="flex items-center gap-2.5"><Check size={15} className="text-emerald-500 shrink-0" /> No Advance Deposit - Pay cash/transfer on delivery</li>
              <li className="flex items-center gap-2.5"><Check size={15} className="text-emerald-500 shrink-0" /> Hardcover Premium Black Gift Box Included</li>
              <li className="flex items-center gap-2.5"><Check size={15} className="text-emerald-500 shrink-0" /> 100% Genuine Materials</li>
            </ul>

            {/* Pulsing Order CTA */}
            <button
              onClick={scrollToForm}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-black text-base py-4 px-6 rounded shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 uppercase tracking-widest flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              <ShoppingCart size={18} />
              Claim My Promo Set Now
            </button>
            <span className="block text-center text-[11px] text-slate-400 mt-3 italic">
              ⚡ Only 14 Boxes Left for this Batch Delivery state!
            </span>
          </div>

        </div>

        {/* Detailed Piece-By-Piece Section */}
        <div className="mb-16 bg-white rounded-xl p-6 md:p-10 shadow-lg border border-slate-200">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
              Premium Features of the Majestic Watch Set 👑
            </h2>
            <p className="text-slate-500 mt-2 text-sm md:text-base font-sans">
              Every single parameter is masterfully engineered to elevate your status, presence, and personal brand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <div 
                key={i} 
                className="bg-slate-50 hover:bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-amber-500/40 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  {/* Icon & Number Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${feat.colorClass} shadow-sm group-hover:scale-110 transition duration-300`}>
                      {getFeatureIcon(feat.iconName)}
                    </div>
                    <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-slate-900 group-hover:text-amber-600 transition text-base md:text-lg mb-2">
                    {feat.title}
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed font-sans">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
            
            {/* The Box */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-6 rounded-2xl border border-yellow-500/30 flex flex-col justify-between lg:col-span-2 md:col-span-2 col-span-1 shadow-lg relative overflow-hidden group hover:border-yellow-500/60 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl animate-pulse">🎁</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 uppercase tracking-wider">
                    Exclusive Premium Bonus
                  </span>
                </div>
                <h4 className="font-display font-bold text-yellow-400 text-lg md:text-xl mb-2 group-hover:text-yellow-300 transition">
                  🎁 Heavyweight Gift Added
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed font-sans">
                  A premium 3-in-1 accessories bundle is added to your package, which includes an elegant matching bracelet, a classic polished steel ring, and a sleek premium necklace. All packaged with style.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">
                  Value: ₦9,000 (Included FREE)
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                  Limited Batch Only
                </span>
              </div>
            </div>
          </div>

          {/* Official Product Technical Specifications */}
          <div className="mt-16 pt-12 border-t border-slate-200">
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-6 md:p-10 border border-yellow-500/30 shadow-2xl relative overflow-hidden">
              {/* Luxury gold shine background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

              {/* Header */}
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-800">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-xs font-bold uppercase tracking-widest text-yellow-500 mb-3">
                    👑 Premium Specifications
                  </div>
                  <h3 className="font-display font-black text-white uppercase text-xl md:text-3xl tracking-tight">
                    Official Product Specifications
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Authentic Model S00771 Leisure Collection - precision certified
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-slate-800 text-[11px] font-bold tracking-wider rounded uppercase text-slate-300 border border-slate-700">
                    Model: S00771
                  </span>
                  <span className="px-3 py-1 bg-amber-950/40 text-[11px] font-bold tracking-wider rounded uppercase text-yellow-400 border border-yellow-500/20">
                    Movement: z618
                  </span>
                </div>
              </div>

              {/* Grid Content */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {/* Column 1: Watch Core */}
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition duration-200">
                  <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-800">
                    <span className="text-xl">⚙️</span>
                    <h5 className="font-display font-bold uppercase tracking-wider text-xs text-yellow-500">
                      Watch Core Mechanics
                    </h5>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Model / Item No:</span>
                      <span className="font-mono font-bold text-yellow-400 text-[13px] bg-yellow-400/5 px-2 py-0.5 rounded border border-yellow-400/10">S00771</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Movement Brand:</span>
                      <span className="font-medium text-slate-100 text-[13px]">z618 Quartz</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Dial Diameter:</span>
                      <span className="font-bold text-white text-[13px]">40mm</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Case Thickness:</span>
                      <span className="font-medium text-slate-100 text-[13px]">10mm</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Display Mode:</span>
                      <span className="font-medium text-slate-100 text-[13px]">Pointer (Classic Analog)</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Dial Shape:</span>
                      <span className="font-medium text-slate-100 text-[13px]">Round</span>
                    </li>
                    <li className="flex justify-between items-center py-1">
                      <span className="text-slate-400 text-xs">Crown Type:</span>
                      <span className="font-medium text-slate-100 text-[13px]">Spiral Crown</span>
                    </li>
                  </ul>
                </div>

                {/* Column 2: Materials */}
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition duration-200">
                  <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-800">
                    <span className="text-xl">✨</span>
                    <h5 className="font-display font-bold uppercase tracking-wider text-xs text-yellow-500">
                      Premium Master Materials
                    </h5>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Strap Material:</span>
                      <span className="font-semibold text-white text-[13px] bg-slate-800 px-2 py-0.5 rounded">High-Grade Alloy</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Case Material:</span>
                      <span className="font-medium text-slate-100 text-[13px]">Solid Alloy</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Mirror Glass:</span>
                      <span className="font-medium text-slate-100 text-[13px]">Ordinary Glass Mirror</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Buckle Style:</span>
                      <span className="font-medium text-slate-100 text-[13px]">Single Folding Buckle</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Buckle Material:</span>
                      <span className="font-medium text-slate-100 text-[13px]">Polished Iron</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Table Bottom:</span>
                      <span className="font-medium text-slate-100 text-[13px]">Ordinary Base</span>
                    </li>
                    <li className="flex justify-between items-center py-1">
                      <span className="text-slate-400 text-xs">Waterproof Class:</span>
                      <span className="font-bold text-red-400 text-[12px] uppercase bg-red-950/40 px-2 py-0.5 rounded border border-red-900/35">No Waterproofing</span>
                    </li>
                  </ul>
                </div>

                {/* Column 3: Sourcing & Box Sets */}
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition duration-200">
                  <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-800">
                    <span className="text-xl">🌍</span>
                    <h5 className="font-display font-bold uppercase tracking-wider text-xs text-yellow-500">
                      Sourcing & Presentation
                    </h5>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Set Code:</span>
                      <span className="font-mono text-slate-300 text-[11px] bg-slate-800/80 px-2 py-0.5 rounded">zhm7-s02420-1</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Design Aesthetic:</span>
                      <span className="font-medium text-slate-100 text-[13px]">Royal Leisure Style</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Target Audience:</span>
                      <span className="font-medium text-slate-100 text-[13px]">General / Gentlemen</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Release Season:</span>
                      <span className="font-medium text-amber-300 text-[13px] font-bold">Summer 2024 Collection</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Patented Sourcing:</span>
                      <span className="font-medium text-slate-400 text-[13px]">No</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-slate-800/40">
                      <span className="text-slate-400 text-xs">Direct Import:</span>
                      <span className="font-medium text-slate-400 text-[13px]">No</span>
                    </li>
                    <li className="flex justify-between items-center py-1">
                      <span className="text-slate-400 text-xs">Packaging Mode:</span>
                      <span className="font-medium text-slate-100 text-[13px]">OPP Protective Standard</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Warranty and Authenticity Guarantee Box */}
              <div className="relative z-10 mt-8 p-4 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 rounded-xl border border-yellow-500/20 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <h6 className="font-bold text-yellow-400 text-sm">Official Store Warranty Included</h6>
                    <p className="text-xs text-slate-300">Enjoy premium protection and guaranteed replacement support for any functional factory errors.</p>
                  </div>
                </div>
                <div className="text-xs font-bold text-yellow-500 uppercase tracking-widest px-4 py-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  Guaranteed Authentic Set
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real Customer Testimony (Social Proof) */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
              Verified Customer Reviews ⭐⭐⭐⭐⭐
            </h2>
            <p className="text-slate-500 mt-2 text-sm font-sans">
              Read how men and gift-buying ladies across Nigeria feel about this set.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded border border-slate-200 shadow-sm relative">
              <div className="flex gap-1 text-yellow-500 mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
              </div>
              <p className="text-slate-700 text-sm italic mb-4 leading-relaxed font-sans">
                "This set is absolute madness! The quality is top notch. I wore the watch and sunglasses to a wedding in Lagos and everyone was asking where I got them. God bless you guys!"
              </p>
              <div className="flex items-center gap-2.5">
                <div className="bg-slate-100 text-slate-800 font-bold text-xs w-8 h-8 rounded-full flex items-center justify-center border border-slate-200">CO</div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Chinedu O.</h5>
                  <p className="text-[10px] text-slate-400">Ikeja, Lagos (Verified Buyer)</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded border border-slate-200 shadow-sm relative">
              <div className="flex gap-1 text-yellow-500 mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
              </div>
              <p className="text-slate-700 text-sm italic mb-4 leading-relaxed font-sans">
                "Delivered within 2 days to my office in Garki, Abuja. I inspected the package first before transferring the cash to the courier. Very honest and smooth transaction."
              </p>
              <div className="flex items-center gap-2.5">
                <div className="bg-slate-100 text-slate-800 font-bold text-xs w-8 h-8 rounded-full flex items-center justify-center border border-slate-200">AM</div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Alhaji Musa</h5>
                  <p className="text-[10px] text-slate-400">Garki, Abuja (Verified Buyer)</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded border border-slate-200 shadow-sm relative">
              <div className="flex gap-1 text-yellow-500 mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
              </div>
              <p className="text-slate-700 text-sm italic mb-4 leading-relaxed font-sans">
                "Bought this as a surprise birthday gift for my fiancé. He couldn't stop taking pictures with it. The wallet looks very rich and the belt is so smart. Highly recommended."
              </p>
              <div className="flex items-center gap-2.5">
                <div className="bg-slate-100 text-slate-800 font-bold text-xs w-8 h-8 rounded-full flex items-center justify-center border border-slate-200">FO</div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Funmi O.</h5>
                  <p className="text-[10px] text-slate-400">Kano (Verified Buyer)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* High Converting Form Section */}
        <div id="checkout-form-section" className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden mb-16 max-w-4xl mx-auto">
          
          {/* Form Header */}
          <div className="bg-slate-900 text-white px-6 py-8 text-center">
            <span className="bg-yellow-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded">
              🚚 100% Free Nationwide Delivery
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-black mt-4 text-white uppercase tracking-tight">
              FILL THE FORM BELOW TO PLACE YOUR ORDER NOW
            </h2>
            <p className="text-sm text-slate-300 mt-2 font-medium max-w-lg mx-auto font-sans">
              Please enter accurate details. Only submit if you have your cash ready to receive this item within 1 to 4 days.
            </p>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmitOrder} className="p-6 md:p-10 space-y-6">
            
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3.5 rounded-lg flex items-center gap-2.5 text-sm font-medium">
                <AlertCircle size={18} className="shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-950 uppercase tracking-wider">Select Box Quantity:</label>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">Most customers buy 2 boxes to gift friends/family & save!</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    className="px-4 py-2 hover:bg-slate-50 text-slate-800 font-bold text-base border-r border-slate-200 transition"
                  >
                    -
                  </button>
                  <span className="px-6 font-bold text-slate-900 text-base">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(prev => prev + 1)}
                    className="px-4 py-2 hover:bg-slate-50 text-slate-800 font-bold text-base border-l border-slate-200 transition"
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase text-slate-400 font-bold block tracking-wider">Total Price</span>
                  <span className="text-xl font-black text-slate-900 font-display">₦{totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Full name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Emeka Johnson Obi"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-300 focus:border-slate-900 rounded outline-none transition text-sm text-slate-900"
                />
              </div>

              {/* Whatsapp Phone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>WhatsApp Phone Number <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-emerald-600 font-bold">DISPATCH ONLY</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g., 08031234567"
                  value={whatsappNo}
                  onChange={(e) => setWhatsappNo(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-300 focus:border-slate-900 rounded outline-none transition text-sm text-slate-900"
                />
              </div>

              {/* Call Phone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Active Phone Number (For Calls) <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-medium font-sans">For courier driver</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g., 08123456789"
                  value={phoneNo}
                  onChange={(e) => setPhoneNo(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-300 focus:border-slate-900 rounded outline-none transition text-sm text-slate-900"
                />
              </div>

              {/* Delivery State */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Address of Delivery State <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={deliveryState}
                  onChange={(e) => setDeliveryState(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-300 focus:border-slate-900 rounded outline-none transition text-sm text-slate-900"
                >
                  <option value="">-- Select Your State --</option>
                  {NIGERIAN_STATES.map((state, i) => (
                    <option key={i} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              {/* City of Delivery */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  City / Town of Delivery <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Ikeja, Garki, Kano Central"
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-300 focus:border-slate-900 rounded outline-none transition text-sm text-slate-900"
                />
              </div>

              {/* Full address */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Detailed Delivery Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Please enter your house number, street name, close landmarks (e.g. Near Keystone Bank, opposite the local market)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-300 focus:border-slate-900 rounded outline-none transition text-sm text-slate-900 resize-none"
                ></textarea>
              </div>

            </div>

            {/* Submit Action */}
            <div className="pt-6 border-t border-slate-150 text-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-black text-lg py-4 px-8 rounded shadow-lg transition duration-200 uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing Your Order...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={22} className="stroke-[2.5]" />
                    <span>SUBMIT ORDER & PAY ON DELIVERY</span>
                  </>
                )}
              </button>
              
              <p className="text-gray-500 text-xs mt-3 flex items-center justify-center gap-1">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Secure checkouts. You only pay after you hold the item in your hands!</span>
              </p>
            </div>

          </form>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h3 className="font-display text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
              Frequently Asked Questions (FAQs) 💬
            </h3>
          </div>
          <div className="space-y-4">
            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
              <h5 className="font-bold text-slate-900 text-sm md:text-base flex items-start gap-2.5 font-display uppercase tracking-tight">
                <HelpCircle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
                <span>How much is delivery? Is it really free?</span>
              </h5>
              <p className="text-slate-600 text-sm mt-2 pl-7 font-sans leading-relaxed">
                Yes! Delivery is 100% free nationwide. You do not pay any delivery fee or advance deposits to any courier.
              </p>
            </div>

            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
              <h5 className="font-bold text-slate-900 text-sm md:text-base flex items-start gap-2.5 font-display uppercase tracking-tight">
                <HelpCircle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
                <span>Can I open and inspect the box before making payment?</span>
              </h5>
              <p className="text-slate-600 text-sm mt-2 pl-7 font-sans leading-relaxed">
                Absolutely! Our courier will hand you the package so you can inspect the pristine quality of watches and also 3 in 1 accessories. Once fully satisfied, you can pay via cash or bank transfer on the spot.
              </p>
            </div>

            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
              <h5 className="font-bold text-slate-900 text-sm md:text-base flex items-start gap-2.5 font-display uppercase tracking-tight">
                <HelpCircle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
                <span>How long does delivery take to my city?</span>
              </h5>
              <p className="text-slate-600 text-sm mt-2 pl-7 font-sans leading-relaxed">
                - **Lagos / Abuja / Kano:** 1 to 2 business days.<br />
                - **Other State Capitals:** 2 to 3 business days.<br />
                - **Remote Localities:** 3 to 4 business days.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Trust Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-4">
          <p 
            onClick={onGoToAdmin}
            className="font-display font-black text-white text-xl uppercase tracking-widest select-none inline-block cursor-default"
          >
            IBOTSHOPLINE
          </p>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Luxury Men's 7-Piece Majestic Gift Watches Set
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-sans">
            Registered under Nigeria Corporate Affairs Commission. Trusted by over 5,400+ elegant gentlemen. 
          </p>
          <div className="flex justify-center gap-6 text-xs text-slate-500 pt-4 border-t border-slate-800 max-w-sm mx-auto font-sans">
            <span className="hover:text-white cursor-pointer transition">Terms of Service</span>
            <span className="hover:text-white cursor-pointer transition">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition">Contact Support</span>
          </div>
          <p className="text-[10px] text-slate-600 font-mono">
            &copy; 2026 IBOTSHOPLINE. All rights reserved. Made in alignment with premium lifestyle values.
          </p>
        </div>
      </footer>

    </div>
  );
}
