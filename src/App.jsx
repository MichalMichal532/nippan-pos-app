import { useState, useEffect, useRef } from "react";

// ===========================================================================
// NIPPAN POS v14 — TANABATA 2026 EDITION
// ===========================================================================
// ⚠️ KROK 1 (POVINNÝ): Vlož svoji Firebase URL na řádek níže.
//    Bez ní NEFUNGUJE sdílená číselná řada zákazníků mezi zařízeními!
// ===========================================================================
const FIREBASE_URL = "https://nippan-pos-13a13-default-rtdb.europe-west1.firebasedatabase.app/"; // <-- SEM VLOŽ Firebase URL (bez lomítka na konci!)

// Číselná řada zákazníků: 1 .. MAX_CUSTOMER, pak zase od 1
const MAX_CUSTOMER = 200;

// PIN pro záložku STATS
const STATS_PIN = "1173";

// Unikátní ID tohoto zařízení (pro bezpečné přidělování čísel)
const DEVICE_ID = Math.random().toString(36).slice(2, 10);

export default function App() {
  const [view, setView] = useState("kasa");
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notes, setNotes] = useState("");
  const [customerNumber, setCustomerNumber] = useState(null);
  const [reserving, setReserving] = useState(false);
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
  const [statsUnlocked, setStatsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const prevWaitingCount = useRef(0);
  const prevGelatoCount = useRef(0);
  const audioCtxRef = useRef(null);
  const lastWriteRef = useRef(0);
  const completionTimerRef = useRef({});
  const reservingRef = useRef(false);

  // =========================================================================
  // MENU — TANABATA 2026
  // =========================================================================

  const limos = [
    { id: "yuzu", name: "Yuzu Matcha Lemonade", emoji: "🍋", price: 129, type: "drink", category: "limo", bg: "bg-green-50", border: "border-green-500", text: "text-green-900",
      recipe: ["Kelímek s ledem (120 g)", "50 ml matcha premix", "50 ml yuzu báze — LAHEV PROTŘEPAT!", "Doplnit sodou (~180 ml)", "Promíchat lžící, NEzatřepat!", "Brčko"] },
    { id: "bezinka", name: "Bezinka Matcha Lemonade", emoji: "🌸", price: 129, type: "drink", category: "limo", bg: "bg-green-50", border: "border-green-500", text: "text-green-900",
      recipe: ["Kelímek s ledem (80 g — MÉNĚ!)", "50 ml matcha premix", "35 ml bezinkový sirup", "Doplnit sodou (~180 ml)", "Dozdobit 2 lístky máty", "Brčko + víčko"] },
    { id: "fizz", name: "Lime Matcha Fizz", emoji: "🌅", price: 119, type: "drink", category: "limo", bg: "bg-green-50", border: "border-green-500", text: "text-green-900",
      recipe: ["Kelímek s ledem (do 3/4)", "35 ml Monin Lime Juice (3-4 pumpy)", "15 ml cukrový sirup", "Doplnit sodou (~230 ml)", "Promíchat — JEN SPODEK", "50 ml matcha premix POMALU shora přes lžíci", "Dozdobit plátkem limetky", "Brčko + víčko — NEMÍCHAT!"] },
  ];

  const lattes = [
    { id: "strawberry", name: "Strawberry Matcha Latte", emoji: "🍓", price: 139, type: "drink", category: "latte", bg: "bg-orange-50", border: "border-orange-500", text: "text-orange-900",
      recipe: ["Kelímek s ledem (120 g)", "35 ml jahodového pyré (dno)", "200 ml mléko (dle volby)", "50 ml matcha premix (shora)", "Brčko + víčko"] },
    { id: "mango", name: "Mango Matcha Latte", emoji: "🥭", price: 139, type: "drink", category: "latte", bg: "bg-orange-50", border: "border-orange-500", text: "text-orange-900",
      recipe: ["Kelímek s ledem (120 g)", "35 ml mangového pyré (dno)", "200 ml mléko (dle volby)", "50 ml matcha premix (shora)", "Víčko, krátké zatřepání", "Brčko + víčko"] },
    { id: "classic", name: "Iced Matcha Latte", emoji: "🍵", price: 119, type: "drink", category: "latte", bg: "bg-orange-50", border: "border-orange-500", text: "text-orange-900",
      recipe: ["Kelímek s ledem (120 g)", "50 ml matcha premix", "200 ml mléko (dle volby)", "NA DOTAZ: 15 ml cukrový sirup (1 pump)", "Brčko + víčko"] },
  ];

  const coffees = [
    { id: "espresso", name: "Espresso", emoji: "☕", price: 70, type: "drink", category: "coffee", bg: "bg-stone-100", border: "border-stone-600", text: "text-stone-900",
      recipe: ["18 g mletá káva, tamper", "Extrakce 25–30 s → ~36 ml", "Malý kelímek"] },
    { id: "cappuccino", name: "Cappuccino", emoji: "☕", price: 90, type: "drink", category: "coffee", bg: "bg-stone-100", border: "border-stone-600", text: "text-stone-900",
      recipe: ["Espresso 36 ml", "~120 ml napěněné mléko (hustá pěna)", "Kelímek 250 ml + víčko"] },
    { id: "cafe-latte", name: "Latte", emoji: "🥛", price: 100, type: "drink", category: "coffee", bg: "bg-stone-100", border: "border-stone-600", text: "text-stone-900",
      recipe: ["Espresso 36 ml", "~200 ml mléko, jemná mikropěna", "Kelímek 300 ml + víčko"] },
    { id: "flatwhite", name: "Flat White", emoji: "☕", price: 110, type: "drink", category: "coffee", bg: "bg-stone-100", border: "border-stone-600", text: "text-stone-900",
      recipe: ["Dvojité espresso 2× 36 ml", "~120 ml mléko, tenká mikropěna", "Kelímek 250 ml"] },
    { id: "iced-cappuccino", name: "Iced Cappuccino", emoji: "🧊", price: 90, type: "drink", category: "coffee", bg: "bg-stone-100", border: "border-stone-600", text: "text-stone-900",
      recipe: ["Kelímek s ledem (100 g)", "Espresso 36 ml", "~120 ml studené mléko", "Lehce napěnit, víčko + brčko"] },
    { id: "iced-latte", name: "Iced Latte", emoji: "🧊", price: 100, type: "drink", category: "coffee", bg: "bg-stone-100", border: "border-stone-600", text: "text-stone-900",
      recipe: ["Kelímek s ledem (120 g)", "Espresso 36 ml", "~200 ml studené mléko", "Víčko + brčko"] },
  ];

  const drinks = [...limos, ...lattes, ...coffees];

  // ---- GELATO (Angelato × NIPPAN TEA) -------------------------------------
  const GELATO_FLAVORS = [
    { id: "matcha", name: "Matcha", emoji: "🍵" },
    { id: "hojicha", name: "Hojicha", emoji: "🌰" },
    { id: "ryze", name: "Rýže", emoji: "🍚" },
    { id: "vanilka", name: "Vanilka", emoji: "🍦" },
    { id: "jahoda", name: "Jahoda", emoji: "🍓" },
    { id: "mango", name: "Mango", emoji: "🥭" },
  ];

  const gelato = [
    { id: "gelato1", name: "Gelato 1 porce", emoji: "🍦", price: 89, type: "gelato", scoops: 1, bg: "bg-fuchsia-50", border: "border-fuchsia-500", text: "text-fuchsia-900" },
    { id: "gelato2", name: "Gelato 2 porce", emoji: "🍨", price: 129, type: "gelato", scoops: 2, bg: "bg-fuchsia-50", border: "border-fuchsia-500", text: "text-fuchsia-900" },
  ];

  // ---- PEČIVO -------------------------------------------------------------
  const pastrySweet = [
    { id: "sorairo-melon", name: "SORAIRO Melon Pan", emoji: "💙", price: 70, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "nippan-melon", name: "NIPPAN Melon Pan", emoji: "🍈", price: 70, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "matcha-melon", name: "Matcha Melon Pan", emoji: "🍵", price: 80, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "matcha-twister", name: "Matcha Twister", emoji: "🥨", price: 70, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "anpan", name: "Anpan", emoji: "🥯", price: 70, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "kuma-pan", name: "Kuma Pan (čoko)", emoji: "🐻", price: 80, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "muffin", name: "Jogurtový muffin", emoji: "🧁", price: 60, type: "extra", bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    { id: "piknik-box", name: "Tanabata Piknik Box", emoji: "🎋", price: 130, type: "extra", bg: "bg-pink-50", border: "border-pink-500", text: "text-pink-900" },
  ];

  const pastrySavory = [
    { id: "korokke-pan", name: "Korokke Pan", emoji: "🍔", price: 120, type: "extra", bg: "bg-lime-50", border: "border-lime-600", text: "text-lime-900" },
    { id: "karaage-pan", name: "Karaage Pan", emoji: "🍗", price: 120, type: "extra", bg: "bg-lime-50", border: "border-lime-600", text: "text-lime-900" },
    { id: "edamame-pan", name: "Edamame Pan", emoji: "🫛", price: 70, type: "extra", bg: "bg-lime-50", border: "border-lime-600", text: "text-lime-900" },
    { id: "toast-sunka", name: "Toast šunka", emoji: "🥪", price: 120, type: "extra", bg: "bg-lime-50", border: "border-lime-600", text: "text-lime-900" },
    { id: "toast-avokado", name: "Toast avokádo", emoji: "🥑", price: 120, type: "extra", bg: "bg-lime-50", border: "border-lime-600", text: "text-lime-900" },
    { id: "toast-houby", name: "Toast houby", emoji: "🍄", price: 120, type: "extra", bg: "bg-lime-50", border: "border-lime-600", text: "text-lime-900" },
    { id: "toast-losos", name: "Toast losos+avokádo", emoji: "🐟", price: 130, type: "extra", bg: "bg-lime-50", border: "border-lime-600", text: "text-lime-900" },
    { id: "toast-surimi", name: "Toast surimi", emoji: "🦀", price: 140, type: "extra", bg: "bg-lime-50", border: "border-lime-600", text: "text-lime-900" },
  ];

  const merchant = [
    { id: "seicha", name: "Seicha Lemonade", emoji: "🍃", price: 80, type: "extra", bg: "bg-emerald-50", border: "border-emerald-500", text: "text-emerald-900" },
    { id: "moya-yuzu", name: "YUZU MOYA Lemonade", emoji: "🥫", price: 80, type: "extra", bg: "bg-cyan-50", border: "border-cyan-500", text: "text-cyan-900" },
    { id: "snack100", name: "Jap. snack 100", emoji: "🍡", price: 100, type: "extra", bg: "bg-rose-50", border: "border-rose-400", text: "text-rose-900" },
    { id: "snack110", name: "Jap. snack 110", emoji: "🍘", price: 110, type: "extra", bg: "bg-rose-50", border: "border-rose-400", text: "text-rose-900" },
  ];

  // =========================================================================
  // AUDIO
  // =========================================================================
  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }, []);

  const playBeep = (freq = 880) => {
    if (!audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  // =========================================================================
  // SDÍLENÁ ČÍSELNÁ ŘADA ZÁKAZNÍKŮ (1..200, pak zase od 1)
  // Používá Firebase ETag compare-and-swap → dvě kasy nikdy nedostanou
  // stejné číslo.
  // =========================================================================
  const reserveNumber = async () => {
    if (reservingRef.current) return null;
    reservingRef.current = true;
    setReserving(true);
    try {
      // --- Fallback bez Firebase: lokální čítač (POZOR: nesdílí se!) -------
      if (!FIREBASE_URL) {
        const cur = parseInt(localStorage.getItem("nippan:counter") || "0", 10) || 0;
        const next = (cur % MAX_CUSTOMER) + 1;
        localStorage.setItem("nippan:counter", String(next));
        setCustomerNumber(next);
        return next;
      }

      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          const res = await fetch(`${FIREBASE_URL}/nippan_counter.json`, {
            headers: { "X-Firebase-ETag": "true" },
          });
          const etag = res.headers.get("ETag");
          const data = await res.json();
          const curNum = data && typeof data.n === "number" ? data.n : 0;
          const next = (curNum % MAX_CUSTOMER) + 1;
          const payload = { n: next, by: DEVICE_ID, at: Date.now() };

          const headers = { "Content-Type": "application/json" };
          if (etag) headers["if-match"] = etag;

          const put = await fetch(`${FIREBASE_URL}/nippan_counter.json`, {
            method: "PUT",
            headers,
            body: JSON.stringify(payload),
          });

          if (put.ok && etag) {
            setCustomerNumber(next);
            setStorageError(null);
            return next;
          }

          if (put.ok && !etag) {
            // ETag nedostupný → ověř, že nás nikdo nepřebil
            await new Promise(r => setTimeout(r, 180));
            const check = await fetch(`${FIREBASE_URL}/nippan_counter.json`);
            const cd = await check.json();
            if (cd && cd.by === DEVICE_ID && cd.n === next) {
              setCustomerNumber(next);
              setStorageError(null);
              return next;
            }
          }
          // konflikt → krátká náhodná pauza a zkusit znovu
          await new Promise(r => setTimeout(r, 60 + Math.random() * 160));
        } catch (e) {
          await new Promise(r => setTimeout(r, 120));
        }
      }
      setStorageError("Nepodařilo se přidělit číslo — zkus ↻ vedle čísla");
      return null;
    } finally {
      reservingRef.current = false;
      setReserving(false);
    }
  };

  // =========================================================================
  // SYNC OBJEDNÁVEK
  // =========================================================================
  const loadOrders = async () => {
    if (FIREBASE_URL) {
      try {
        const response = await fetch(`${FIREBASE_URL}/nippan_orders.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
        setSynced(true);
        setLastSyncTime(Date.now());
        setStorageError(null);
      } catch (e) {
        setStorageError("Firebase chyba: " + (e.message || "neznámá"));
        setSynced(true);
        setLastSyncTime(Date.now());
      }
    } else {
      try {
        const result = localStorage.getItem("nippan:orders");
        setOrders(result ? JSON.parse(result) : []);
        setSynced(true);
        setLastSyncTime(Date.now());
        setStorageError("⚠️ FIREBASE_URL není nastaveno — BEZ sync mezi zařízeními!");
      } catch (e) {
        setSynced(true);
        setLastSyncTime(Date.now());
      }
    }
  };

  const saveOrders = async (newOrders) => {
    lastWriteRef.current = Date.now();
    setOrders(newOrders);
    if (FIREBASE_URL) {
      try {
        const response = await fetch(`${FIREBASE_URL}/nippan_orders.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newOrders),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setStorageError(null);
      } catch (e) {
        setStorageError("Firebase chyba: " + (e.message || "neznámá"));
      }
    } else {
      try {
        localStorage.setItem("nippan:orders", JSON.stringify(newOrders));
      } catch (e) {
        setStorageError("Chyba ukládání: " + (e.message || "neznámá"));
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      if (Date.now() - lastWriteRef.current < 1500) return;
      await loadOrders();
    };
    load();
    const interval = setInterval(load, 1000);
    return () => clearInterval(interval);
  }, []);

  // Zvuk při nové objednávce (barista / gelato)
  useEffect(() => {
    const waiting = orders.filter(o => o.status === "waiting");
    const baristaCount = waiting.filter(o => o.items.some(i => i.type === "drink" && !i.done)).length;
    const gelatoCount = waiting.filter(o => o.items.some(i => i.type === "gelato" && !i.done)).length;
    if (view === "barista" && baristaCount > prevWaitingCount.current && prevWaitingCount.current > 0) playBeep(880);
    if (view === "gelato" && gelatoCount > prevGelatoCount.current && prevGelatoCount.current > 0) playBeep(660);
    prevWaitingCount.current = baristaCount;
    prevGelatoCount.current = gelatoCount;
  }, [orders, view]);

  // Auto-complete: když jsou hotové VŠECHNY drinky i gelato
  useEffect(() => {
    orders.forEach(o => {
      if (o.status !== "waiting") return;
      const made = o.items.filter(i => i.type === "drink" || i.type === "gelato");
      if (made.length === 0) return;
      const allDone = made.every(d => d.done);
      if (allDone && !completionTimerRef.current[o.timestamp]) {
        completionTimerRef.current[o.timestamp] = setTimeout(() => {
          setOrders(currentOrders => {
            const updated = currentOrders.map(co =>
              co.timestamp === o.timestamp ? { ...co, status: "done", doneAt: Date.now() } : co
            );
            lastWriteRef.current = Date.now();
            if (FIREBASE_URL) {
              fetch(`${FIREBASE_URL}/nippan_orders.json`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updated),
              }).catch(() => {});
            } else {
              try { localStorage.setItem("nippan:orders", JSON.stringify(updated)); } catch (e) {}
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

  // =========================================================================
  // KOŠÍK
  // =========================================================================
  const addToCart = (item) => {
    const cartItem = { ...item, cartId: `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` };
    if (item.category === "latte" || item.category === "coffee") cartItem.milk = "standard";
    if (item.category === "coffee") cartItem.shot = 0;
    if (item.type === "drink") cartItem.ice = "standard";
    if (item.type === "gelato") cartItem.flavors = [];
    if (cart.length === 0) {
      setCartExpanded(true);
      if (customerNumber === null) reserveNumber();
    }
    setCart([...cart, cartItem]);
  };

  const buildCartGroups = (cartArray) => {
    const groups = [];
    cartArray.forEach((item, originalIdx) => {
      const milkKey = (item.category === "latte" || item.category === "coffee") ? item.milk : "";
      const shotKey = item.category === "coffee" ? String(item.shot || 0) : "";
      const iceKey = item.type === "drink" ? (item.ice || "standard") : "";
      const flavKey = item.type === "gelato" ? (item.flavors || []).join("+") : "";
      const groupKey = `${item.id}|${milkKey}|${shotKey}|${iceKey}|${flavKey}`;
      const existing = groups.find(g => g.key === groupKey);
      if (existing) {
        existing.count += 1;
        existing.indices.push(originalIdx);
      } else {
        groups.push({ key: groupKey, item, count: 1, indices: [originalIdx] });
      }
    });
    return groups;
  };

  const cartGroups = buildCartGroups(cart);

  const unitPriceOf = (item) => {
    let p = item.price;
    if (item.milk === "ovesne" || item.milk === "kokosove") p += 20;
    if (item.shot) p += 30 * item.shot;
    return p;
  };

  const decrementGroup = (group) => {
    const lastIdx = group.indices[group.indices.length - 1];
    setCart(cart.filter((_, i) => i !== lastIdx));
  };

  const addOneToGroup = (group) => {
    const cartItem = {
      ...group.item,
      cartId: `${group.item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    if (group.item.category === "latte" || group.item.category === "coffee") cartItem.milk = group.item.milk || "standard";
    if (group.item.category === "coffee") cartItem.shot = group.item.shot || 0;
    if (group.item.type === "drink") cartItem.ice = group.item.ice || "standard";
    if (group.item.type === "gelato") cartItem.flavors = [...(group.item.flavors || [])];
    setCart(prev => [...prev, cartItem]);
  };

  const setGroupField = (group, field, value) => {
    setCart(cart.map((item, i) => group.indices.includes(i) ? { ...item, [field]: value } : item));
  };

  const toggleGroupFlavor = (group, flavorId) => {
    const cur = group.item.flavors || [];
    let next;
    if (cur.includes(flavorId)) next = cur.filter(f => f !== flavorId);
    else if (cur.length >= 2) return; // max 2 příchutě
    else next = [...cur, flavorId];
    setGroupField(group, "flavors", next);
  };

  const removeGroup = (group) => {
    setCart(cart.filter((_, i) => !group.indices.includes(i)));
  };

  const addCustom = () => {
    const price = parseInt(customPrice, 10);
    const name = customName.trim();
    if (!name || !price || price < 0) return;
    addToCart({ id: `custom-${Date.now()}`, name, emoji: "🏷️", price, type: "extra", bg: "bg-stone-100", border: "border-stone-400", text: "text-stone-800" });
    setCustomName("");
    setCustomPrice("");
    setCustomOpen(false);
  };

  const cartTotal = cart.reduce((sum, item) => sum + unitPriceOf(item), 0);

  // Gelato bez vybrané příchutě = blokace odeslání
  const gelatoMissingFlavor = cart.some(i => i.type === "gelato" && (!i.flavors || i.flavors.length === 0));

  const submitOrder = async () => {
    if (!customerNumber || cart.length === 0 || gelatoMissingFlavor) return;
    const itemsWithDone = cart.map(i =>
      (i.type === "drink" || i.type === "gelato") ? { ...i, done: false } : i
    );
    const needsMaking = cart.some(i => i.type === "drink" || i.type === "gelato");
    const now = Date.now();

    const newOrder = {
      number: String(customerNumber),
      items: itemsWithDone,
      notes: notes.trim(),
      timestamp: now,
      status: needsMaking ? "waiting" : "done",
    };
    if (!needsMaking) newOrder.doneAt = now;

    await saveOrders([...orders, newOrder]);
    setSubmittedFlash({ number: newOrder.number, autoDone: !needsMaking });
    setTimeout(() => setSubmittedFlash(null), 2000);
    setCart([]);
    setNotes("");
    setCustomerNumber(null);
    setCartExpanded(true);
  };

  const toggleItemDone = async (orderTimestamp, itemIndex) => {
    const newOrders = orders.map(o => {
      if (o.timestamp !== orderTimestamp) return o;
      const newItems = o.items.map((item, i) => i === itemIndex ? { ...item, done: !item.done } : item);
      return { ...o, items: newItems };
    });
    await saveOrders(newOrders);
  };

  const resetAll = async () => {
    if (!resetConfirm) { setResetConfirm(true); setTimeout(() => setResetConfirm(false), 3000); return; }
    await saveOrders([]);
    if (FIREBASE_URL) {
      try {
        await fetch(`${FIREBASE_URL}/nippan_counter.json`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ n: 0, by: DEVICE_ID, at: Date.now() }),
        });
      } catch (e) {}
    } else {
      localStorage.setItem("nippan:counter", "0");
    }
    setResetConfirm(false);
  };

  const manualRefresh = async () => { await loadOrders(); };

  const waitingOrders = orders.filter(o => o.status === "waiting");
  const doneOrders = orders.filter(o => o.status === "done");
  const baristaOrders = waitingOrders.filter(o => o.items.some(i => i.type === "drink"));
  const gelatoOrders = waitingOrders.filter(o => o.items.some(i => i.type === "gelato"));

  const itemStats = {};
  orders.forEach(o => o.items.forEach(item => {
    itemStats[item.name] = (itemStats[item.name] || 0) + 1;
  }));
  const topItems = Object.entries(itemStats).sort((a, b) => b[1] - a[1]);

  const revenue = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + unitPriceOf(i), 0), 0);

  const ageText = (ts) => {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return `${sec} s`;
    const min = Math.floor(sec / 60);
    return `${min} min ${sec % 60} s`;
  };

  const syncAgo = () => {
    if (!lastSyncTime) return "—";
    const sec = Math.floor((Date.now() - lastSyncTime) / 1000);
    return sec < 3 ? "teď" : `${sec} s`;
  };

  const milkLabel = (m) => m === "ovesne" ? "OVESNÉ" : m === "kokosove" ? "KOKOSOVÉ" : null;
  const milkBadgeColor = (m) => m === "ovesne" ? "bg-amber-500 text-white" : "bg-stone-500 text-white";
  const flavorName = (id) => (GELATO_FLAVORS.find(f => f.id === id) || {}).name || id;
  const flavorEmoji = (id) => (GELATO_FLAVORS.find(f => f.id === id) || {}).emoji || "";

  const ItemBtn = ({ item, big }) => (
    <button
      onClick={() => addToCart(item)}
      className={`${item.bg} border-2 ${item.border} rounded-xl ${big ? "p-3" : "p-2"} active:scale-95 transition text-center`}
    >
      <div className={`${big ? "text-3xl" : "text-2xl"} mb-1`}>{item.emoji}</div>
      <div className={`text-xs font-bold ${item.text} leading-tight`}>{item.name}</div>
      <div className="text-xs font-mono mt-1 text-stone-600">{item.price} Kč</div>
    </button>
  );

  const SectionLabel = ({ children, className = "" }) => (
    <div className={`text-xs uppercase font-bold tracking-wider text-white text-center py-1.5 rounded-lg mb-2 ${className}`}>{children}</div>
  );

  const TabBtn = ({ id, label, color, badge }) => (
    <button
      onClick={() => setView(id)}
      className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition relative ${view === id ? color + " text-white" : "bg-stone-800 text-stone-400"}`}
    >
      {label}
      {badge > 0 && (
        <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{badge}</span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-stone-100 pb-2">
      {/* HLAVIČKA */}
      <div className="bg-stone-900 text-white sticky top-0 z-30 shadow-lg">
        <div className="px-3 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎋</span>
            <span className="font-bold tracking-wide text-sm">NIPPAN POS</span>
            <span className="text-[10px] text-stone-500 font-mono">TANABATA</span>
          </div>
          <div className="text-xs font-mono opacity-75 flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${FIREBASE_URL ? "bg-green-600 text-white" : "bg-amber-600 text-white"}`}>
              {FIREBASE_URL ? "FB" : "LOCAL"}
            </span>
            <span>{synced ? "● " + syncAgo() : "○"}</span>
          </div>
        </div>
        <div className="flex">
          <TabBtn id="kasa" label="Kasa" color="bg-red-700" />
          <TabBtn id="barista" label="Barista" color="bg-green-700" badge={baristaOrders.length} />
          <TabBtn id="gelato" label="Gelato" color="bg-fuchsia-700" badge={gelatoOrders.length} />
          <TabBtn id="stats" label="Stats" color="bg-amber-600" />
        </div>
      </div>

      {storageError && (
        <div className="bg-red-100 border-b-2 border-red-500 px-3 py-2 text-xs text-red-800 font-medium">
          ⚠️ {storageError}
        </div>
      )}
      {submittedFlash && (
        <div className="bg-emerald-600 text-white px-3 py-3 text-center font-bold text-lg">
          ✓ Odesláno #{submittedFlash.number}{submittedFlash.autoDone ? " → rovnou Hotové" : ""}
        </div>
      )}

      {/* ================= KASA ================= */}
      {view === "kasa" && (
        <>
          <div className="p-3" style={{ paddingBottom: cart.length > 0 ? (cartExpanded ? "34rem" : "8rem") : "5rem" }}>
            {/* Číslo zákazníka */}
            <div className="bg-white rounded-xl shadow p-3 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Číslo zákazníka</div>
                  <div className="text-4xl font-bold font-mono text-stone-900 leading-none">
                    {reserving ? "…" : customerNumber ? `#${customerNumber}` : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setCustomerNumber(null); reserveNumber(); }}
                    className="text-xs px-3 py-2 bg-stone-200 text-stone-700 rounded-lg font-bold active:bg-stone-300"
                  >↻ Nové</button>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">Cena</div>
                    <div className="text-xl font-bold font-mono text-emerald-800">{cartTotal} Kč</div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-stone-400 mt-1">
                Číslo se přiděluje automaticky a sdíleně (1–{MAX_CUSTOMER}). Nepřepisuj ho ručně.
              </div>
            </div>

            {/* MATCHA */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <SectionLabel className="bg-green-700">LIMO</SectionLabel>
                <div className="grid gap-2">{limos.map(i => <ItemBtn key={i.id} item={i} big />)}</div>
              </div>
              <div>
                <SectionLabel className="bg-orange-600">LATTE</SectionLabel>
                <div className="grid gap-2">{lattes.map(i => <ItemBtn key={i.id} item={i} big />)}</div>
              </div>
            </div>

            {/* GELATO */}
            <SectionLabel className="bg-fuchsia-600">🍦 GELATO (Angelato)</SectionLabel>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {gelato.map(i => <ItemBtn key={i.id} item={i} big />)}
            </div>
            <div className="text-[10px] text-fuchsia-700 bg-fuchsia-50 border-l-4 border-fuchsia-400 px-2 py-1 mb-3 rounded-r">
              Příchuť vyber v košíku (max 2 — lze kombinovat i u 1 porce).
            </div>

            {/* KÁVA */}
            <SectionLabel className="bg-stone-700">☕ KÁVA</SectionLabel>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {coffees.map(i => <ItemBtn key={i.id} item={i} />)}
            </div>

            {/* PEČIVO SLADKÉ */}
            <SectionLabel className="bg-amber-600">🥖 SLADKÉ PEČIVO</SectionLabel>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {pastrySweet.map(i => <ItemBtn key={i.id} item={i} />)}
            </div>

            {/* PEČIVO SLANÉ */}
            <SectionLabel className="bg-lime-700">🥪 SLANÉ PEČIVO</SectionLabel>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {pastrySavory.map(i => <ItemBtn key={i.id} item={i} />)}
            </div>

            {/* MERCHANT */}
            <SectionLabel className="bg-cyan-700">🥤 MERCHANT</SectionLabel>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {merchant.map(i => <ItemBtn key={i.id} item={i} />)}
              <button
                onClick={() => setCustomOpen(!customOpen)}
                className="bg-white border-2 border-dashed border-stone-300 rounded-xl p-2 active:scale-95 transition text-center"
              >
                <div className="text-2xl mb-1">➕</div>
                <div className="text-xs font-bold text-stone-700 leading-tight">Vlastní</div>
                <div className="text-xs font-mono mt-1 text-stone-400">cena</div>
              </button>
            </div>

            {customOpen && (
              <div className="bg-white rounded-xl shadow p-3 mb-3">
                <div className="text-xs uppercase font-bold tracking-wider text-stone-500 mb-2">Vlastní položka</div>
                <div className="flex gap-2">
                  <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Název"
                    className="flex-1 px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:border-red-600 outline-none" />
                  <input type="number" inputMode="numeric" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="Kč"
                    className="w-24 px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:border-red-600 outline-none" />
                  <button onClick={addCustom} className="px-4 py-2 bg-stone-900 text-white rounded-lg font-bold text-sm">+</button>
                </div>
              </div>
            )}
          </div>

          {/* KOŠÍK */}
          {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t-4 border-red-700 shadow-2xl">
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

              {cartExpanded && (
                <div className="p-3 max-h-[52vh] overflow-y-auto">
                  {gelatoMissingFlavor && (
                    <div className="bg-red-50 border-l-4 border-red-500 px-3 py-2 mb-2 text-xs text-red-800 font-bold">
                      🍦 Vyber příchuť u gelata — bez ní nejde odeslat!
                    </div>
                  )}
                  <div className="space-y-2 max-h-[30vh] overflow-y-auto mb-2">
                    {cartGroups.map((group) => {
                      const item = group.item;
                      const groupTotal = unitPriceOf(item) * group.count;
                      return (
                        <div key={group.key} className="bg-stone-50 rounded-lg p-2">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-sm flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-lg flex-shrink-0">{item.emoji}</span>
                              <span className="truncate font-medium">{item.name}</span>
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => decrementGroup(group)} className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 font-bold text-base active:bg-stone-300 flex items-center justify-center">−</button>
                              <span className="text-sm font-bold font-mono w-8 text-center">{group.count}×</span>
                              <button onClick={() => addOneToGroup(group)} className="w-7 h-7 rounded-full bg-stone-900 text-white font-bold text-base active:bg-stone-700 flex items-center justify-center">+</button>
                            </div>
                            <span className="text-xs font-mono text-stone-600 w-16 text-right flex-shrink-0">{groupTotal} Kč</span>
                            <button onClick={() => removeGroup(group)} className="text-red-600 text-xl font-bold w-7 h-7 rounded-full hover:bg-red-50 flex-shrink-0">×</button>
                          </div>

                          {/* GELATO — příchutě */}
                          {item.type === "gelato" && (
                            <div className="mt-2 pt-2 border-t border-stone-200">
                              <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">
                                Příchutě (max 2) — vybráno {(item.flavors || []).length}
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                {GELATO_FLAVORS.map(f => {
                                  const on = (item.flavors || []).includes(f.id);
                                  return (
                                    <button key={f.id} onClick={() => toggleGroupFlavor(group, f.id)}
                                      className={`py-2 rounded text-xs font-bold border transition ${on ? "bg-fuchsia-600 border-fuchsia-600 text-white" : "bg-white border-stone-300 text-stone-600"}`}>
                                      {f.emoji} {f.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* MLÉKO (latte + káva) */}
                          {(item.category === "latte" || item.category === "coffee") && (
                            <div className="mt-2 pt-2 border-t border-stone-200">
                              <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Mléko:</div>
                              <div className="grid grid-cols-3 gap-1">
                                <button onClick={() => setGroupField(group, "milk", "standard")} className={`py-2 rounded text-xs font-bold border transition ${item.milk === "standard" ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-300 text-stone-600"}`}>Std</button>
                                <button onClick={() => setGroupField(group, "milk", "ovesne")} className={`py-2 rounded text-xs font-bold border transition ${item.milk === "ovesne" ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-stone-300 text-stone-600"}`}>Oves +20</button>
                                <button onClick={() => setGroupField(group, "milk", "kokosove")} className={`py-2 rounded text-xs font-bold border transition ${item.milk === "kokosove" ? "bg-stone-500 border-stone-500 text-white" : "bg-white border-stone-300 text-stone-600"}`}>Kok +20</button>
                              </div>
                            </div>
                          )}

                          {/* EXTRA SHOT (káva) */}
                          {item.category === "coffee" && (
                            <div className="mt-2">
                              <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Extra shot:</div>
                              <div className="grid grid-cols-3 gap-1">
                                <button onClick={() => setGroupField(group, "shot", 0)} className={`py-2 rounded text-xs font-bold border ${!item.shot ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-300 text-stone-600"}`}>Ne</button>
                                <button onClick={() => setGroupField(group, "shot", 1)} className={`py-2 rounded text-xs font-bold border ${item.shot === 1 ? "bg-amber-700 border-amber-700 text-white" : "bg-white border-stone-300 text-stone-600"}`}>+1 (+30)</button>
                                <button onClick={() => setGroupField(group, "shot", 2)} className={`py-2 rounded text-xs font-bold border ${item.shot === 2 ? "bg-amber-800 border-amber-800 text-white" : "bg-white border-stone-300 text-stone-600"}`}>+2 (+60)</button>
                              </div>
                            </div>
                          )}

                          {/* LED (všechny drinky) */}
                          {item.type === "drink" && (
                            <div className="mt-2">
                              <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Led:</div>
                              <div className="grid grid-cols-3 gap-1">
                                <button onClick={() => setGroupField(group, "ice", "standard")} className={`py-2 rounded text-xs font-bold border ${(item.ice || "standard") === "standard" ? "bg-sky-700 border-sky-700 text-white" : "bg-white border-stone-300 text-stone-600"}`}>🧊 Std</button>
                                <button onClick={() => setGroupField(group, "ice", "less")} className={`py-2 rounded text-xs font-bold border ${item.ice === "less" ? "bg-sky-400 border-sky-400 text-white" : "bg-white border-stone-300 text-stone-600"}`}>🧊 Málo</button>
                                <button onClick={() => setGroupField(group, "ice", "none")} className={`py-2 rounded text-xs font-bold border ${item.ice === "none" ? "bg-red-600 border-red-600 text-white" : "bg-white border-stone-300 text-stone-600"}`}>🚫 Bez</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Poznámka (volitelné)..."
                    className="w-full mb-2 px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:border-red-600 outline-none" />
                </div>
              )}

              <div className="p-3 pt-2 bg-white">
                <button
                  onClick={submitOrder}
                  disabled={!customerNumber || gelatoMissingFlavor}
                  className="w-full bg-red-700 text-white py-4 rounded-xl font-bold text-lg active:bg-red-800 active:scale-95 transition shadow-lg disabled:bg-stone-300 disabled:cursor-not-allowed"
                >
                  ODESLAT #{customerNumber || "?"} · {cartTotal} Kč →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= BARISTA ================= */}
      {view === "barista" && (
        <StationView
          title="🍵 Barista — matcha & káva"
          emptyEmoji="🍵"
          orders={baristaOrders}
          stationType="drink"
          {...{ ageText, syncAgo, manualRefresh, toggleItemDone, drinks, recipeOpen, setRecipeOpen, milkLabel, milkBadgeColor, flavorName, flavorEmoji }}
        />
      )}

      {/* ================= GELATO ================= */}
      {view === "gelato" && (
        <StationView
          title="🍦 Gelato — Angelato výdej"
          emptyEmoji="🍦"
          orders={gelatoOrders}
          stationType="gelato"
          {...{ ageText, syncAgo, manualRefresh, toggleItemDone, drinks, recipeOpen, setRecipeOpen, milkLabel, milkBadgeColor, flavorName, flavorEmoji }}
        />
      )}

      {/* ================= STATS (PIN) ================= */}
      {view === "stats" && !statsUnlocked && (
        <div className="p-6 max-w-xs mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-10 text-center">
            <div className="text-5xl mb-3">🔒</div>
            <div className="font-bold text-lg mb-1">Statistiky jsou zamčené</div>
            <div className="text-xs text-stone-500 mb-4">Zadej PIN</div>
            <div className={`text-3xl font-mono tracking-[0.5em] mb-4 h-10 ${pinError ? "text-red-600" : "text-stone-900"}`}>
              {pinInput.replace(/./g, "•") || "\u00A0"}
            </div>
            {pinError && <div className="text-xs text-red-600 font-bold mb-2">Špatný PIN</div>}
            <div className="grid grid-cols-3 gap-2">
              {["1","2","3","4","5","6","7","8","9"].map(d => (
                <button key={d} onClick={() => { setPinError(false); setPinInput(p => (p + d).slice(0, 4)); }}
                  className="py-4 bg-stone-100 rounded-xl text-xl font-bold active:bg-stone-200">{d}</button>
              ))}
              <button onClick={() => { setPinInput(""); setPinError(false); }} className="py-4 bg-stone-100 rounded-xl text-sm font-bold active:bg-stone-200">C</button>
              <button onClick={() => { setPinError(false); setPinInput(p => (p + "0").slice(0, 4)); }} className="py-4 bg-stone-100 rounded-xl text-xl font-bold active:bg-stone-200">0</button>
              <button
                onClick={() => {
                  if (pinInput === STATS_PIN) { setStatsUnlocked(true); setPinInput(""); }
                  else { setPinError(true); setPinInput(""); }
                }}
                className="py-4 bg-amber-600 text-white rounded-xl text-sm font-bold active:bg-amber-700">OK</button>
            </div>
            <button onClick={() => setView("kasa")} className="mt-4 text-xs text-stone-400 underline">Zpět na Kasu</button>
          </div>
        </div>
      )}

      {view === "stats" && statsUnlocked && (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl shadow p-3 text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Čeká</div>
              <div className="text-3xl font-bold font-mono text-red-700">{waitingOrders.length}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-3 text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Hotovo</div>
              <div className="text-3xl font-bold font-mono text-green-700">{doneOrders.length}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-3 text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">Tržba</div>
              <div className="text-2xl font-bold font-mono text-emerald-700">{revenue.toLocaleString("cs-CZ")}</div>
            </div>
          </div>

          {topItems.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-xs uppercase font-bold tracking-wider text-stone-500 mb-3">Nejprodávanější položky</div>
              {topItems.map(([name, count]) => {
                const max = topItems[0][1];
                return (
                  <div key={name} className="mb-2 last:mb-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{name}</span>
                      <span className="font-mono font-bold">{count}×</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600" style={{ width: `${(count / max) * 100}%` }}></div>
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
                    <span className="flex-1 mx-3 text-stone-600 truncate">{order.items.map(i => i.emoji).join(" ")}</span>
                    <span className="text-xs text-stone-400 font-mono">
                      {new Date(order.doneAt || order.timestamp).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => setStatsUnlocked(false)} className="w-full py-2 rounded-xl text-xs font-bold bg-stone-200 text-stone-600">🔒 Zamknout statistiky</button>
          <button onClick={resetAll} className={`w-full py-3 rounded-xl text-sm font-bold transition ${resetConfirm ? "bg-red-700 text-white" : "bg-stone-200 text-stone-700"}`}>
            {resetConfirm ? "⚠️ KLIK ZNOVU — smaže objednávky i číselník" : "Vymazat všechny objednávky + reset čísel"}
          </button>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// SPOLEČNÁ KOMPONENTA PRO VÝDEJNÍ MÍSTA (Barista / Gelato)
// ===========================================================================
function StationView({ title, emptyEmoji, orders, stationType, ageText, syncAgo, manualRefresh, toggleItemDone, drinks, recipeOpen, setRecipeOpen, milkLabel, milkBadgeColor, flavorName, flavorEmoji }) {
  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-3">
        <div className="text-xs font-bold text-stone-600">{title}</div>
        <button onClick={manualRefresh} className="text-xs px-3 py-1.5 bg-stone-200 text-stone-700 rounded-full font-bold">↻ Obnovit</button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <div className="text-7xl mb-4">{emptyEmoji}</div>
          <div className="text-xl font-bold mb-2">Žádné objednávky</div>
          <div className="text-sm">Čekáme na zákazníky…</div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, idx) => {
            const ageSec = Math.floor((Date.now() - order.timestamp) / 1000);
            const isOld = ageSec > 180;
            const isVeryOld = ageSec > 300;
            const mine = order.items.filter(i => i.type === stationType);
            const doneCount = mine.filter(d => d.done).length;
            const allDone = mine.length > 0 && doneCount === mine.length;
            const cardKey = `${order.number}-${order.timestamp}`;

            const otherItems = order.items.filter(i => i.type !== stationType);
            const otherGroups = {};
            otherItems.forEach(e => {
              if (otherGroups[e.name]) otherGroups[e.name].count += 1;
              else otherGroups[e.name] = { ...e, count: 1 };
            });

            return (
              <div key={cardKey} className={`bg-white rounded-xl shadow-lg p-4 border-l-8 transition ${
                allDone ? "border-green-500 opacity-70" :
                idx === 0 ? "border-green-600" : isVeryOld ? "border-red-600" : isOld ? "border-orange-500" : "border-stone-400"}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-stone-400 font-bold">Zákazník</div>
                    <div className="text-5xl font-bold font-mono text-stone-900 leading-none">#{order.number}</div>
                    <div className={`text-xs mt-2 font-medium ${isVeryOld ? "text-red-600 font-bold" : isOld ? "text-orange-600" : "text-stone-500"}`}>
                      {ageText(order.timestamp)}{isVeryOld && " · ⚠️ POZOR!"}
                    </div>
                  </div>
                  {idx === 0 && !allDone && <div className="text-xs font-bold uppercase tracking-wider bg-green-600 text-white px-3 py-1 rounded-full">DALŠÍ</div>}
                  {allDone && <div className="text-xs font-bold uppercase tracking-wider bg-green-600 text-white px-3 py-1 rounded-full animate-pulse">✓ HOTOVO</div>}
                </div>

                <div className="space-y-2 mb-3">
                  {order.items.map((item, i) => {
                    if (item.type !== stationType) return null;
                    const drink = drinks.find(d => d.id === item.id);
                    const recipeKey = `${cardKey}-${i}`;
                    const isDone = item.done;
                    const milkBadge = milkLabel(item.milk);
                    return (
                      <div key={i}>
                        <div className={`flex items-center gap-2 rounded-lg overflow-hidden ${isDone ? "bg-green-100" : "bg-stone-50"}`}>
                          <button onClick={() => toggleItemDone(order.timestamp, i)}
                            className={`flex-1 flex items-center gap-3 px-3 py-3 active:bg-stone-200 transition ${isDone ? "opacity-60" : ""}`}>
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${isDone ? "bg-green-600 text-white" : "bg-white border-2 border-stone-400 text-stone-400"}`}>
                              {isDone ? "✓" : ""}
                            </span>
                            <span className="text-3xl">{item.emoji}</span>
                            <div className={`flex-1 text-left ${isDone ? "line-through" : ""}`}>
                              <div className="font-bold text-base leading-tight">{item.name}</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(item.flavors || []).map(f => (
                                  <div key={f} className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-fuchsia-600 text-white">
                                    {flavorEmoji(f)} {flavorName(f)}
                                  </div>
                                ))}
                                {milkBadge && <div className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${milkBadgeColor(item.milk)}`}>🥛 {milkBadge}</div>}
                                {item.shot > 0 && <div className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-amber-800 text-white">☕ +{item.shot} SHOT</div>}
                                {item.ice === "less" && <div className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-sky-500 text-white">🧊 MÁLO LEDU</div>}
                                {item.ice === "none" && <div className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-red-600 text-white">🚫 BEZ LEDU</div>}
                              </div>
                            </div>
                          </button>
                          {drink && (
                            <button onClick={() => setRecipeOpen(recipeOpen === recipeKey ? null : recipeKey)}
                              className="text-xs text-stone-400 px-3 py-3 hover:bg-stone-200">
                              {recipeOpen === recipeKey ? "▼" : "▶"} recept
                            </button>
                          )}
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
                  {mine.length > 1 && <div className="text-xs text-stone-400 text-right">{doneCount}/{mine.length} hotovo</div>}
                </div>

                {order.notes && (
                  <div className="bg-yellow-100 border-l-4 border-yellow-600 px-3 py-2 mb-3 text-sm font-medium">📝 {order.notes}</div>
                )}

                {Object.keys(otherGroups).length > 0 && (
                  <div className="border-t border-stone-200 pt-2">
                    <div className="text-xs text-stone-400 mb-1">Zákazník má v objednávce také:</div>
                    <div className="text-xs text-stone-500">
                      {Object.values(otherGroups).map((e, i) => (
                        <span key={i}>{i > 0 && " · "}{e.emoji} {e.name}{e.count > 1 ? ` ×${e.count}` : ""}</span>
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
  );
}
