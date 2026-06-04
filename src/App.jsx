import { useState, useEffect, useRef } from "react";

// ===========================================================================
// BACKEND CONFIGURATION
// ===========================================================================
// Pro spolehlivou cross-device sync (iPhone Kasa <-> Android Barista) nastav 
// Firebase Realtime Database URL.
//
// SETUP (15 min):
// 1. Jdi na console.firebase.google.com a vytvoř nový projekt
// 2. V projektu: "Realtime Database" -> "Create database" -> "Europe-west1" 
//    -> "Start in test mode"
// 3. Klikni "Rules" tab a nastav:
//    { "rules": { ".read": true, ".write": true } }
// 4. Zkopíruj URL databáze (např. https://nippan-pos-default-rtdb.europe-west1.firebasedatabase.app)
// 5. Vlož ji níže do FIREBASE_URL a republish artifact
//
// POZNÁMKA: Pokud necháš FIREBASE_URL prázdné, aplikace použije localStorage 
// jako fallback (data jsou lokální, BEZ sync mezi zařízeními).
// ===========================================================================
const FIREBASE_URL = ""; // <-- Sem vlož URL Firebase databáze

export default function App() {
  const [view, setView] = useState("kasa");
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notes, setNotes] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [synced, setSynced] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [submittedFlash, setSubmittedFlash] = useState(null);
  const [storageError, setStorageError] = useState(null);
  const [cartExpanded, setCartExpanded] = useState(true);
  const prevWaitingCount = useRef(0);
  const audioCtxRef = useRef(null);
  const lastWriteRef = useRef(0);
  const completionTimerRef = useRef({});

  const limos = [
    { id: "yuzu", name: "Yuzu Matcha Lemonade", emoji: "🍋", price: 129, type: "drink", category: "limo", bg: "bg-green-50", border: "border-green-500", text: "text-green-900",
      recipe: ["Kelímek s ledem (120 g)", "30 ml matcha premix", "50 ml yuzu báze (lahev protřepat!)", "10 ml citronová šťáva", "Doplnit sodou (~180 ml)", "Promíchat lžící, NEzatřepat!", "Brčko + plátek citronu"] },
    { id: "bezinka", name: "Bezinka Matcha Lemonade", emoji: "🌸", price: 129, type: "drink", category: "limo", bg: "bg-green-50", border: "border-green-500", text: "text-green-900",
      recipe: ["Kelímek s ledem (80 g — méně!)", "30 ml matcha premix", "30 ml bezinkový sirup (2 pumpy)", "~50 g mraženého ovoce", "10 ml citronová šťáva", "Doplnit sodou (~180 ml)", "Promíchat, široké brčko"] },
    { id: "fizz", name: "Lime Matcha Fizz", emoji: "🌅", price: 119, type: "drink", category: "limo", bg: "bg-green-50", border: "border-green-500", text: "text-green-900",
      recipe: ["Kelímek s ledem (do 3/4)", "35 ml Monin Lime Juice (3-4 pumpy)", "Doplnit sodou (~230 ml)", "Promíchat (jen spodek)", "30 ml matcha premix POMALU shora přes lžíci", "Brčko, NEMÍCHAT! Garnish: plátek limetky"] },
  ];

  const lattes = [
    { id: "strawberry", name: "Strawberry Matcha Latte", emoji: "🍓", price: 139, type: "drink", category: "latte", bg: "bg-orange-50", border: "border-orange-500", text: "text-orange-900",
      recipe: ["Kelímek s ledem (120 g)", "40 ml jahodového pyré (dno)", "200 ml mléko (dle volby)", "30 ml matcha premix (shora)", "Víčko, krátké zatřepání", "Brčko + čerstvá jahoda na vrchu"] },
    { id: "mango", name: "Mango Matcha Latte", emoji: "🥭", price: 139, type: "drink", category: "latte", bg: "bg-orange-50", border: "border-orange-500", text: "text-orange-900",
      recipe: ["Kelímek s ledem (120 g)", "40 ml mangového pyré (dno)", "200 ml mléko (dle volby)", "30 ml matcha premix (shora)", "Víčko, krátké zatřepání", "Brčko"] },
    { id: "classic", name: "Iced Matcha Latte", emoji: "🍵", price: 119, type: "drink", category: "latte", bg: "bg-orange-50", border: "border-orange-500", text: "text-orange-900",
      recipe: ["Kelímek s ledem (120 g)", "30 ml matcha premix", "200 ml mléko (dle volby)", "15 ml cukrový sirup (1 pump)", "Víčko, krátké zatřepání", "Brčko"] },
  ];

  const drinks = [...limos, ...lattes];

  const pastry = [
    { id: "matcha-melon-pan", name: "Matcha Melon Pan", emoji: "🍵", price: 80, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "melon-pan", name: "Melon Pan", emoji: "🍈", price: 70, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "anpan", name: "Anpan", emoji: "🥯", price: 70, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "matcha-twister", name: "Matcha Twister", emoji: "🥨", price: 85, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "korokke-pan", name: "Korokke Pan", emoji: "🍔", price: 120, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "toast-ham", name: "Toast Ham", emoji: "🥪", price: 120, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "toast-losos", name: "Toast Losos", emoji: "🐟", price: 140, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "edamame", name: "Edamame", emoji: "🫛", price: 70, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
  ];

  const merchant = [
    { id: "greentea", name: "Green Tea", emoji: "🍃", price: 85, type: "extra", bg: "bg-emerald-50", border: "border-emerald-500", text: "text-emerald-900" },
    { id: "ramune", name: "Hata Ramune", emoji: "🥤", price: 75, type: "extra", bg: "bg-cyan-50", border: "border-cyan-500", text: "text-cyan-900" },
    { id: "snack100", name: "Jap. snack 100", emoji: "🍡", price: 100, type: "extra", bg: "bg-rose-50", border: "border-rose-400", text: "text-rose-900" },
    { id: "snack110", name: "Jap. snack 110", emoji: "🍘", price: 110, type: "extra", bg: "bg-rose-50", border: "border-rose-400", text: "text-rose-900" },
  ];

  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }, []);

  const playBeep = () => {
    if (!audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  const loadOrders = async () => {
    if (FIREBASE_URL) {
      // Firebase REST API
      try {
        const response = await fetch(`${FIREBASE_URL}/nippan_orders.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
        setSynced(true);
        setLastSyncTime(Date.now());
        setStorageError(null);
      } catch (e) {
        console.error("Firebase load error:", e);
        setStorageError("Firebase chyba: " + (e.message || "neznámá"));
        setSynced(true);
        setLastSyncTime(Date.now());
      }
    } else {
      // Fallback: localStorage (per-device, NEsynchronizuje napříč zařízeními!)
      try {
        const result = localStorage.getItem("nippan:orders");
        if (result) {
          const parsed = JSON.parse(result);
          setOrders(parsed);
        } else {
          setOrders([]);
        }
        setSynced(true);
        setLastSyncTime(Date.now());
        setStorageError("⚠️ FIREBASE_URL není nastaveno — data jsou jen lokálně, BEZ sync mezi zařízeními!");
      } catch (e) {
        console.error("Load error:", e);
        setSynced(true);
        setLastSyncTime(Date.now());
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      if (Date.now() - lastWriteRef.current < 2000) return;
      await loadOrders();
    };
    load();
    const interval = setInterval(load, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (view === "kasa" && customerNumber === "") {
      const highest = orders.reduce((max, o) => {
        const n = parseInt(o.number);
        return isNaN(n) ? max : Math.max(max, n);
      }, 0);
      setCustomerNumber(String(highest + 1));
    }
  }, [view, orders]);

  useEffect(() => {
    const waiting = orders.filter(o => o.status === "waiting").length;
    if (view === "barista" && waiting > prevWaitingCount.current && prevWaitingCount.current > 0) {
      playBeep();
    }
    prevWaitingCount.current = waiting;
  }, [orders, view]);

  useEffect(() => {
    orders.forEach(o => {
      if (o.status !== "waiting") return;
      const orderDrinks = o.items.filter(i => i.type === "drink");
      if (orderDrinks.length === 0) return;
      const allDone = orderDrinks.every(d => d.done);

      if (allDone && !completionTimerRef.current[o.timestamp]) {
        completionTimerRef.current[o.timestamp] = setTimeout(() => {
          setOrders(currentOrders => {
            const updated = currentOrders.map(co =>
              co.timestamp === o.timestamp ? { ...co, status: "done", doneAt: Date.now() } : co
            );
            lastWriteRef.current = Date.now();
            if (FIREBASE_URL) {
              fetch(`${FIREBASE_URL}/nippan_orders.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated),
              }).catch(err => {
                console.error("Auto-complete Firebase error:", err);
                setStorageError("Firebase chyba: " + (err.message || "neznámá"));
              });
            } else {
              try {
                localStorage.setItem("nippan:orders", JSON.stringify(updated));
              } catch (err) {
                console.error("Auto-complete save error:", err);
                setStorageError("Chyba při ukládání: " + (err.message || "neznámá chyba"));
              }
            }
            return updated;
          });
          delete completionTimerRef.current[o.timestamp];
        }, 600);
      } else if (!allDone && completionTimerRef.current[o.timestamp]) {
        clearTimeout(completionTimerRef.current[o.timestamp]);
        delete completionTimerRef.current[o.timestamp];
      }
    });
  }, [orders]);

  const saveOrders = async (newOrders) => {
    lastWriteRef.current = Date.now();
    setOrders(newOrders);
    if (FIREBASE_URL) {
      // Firebase REST API
      try {
        const response = await fetch(`${FIREBASE_URL}/nippan_orders.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrders),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setStorageError(null);
      } catch (e) {
        console.error("Firebase save error:", e);
        setStorageError("Firebase chyba: " + (e.message || "neznámá"));
      }
    } else {
      // Fallback: localStorage (per-device only, žádný cross-device sync)
      try {
        localStorage.setItem("nippan:orders", JSON.stringify(newOrders));
      } catch (e) {
        console.error("Save error:", e);
        setStorageError("Chyba ukládání: " + (e.message || "neznámá"));
      }
    }
  };

  const addToCart = (item) => {
    const cartItem = { ...item, cartId: `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` };
    if (item.category === "latte") cartItem.milk = "standard";
    if (item.type === "drink") cartItem.ice = "standard"; // standard | less | none
    // Auto-expand cart when adding first item to empty cart
    if (cart.length === 0) setCartExpanded(true);
    setCart([...cart, cartItem]);
  };

  // Group cart items into displayable rows with counts
  // Drinks: grouped by id + milk
  // Extras: grouped by id (custom items have unique ids, stay separate)
  const buildCartGroups = (cartArray) => {
    const groups = [];
    cartArray.forEach((item, originalIdx) => {
      const milkKey = item.category === "latte" ? item.milk : "";
      const iceKey = item.type === "drink" ? (item.ice || "standard") : "";
      const groupKey = `${item.id}|${milkKey}|${iceKey}`;
      const existing = groups.find(g => g.key === groupKey);
      if (existing) {
        existing.count += 1;
        existing.indices.push(originalIdx);
      } else {
        groups.push({
          key: groupKey,
          item: item,
          count: 1,
          indices: [originalIdx],
        });
      }
    });
    return groups;
  };

  const cartGroups = buildCartGroups(cart);

  // Remove one unit from a group (last added of that group)
  const decrementGroup = (group) => {
    const lastIdx = group.indices[group.indices.length - 1];
    setCart(cart.filter((_, i) => i !== lastIdx));
  };

  // Increment: add another of the same with same milk
  const incrementGroup = (group) => {
    addToCart({ ...group.item });
    // Note: new item will get standard milk by default for LATTE
    // We need to override to match the group's milk
    if (group.item.category === "latte" && group.item.milk !== "standard") {
      // Need to set milk for the just-added item. We'll do it via state update.
      // Easier approach: build the cart item directly with correct milk.
      // Let's refactor:
    }
  };

  // Better increment: build cart item directly with milk
  const addOneToGroup = (group) => {
    const cartItem = {
      ...group.item,
      cartId: `${group.item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    if (group.item.category === "latte") {
      cartItem.milk = group.item.milk || "standard";
    }
    if (group.item.type === "drink") {
      cartItem.ice = group.item.ice || "standard";
    }
    setCart(prev => [...prev, cartItem]);
  };

  // Change milk for all items in this group
  const setGroupMilk = (group, newMilk) => {
    setCart(cart.map((item, i) =>
      group.indices.includes(i) ? { ...item, milk: newMilk } : item
    ));
  };

  // Change ice mode for all items in this group
  const setGroupIce = (group, newIce) => {
    setCart(cart.map((item, i) =>
      group.indices.includes(i) ? { ...item, ice: newIce } : item
    ));
  };

  // Remove entire group
  const removeGroup = (group) => {
    setCart(cart.filter((_, i) => !group.indices.includes(i)));
  };

  const addCustom = () => {
    const price = parseInt(customPrice);
    const name = customName.trim();
    if (!name || isNaN(price) || price <= 0) return;
    addToCart({
      id: `custom-${Date.now()}`,
      name: name,
      emoji: "🥐",
      price: price,
      type: "extra"
    });
    setCustomName("");
    setCustomPrice("");
    setCustomOpen(false);
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;
    if (!customerNumber.trim()) {
      alert("Zadej číslo zákazníka");
      return;
    }

    const itemsWithDone = cart.map(i => i.type === "drink" ? { ...i, done: false } : i);
    const hasDrinks = cart.some(i => i.type === "drink");
    const now = Date.now();

    const newOrder = {
      number: customerNumber.trim(),
      items: itemsWithDone,
      notes: notes.trim(),
      timestamp: now,
      status: hasDrinks ? "waiting" : "done",
    };
    if (!hasDrinks) newOrder.doneAt = now;

    await saveOrders([...orders, newOrder]);
    setSubmittedFlash({ number: newOrder.number, autoDone: !hasDrinks });
    setTimeout(() => setSubmittedFlash(null), 2000);
    setCart([]);
    setNotes("");
    setCartExpanded(true);
    const nextNum = parseInt(customerNumber);
    setCustomerNumber(isNaN(nextNum) ? "" : String(nextNum + 1));
  };

  const toggleItemDone = async (orderTimestamp, itemIndex) => {
    const newOrders = orders.map(o => {
      if (o.timestamp !== orderTimestamp) return o;
      const newItems = o.items.map((item, i) => {
        if (i !== itemIndex || item.type !== "drink") return item;
        return { ...item, done: !item.done };
      });
      return { ...o, items: newItems };
    });
    await saveOrders(newOrders);
  };

  const resetAll = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
      return;
    }
    await saveOrders([]);
    setResetConfirm(false);
  };

  const manualRefresh = async () => {
    lastWriteRef.current = 0;
    await loadOrders();
  };

  const waitingOrders = orders.filter(o => o.status === "waiting");
  const doneOrders = orders.filter(o => o.status === "done");

  const cartTotal = cart.reduce((sum, item) => {
    let p = item.price;
    if (item.milk === "ovesne" || item.milk === "kokosove") p += 20;
    return sum + p;
  }, 0);

  const itemStats = {};
  orders.forEach(o => o.items.forEach(item => {
    itemStats[item.name] = (itemStats[item.name] || 0) + 1;
  }));
  const topItems = Object.entries(itemStats).sort((a, b) => b[1] - a[1]);

  const ageText = (ts) => {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return "právě teď";
    const min = Math.floor(sec / 60);
    return `${min} min`;
  };

  const syncAgo = () => {
    if (!lastSyncTime) return "nikdy";
    const sec = Math.floor((Date.now() - lastSyncTime) / 1000);
    if (sec < 5) return "teď";
    if (sec < 60) return `před ${sec}s`;
    return `před ${Math.floor(sec / 60)}min`;
  };

  const milkLabel = (m) => {
    if (m === "ovesne") return "OVESNÉ";
    if (m === "kokosove") return "KOKOSOVÉ";
    return null;
  };

  const milkBadgeColor = (m) => {
    if (m === "ovesne") return "bg-amber-500 text-white";
    if (m === "kokosove") return "bg-stone-500 text-white";
    return "";
  };

  const DrinkBtn = ({ item }) => (
    <button
      onClick={() => addToCart(item)}
      className={`${item.bg} ${item.border} border-2 rounded-xl p-3 active:scale-95 transition shadow-sm w-full`}
    >
      <div className="text-3xl mb-1">{item.emoji}</div>
      <div className={`text-xs font-bold ${item.text} leading-tight`}>{item.name}</div>
      <div className="text-xs font-mono mt-1 text-stone-600">{item.price} Kč</div>
    </button>
  );

  const ExtraBtn = ({ item }) => (
    <button
      onClick={() => addToCart(item)}
      className={`${item.bg} ${item.border} border-2 rounded-xl p-2 active:scale-95 transition shadow-sm`}
    >
      <div className="text-2xl mb-1">{item.emoji}</div>
      <div className={`text-xs font-bold ${item.text} leading-tight`}>{item.name}</div>
      <div className="text-xs font-mono mt-1 text-stone-600">{item.price} Kč</div>
    </button>
  );

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header className="bg-stone-900 text-white sticky top-0 z-30 shadow-lg">
        <div className="px-3 py-2 flex items-center justify-between border-b border-stone-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍵</span>
            <span className="font-bold text-sm">NIPPAN POS</span>
          </div>
          <div className="text-xs font-mono opacity-75 flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${FIREBASE_URL ? 'bg-green-600 text-white' : 'bg-amber-600 text-white'}`}>
              {FIREBASE_URL ? 'FB' : 'LOCAL'}
            </span>
            <span>{synced ? "● " + syncAgo() : "○ čekám"}</span>
            <span>·</span>
            <span>#{waitingOrders.length} fronta</span>
          </div>
        </div>
        <div className="flex">
          <button
            onClick={() => setView("kasa")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition ${view === "kasa" ? "bg-red-700 text-white" : "bg-stone-800 text-stone-400"}`}
          >
            KASA
          </button>
          <button
            onClick={() => setView("barista")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition relative ${view === "barista" ? "bg-green-700 text-white" : "bg-stone-800 text-stone-400"}`}
          >
            BARISTA
            {waitingOrders.length > 0 && view !== "barista" && (
              <span className="absolute top-1 right-3 bg-yellow-400 text-stone-900 rounded-full px-2 py-0.5 text-xs font-mono font-bold animate-pulse">
                {waitingOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setView("stats")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition ${view === "stats" ? "bg-amber-600 text-white" : "bg-stone-800 text-stone-400"}`}
          >
            STATS
          </button>
        </div>
      </header>

      {storageError && (
        <div className="bg-red-600 text-white text-xs font-bold px-3 py-2 text-center">
          ⚠️ {storageError}
        </div>
      )}

      {submittedFlash && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-40 px-6 py-3 rounded-full shadow-2xl font-bold text-lg animate-pulse text-white ${submittedFlash.autoDone ? "bg-emerald-600" : "bg-green-600"}`}>
          {submittedFlash.autoDone ? `✓ Hotovo: #${submittedFlash.number}` : `✓ Odesláno: #${submittedFlash.number}`}
        </div>
      )}

      {view === "kasa" && (
        <>
          <div className="p-3" style={{ paddingBottom: cart.length > 0 ? (cartExpanded ? '32rem' : '8rem') : '5rem' }}>
            <div className="flex gap-2 mb-3">
              <div className="bg-white rounded-xl shadow border-2 border-stone-900 p-2 flex items-center gap-2 flex-shrink-0">
                <span className="text-xs uppercase font-bold tracking-wider text-stone-600 whitespace-nowrap pl-1">Zákazník č.:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="3"
                  value={customerNumber}
                  onChange={(e) => setCustomerNumber(e.target.value)}
                  className="w-14 text-xl font-bold font-mono px-2 py-1 border-2 border-stone-200 rounded text-center focus:border-stone-900 outline-none"
                  placeholder="47"
                />
              </div>
              <div className="bg-white rounded-xl shadow border-2 border-emerald-600 p-2 flex-1 flex items-center justify-center min-w-0">
                <div className="text-center">
                  <div className="text-xs uppercase font-bold tracking-wider text-emerald-700">Cena</div>
                  <div className="text-xl font-bold font-mono text-emerald-800">{cartTotal} Kč</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="space-y-2">
                <div className="text-xs uppercase font-bold tracking-wider text-white text-center bg-green-700 py-1.5 rounded-lg">LIMO</div>
                {limos.map(item => <DrinkBtn key={item.id} item={item} />)}
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase font-bold tracking-wider text-white text-center bg-orange-600 py-1.5 rounded-lg">LATTE</div>
                {lattes.map(item => <DrinkBtn key={item.id} item={item} />)}
              </div>
            </div>

            <div className="text-xs uppercase font-bold tracking-wider text-stone-500 mb-2">Pečivo</div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {pastry.map(item => <ExtraBtn key={item.id} item={item} />)}
              <button
                onClick={() => setCustomOpen(!customOpen)}
                className="bg-white border-2 border-dashed border-stone-400 rounded-xl p-2 active:scale-95 transition"
              >
                <div className="text-2xl mb-1">➕</div>
                <div className="text-xs font-bold text-stone-700 leading-tight">Vlastní pečivo</div>
                <div className="text-xs font-mono mt-1 text-stone-400">zadat cenu</div>
              </button>
            </div>

            {customOpen && (
              <div className="bg-white border-2 border-stone-400 rounded-xl p-3 mb-4">
                <div className="text-xs uppercase font-bold tracking-wider text-stone-500 mb-2">Přidat vlastní položku</div>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Název (např. Taiyaki)"
                  className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm mb-2 focus:border-stone-900 outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="Cena Kč"
                    className="flex-1 px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:border-stone-900 outline-none"
                  />
                  <button
                    onClick={addCustom}
                    disabled={!customName.trim() || !customPrice || parseInt(customPrice) <= 0}
                    className="px-4 py-2 bg-stone-900 text-white rounded-lg font-bold text-sm disabled:bg-stone-300"
                  >
                    Přidat
                  </button>
                  <button
                    onClick={() => { setCustomOpen(false); setCustomName(""); setCustomPrice(""); }}
                    className="px-3 py-2 bg-stone-100 text-stone-600 rounded-lg text-sm"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className="text-xs uppercase font-bold tracking-wider text-stone-500 mb-2 mt-3">Merchant</div>
            <div className="grid grid-cols-3 gap-2">
              {merchant.map(item => <ExtraBtn key={item.id} item={item} />)}
            </div>
          </div>

          {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t-4 border-red-700 shadow-2xl">
              {/* Compact bar — always visible */}
              <button
                onClick={() => setCartExpanded(!cartExpanded)}
                className="w-full px-3 py-2 flex items-center justify-between bg-stone-50 border-b border-stone-200 active:bg-stone-100"
              >
                <span className="flex items-center gap-2">
                  <span className="text-stone-400 text-xs font-bold">{cartExpanded ? "▼" : "▲"}</span>
                  <span className="text-xs uppercase font-bold tracking-wider text-stone-600">
                    Košík · #{customerNumber || "?"} · {cart.length} ks
                  </span>
                </span>
                <span className="text-base font-bold font-mono text-emerald-700">{cartTotal} Kč</span>
              </button>

              {/* Expanded content */}
              {cartExpanded && (
                <div className="p-3 max-h-[55vh] overflow-y-auto">
                  {!cart.some(i => i.type === "drink") && (
                    <div className="bg-emerald-50 border-l-4 border-emerald-500 px-3 py-2 mb-2 text-xs text-emerald-800">
                      ℹ️ Bez nápojů → po odeslání jde rovnou do Hotových (nečeká na baristu)
                    </div>
                  )}
                  <div className="space-y-2 max-h-[28vh] overflow-y-auto mb-2">
                    {cartGroups.map((group) => {
                      const item = group.item;
                      const unitPrice = item.price + (item.milk === "ovesne" || item.milk === "kokosove" ? 20 : 0);
                      const groupTotal = unitPrice * group.count;
                      return (
                        <div key={group.key} className="bg-stone-50 rounded-lg p-2">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-sm flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-lg flex-shrink-0">{item.emoji}</span>
                              <span className="truncate font-medium">{item.name}</span>
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => decrementGroup(group)}
                                className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 font-bold text-base active:bg-stone-300 flex items-center justify-center"
                              >
                                −
                              </button>
                              <span className="text-sm font-bold font-mono w-8 text-center">{group.count}×</span>
                              <button
                                onClick={() => addOneToGroup(group)}
                                className="w-7 h-7 rounded-full bg-stone-900 text-white font-bold text-base active:bg-stone-700 flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-xs font-mono text-stone-600 w-16 text-right flex-shrink-0">{groupTotal} Kč</span>
                            <button onClick={() => removeGroup(group)} className="text-red-600 text-xl font-bold w-7 h-7 rounded-full hover:bg-red-50 flex-shrink-0">×</button>
                          </div>
                          {item.type === "drink" && (
                            <div className="mt-2 space-y-2 pt-2 border-t border-stone-200">
                              {item.category === "latte" && (
                                <div>
                                  <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Mléko:</div>
                                  <div className="grid grid-cols-3 gap-1">
                                    <button
                                      onClick={() => setGroupMilk(group, "standard")}
                                      className={`py-2 rounded text-xs font-bold border transition ${item.milk === "standard" ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-300 text-stone-600"}`}
                                    >
                                      Std
                                    </button>
                                    <button
                                      onClick={() => setGroupMilk(group, "ovesne")}
                                      className={`py-2 rounded text-xs font-bold border transition ${item.milk === "ovesne" ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-stone-300 text-stone-600"}`}
                                    >
                                      Oves +20
                                    </button>
                                    <button
                                      onClick={() => setGroupMilk(group, "kokosove")}
                                      className={`py-2 rounded text-xs font-bold border transition ${item.milk === "kokosove" ? "bg-stone-500 border-stone-500 text-white" : "bg-white border-stone-300 text-stone-600"}`}
                                    >
                                      Kok +20
                                    </button>
                                  </div>
                                </div>
                              )}
                              <div>
                                <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Led:</div>
                                <div className="grid grid-cols-3 gap-1">
                                  <button
                                    onClick={() => setGroupIce(group, "standard")}
                                    className={`py-2 rounded text-xs font-bold border transition ${(item.ice || "standard") === "standard" ? "bg-sky-700 border-sky-700 text-white" : "bg-white border-stone-300 text-stone-600"}`}
                                  >
                                    🧊 Std
                                  </button>
                                  <button
                                    onClick={() => setGroupIce(group, "less")}
                                    className={`py-2 rounded text-xs font-bold border transition ${item.ice === "less" ? "bg-sky-400 border-sky-400 text-white" : "bg-white border-stone-300 text-stone-600"}`}
                                  >
                                    🧊 Málo
                                  </button>
                                  <button
                                    onClick={() => setGroupIce(group, "none")}
                                    className={`py-2 rounded text-xs font-bold border transition ${item.ice === "none" ? "bg-red-600 border-red-600 text-white" : "bg-white border-stone-300 text-stone-600"}`}
                                  >
                                    🚫 Bez
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Další poznámka (volitelné)..."
                    className="w-full mb-2 px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:border-red-600 outline-none"
                  />
                </div>
              )}

              {/* Submit button — always visible */}
              <div className="p-3 pt-2 bg-white">
                <button
                  onClick={submitOrder}
                  disabled={!customerNumber.trim()}
                  className="w-full bg-red-700 text-white py-4 rounded-xl font-bold text-lg active:bg-red-800 active:scale-95 transition shadow-lg disabled:bg-stone-300 disabled:cursor-not-allowed"
                >
                  ODESLAT #{customerNumber || "?"} · {cartTotal} Kč →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {view === "barista" && (
        <div className="p-3">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs text-stone-500 font-mono">
              Poslední sync: {syncAgo()}
            </div>
            <button
              onClick={manualRefresh}
              className="text-xs px-3 py-1.5 bg-stone-200 text-stone-700 rounded-full font-bold hover:bg-stone-300"
            >
              ↻ Obnovit
            </button>
          </div>

          {waitingOrders.length === 0 ? (
            <div className="text-center py-20 text-stone-400">
              <div className="text-7xl mb-4">🍵</div>
              <div className="text-xl font-bold mb-2">Žádné objednávky</div>
              <div className="text-sm">Čekáme na zákazníky...</div>
            </div>
          ) : (
            <div className="space-y-3">
              {waitingOrders.map((order, idx) => {
                const ageSec = Math.floor((Date.now() - order.timestamp) / 1000);
                const isOld = ageSec > 180;
                const isVeryOld = ageSec > 300;
                const orderDrinks = order.items.filter(i => i.type === "drink");
                const orderExtras = order.items.filter(i => i.type === "extra");
                const drinksDone = orderDrinks.filter(d => d.done).length;
                const allDrinksDone = orderDrinks.length > 0 && drinksDone === orderDrinks.length;
                const cardKey = `${order.number}-${order.timestamp}`;

                // Group extras for barista display (compact)
                const extraGroups = {};
                orderExtras.forEach(e => {
                  const k = e.name;
                  if (extraGroups[k]) extraGroups[k].count += 1;
                  else extraGroups[k] = { ...e, count: 1 };
                });

                return (
                  <div
                    key={cardKey}
                    className={`bg-white rounded-xl shadow-lg p-4 border-l-8 transition ${
                      allDrinksDone ? "border-green-500 opacity-70" :
                      idx === 0 ? "border-green-600" : isVeryOld ? "border-red-600" : isOld ? "border-orange-500" : "border-stone-400"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-stone-400 font-bold">Zákazník</div>
                        <div className="text-5xl font-bold font-mono text-stone-900 leading-none">
                          #{order.number}
                        </div>
                        <div className={`text-xs mt-2 font-medium ${isVeryOld ? "text-red-600 font-bold" : isOld ? "text-orange-600" : "text-stone-500"}`}>
                          {ageText(order.timestamp)}
                          {isVeryOld && " · ⚠️ POZOR!"}
                        </div>
                      </div>
                      {idx === 0 && !allDrinksDone && (
                        <div className="text-xs font-bold uppercase tracking-wider bg-green-600 text-white px-3 py-1 rounded-full">
                          DALŠÍ
                        </div>
                      )}
                      {allDrinksDone && (
                        <div className="text-xs font-bold uppercase tracking-wider bg-green-600 text-white px-3 py-1 rounded-full animate-pulse">
                          ✓ HOTOVO
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mb-3">
                      {order.items.map((item, i) => {
                        if (item.type !== "drink") return null;
                        const drink = drinks.find(d => d.id === item.id);
                        const recipeKey = `${cardKey}-${i}`;
                        const isDone = item.done;
                        const milkBadge = milkLabel(item.milk);
                        return (
                          <div key={i}>
                            <div className={`flex items-center gap-2 rounded-lg overflow-hidden ${isDone ? "bg-green-100" : "bg-stone-50"}`}>
                              <button
                                onClick={() => toggleItemDone(order.timestamp, i)}
                                className={`flex-1 flex items-center gap-3 px-3 py-3 active:bg-stone-200 transition ${isDone ? "opacity-60" : ""}`}
                              >
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${isDone ? "bg-green-600 text-white" : "bg-white border-2 border-stone-400 text-stone-400"}`}>
                                  {isDone ? "✓" : ""}
                                </span>
                                <span className="text-3xl">{item.emoji}</span>
                                <div className={`flex-1 text-left ${isDone ? "line-through" : ""}`}>
                                  <div className="font-bold text-base leading-tight">{item.name}</div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {milkBadge && (
                                      <div className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${milkBadgeColor(item.milk)}`}>
                                        🥛 {milkBadge}
                                      </div>
                                    )}
                                    {item.ice === "less" && (
                                      <div className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-sky-500 text-white">
                                        🧊 MÁLO LEDU
                                      </div>
                                    )}
                                    {item.ice === "none" && (
                                      <div className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-red-600 text-white">
                                        🚫 BEZ LEDU
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                              <button
                                onClick={() => setRecipeOpen(recipeOpen === recipeKey ? null : recipeKey)}
                                className="text-xs text-stone-400 px-3 py-3 hover:bg-stone-200 active:bg-stone-300"
                              >
                                {recipeOpen === recipeKey ? "▼" : "▶"} recept
                              </button>
                            </div>
                            {drink && recipeOpen === recipeKey && (
                              <div className="mt-1 px-3 py-2 bg-emerald-50 border-l-4 border-emerald-500 rounded-r text-xs leading-relaxed">
                                <ol className="list-decimal list-inside space-y-1">
                                  {drink.recipe.map((step, j) => <li key={j}>{step}</li>)}
                                </ol>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {orderDrinks.length > 1 && (
                        <div className="text-xs text-stone-400 text-right">
                          {drinksDone}/{orderDrinks.length} hotovo
                        </div>
                      )}
                    </div>

                    {order.notes && (
                      <div className="bg-yellow-100 border-l-4 border-yellow-600 px-3 py-2 mb-3 text-sm font-medium">
                        📝 {order.notes}
                      </div>
                    )}

                    {Object.keys(extraGroups).length > 0 && (
                      <div className="border-t border-stone-200 pt-2 mb-3">
                        <div className="text-xs text-stone-400 mb-1">K nápojům přidat (finisher):</div>
                        <div className="text-xs text-stone-500">
                          {Object.values(extraGroups).map((e, i) => (
                            <span key={i}>{i > 0 && " · "}<span>{e.emoji} {e.name}{e.count > 1 ? ` ×${e.count}` : ""}</span></span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === "stats" && (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs uppercase font-bold tracking-wider text-stone-500 mb-1">Čeká</div>
              <div className="text-4xl font-bold font-mono text-red-700">{waitingOrders.length}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs uppercase font-bold tracking-wider text-stone-500 mb-1">Hotovo</div>
              <div className="text-4xl font-bold font-mono text-green-700">{doneOrders.length}</div>
            </div>
          </div>

          {topItems.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-xs uppercase font-bold tracking-wider text-stone-500 mb-3">Nejprodávanější položky</div>
              {topItems.map(([name, count]) => {
                const max = topItems[0][1];
                const pct = (count / max) * 100;
                return (
                  <div key={name} className="mb-2 last:mb-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{name}</span>
                      <span className="font-mono font-bold">{count}×</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {doneOrders.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-xs uppercase font-bold tracking-wider text-stone-500 mb-2">
                Posledních {Math.min(10, doneOrders.length)} hotových
              </div>
              <div className="space-y-1">
                {doneOrders.slice(-10).reverse().map((order, idx) => (
                  <div key={`${order.number}-${order.timestamp}-${idx}`} className="flex justify-between items-center py-1.5 text-sm border-b last:border-0 border-stone-100">
                    <span className="font-mono font-bold text-stone-700">#{order.number}</span>
                    <span className="flex-1 mx-3 text-stone-600">{order.items.map(i => i.emoji).join(" ")}</span>
                    <span className="text-xs text-stone-400 font-mono">
                      {new Date(order.doneAt || order.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={resetAll}
            className={`w-full py-3 rounded-xl text-sm font-bold transition ${resetConfirm ? "bg-red-700 text-white" : "bg-stone-200 text-stone-700"}`}
          >
            {resetConfirm ? "⚠️ KLIK ZNOVU PRO POTVRZENÍ" : "Vymazat všechny objednávky"}
          </button>
        </div>
      )}
    </div>
  );
}
