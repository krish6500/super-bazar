"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { authFetch } from "./lib/auth-fetch";

type Product = {
  id: number;
  emoji: string;
  name: string;
  qty: string;
  price: number;
  old: number;
  category: string;
  badge: string;
};
type Banner = {
  id: number;
  title: string;
  desktopUrl: string;
  mobileUrl: string;
};
const categories = [
  ["All", "🛍️", "All products"],
  ["Fresh", "🥬", "Fruits & Veggies"],
  ["Dairy", "🥛", "Dairy, Bread & Eggs"],
  ["Snacks", "🍪", "Snacks & Munchies"],
  ["Drinks", "🥤", "Cold Drinks & Juices"],
  ["Pantry", "🍚", "Atta, Rice & Dal"],
  ["Care", "🧴", "Personal Care"],
  ["Pet", "🐾", "Pet Care"],
];
const fallbackProducts: Product[] = [
  {
    id: 1,
    emoji: "🥭",
    name: "Mango Banganapalli",
    qty: "1 kg",
    price: 119,
    old: 149,
    category: "Fresh",
    badge: "10 MINS",
  },
  {
    id: 2,
    emoji: "🍌",
    name: "Farm Fresh Bananas",
    qty: "1 kg",
    price: 55,
    old: 65,
    category: "Fresh",
    badge: "10 MINS",
  },
  {
    id: 3,
    emoji: "🥛",
    name: "Nandini Toned Milk",
    qty: "1 L",
    price: 58,
    old: 60,
    category: "Dairy",
    badge: "12 MINS",
  },
  {
    id: 4,
    emoji: "🍞",
    name: "Daily Fresh Bread",
    qty: "400 g",
    price: 42,
    old: 50,
    category: "Dairy",
    badge: "10 MINS",
  },
  {
    id: 5,
    emoji: "🥔",
    name: "Premium Potatoes",
    qty: "1 kg",
    price: 39,
    old: 49,
    category: "Fresh",
    badge: "10 MINS",
  },
  {
    id: 6,
    emoji: "🧃",
    name: "Tropicana Orange Juice",
    qty: "1 L",
    price: 110,
    old: 125,
    category: "Drinks",
    badge: "15 MINS",
  },
  {
    id: 7,
    emoji: "🍪",
    name: "Chocolate Cookies",
    qty: "300 g",
    price: 79,
    old: 95,
    category: "Snacks",
    badge: "10 MINS",
  },
  {
    id: 8,
    emoji: "🍿",
    name: "Classic Salted Popcorn",
    qty: "90 g",
    price: 45,
    old: 55,
    category: "Snacks",
    badge: "10 MINS",
  },
  {
    id: 9,
    emoji: "🍚",
    name: "Premium Sona Masoori Rice",
    qty: "5 kg",
    price: 349,
    old: 425,
    category: "Pantry",
    badge: "15 MINS",
  },
  {
    id: 10,
    emoji: "🧴",
    name: "Aloe Fresh Body Wash",
    qty: "250 ml",
    price: 165,
    old: 199,
    category: "Care",
    badge: "12 MINS",
  },
  {
    id: 11,
    emoji: "🐶",
    name: "Healthy Pet Dog Food",
    qty: "1.2 kg",
    price: 299,
    old: 349,
    category: "Pet",
    badge: "15 MINS",
  },
  {
    id: 12,
    emoji: "🥚",
    name: "Farm Fresh Eggs",
    qty: "6 pcs",
    price: 72,
    old: 84,
    category: "Dairy",
    badge: "10 MINS",
  },
];

