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
    "https://i.ibb.co/sd3zkcDV/IMG-20260628-WA0083.jpg",
    "https://i.ibb.co/3yH80rLV/IMG-20260704-WA0046.jpg",
    "https://i.ibb.co/qFshF3RX/IMG-20260704-WA0045.jpg"
  ]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Countdown timer state (hours, minutes, seconds)
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 24, seconds: 45 });

  // Clothing styles metadata
  const CLOTHING_STYLES = [
    {
      id: "emerald",
      name: "Emerald Crest Premium Two-Piece Tracksuit",
      price: 48000,
      regularPrice: 60000,
      description: "Luxurious deep Emerald green native Two-Piece Tracksuit. Features premium gold hand-detailed embroidery on the chest and cuffs, projecting wealth and royal stature.",
      features: ["Premium Fine Cotton-Wool Blend", "Exquisite Gold Chest Embroidery", "Rich Deep Emerald Green Tone", "Matching Tailored Track Pants"]
    },
    {
      id: "navy",
      name: "Black Sovereign Two-Piece Tracksuit",
      price: 48000,
      regularPrice: 60000,
      description: "Distinguished Obsidian Black Premium Two-Piece Tracksuit. Features precision customized shoulder and front embroidery patterns, giving a powerful modern athletic look.",
      features: ["Elite Durable Fabric Blend", "Sleek Custom Front Embroidery", "Prestige Deep Black Color", "Matching Tailored Track Pants Included"]
    },
    {
      id: "ivory",
      name: "Heritage Ivory Monarch Two-Piece Tracksuit",
      price: 48000,
      regularPrice: 60000,
      description: "An absolute masterpiece of modern elegance in clean Ivory White/Cream Two-Piece Tracksuit. Crafted with premium breathable cotton-fleece for maximum daily comfort.",
      features: ["Breathable High-Density Cotton-Linen", "Subtle Textured Contrast Piping", "Pristine Ivory White & Gold Accent", "Matching Ivory Pants Included"]
    }
  ];

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

  // Custom package selection states
  const [selectedPackage, setSelectedPackage] = useState<"single" | "double" | "triple">("single");
  const [selectedSingleStyle, setSelectedSingleStyle] = useState<string>("Emerald Crest Premium Two-Piece Tracksuit");
  const [selectedDoubleStyles, setSelectedDoubleStyles] = useState<string[]>([
    "Emerald Crest Premium Two-Piece Tracksuit", 
    "Black Sovereign Two-Piece Tracksuit"
  ]);
  const [selectedSize, setSelectedSize] = useState<string>("L");

  // Helper to calculate pricing dynamically
  const getSelectedPackageInfo = () => {
    if (selectedPackage === "single") {
      const styleInfo = CLOTHING_STYLES.find(s => s.name === selectedSingleStyle);
      return {
        packageName: "Single Style - Standard Pack",
        clothingDetails: selectedSingleStyle,
        price: styleInfo ? styleInfo.price : 48000,
        regularPrice: styleInfo ? styleInfo.regularPrice : 60000
      };
    } else if (selectedPackage === "double") {
      return {
        packageName: "Double Style - Luxury Combo",
        clothingDetails: selectedDoubleStyles.join(" + "),
        price: 90000,
        regularPrice: 120000
      };
    } else {
      return {
        packageName: "Triple Style - Ultimate Wardrobe",
        clothingDetails: "All 3 Clothes (Emerald + Black + Heritage Ivory Two-Piece Tracksuits)",
        price: 132000,
        regularPrice: 180000
      };
    }
  };

  const { packageName, clothingDetails, price: packageUnitPrice, regularPrice: packageRegularPrice } = getSelectedPackageInfo();
  const totalPrice = packageUnitPrice * quantity;

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
            "https://i.ibb.co/sd3zkcDV/IMG-20260628-WA0083.jpg",
            "https://i.ibb.co/3yH80rLV/IMG-20260704-WA0046.jpg",
            "https://i.ibb.co/qFshF3RX/IMG-20260704-WA0045.jpg"
          ]);
        }
      } catch (e) {
        console.error("Error fetching images, loading templates:", e);
        setImages([
          "https://i.ibb.co/sd3zkcDV/IMG-20260628-WA0083.jpg",
          "https://i.ibb.co/3yH80rLV/IMG-20260704-WA0046.jpg",
          "https://i.ibb.co/qFshF3RX/IMG-20260704-WA0045.jpg"
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
    if (selectedPackage === "double" && selectedDoubleStyles.length !== 2) {
      return setSubmitError("Please check exactly 2 clothing styles for your Double Style package.");
    }
 
    setIsSubmitting(true);
 
    try {
      // Generate a unique 8-character numeric/alpha order reference code
      const randHex = Math.floor(100000 + Math.random() * 900000).toString();
      const referenceId = `AP-${randHex}`;
 
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
        totalPrice: totalPrice,
        selectedStyles: selectedPackage === "single" ? [selectedSingleStyle] : selectedPackage === "double" ? selectedDoubleStyles : CLOTHING_STYLES.map(s => s.name),
        packageName,
        size: selectedSize,
        clothingDetails
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

  // Curated product features for clothes
  const features = [
    {
      title: "Elegant Custom Chest Embroidery",
      desc: "Turn heads with sophisticated, precision-stitched embroidery patterns on the chest and cuffs, adding custom flair to your casual luxury presence.",
      iconName: "Sparkles",
      colorClass: "bg-amber-500/10 border-amber-500/20 text-amber-500"
    },
    {
      title: "Premium Double-Knit Cotton Blend",
      desc: "Experience luxurious thickness, structure, and 4-way stretch comfort. Carefully selected fibers ensure the tracksuit retains its sharp, tailored look.",
      iconName: "Clock",
      colorClass: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
    },
    {
      title: "Tailored Athletic Fit",
      desc: "Precision tailored to drape perfectly over your chest and shoulders, with modern tapered sleeves and pants that project an executive yet athletic look.",
      iconName: "ShieldCheck",
      colorClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
    },
    {
      title: "All-Weather Breathability",
      desc: "High-density breathable knitting keeps you insulated in cool weather yet breezy and dry in the warm afternoons, making it the ultimate everyday outfit.",
      iconName: "Smile",
      colorClass: "bg-rose-500/10 border-rose-500/20 text-rose-400"
    },
    {
      title: "Anti-Wrinkle Fabric Tech",
      desc: "Engineered to resist standard creasing and wrinkles, allowing you to stay sharp during long travels, outdoor commutes, or weekend lounges.",
      iconName: "Layers",
      colorClass: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
    },
    {
      title: "Vibrant Anti-Fade Tones",
      desc: "Deep solid colors (Emerald Green, Obsidian Black, Heritage Ivory) that retain their high luster and deep dye even after multiple washes.",
      iconName: "Compass",
      colorClass: "bg-violet-500/10 border-violet-500/20 text-violet-400"
    },
    {
      title: "Matching Tailored Pants",
      desc: "Every tracksuit top is accompanied by its matching, custom-fitted drawstring pants featuring zippered side pockets and secure comfortable waistbands.",
      iconName: "Eye",
      colorClass: "bg-teal-500/10 border-teal-500/20 text-teal-400"
    },
    {
      title: "Versatile Modern Athleisure",
      desc: "Whether going for quick business lounges, airport travels, high-profile physical retreats, or weekend gatherings, remain stylishly comfortable.",
      iconName: "Award",
      colorClass: "bg-amber-500/15 border-amber-500/30 text-yellow-500"
    },
    {
      title: "Unmatched Wardrobe Value",
      desc: "Order 2 styles or the full 3 styles bundle and receive massive discounts that you won't get anywhere else.",
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
        <span>PROMO ENDS SOON - SAVE UP TO 25% ON APPAREL BUNDLES! TIME LEFT:</span>
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
            #1 PRESTIGE MENSWEAR BY IBOTSHOPLINE IN NIGERIA • EXQUISITE TWO-PIECE TRACKSUIT BUNDLES
          </span>
          <h1 className="font-display text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight md:leading-tight uppercase">
            Command Respect & Royalty! Get The Exclusive <span className="text-red-600 underline decoration-red-600/35 decoration-wavy">Premium Hand-Embroidered Two-Piece Tracksuits</span>
          </h1>
          <p className="text-slate-600 mt-4 text-base md:text-lg max-w-2xl mx-auto font-sans leading-relaxed">
            Modern, effortless two-piece sets designed for everyday style and comfort. Our premium collection features the Emerald Crest Premium Two-Piece Tracksuit, the Black Sovereign Two-Piece Tracksuit, and the Heritage Ivory Monarch Two-Piece Tracksuit. Choose your favorite or own the complete luxury wardrobe with a massive discount today!
          </p>
        </div>

        {/* Product Grid (Gallery + Core Action) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          
          {/* Gallery Column */}
          <div className="lg:col-span-7 bg-white rounded-xl p-4 md:p-6 shadow-md border border-slate-200">
            {isLoadingImages ? (
              <div className="aspect-[3/4] bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">
                <span className="text-slate-400 font-medium">Loading high definition catalog...</span>
              </div>
            ) : (
              <div>
                {/* Active Image Box */}
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200 shadow-sm">
                  <img
                    src={images[activeImageIdx]}
                    alt={`Traditional Style Image ${activeImageIdx + 1}`}
                    className="w-full h-full object-contain"
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
                    SAVE UP TO 25% TODAY
                  </div>
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2.5 mt-4 overflow-x-auto pb-2 scrollbar-none justify-center">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveImageIdx(idx);
                          // Auto-sync form selection based on active thumbnail
                          if (idx === 0) {
                            setSelectedPackage("single");
                            setSelectedSingleStyle("Emerald Crest Premium Two-Piece Tracksuit");
                          } else if (idx === 1) {
                            setSelectedPackage("single");
                            setSelectedSingleStyle("Black Sovereign Two-Piece Tracksuit");
                          } else if (idx === 2) {
                            setSelectedPackage("single");
                            setSelectedSingleStyle("Heritage Ivory Monarch Two-Piece Tracksuit");
                          }
                        }}
                        className={`w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                          idx === activeImageIdx ? "border-slate-900 scale-105 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={img} alt="Thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="bg-slate-900 text-white text-[8px] font-bold text-center py-0.5 truncate">
                          {idx === 0 ? "Emerald Green" : idx === 1 ? "Black" : "Heritage Ivory"}
                        </div>
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
                <span className="block text-[11px] md:text-xs font-bold text-slate-900 uppercase">CUSTOM TAILORED</span>
                <span className="block text-[9px] text-slate-500 uppercase tracking-tight">PREMIUM FIT</span>
              </div>
            </div>
          </div>

          {/* Core Action panel */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl"></div>
            
            <div className="mb-5">
              <span className="bg-red-900/45 text-red-400 font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded border border-red-700/30">
                🔥 SPECIAL PROMO PACKAGE DEAL
              </span>
            </div>

            <h3 className="font-display text-2xl font-bold mb-4 text-yellow-500 uppercase tracking-tight">
              Traditional Male Apparel Collection
            </h3>

            {/* Selection Quick Tabs */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button 
                onClick={() => { setSelectedPackage("single"); setActiveImageIdx(0); }}
                className={`py-2 px-1 rounded text-center border text-[10px] font-bold uppercase transition ${
                  selectedPackage === "single" ? "bg-yellow-500 border-yellow-600 text-slate-950" : "bg-slate-950 border-slate-850 text-slate-300 hover:bg-slate-800"
                }`}
              >
                1 Outfit Pack
              </button>
              <button 
                onClick={() => { setSelectedPackage("double"); setActiveImageIdx(1); }}
                className={`py-2 px-1 rounded text-center border text-[10px] font-bold uppercase transition ${
                  selectedPackage === "double" ? "bg-yellow-500 border-yellow-600 text-slate-950" : "bg-slate-950 border-slate-850 text-slate-300 hover:bg-slate-800"
                }`}
              >
                2 Outfits Combo
              </button>
              <button 
                onClick={() => { setSelectedPackage("triple"); setActiveImageIdx(2); }}
                className={`py-2 px-1 rounded text-center border text-[10px] font-bold uppercase transition ${
                  selectedPackage === "triple" ? "bg-yellow-500 border-yellow-600 text-slate-950" : "bg-slate-950 border-slate-850 text-slate-300 hover:bg-slate-800"
                }`}
              >
                All 3 Clothes
              </button>
            </div>

            {/* Pricing Panel */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 mb-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase tracking-widest">Regular Price</span>
                <span className="text-base text-slate-400 line-through font-semibold">₦{packageRegularPrice.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-yellow-500 block uppercase tracking-widest font-black">Promo Price Today</span>
                <span className="text-2xl md:text-3xl font-extrabold text-white font-display">₦{packageUnitPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Package details description dynamic text */}
            <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-800/80 mb-5 text-xs text-slate-300 font-sans space-y-1.5">
              <div className="text-white font-bold uppercase tracking-wider text-yellow-500 text-[10px]">Active Package:</div>
              <div className="font-extrabold text-white text-sm">{packageName}</div>
              <p className="leading-relaxed">{clothingDetails}</p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6 font-sans">
              Why pay expensive boutique fees and waste weeks waiting? Buy our premium ready-to-wear luxury tracksuit set, crafted with supreme double-knit cotton-fleece and fine stitching. Tailored beautifully to represent your active yet noble status.
            </p>

            <ul className="space-y-2.5 mb-6 text-xs text-slate-200">
              <li className="flex items-center gap-2.5"><Check size={14} className="text-emerald-500 shrink-0" /> Free Shipping to all 36 States + FCT Abuja</li>
              <li className="flex items-center gap-2.5"><Check size={14} className="text-emerald-500 shrink-0" /> Cash or Transfer on Delivery (No deposit required)</li>
              <li className="flex items-center gap-2.5"><Check size={14} className="text-emerald-500 shrink-0" /> Matching tailored trousers included for all garments</li>
              <li className="flex items-center gap-2.5"><Check size={14} className="text-emerald-500 shrink-0" /> Luxury apparel hangers & dust covers included</li>
            </ul>

            {/* Pulsing Order CTA */}
            <button
              onClick={scrollToForm}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-black text-sm py-3.5 px-6 rounded shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer animate-pulse"
            >
              <ShoppingCart size={16} />
              Customize & Order My Package
            </button>
            <span className="block text-center text-[10px] text-slate-400 mt-2.5 italic">
              ⚡ Only 12 Custom Bundles Left for this Week's Dispatch!
            </span>
          </div>

        </div>

        {/* Detailed Piece-By-Piece Section */}
        <div className="mb-16 bg-white rounded-xl p-6 md:p-10 shadow-lg border border-slate-200">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
              Premium Styling & Fabric Specs 👑
            </h2>
            <p className="text-slate-500 mt-2 text-sm md:text-base font-sans">
              Each tracksuit is designed to reflect active elegance, executive posture, and extreme everyday comfort.
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
            
          </div>
        </div>

        {/* Real Customer Testimony (Social Proof) */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
              Verified Gentleman Reviews ⭐⭐⭐⭐⭐
            </h2>
            <p className="text-slate-500 mt-2 text-sm font-sans">
              Read how men and gift-buying ladies across Nigeria feel about our clothes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded border border-slate-200 shadow-sm relative">
              <div className="flex gap-1 text-yellow-500 mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
              </div>
              <p className="text-slate-700 text-sm italic mb-4 leading-relaxed font-sans">
                "The Emerald Two-Piece Tracksuit is absolutely majestic! The gold chest embroidery has a solid premium weight to it, not cheap thread. I wore it to an premium launch in Lekki and received over 20 compliments. God bless IBOTSHOPLINE!"
              </p>
              <div className="flex items-center gap-2.5">
                <div className="bg-slate-100 text-slate-800 font-bold text-xs w-8 h-8 rounded-full flex items-center justify-center border border-slate-200">CO</div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Chief Chinedu O.</h5>
                  <p className="text-[10px] text-slate-400">Ikeja, Lagos (Verified Buyer)</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded border border-slate-200 shadow-sm relative">
              <div className="flex gap-1 text-yellow-500 mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
              </div>
              <p className="text-slate-700 text-sm italic mb-4 leading-relaxed font-sans">
                "I ordered the Black Sovereign Two-Piece Tracksuit in Large size and it was delivered to Garki within 48 hours. I opened it and tried it on before paying the courier. The fit is perfect, like it was custom sewn on my body. Highly recommended."
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
                "I bought the 3-Style wardrobe pack for my husband's birthday. It arrived in individual premium dust protection bags. He looks so handsome in the Heritage Ivory Two-Piece Tracksuit. Best online purchase this year!"
              </p>
              <div className="flex items-center gap-2.5">
                <div className="bg-slate-100 text-slate-800 font-bold text-xs w-8 h-8 rounded-full flex items-center justify-center border border-slate-200">FO</div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Mrs. Funmi O.</h5>
                  <p className="text-[10px] text-slate-400">Kano State (Verified Buyer)</p>
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

            {/* Custom Clothing Configuration Grid */}
            <div className="space-y-6">
              
              {/* Step 1: Package selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Step 1: Choose Your Apparel Package <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Single Style */}
                  <div 
                    onClick={() => { setSelectedPackage("single"); setActiveImageIdx(0); }}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition ${
                      selectedPackage === "single" ? "border-slate-900 bg-slate-50/50 shadow-md" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-900 text-sm">1 Style Pack</span>
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black uppercase">Save 20%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Choose any 1 premium tracksuit style from our exclusive set.</p>
                    <div className="mt-3 text-sm font-bold text-slate-900">₦{CLOTHING_STYLES.find(s => s.name === selectedSingleStyle)?.price.toLocaleString() || "48,000"} <span className="text-slate-400 line-through text-xs font-normal">₦{CLOTHING_STYLES.find(s => s.name === selectedSingleStyle)?.regularPrice.toLocaleString() || "60,000"}</span></div>
                  </div>

                  {/* Double Style Combo */}
                  <div 
                    onClick={() => { setSelectedPackage("double"); setActiveImageIdx(1); }}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition ${
                      selectedPackage === "double" ? "border-slate-900 bg-slate-50/50 shadow-md" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-900 text-sm">2 Styles Combo</span>
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black uppercase">Save 22%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Choose any 2 different tracksuit styles. Get matching pants for both styles.</p>
                    <div className="mt-3 text-sm font-bold text-slate-900">₦90,000 <span className="text-slate-400 line-through text-xs font-normal">₦120,000</span></div>
                  </div>

                  {/* Triple Style Wardrobe */}
                  <div 
                    onClick={() => { setSelectedPackage("triple"); setActiveImageIdx(2); }}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition ${
                      selectedPackage === "triple" ? "border-slate-900 bg-slate-50/50 shadow-md" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-900 text-sm">All 3 Clothes</span>
                      <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black uppercase">Save 25%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Get the complete set (Emerald Green + Black + Heritage Ivory) with all track pants.</p>
                    <div className="mt-3 text-sm font-bold text-slate-900">₦132,000 <span className="text-slate-400 line-through text-xs font-normal">₦180,000</span></div>
                  </div>
                </div>
              </div>

              {/* Step 2: Style Customization details */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Step 2: Customize Your Selected Styles <span className="text-red-500">*</span>
                </label>

                {selectedPackage === "single" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 mb-2 font-sans">Choose which 1 style you would like to order:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {CLOTHING_STYLES.map((style) => (
                        <label 
                          key={style.id}
                          className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition ${
                            selectedSingleStyle === style.name ? "bg-white border-slate-900 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input 
                              type="radio"
                              name="single-style-select"
                              checked={selectedSingleStyle === style.name}
                              onChange={() => {
                                setSelectedSingleStyle(style.name);
                                if (style.id === "emerald") setActiveImageIdx(0);
                                if (style.id === "navy") setActiveImageIdx(1);
                                if (style.id === "ivory") setActiveImageIdx(2);
                              }}
                              className="accent-slate-900 text-slate-900"
                            />
                            <span className="text-xs font-bold text-slate-900">{style.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1 leading-normal block">{style.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPackage === "double" && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-sans">Check exactly 2 clothing styles to include in your combo:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {CLOTHING_STYLES.map((style) => {
                        const isChecked = selectedDoubleStyles.includes(style.name);
                        return (
                          <label 
                            key={style.id}
                            className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition ${
                              isChecked ? "bg-white border-slate-900 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    // Remove if we have more than 1
                                    if (selectedDoubleStyles.length > 1) {
                                      setSelectedDoubleStyles(prev => prev.filter(s => s !== style.name));
                                    }
                                  } else {
                                    // Add if current checked is less than 2
                                    if (selectedDoubleStyles.length < 2) {
                                      setSelectedDoubleStyles(prev => [...prev, style.name]);
                                    } else {
                                      // Replace first checked style to maintain exactly 2
                                      setSelectedDoubleStyles(prev => [prev[1], style.name]);
                                    }
                                  }
                                }}
                                className="accent-slate-900 text-slate-900 rounded"
                              />
                              <span className="text-xs font-bold text-slate-900">{style.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1 leading-normal block">{style.description}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedPackage === "triple" && (
                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center gap-3">
                    <span className="text-lg">👑</span>
                    <div>
                      <p className="font-bold text-slate-900">Your Triple Pack is Fully Configured!</p>
                      <p className="text-[11px] text-slate-500">Includes 1x Emerald Crest Premium Two-Piece Tracksuit + 1x Black Sovereign Two-Piece Tracksuit + 1x Heritage Ivory Monarch Two-Piece Tracksuit (With matching tailored trousers for all 3).</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Size selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Step 3: Select Your Attire Size <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2.5 max-w-sm">
                  {["M", "L", "XL", "XXL"].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`py-3 text-sm font-bold rounded-lg border-2 uppercase tracking-wide transition ${
                        selectedSize === size ? "bg-slate-950 border-slate-950 text-white shadow-md" : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-sans">
                  *Standard fitting size. Don't worry, if the fit is incorrect upon delivery, we exchange it absolutely free of charge!
                </p>
              </div>

            </div>

            {/* Quantity Selector */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-950 uppercase tracking-wider">Select Package Quantity:</label>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">Most customers buy 2 sets to share with brothers or fathers.</p>
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
                Yes! Delivery is 100% free nationwide. You do not pay any delivery fee or advance deposits.
              </p>
            </div>

            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
              <h5 className="font-bold text-slate-900 text-sm md:text-base flex items-start gap-2.5 font-display uppercase tracking-tight">
                <HelpCircle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
                <span>What if the selected clothing size doesn't fit me?</span>
              </h5>
              <p className="text-slate-600 text-sm mt-2 pl-7 font-sans leading-relaxed">
                We provide a 100% Fit Guarantee! If the clothing is too large or too tight, simply notify us on WhatsApp or call our support lines, and we will send our dispatch driver to swap it for a different size absolutely free.
              </p>
            </div>

            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
              <h5 className="font-bold text-slate-900 text-sm md:text-base flex items-start gap-2.5 font-display uppercase tracking-tight">
                <HelpCircle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
                <span>Can I open and inspect the clothes before payment?</span>
              </h5>
              <p className="text-slate-600 text-sm mt-2 pl-7 font-sans leading-relaxed">
                Absolutely! Our courier will hand you the package so you can check the embroidery, premium double-knit fabrics, and pants fit. Once fully satisfied, you can pay via bank transfer or cash to the driver on the spot.
              </p>
            </div>

            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
              <h5 className="font-bold text-slate-900 text-sm md:text-base flex items-start gap-2.5 font-display uppercase tracking-tight">
                <HelpCircle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
                <span>How long does delivery take to my city?</span>
              </h5>
              <p className="text-slate-600 text-sm mt-2 pl-7 font-sans leading-relaxed">
                - **Lagos / Abuja / Port Harcourt:** 1 to 2 business days.<br />
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
            className="font-display font-black text-white text-xl uppercase tracking-widest select-none inline-block cursor-default cursor-pointer"
          >
            IBOTSHOPLINE
          </p>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Premium Royal Two-Piece Tracksuit Collection
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-sans">
            Registered under Nigeria Corporate Affairs Commission. Trusted by over 12,400+ regal gentlemen nationwide.
          </p>
          <div className="flex justify-center gap-6 text-xs text-slate-500 pt-4 border-t border-slate-800 max-w-sm mx-auto font-sans">
            <span className="hover:text-white cursor-pointer transition">Terms of Service</span>
            <span className="hover:text-white cursor-pointer transition">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition">Contact Support</span>
          </div>
          <p className="text-[10px] text-slate-600 font-mono">
            &copy; 2026 IBOTSHOPLINE. All rights reserved. Made in alignment with premium royal values.
          </p>
        </div>
      </footer>

    </div>
  );
}