export default function Home() {
  const [productList, setProductList] = useState<Product[]>(fallbackProducts);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("All");
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [checkout, setCheckout] = useState<0 | 1 | 2 | 3>(0);
  const [payment, setPayment] = useState("UPI");
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [toast, setToast] = useState("");
  const [location, setLocation] = useState("Alliance University, Bengaluru");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [paymentFlow, setPaymentFlow] = useState(false),
    [qrCode, setQrCode] = useState(""),
    [verifying, setVerifying] = useState(false);
  const [pendingSession, setPendingSession] = useState("");
  const [festivalBanner, setFestivalBanner] = useState<Banner | null>(null);

  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = productList.reduce(
    (s, p) => s + (cart[p.id] || 0) * p.price,
    0,
  );
  const delivery = subtotal > 0 && subtotal < 299 ? 25 : 0;
  const total = Math.max(0, subtotal + delivery - discount);
  const shown = useMemo(
    () =>
      productList.filter(
        (p) =>
          (active === "All" || p.category === active) &&
          p.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [active, query, productList],
  );
  const cartItems = productList.filter((p) => cart[p.id]);
  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };
  const add = (id: number) => {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
    flash("Added to cart");
  };
  const remove = (id: number) =>
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));
  const chooseCategory = (name: string) => {
    setActive(name);
    setQuery("");
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };
  const applyCoupon = () => {
    if (coupon.trim().toUpperCase() === "SUPER50") {
      setDiscount(Math.min(50, subtotal));
      flash("SUPER50 applied");
    } else flash("Try coupon SUPER50");
  };
  useEffect(() => {
    if (!paymentFlow) return;
    const uri = `upi://pay?pa=9008799949@axl&pn=Super%20Bazar&am=${total.toFixed(2)}&cu=INR&tn=Super%20Bazar%20Order`;
    QRCode.toDataURL(uri, {
      width: 240,
      margin: 2,
      color: { dark: "#173326", light: "#ffffff" },
    }).then(setQrCode);
  }, [paymentFlow, total]);
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        if (d.products?.length)
          setProductList(
            d.products
              .filter((p: { active: boolean }) => p.active)
              .map(
                (p: {
                  id: number;
                  emoji: string;
                  name: string;
                  unit: string;
                  price: number;
                  mrp: number;
                  category: string;
                }) => ({
                  id: p.id,
                  emoji: p.emoji,
                  name: p.name,
                  qty: p.unit,
                  price: p.price,
                  old: p.mrp,
                  category: p.category,
                  badge: "10 MINS",
                }),
              ),
          );
      })
      .catch(() => {});
    fetch("/api/banners")
      .then((r) => r.json())
      .then((d) => setFestivalBanner(d.banners?.[0] || null))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!pendingSession) return;
    const timer = window.setInterval(async () => {
      const r = await fetch(`/api/payment/status?id=${pendingSession}`);
      const d = await r.json();
      if (d.status === "approved") {
        window.clearInterval(timer);
        setPaymentFlow(false);
        setPendingSession("");
        flash("Payment approved successfully");
        void saveOrder();
      } else if (d.status === "expired") {
        window.clearInterval(timer);
        setPendingSession("");
        flash("Payment request expired");
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [pendingSession]);
  const saveOrder = async () => {
    const items = cartItems.map((p) => ({
      id: p.id,
      name: p.name,
      quantity: cart[p.id],
      price: p.price,
    }));
    try {
      const response = await authFetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: location,
          paymentMethod: payment,
          amount: total,
          items,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = "/account";
        return;
      }
      if (!response.ok) throw new Error(data.error || "Order failed");
      setOrderId(data.order.id);
      setCheckout(3);
      setCart({});
      setDrawer(false);
    } catch {
      flash("Could not save order. Please sign in and try again");
    }
  };
  const placeOrder = () => {
    if (payment === "COD") {
      void saveOrder();
      return;
    }
    setPaymentFlow(true);
  };
  const confirmPayment = async () => {
    if (pendingSession) {
      flash("Waiting for merchant approval");
      return;
    }
    setVerifying(true);
    try {
      const r = await authFetch("/api/payment/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: total, phone: "9008799949" }),
      });
      const d = await r.json();
      if (r.status === 401) {
        window.location.href = "/account";
        return;
      }
      if (!r.ok) throw new Error(d.error);
      setPendingSession(d.sessionId);
      flash("Payment request sent to merchant");
    } catch {
      flash("Could not request payment approval");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#home">
          <span>super</span>bazar<i>.</i>
        </a>
        <button className="delivery" onClick={() => setAddressOpen(true)}>
          <strong>Delivery in 10 minutes</strong>
          <small>⌖ {location}　⌄</small>
        </button>
        <label className="search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive("All");
            }}
            placeholder='Search for "milk", "fruits"...'
          />
        </label>
        <button
          className="account"
          onClick={() => {
            window.location.href = "/account";
          }}
        >
          Hi, Krish <span>→</span>
        </button>
        <button className="cart" onClick={() => setDrawer(true)}>
          🛒 <b>{count ? `${count} item${count > 1 ? "s" : ""}` : "My Cart"}</b>
        </button>
        {menu && (
          <div className="account-menu">
            <strong>My Account</strong>
            <small>9008799949</small>
            <button
              onClick={() => {
                window.location.href = "/orders";
              }}
            >
              📦 My Orders
            </button>
            <button
              onClick={() => {
                setAddressOpen(true);
                setMenu(false);
              }}
            >
              ⌖ Saved Addresses
            </button>
            <button
              onClick={() => {
                chooseCategory("All");
                setMenu(false);
                flash(
                  `${wishlist.length} saved item${wishlist.length === 1 ? "" : "s"}`,
                );
              }}
            >
              ♡ My Wishlist ({wishlist.length})
            </button>
            <button
              onClick={() => {
                window.location.href = "/admin";
              }}
            >
              ⚙ Store Admin
            </button>
            <button
              onClick={() => {
                flash("Support: +91 90000 12345");
                setMenu(false);
              }}
            >
              ❔ Help & Support
            </button>
          </div>
        )}
      </header>

      <section className="page" id="home">
        {festivalBanner && (
          <a className="festival-banner" href="#products">
            <picture>
              <source
                media="(max-width:600px)"
                srcSet={festivalBanner.mobileUrl}
              />
              <img src={festivalBanner.desktopUrl} alt={festivalBanner.title} />
            </picture>
          </a>
        )}
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">⚡ FAST. FRESH. LOCAL.</p>
            <h1>
              Your daily essentials,
              <br />
              <em>at your door.</em>
            </h1>
            <p>
              From fresh vegetables to pantry favourites — get everything you
              need in minutes.
            </p>
            <button onClick={() => chooseCategory("All")}>
              Shop now <span>→</span>
            </button>
          </div>
          <div className="hero-art">
            <span className="floating">✦</span>
            <div className="bag">
              SUPER
              <br />
              <b>BAZAR</b>
              <small>fresh picks</small>
            </div>
            <div className="produce">
              🥬<span>🍊</span>
              <span>🥖</span>
              <span>🥛</span>
              <span>🍅</span>
            </div>
            <div className="delivery-pill">⚡ Delivered in 10 min</div>
          </div>
        </section>
        <section className="trust">
          <span>
            ✦ <b>10-min delivery</b>
          </span>
          <span>
            ❋ <b>Farm-fresh quality</b>
          </span>
          <span>
            ▣ <b>Best prices, always</b>
          </span>
          <span>
            ↻ <b>Easy returns</b>
          </span>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">SHOP BY AISLE</p>
              <h2>What are you looking for?</h2>
            </div>
            <button onClick={() => chooseCategory("All")}>View all →</button>
          </div>
          <div className="categories">
            {categories.map(([key, emoji, label], i) => (
              <button
                className={`category c${i} ${active === key ? "selected" : ""}`}
                key={key}
                onClick={() => chooseCategory(key)}
              >
                <span>{emoji}</span>
                <b>{label}</b>
                <i>→</i>
              </button>
            ))}
          </div>
        </section>
        <section className="offers">
          <article className="offer offer-green">
            <div>
              <p>WEEKEND SPECIAL</p>
              <h3>
                Fresh picks,
                <br />
                happy prices.
              </h3>
              <button onClick={() => chooseCategory("Fresh")}>
                Explore deals →
              </button>
            </div>
            <span>🥑</span>
            <span>🥦</span>
          </article>
          <article className="offer offer-orange">
            <div>
              <p>DAILY SAVERS</p>
              <h3>
                Save ₹50
                <br />
                on essentials
              </h3>
              <button
                onClick={() => {
                  setCoupon("SUPER50");
                  flash("Coupon SUPER50 copied");
                }}
              >
                Get coupon →
              </button>
            </div>
            <span>🛍️</span>
          </article>
        </section>

        <section className="section" id="products">
          <div className="section-head">
            <div>
              <p className="eyebrow">
                {active === "All" ? "MOST LOVED" : active.toUpperCase()}
              </p>
              <h2>
                {query
                  ? `Results for “${query}”`
                  : active === "All"
                    ? "Popular near you"
                    : `${active} essentials`}
              </h2>
            </div>
            <button onClick={() => chooseCategory("All")}>
              See all products →
            </button>
          </div>
          <div className="products">
            {shown.map((p) => (
              <article className="product" key={p.id}>
                <div className="product-image">
                  <span>{p.emoji}</span>
                  <small>{p.badge}</small>
                  <button
                    className={`wish ${wishlist.includes(p.id) ? "liked" : ""}`}
                    aria-label="Add to wishlist"
                    onClick={() =>
                      setWishlist((w) =>
                        w.includes(p.id)
                          ? w.filter((x) => x !== p.id)
                          : [...w, p.id],
                      )
                    }
                  >
                    {wishlist.includes(p.id) ? "♥" : "♡"}
                  </button>
                </div>
                <p className="qty">{p.qty}</p>
                <h3>{p.name}</h3>
                <div className="price">
                  <b>₹{p.price}</b>
                  <del>₹{p.old}</del>
                </div>
                {cart[p.id] ? (
                  <div className="stepper">
                    <button onClick={() => remove(p.id)}>−</button>
                    <b>{cart[p.id]}</b>
                    <button onClick={() => add(p.id)}>+</button>
                  </div>
                ) : (
                  <button className="add" onClick={() => add(p.id)}>
                    ADD <span>+</span>
                  </button>
                )}
              </article>
            ))}
          </div>
          {!shown.length && (
            <div className="empty">
              <span>🔎</span>
              <h3>No products found</h3>
              <p>Try searching for milk, mango, bread or rice.</p>
              <button
                onClick={() => {
                  setQuery("");
                  setActive("All");
                }}
              >
                Clear search
              </button>
            </div>
          )}
        </section>
      </section>

      {drawer && (
        <>
          <button
            className="scrim"
            aria-label="Close cart"
            onClick={() => setDrawer(false)}
          />
          <aside className="drawer">
            <div className="drawer-head">
              <div>
                <small>SUPER BAZAR</small>
                <h2>
                  My cart <span>{count} items</span>
                </h2>
              </div>
              <button onClick={() => setDrawer(false)}>×</button>
            </div>
            {count === 0 ? (
              <div className="empty-cart">
                <span>🛒</span>
                <h3>Your cart is waiting</h3>
                <p>Add fresh groceries and daily essentials.</p>
                <button onClick={() => setDrawer(false)}>Start shopping</button>
              </div>
            ) : (
              <>
                <div className="delivery-note">⚡ Delivery in 10 minutes</div>
                <div className="cart-items">
                  {cartItems.map((p) => (
                    <article key={p.id}>
                      <div className="cart-pic">{p.emoji}</div>
                      <div>
                        <strong>{p.name}</strong>
                        <small>{p.qty}</small>
                        <b>₹{p.price}</b>
                      </div>
                      <div className="mini-step">
                        <button onClick={() => remove(p.id)}>−</button>
                        <span>{cart[p.id]}</span>
                        <button onClick={() => add(p.id)}>+</button>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="coupon">
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder="Coupon code"
                  />
                  <button onClick={applyCoupon}>Apply</button>
                  <small>Use SUPER50 to save ₹50</small>
                </div>
                <div className="bill">
                  <p>
                    <span>Item total</span>
                    <b>₹{subtotal}</b>
                  </p>
                  <p>
                    <span>Delivery fee</span>
                    <b>{delivery ? `₹${delivery}` : "FREE"}</b>
                  </p>
                  {discount > 0 && (
                    <p className="saving">
                      <span>Coupon discount</span>
                      <b>−₹{discount}</b>
                    </p>
                  )}
                  <p className="grand">
                    <span>To pay</span>
                    <b>₹{total}</b>
                  </p>
                </div>
                <button className="checkout-btn" onClick={() => setCheckout(1)}>
                  <span>
                    <small>TOTAL</small>₹{total}
                  </span>
                  <b>Proceed to checkout →</b>
                </button>
              </>
            )}
          </aside>
        </>
      )}

      {addressOpen && (
        <div className="modal-wrap">
          <button
            className="scrim"
            aria-label="Close"
            onClick={() => setAddressOpen(false)}
          />
          <section className="modal address-modal">
            <button className="modal-x" onClick={() => setAddressOpen(false)}>
              ×
            </button>
            <p className="eyebrow">DELIVERY ADDRESS</p>
            <h2>Where should we deliver?</h2>
            <button
              className="address-choice"
              onClick={() => {
                setLocation("Alliance University, Bengaluru");
                setAddressOpen(false);
                flash("Delivery location updated");
              }}
            >
              <span>🏫</span>
              <div>
                <b>Alliance University</b>
                <small>Chandapura - Anekal Main Road, Bengaluru</small>
              </div>
              <i>✓</i>
            </button>
            <button
              className="address-choice"
              onClick={() => {
                setLocation("Kengeri, Bengaluru");
                setAddressOpen(false);
                flash("Delivery location updated");
              }}
            >
              <span>🏠</span>
              <div>
                <b>Home</b>
                <small>Kengeri, Bengaluru, Karnataka</small>
              </div>
              <i>→</i>
            </button>
            <button
              className="new-address"
              onClick={() =>
                flash("New address form ready for backend connection")
              }
            >
              ＋ Add a new address
            </button>
          </section>
        </div>
      )}

      {checkout > 0 && (
        <div className="modal-wrap">
          <button
            className="scrim"
            aria-label="Close"
            onClick={() => setCheckout(0)}
          />
          <section className="modal checkout-modal">
            <button className="modal-x" onClick={() => setCheckout(0)}>
              ×
            </button>
            {checkout < 3 && (
              <div className="steps">
                <span className="done">1 Cart</span>
                <i>—</i>
                <span className={checkout >= 1 ? "done" : ""}>2 Address</span>
                <i>—</i>
                <span className={checkout >= 2 ? "done" : ""}>3 Payment</span>
              </div>
            )}
            {checkout === 1 && (
              <>
                <p className="eyebrow">STEP 1 OF 2</p>
                <h2>Confirm delivery address</h2>
                <button className="address-choice active">
                  <span>⌖</span>
                  <div>
                    <b>{location}</b>
                    <small>Deliver to Krish • 9008799949</small>
                  </div>
                  <i>✓</i>
                </button>
                <label className="instructions">
                  Delivery instructions
                  <textarea placeholder="e.g. Leave at the security desk" />
                </label>
                <button className="primary" onClick={() => setCheckout(2)}>
                  Continue to payment →
                </button>
              </>
            )}
            {checkout === 2 && (
              <>
                <p className="eyebrow">STEP 2 OF 2</p>
                <h2>Choose payment method</h2>
                <div className="payments">
                  {[
                    ["UPI", "◉", "UPI / QR code", "Google Pay, PhonePe, Paytm"],
                    [
                      "Card",
                      "▣",
                      "Credit or Debit Card",
                      "Visa, Mastercard, RuPay",
                    ],
                    ["Wallet", "◈", "Wallet", "Super Bazar wallet"],
                    [
                      "COD",
                      "₹",
                      "Cash on Delivery",
                      "Pay when your order arrives",
                    ],
                  ].map(([key, icon, title, sub]) => (
                    <button
                      className={payment === key ? "active" : ""}
                      key={key}
                      onClick={() => setPayment(key)}
                    >
                      <span>{icon}</span>
                      <div>
                        <b>{title}</b>
                        <small>{sub}</small>
                      </div>
                      <i>{payment === key ? "●" : "○"}</i>
                    </button>
                  ))}
                </div>
                {payment === "UPI" && (
                  <input
                    className="pay-input"
                    placeholder="Enter UPI ID (example@upi)"
                  />
                )}
                {payment === "Card" && (
                  <div className="card-fields">
                    <input placeholder="Card number" />
                    <input placeholder="MM/YY" />
                    <input placeholder="CVV" />
                  </div>
                )}
                <div className="secure">
                  🔒 Secure payment • You will not be charged in this demo
                </div>
                <button className="primary pay" onClick={placeOrder}>
                  Place order • ₹{total}
                </button>
              </>
            )}
            {checkout === 3 && (
              <div className="success">
                <div className="success-check">✓</div>
                <p className="eyebrow">ORDER CONFIRMED</p>
                <h2>Your groceries are on the way!</h2>
                <p>
                  Order <b>#SB{Math.floor(1000 + Math.random() * 8999)}</b> will
                  reach you in approximately 10 minutes.
                </p>
                <div className="track">
                  <span>✓ Order placed</span>
                  <i />
                  <span>● Packing</span>
                  <i />
                  <span>○ On the way</span>
                </div>
                <button className="primary" onClick={() => setCheckout(0)}>
                  Continue shopping
                </button>
              </div>
            )}
          </section>
        </div>
      )}
      {paymentFlow && (
        <div className="modal-wrap">
          <button
            className="scrim"
            aria-label="Close payment"
            onClick={() => setPaymentFlow(false)}
          />
          <section className="modal qr-modal">
            <button className="modal-x" onClick={() => setPaymentFlow(false)}>
              ×
            </button>
            <p className="eyebrow">SECURE UPI PAYMENT</p>
            <h2>
              {pendingSession
                ? "Waiting for approval"
                : `Scan and pay ₹${total}`}
            </h2>
            {!pendingSession ? (
              <>
                <p className="qr-help">
                  Use Google Pay, PhonePe, Paytm or any UPI app.
                </p>
                <div className="qr-box">
                  {qrCode ? (
                    <img src={qrCode} alt={`UPI QR code to pay ₹${total}`} />
                  ) : (
                    <span>Generating secure QR…</span>
                  )}
                </div>
                <div className="upi-details">
                  <span>Paying</span>
                  <b>Super Bazar • 9008799949@axl</b>
                </div>
                <button
                  className="primary"
                  disabled={verifying}
                  onClick={confirmPayment}
                >
                  {verifying ? "Submitting…" : "I have completed the payment"}
                </button>
                <small className="test-note">
                  Only submit after completing the UPI payment.
                </small>
              </>
            ) : (
              <div className="merchant-wait">
                <div className="waiting-ring">
                  <span>₹</span>
                </div>
                <h3>Payment confirmation sent</h3>
                <p>
                  Please keep this screen open. The merchant is checking the
                  payment received in their UPI account.
                </p>
                <div className="payment-wait">
                  <i /> Waiting for merchant approval…
                </div>
                <small>
                  Your order will be placed automatically after approval.
                </small>
              </div>
            )}
          </section>
        </div>
      )}
      <nav className="quick-links" aria-label="Quick navigation">
        <a href="/">
          ⌂ <span>Shop</span>
        </a>
        <a href="/orders">
          📦 <span>Orders</span>
        </a>
        <a href="/admin">
          ⚙ <span>Admin</span>
        </a>
        <a href="/account">
          👤 <span>Account</span>
        </a>
      </nav>
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}
