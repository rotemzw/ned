/* Ned — a personal TED talks player.
   Data: data/talks.json (built by fetch-talks.py). Playback: TED's official embed player. */
(() => {
  "use strict";

  // ---------- helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PALETTE = ["--red", "--yellow", "--green", "--blue", "--purple", "--orange", "--pink"];
  const LIGHT = new Set(["--yellow", "--blue", "--pink"]);
  const hash = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  const colorOf = (s) => PALETTE[hash(s || "x") % PALETTE.length];
  const fmtDur = (sec) => { const m = Math.round(sec / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`; };
  const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const fmtViews = (v) => v >= 1e6 ? `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : String(v);
  const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const viewColor = (v) => v >= 1e7 ? "--purple" : v >= 3e6 ? "--red" : v >= 1e6 ? "--orange" : v >= 2e5 ? "--green" : "--blue";

  const ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M3 6h11v2H3zm0 5h11v2H3zm0 5h7v2H3zm13-5 6 4-6 4z"/></svg>',
    queue: '<svg viewBox="0 0 24 24"><path d="M3 6h12v2H3zm0 5h12v2H3zm0 5h8v2H3zm14-2v-3h2v3h3v2h-3v3h-2v-3h-3v-2z"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3 1.7-1.8 3.2-3 5.3-3 3.7 0 5.8 3.7 4.3 7.2C19.5 16.4 12 21 12 21z"/></svg>',
    heartO: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3 1.7-1.8 3.2-3 5.3-3 3.7 0 5.8 3.7 4.3 7.2C19.5 16.4 12 21 12 21zm0-2.4c2.2-1.5 6.1-4.6 7.5-7.7.9-2.1-.3-4.4-2.3-4.4-1.4 0-2.5 1-4.3 3L12 10.4l-.9-.9c-1.8-2-2.9-3-4.3-3-2 0-3.2 2.3-2.3 4.4 1.4 3.1 5.3 6.2 7.5 7.7z"/></svg>',
    similar: '<svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm12 0h2v3h3v2h-3v3h-2v-3h-3v-2h3z"/></svg>',
    person: '<svg viewBox="0 0 24 24"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m9.5 16.2-4.2-4.2-1.4 1.4 5.6 5.6L21 7.5 19.6 6z"/></svg>',
    dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="m12 8-6 6 1.4 1.4 4.6-4.6 4.6 4.6L18 14z"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="m12 16 6-6-1.4-1.4-4.6 4.6-4.6-4.6L6 10z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4L12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>',
    headphones: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h2a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H5a7 7 0 0 1 14 0h-2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>',
    skip: '<svg viewBox="0 0 24 24"><path d="M6 5l9 7-9 7V5zm10 0h2v14h-2z"/></svg>',
    back15: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/><text x="12" y="16.5" font-size="7" font-weight="700" text-anchor="middle" font-family="sans-serif">15</text></svg>',
    fwd15: '<svg viewBox="0 0 24 24"><path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z"/><text x="12" y="16.5" font-size="7" font-weight="700" text-anchor="middle" font-family="sans-serif">15</text></svg>',
    search: '<svg viewBox="0 0 24 24"><path d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.8 4.8-1.4 1.4-4.8-4.8A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"/></svg>',
  };

  // ---------- persisted state ----------
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem("ts:" + k)) ?? d; } catch { return d; } },
    set(k, v) { localStorage.setItem("ts:" + k, JSON.stringify(v)); },
  };
  const U = {
    saved: store.get("saved", {}),     // id -> timestamp
    watched: store.get("watched", {}), // id -> timestamp
    queue: store.get("queue", []),     // upcoming ids
    now: store.get("now", null),       // currently playing id
    mode: store.get("mode", "watch"),  // how it plays: "watch" (TED video player) or "listen" (audio only, keeps playing in background)
  };
  const persist = () => { for (const k of ["saved", "watched", "queue", "now", "mode"]) store.set(k, U[k]); updateBadge(); };

  // ---------- data ----------
  let TALKS = [], BY_ID = new Map(), SPEAKERS = new Map(), TOPIC_COUNT = new Map(), IDF = new Map(), HAY = [];

  async function loadData() {
    const res = await fetch("data/talks.json");
    TALKS = await res.json();
    TALKS.forEach((t, i) => {
      t.i = i;
      BY_ID.set(t.id, t);
      for (const [slug, name] of t.sp) {
        if (!SPEAKERS.has(slug)) SPEAKERS.set(slug, { slug, name, talks: [] });
        SPEAKERS.get(slug).talks.push(t);
      }
      for (const k of t.k) TOPIC_COUNT.set(k, (TOPIC_COUNT.get(k) || 0) + 1);
      HAY[i] = { title: norm(t.t), sp: norm(t.s + " " + t.sp.map((s) => s[1]).join(" ")), k: norm(t.k.join(" | ")), desc: norm(t.desc) };
    });
    const N = TALKS.length;
    for (const [k, c] of TOPIC_COUNT) IDF.set(k, Math.log(N / c));
  }

  // ---------- recommendation & search ----------
  function related(id, limit = 40) {
    const base = BY_ID.get(id);
    if (!base) return [];
    const topics = new Set(base.k), speakers = new Set(base.sp.map((s) => s[0]));
    const scored = [];
    for (const t of TALKS) {
      if (t.id === id) continue;
      let s = 0;
      for (const k of t.k) if (topics.has(k)) s += IDF.get(k);
      if (t.sp.some((x) => speakers.has(x[0]))) s += 6;
      if (s <= 0) continue;
      s += 0.25 * Math.log10(t.v + 10);
      scored.push([s, t]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, limit).map((x) => x[1]);
  }

  function search(q) {
    q = norm(q);
    const tokens = q.split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    const out = [];
    for (const t of TALKS) {
      const h = HAY[t.i];
      let score = 0, ok = true;
      for (const tok of tokens) {
        let s = 0;
        if (h.title.includes(tok)) s += 4;
        if (h.sp.includes(tok)) s += 5;
        if (h.k.includes(tok)) s += 2.5;
        if (h.desc.includes(tok)) s += 1;
        if (!s) { ok = false; break; }
        score += s;
      }
      if (!ok) continue;
      if (h.title.includes(q)) score += 4;
      score += 0.35 * Math.log10(t.v + 10);
      out.push([score, t]);
    }
    out.sort((a, b) => b[0] - a[0]);
    return out.map((x) => x[1]);
  }

  // Home feed: popularity + freshness + your taste + a bit of randomness; endless.
  function buildFeed() {
    const taste = new Map();
    const bump = (id, w) => { const t = BY_ID.get(id); if (t) for (const k of t.k) taste.set(k, (taste.get(k) || 0) + w); };
    Object.keys(U.saved).forEach((id) => bump(id, 2));
    Object.keys(U.watched).forEach((id) => bump(id, 1));
    const now = Date.now();
    return TALKS.map((t) => {
      let s = 0.8 * Math.log10(t.v + 10) + Math.random() * 3.2;
      const age = (now - Date.parse(t.p)) / 864e5;
      if (age < 60) s += 1.5;
      let aff = 0; for (const k of t.k) aff += (taste.get(k) || 0) * (IDF.get(k) || 0);
      s += Math.min(aff / 6, 3);
      if (U.watched[t.id]) s -= 4;
      return [s, t];
    }).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
  }

  // ---------- filters (length / subject / views / sort) ----------
  const LEN = [["any", "Any length"], ["s", "Under 6 min"], ["m", "6–12 min"], ["l", "12–18 min"], ["xl", "18+ min"]];
  const LEN_TEST = { any: () => true, s: (d) => d < 360, m: (d) => d >= 360 && d < 720, l: (d) => d >= 720 && d < 1080, xl: (d) => d >= 1080 };
  const VIEWS = [["0", "Any views"], ["100000", "100K+ views"], ["1000000", "1M+ views"], ["5000000", "5M+ views"], ["10000000", "10M+ views"]];
  const SORTS_LIB = [["added", "Recently added"], ["popular", "Most popular"], ["least", "Least popular"], ["short", "Shortest"], ["long", "Longest"], ["newest", "Newest talks"]];
  const SORTS = [["relevance", "Best match"], ["popular", "Most popular"], ["least", "Least popular"], ["short", "Shortest"], ["long", "Longest"], ["newest", "Newest talks"]];
  const FILTERS = {}; // per page key
  const getF = (key, sort) => (FILTERS[key] ||= { len: "any", topic: "", views: "0", sort });

  function applyFilters(list, f, addedAt) {
    let out = list.filter((t) => LEN_TEST[f.len](t.d) && t.v >= +f.views && (!f.topic || t.k.includes(f.topic)));
    const by = {
      popular: (a, b) => b.v - a.v, least: (a, b) => a.v - b.v, short: (a, b) => a.d - b.d, long: (a, b) => b.d - a.d,
      newest: (a, b) => b.p.localeCompare(a.p), added: addedAt ? (a, b) => addedAt[b.id] - addedAt[a.id] : null,
    }[f.sort];
    if (by) out = [...out].sort(by);
    return out;
  }

  function filterBar(key, list, f, sorts, { subject = true } = {}) {
    const topics = new Map();
    for (const t of list) for (const k of t.k) topics.set(k, (topics.get(k) || 0) + 1);
    const topicOpts = [...topics].sort((a, b) => b[1] - a[1]).slice(0, 80);
    if (f.topic && !topics.has(f.topic)) topicOpts.unshift([f.topic, 0]);
    const sel = (name, opts, val, def) => `<label class="sel ${val !== def ? "on" : ""}"><select data-filter="${key}" data-name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
    const active = f.len !== "any" || f.views !== "0" || f.topic;
    return `<div class="filters">
      ${sel("sort", sorts, f.sort, sorts[0][0])}
      ${sel("len", LEN, f.len, "any")}
      ${subject ? sel("topic", [["", "All subjects"], ...topicOpts.map(([k, c]) => [k, c ? `${k} (${c})` : k])], f.topic, "") : ""}
      ${sel("views", VIEWS, f.views, "0")}
      ${active ? `<button class="clear-filters" data-act="clear-filters" data-key="${key}">Clear</button>` : ""}
    </div>`;
  }

  // ---------- render bits ----------
  const thumb = (t, extra = "") => `<div class="thumb">${t.img ? `<img loading="lazy" src="${esc(t.img)}" alt="">` : ""}<span class="dur">${fmtClock(t.d)}</span>${U.watched[t.id] ? '<span class="seen"></span>' : ""}${extra}</div>`;
  const row = (t, opts = {}) => `<div class="row" data-act="talk" data-id="${esc(t.id)}">
      ${opts.lead || ""}${thumb(t)}
      <div class="row-body">
        <div class="row-title">${esc(t.t)}</div>
        <div class="row-sub">${esc(t.s)} · ${fmtDur(t.d)}</div>
        <span class="views" style="--c:var(${viewColor(t.v)})">${fmtViews(t.v)} views</span>
      </div>
      ${opts.tail ?? `<button class="more-btn" data-act="sheet" data-id="${esc(t.id)}" aria-label="More options">${ICON.dots}</button>`}
    </div>`;
  const bigCard = (t) => {
    const c = colorOf(t.k[0]);
    return `<div class="big-card ${LIGHT.has(c) ? "light" : ""}" style="--c:var(${c})" data-act="talk" data-id="${esc(t.id)}">
      <span class="tag">${esc(t.k[0] || "talk")}</span>
      <button class="heart" data-act="save" data-id="${esc(t.id)}" aria-label="Save">${U.saved[t.id] ? ICON.heart : ICON.heartO}</button>
      <h3>${esc(t.t)}</h3><p>${esc(t.s)} · ${fmtDur(t.d)} · ${fmtViews(t.v)} views</p>
      ${t.img ? `<div class="art" style="background-image:url('${esc(t.img)}')"></div>` : ""}
    </div>`;
  };
  const header = (title, sub = "") => `<div class="page-head"><button class="back" data-act="back" aria-label="Back">${ICON.back}</button><div><h1 class="page-title">${esc(title)}</h1>${sub ? `<div class="row-sub">${sub}</div>` : ""}</div></div>`;
  const empty = (title, text) => `<div class="empty"><b>${esc(title)}</b>${esc(text)}</div>`;

  // Endless list: renders rows in chunks as you scroll.
  let pager = null;
  function mountPager(containerSel, source, { chunk = 15, rowFn = row } = {}) {
    const box = $(containerSel);
    if (!box) return;
    let i = 0;
    const sentinel = document.createElement("div");
    sentinel.className = "sentinel";
    box.after(sentinel);
    const more = () => {
      const items = typeof source === "function" ? source(i, chunk) : source.slice(i, i + chunk);
      if (!items.length) { sentinel.textContent = i ? "That's everything" : ""; obs.disconnect(); return; }
      box.insertAdjacentHTML("beforeend", items.map((t) => rowFn(t)).join(""));
      i += items.length;
      sentinel.textContent = "Loading more…";
    };
    const obs = new IntersectionObserver((e) => { if (e[0].isIntersecting) more(); }, { root: $("#view"), rootMargin: "600px" });
    obs.observe(sentinel);
    more();
    pager = obs;
  }

  // ---------- pages ----------
  let FEED = null;
  const PAGES = {
    home() {
      FEED ||= buildFeed();
      const recent = TALKS.filter((t) => (Date.now() - Date.parse(t.p)) / 864e5 < 120).sort((a, b) => b.v - a.v).slice(0, 10);
      const topTopics = [...TOPIC_COUNT].sort((a, b) => b[1] - a[1]).slice(0, 18).map((x) => x[0]);
      const savedCount = Object.keys(U.saved).length;
      return {
        html: `<div class="hero-row"><h1 class="hero-title">Ned<br>talks<span class="dot">.</span></h1>
            <a class="pill-stat" href="#/library">${ICON.heart.replace("<svg", '<svg style="width:16px;height:16px;vertical-align:-3px;color:var(--red)"')} ${savedCount} saved</a></div>
          <p class="intro">${TALKS.length.toLocaleString()} talks. Save the good ones, queue up the rest.</p>
          <div class="chips">${topTopics.map((k) => `<a class="chip" href="#/topic/${encodeURIComponent(k)}">${esc(k)}</a>`).join("")}</div>
          <h2 class="h2">Popular right now 🔥</h2>
          <div class="carousel">${recent.map(bigCard).join("")}</div>
          <h2 class="h2">For you</h2>
          <div class="list" id="feed"></div>`,
        after() {
          let n = 0;
          mountPager("#feed", (_, c) => {
            if (n + c > FEED.length) { FEED = FEED.concat(buildFeed()); } // never runs out
            const items = FEED.slice(n, n + c); n += c; return items;
          }, { chunk: 12 });
        },
      };
    },

    browse(params) {
      const q = params.get("q") || "";
      const topics = [...TOPIC_COUNT].sort((a, b) => b[1] - a[1]).slice(0, 24);
      return {
        html: `<h1 class="page-title" style="font-size:44px;margin:6px 0 12px">Browse</h1>
          <div class="search"><div class="search-box">${ICON.search}<input id="q" type="search" placeholder="Talks, speakers, subjects…" value="${esc(q)}" autocomplete="off" enterkeyhint="search"></div></div>
          <div id="results"></div>`,
        after() {
          const input = $("#q");
          const run = () => renderSearch(input.value.trim(), topics);
          let tm;
          input.addEventListener("input", () => {
            clearTimeout(tm);
            tm = setTimeout(() => { history.replaceState(null, "", "#/browse" + (input.value.trim() ? "?q=" + encodeURIComponent(input.value.trim()) : "")); run(); }, 160);
          });
          run();
          if (!q) setTimeout(() => input.focus({ preventScroll: true }), 50);
        },
      };
    },

    topic(params, name) {
      const list = TALKS.filter((t) => t.k.includes(name));
      return listPage({ key: "topic:" + name, title: name, sub: `${list.length} talks`, list, sorts: SORTS.slice(1), subject: false });
    },

    speaker(params, slug) {
      const sp = SPEAKERS.get(slug);
      if (!sp) return { html: header("Speaker") + empty("Not found", "We couldn't find that speaker.") };
      const list = sp.talks;
      const total = list.reduce((s, t) => s + t.v, 0);
      const c = colorOf(sp.name);
      return {
        html: `<div class="page-head"><button class="back" data-act="back" aria-label="Back">${ICON.back}</button></div>
          <div class="speaker-hero"><div class="av-xl" style="--c:var(${c})">${esc(initials(sp.name))}</div>
            <h1>${esc(sp.name)}</h1>
            <div class="stats"><span>${list.length} talk${list.length > 1 ? "s" : ""}</span><span>${fmtViews(total)} views</span></div>
            ${list.length > 1 ? `<div class="btn-row" style="width:100%"><button class="btn" data-act="queue-all" data-ids="${esc(list.map((t) => t.id).join(","))}">${ICON.queue} Queue all</button></div>` : ""}
          </div>
          <h2 class="h2">Talks featuring ${esc(sp.name.split(" ")[0])}</h2>
          <div class="list">${[...list].sort((a, b) => b.v - a.v).map((t) => row(t)).join("")}</div>`,
      };
    },

    similar(params, id) {
      const t = BY_ID.get(id);
      if (!t) return { html: header("More like this") + empty("Not found", "") };
      return listPage({ key: "sim:" + id, title: "More like this", sub: `Because of “${esc(t.t)}”`, list: related(id, 120), sorts: SORTS });
    },

    talk(params, id) {
      const t = BY_ID.get(id);
      if (!t) return { html: header("Talk") + empty("Not found", "This talk isn't in the catalog.") };
      const playing = U.now === id;
      const rel = related(id, 60);
      const inQueue = U.queue.includes(id);
      return {
        html: `${playing ? `<button class="back talk-top-back" data-act="back" aria-label="Back">${ICON.back}</button>` :
          `<div class="poster" style="background-image:url('${esc(t.img)}')" data-act="play" data-id="${esc(id)}" data-mode="watch">
              <button class="back" data-act="back" aria-label="Back">${ICON.back}</button>
              <span class="play-big">${ICON.play}</span></div>`}
          <h1 class="talk-title">${esc(t.t)}</h1>
          <div class="speakers">${t.sp.map(([slug, name]) => `<a class="speaker-link" href="#/speaker/${encodeURIComponent(slug)}"><span class="av" style="--c:var(${colorOf(name)})">${esc(initials(name))}</span>${esc(name)}</a>`).join("")}</div>
          <div class="meta"><span>${fmtDur(t.d)}</span><span>${fmtViews(t.v)} views</span><span>${new Date(t.p).toLocaleDateString(undefined, { year: "numeric", month: "short" })}</span>${U.watched[id] ? "<span>✓ Watched</span>" : ""}</div>
          <div class="play-row">
            ${playing ? `<button class="btn" data-act="next" ${U.queue.length ? "" : "disabled"}>${ICON.skip} Next in queue</button>
                ${t.a ? `<button class="btn ghost" data-act="play" data-id="${esc(id)}" data-mode="${U.mode === "listen" ? "watch" : "listen"}">${U.mode === "listen" ? ICON.play + " Watch instead" : ICON.headphones + " Listen instead"}</button>` : ""}`
              : `<button class="btn" data-act="play" data-id="${esc(id)}" data-mode="watch">${ICON.play} Watch</button>
                ${t.a ? `<button class="btn listen" data-act="play" data-id="${esc(id)}" data-mode="listen">${ICON.headphones} Listen</button>` : ""}`}
          </div>
          ${t.a ? "" : `<div class="row-sub" style="margin-top:6px">No audio-only version from TED yet — Watch only.</div>`}
          <div class="actions">
            <button class="act" data-act="play-next" data-id="${esc(id)}">${ICON.next}Play next</button>
            <button class="act ${inQueue ? "on" : ""}" data-act="enqueue" data-id="${esc(id)}">${ICON.queue}${inQueue ? "In queue" : "Add to queue"}</button>
            <button class="act ${U.saved[id] ? "on" : ""}" data-act="save" data-id="${esc(id)}">${U.saved[id] ? ICON.heart : ICON.heartO}${U.saved[id] ? "Saved" : "Save"}</button>
          </div>
          ${playing ? upNextBlock() : ""}
          <p class="desc">${esc(t.desc)}${t.desc.length >= 280 ? "…" : ""}</p>
          <div class="topic-chips">${t.k.map((k) => `<a class="chip" href="#/topic/${encodeURIComponent(k)}">${esc(k)}</a>`).join("")}</div>
          <a class="btn ghost" style="width:100%" href="#/similar/${encodeURIComponent(id)}">${ICON.similar} More like this</a>
          <h2 class="h2">More talks for you</h2>
          <div class="list" id="relList"></div>`,
        after() { mountPager("#relList", rel, { chunk: 10 }); },
      };
    },

    library(params) {
      const tab = params.get("tab") === "watched" ? "watched" : "saved";
      const map = U[tab];
      const list = Object.keys(map).map((id) => BY_ID.get(id)).filter(Boolean);
      const key = "lib:" + tab;
      const f = getF(key, "added");
      const shown = applyFilters(list, f, map);
      const ns = Object.keys(U.saved).length, nw = Object.keys(U.watched).length;
      return {
        html: `<h1 class="page-title" style="font-size:44px;margin:6px 0 4px">Library</h1>
          <div class="seg"><button class="${tab === "saved" ? "on" : ""}" data-act="go" data-href="#/library?tab=saved">Saved<em>${ns}</em></button>
            <button class="${tab === "watched" ? "on" : ""}" data-act="go" data-href="#/library?tab=watched">Watched<em>${nw}</em></button></div>
          ${list.length ? filterBar(key, list, f, SORTS_LIB) + `<div class="result-count">${shown.length} of ${list.length} talks</div>` : ""}
          <div class="list" id="libList"></div>
          ${!list.length ? empty(tab === "saved" ? "Nothing saved yet" : "Nothing watched yet", tab === "saved" ? "Tap the heart on any talk to keep it here." : "Talks you play show up here.") :
            !shown.length ? empty("No matches", "Try loosening the filters.") : ""}
          ${tab === "watched" && nw ? `<div class="btn-row"><button class="btn ghost" data-act="clear-watched">Clear watch history</button></div>` : ""}`,
        after() { mountPager("#libList", shown, { chunk: 20 }); },
      };
    },

  };

  function upNextBlock() {
    const q = U.queue.map((id) => BY_ID.get(id)).filter(Boolean);
    return `<h2 class="h2">Up next ${q.length ? `<small><button class="link" data-act="queue-open">See all (${q.length})</button></small>` : ""}</h2>
      ${q.length ? `<div class="list">${q.slice(0, 3).map((t) => row(t)).join("")}</div>`
        : `<div class="row-sub">Nothing queued. Tap “Add to queue” on any talk.</div>`}`;
  }
  function queueSheetHtml() {
    const now = U.now && BY_ID.get(U.now);
    const q = U.queue.map((id) => BY_ID.get(id)).filter(Boolean);
    const total = q.reduce((x, t) => x + t.d, 0);
    return `<div class="grab"></div>
      <div class="q-head"><h2 class="page-title">Up next</h2><span class="row-sub">${q.length ? `${q.length} talk${q.length > 1 ? "s" : ""} · ${fmtDur(total)}` : ""}</span>
        <button class="back" data-act="sheet-close" aria-label="Close">${ICON.down}</button></div>
      <div class="seg"><button class="${U.mode === "watch" ? "on" : ""}" data-act="set-mode" data-mode="watch">${ICON.play} Watch</button>
        <button class="${U.mode === "listen" ? "on" : ""}" data-act="set-mode" data-mode="listen">${ICON.headphones} Listen</button></div>
      ${now ? `<div class="now-card" data-act="talk" data-id="${esc(now.id)}">${thumb(now)}<div class="row-body"><span class="label">Now playing</span><div class="row-title">${esc(now.t)}</div><div class="row-sub">${esc(now.s)}</div></div></div>` : ""}
      ${q.length ? `<div class="list">${q.map((t, i) => row(t, {
        lead: `<span class="q-num">${i + 1}</span>`,
        tail: `<div class="q-ctrl"><button data-act="q-up" data-i="${i}" aria-label="Move up">${ICON.up}</button><button data-act="q-down" data-i="${i}" aria-label="Move down">${ICON.down}</button></div><button class="more-btn" data-act="q-remove" data-i="${i}" aria-label="Remove">${ICON.x}</button>`,
      })).join("")}</div>` : empty("Nothing up next", "Use “Add to queue” or “Play next” on any talk.")}
      <div class="btn-row">
        ${q.length ? `<button class="btn" data-act="next">${ICON.skip} ${now ? "Skip to next" : "Start queue"}</button><button class="btn ghost" data-act="q-clear">Clear</button>` : ""}
        ${now ? `<button class="btn ghost" data-act="stop">${ICON.x} Close player</button>` : ""}
      </div>`;
  }
  const queueOpen = () => $("#sheet").classList.contains("q-sheet") && !$("#sheet").hidden;
  function openQueue() {
    const sh = $("#sheet");
    sh.classList.add("q-sheet"); sh.innerHTML = queueSheetHtml();
    sh.hidden = false; $("#sheetBackdrop").hidden = false;
  }

  function listPage({ key, title, sub, list, sorts, subject = true }) {
    const f = getF(key, sorts[0][0]);
    const shown = applyFilters(list, f);
    return {
      html: `${header(title, sub)}${filterBar(key, list, f, sorts, { subject })}
        <div class="result-count">${shown.length} talks</div><div class="list" id="lp"></div>
        ${shown.length ? "" : empty("No matches", "Try loosening the filters.")}`,
      after() { mountPager("#lp", shown); },
    };
  }

  function renderSearch(q, topics) {
    const box = $("#results");
    if (pager) pager.disconnect();
    box.nextElementSibling?.classList.contains("sentinel") && box.nextElementSibling.remove();
    if (!q) {
      box.innerHTML = `<h2 class="h2">Subjects</h2><div class="topic-grid">${topics.map(([k, c]) => {
        const col = colorOf(k);
        return `<a class="topic-tile ${LIGHT.has(col) ? "light" : ""}" style="--c:var(${col})" href="#/topic/${encodeURIComponent(k)}"><b>${esc(k)}</b><span>${c} talks</span></a>`;
      }).join("")}</div>
      <h2 class="h2">Most viewed ever</h2><div class="list" id="srList"></div>`;
      mountPager("#srList", [...TALKS].sort((a, b) => b.v - a.v), { chunk: 15 });
      return;
    }
    const all = search(q);
    const key = "search";
    const f = getF(key, "relevance");
    const shown = applyFilters(all, f);
    box.innerHTML = `${all.length ? filterBar(key, all, f, SORTS) : ""}
      <div class="result-count">${shown.length} result${shown.length === 1 ? "" : "s"} for “${esc(q)}”</div>
      <div class="list" id="srList"></div>${all.length ? "" : empty("No talks found", "Try a speaker's name or a subject like “climate”.")}`;
    mountPager("#srList", shown, { chunk: 15 });
  }

  // ---------- router ----------
  const scrollMemo = new Map();
  function route() {
    let raw = location.hash.slice(1) || "/home";
    if (raw.startsWith("/queue")) { history.replaceState(null, "", "#/home"); raw = "/home"; setTimeout(openQueue); }
    const [path, qs] = raw.split("?");
    const params = new URLSearchParams(qs || "");
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
    const name = PAGES[parts[0]] ? parts[0] : "home";
    if (pager) { pager.disconnect(); pager = null; }
    if (name === "home" && parts[0] !== "home" && !raw.startsWith("/home")) { /* default */ }
    const page = PAGES[name](params, parts[1]);
    const view = $("#view");
    view.innerHTML = page.html;
    page.after?.();
    view.scrollTop = scrollMemo.get(raw) || 0;
    const tab = { talk: null, similar: null, speaker: null, topic: "browse" }[name] ?? name;
    document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.tab === tab));
    layoutDock(name === "talk" && parts[1] === U.now);
  }
  $("#view").addEventListener("scroll", () => scrollMemo.set(location.hash.slice(1) || "/home", $("#view").scrollTop), { passive: true });
  const rerender = () => { const v = $("#view"), top = v.scrollTop; route(); v.scrollTop = top; if (queueOpen()) $("#sheet").innerHTML = queueSheetHtml(); };

  // ---------- player ----------
  const audio = $("#audio");
  let loadedKey = null;
  function layoutDock(full) {
    const dock = $("#dock"), app = $("#app");
    const t = U.now && BY_ID.get(U.now);
    $("#dockQCount").textContent = U.queue.length || "";
    if (!t) {
      stopAudio();
      const first = U.queue.length && BY_ID.get(U.queue[0]);
      if (!first) { dock.hidden = true; app.classList.remove("has-mini", "player-full"); $("#dockVideo").innerHTML = ""; loadedKey = null; return; }
      // Nothing playing but talks are queued: show a "start queue" bar.
      if (loadedKey !== "idle" + first.id) { $("#dockVideo").innerHTML = `<img src="${esc(first.img)}" alt="">`; loadedKey = "idle" + first.id; }
      $("#dockTitle").textContent = `${U.queue.length} talk${U.queue.length > 1 ? "s" : ""} in queue`;
      $("#dockSub").textContent = "Next: " + first.t;
      $(".dock-next").disabled = false;
      dock.className = "dock mini idle"; dock.hidden = false;
      app.classList.add("has-mini"); app.classList.remove("player-full");
      return;
    }
    dock.classList.remove("idle");
    const listen = U.mode === "listen" && !!t.a;
    if (loadedKey !== t.id + listen) {
      $("#dockVideo").innerHTML = listen
        ? `<div class="listen" style="background-image:url('${esc(t.img)}')">
             <div class="listen-ctrls">
               <button class="icon-btn" data-act="seek" data-s="-15" aria-label="Back 15 seconds">${ICON.back15}</button>
               <button class="icon-btn pp" data-act="toggle" aria-label="Play or pause"></button>
               <button class="icon-btn" data-act="seek" data-s="15" aria-label="Forward 15 seconds">${ICON.fwd15}</button>
             </div>
             <div class="listen-bar"><span id="tCur">0:00</span><input id="seekBar" type="range" min="0" max="${t.d}" step="1" value="0" aria-label="Position"><span>${fmtClock(t.d)}</span></div>
           </div>`
        : `<iframe src="https://embed.ted.com/talks/${encodeURIComponent(t.id)}?autoplay=true" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen title="${esc(t.t)}"></iframe>`;
      loadedKey = t.id + listen;
      if (listen) { if (audio.dataset.id !== t.id) loadAudio(t); syncAudioUi(); }
      else stopAudio();
    }
    dock.classList.toggle("listening", listen);
    $("#dockTitle").textContent = t.t;
    $("#dockSub").textContent = t.s;
    $(".dock-next").disabled = !U.queue.length;
    dock.hidden = false;
    dock.classList.toggle("full", full);
    dock.classList.toggle("mini", !full);
    app.classList.toggle("player-full", full);
    app.classList.toggle("has-mini", !full);
  }

  // ---------- audio (Listen mode) ----------
  function loadAudio(t) {
    audio.src = t.a; audio.dataset.id = t.id;
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.t, artist: t.s, album: "Ned",
        artwork: t.img ? [{ src: t.img, sizes: "640x360", type: "image/jpeg" }] : [] });
    }
  }
  function stopAudio() {
    if (!audio.dataset.id) return;
    audio.pause(); audio.removeAttribute("src"); audio.load(); delete audio.dataset.id;
  }
  function syncAudioUi() {
    const playingNow = !audio.paused;
    document.querySelectorAll(".pp").forEach((b) => (b.innerHTML = playingNow ? ICON.pause : ICON.play));
    const bar = $("#seekBar");
    if (bar && !bar.matches(":active")) bar.value = Math.floor(audio.currentTime || 0);
    const cur = $("#tCur"); if (cur) cur.textContent = fmtClock(Math.floor(audio.currentTime || 0));
  }
  ["play", "pause", "timeupdate", "loadedmetadata"].forEach((ev) => audio.addEventListener(ev, syncAudioUi));
  audio.addEventListener("ended", () => { if (U.queue.length) playNextInQueue(); else syncAudioUi(); });
  document.addEventListener("input", (e) => { if (e.target.id === "seekBar") audio.currentTime = +e.target.value; });
  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession, on = (a, f) => { try { ms.setActionHandler(a, f); } catch {} };
    on("play", () => audio.play());
    on("pause", () => audio.pause());
    on("nexttrack", () => playNextInQueue());
    on("previoustrack", () => (audio.currentTime = 0));
    on("seekbackward", () => (audio.currentTime = Math.max(0, audio.currentTime - 15)));
    on("seekforward", () => (audio.currentTime += 15));
    on("seekto", (d) => (audio.currentTime = d.seekTime));
  }

  function play(id, mode = U.mode, { nav = true } = {}) {
    const t = BY_ID.get(id);
    if (mode === "listen" && !t.a) { mode = "watch"; toast("No audio version — playing video"); }
    U.mode = mode;
    if (mode === "listen") { loadAudio(t); audio.play().catch(() => {}); } // start inside the tap / ended event so phones allow it
    else stopAudio();
    U.now = id;
    U.queue = U.queue.filter((x) => x !== id);
    U.watched[id] = Date.now();
    FEED = null;
    persist();
    if (!nav || location.hash === "#/talk/" + encodeURIComponent(id)) rerender();
    else location.hash = "#/talk/" + encodeURIComponent(id);
  }
  function playNextInQueue() {
    if (!U.queue.length) { toast("Queue is empty"); return; }
    // While listening, skip talks that only have video (they stay in the queue for later).
    const next = U.mode === "listen" ? U.queue.find((id) => BY_ID.get(id)?.a) : U.queue[0];
    if (!next) { audio.pause(); toast("Next talks are video-only — switch to Watch"); return; }
    play(next);
  }

  // TED's embed posts player events; advance the queue when a talk ends.
  window.addEventListener("message", (e) => {
    if (!/(^|\.)ted\.com$/.test(e.origin.replace(/^https?:\/\//, ""))) return;
    const d = typeof e.data === "string" ? e.data : JSON.stringify(e.data || "");
    if (/ended|complete|finished/i.test(d) && U.queue.length) playNextInQueue();
  });

  // ---------- actions ----------
  function toast(msg, undo) {
    const el = $("#toast");
    el.innerHTML = esc(msg) + (undo ? ' <button class="undo">Undo</button>' : "");
    el.hidden = false;
    if (undo) el.querySelector(".undo").onclick = (e) => { e.stopPropagation(); undo(); el.hidden = true; };
    clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), undo ? 4000 : 1800);
  }
  // Change the queue, then offer Undo.
  function editQueue(next, msg) {
    const before = U.queue.slice();
    U.queue = next; persist(); rerender();
    if (msg) toast(msg, () => { U.queue = before; persist(); rerender(); });
  }
  function updateBadge() { const c = $("#dockQCount"); if (c) c.textContent = U.queue.length || ""; }

  function openSheet(id) {
    const t = BY_ID.get(id);
    const sh = $("#sheet");
    const opt = (act, icon, label, extra = "") => `<button class="opt" data-act="${act}" data-id="${esc(id)}" ${extra}>${icon}${label}</button>`;
    sh.innerHTML = `<div class="grab"></div>
      <div class="sheet-head">${thumb(t)}<div class="row-body"><div class="row-title">${esc(t.t)}</div><div class="row-sub">${esc(t.s)} · ${fmtDur(t.d)}</div></div></div>
      ${opt("play", ICON.play, "Watch now", 'data-mode="watch"')}
      ${t.a ? opt("play", ICON.headphones, "Listen now", 'data-mode="listen"') : ""}
      ${opt("play-next", ICON.next, "Play next")}
      ${opt("enqueue", ICON.queue, U.queue.includes(id) ? "Move to end of queue" : "Add to queue")}
      ${opt("save", U.saved[id] ? ICON.heart : ICON.heartO, U.saved[id] ? "Remove from saved" : "Save")}
      ${opt("similar", ICON.similar, "More like this")}
      ${t.sp.map(([slug, name]) => `<button class="opt" data-act="go" data-href="#/speaker/${encodeURIComponent(slug)}">${ICON.person}More from ${esc(name)}</button>`).join("")}
      ${opt("toggle-watched", ICON.check, U.watched[id] ? "Mark as unwatched" : "Mark as watched")}`;
    sh.classList.remove("q-sheet");
    sh.hidden = false; $("#sheetBackdrop").hidden = false;
  }
  function closeSheet() { const sh = $("#sheet"); sh.hidden = true; sh.classList.remove("q-sheet"); $("#sheetBackdrop").hidden = true; }

  const ACTIONS = {
    talk: (el) => (location.hash = "#/talk/" + encodeURIComponent(el.dataset.id)),
    play: (el) => play(el.dataset.id, el.dataset.mode || U.mode),
    toggle: () => (audio.paused ? audio.play() : audio.pause()),
    seek: (el) => (audio.currentTime = Math.max(0, audio.currentTime + +el.dataset.s)),
    "set-mode": (el) => { const m = el.dataset.mode; if (U.now) play(U.now, m, { nav: false }); else { U.mode = m; persist(); rerender(); } },
    "open-now": () => U.now && (location.hash = "#/talk/" + encodeURIComponent(U.now)),
    next: playNextInQueue,
    stop: () => { U.now = null; stopAudio(); persist(); rerender(); },
    "play-next": (el) => { const id = el.dataset.id; if (id === U.now) return toast("Already playing"); if (!U.now) return play(id); editQueue([id, ...U.queue.filter((x) => x !== id)], "Plays next"); },
    enqueue: (el) => { const id = el.dataset.id; if (id === U.now) return toast("Already playing"); const q = [...U.queue.filter((x) => x !== id), id]; editQueue(q, `Added · #${q.length} in queue`); },
    "queue-all": (el) => { const ids = el.dataset.ids.split(",").filter((x) => x !== U.now); editQueue([...U.queue.filter((x) => !ids.includes(x)), ...ids], `${ids.length} talks queued`); },
    "queue-open": openQueue,
    "sheet-close": () => closeSheet(),
    save: (el) => { const id = el.dataset.id; if (U.saved[id]) { delete U.saved[id]; toast("Removed from saved"); } else { U.saved[id] = Date.now(); toast("Saved to library"); } persist(); rerender(); },
    similar: (el) => (location.hash = "#/similar/" + encodeURIComponent(el.dataset.id)),
    "toggle-watched": (el) => { const id = el.dataset.id; if (U.watched[id]) delete U.watched[id]; else U.watched[id] = Date.now(); persist(); rerender(); },
    sheet: (el) => openSheet(el.dataset.id),
    go: (el) => (location.hash = el.dataset.href),
    back: () => (history.length > 1 ? history.back() : (location.hash = "#/home")),
    "q-up": (el) => { const i = +el.dataset.i; if (i > 0) { [U.queue[i - 1], U.queue[i]] = [U.queue[i], U.queue[i - 1]]; persist(); rerender(); } },
    "q-down": (el) => { const i = +el.dataset.i; if (i < U.queue.length - 1) { [U.queue[i + 1], U.queue[i]] = [U.queue[i], U.queue[i + 1]]; persist(); rerender(); } },
    "q-remove": (el) => { const q = U.queue.slice(); q.splice(+el.dataset.i, 1); editQueue(q, "Removed from queue"); },
    "q-clear": () => editQueue([], "Queue cleared"),
    "clear-watched": () => { if (confirm("Clear your whole watch history?")) { U.watched = {}; persist(); rerender(); } },
    "clear-filters": (el) => { const f = FILTERS[el.dataset.key]; Object.assign(f, { len: "any", topic: "", views: "0" }); refreshFiltered(el.dataset.key); },
  };

  function refreshFiltered(key) {
    if (key === "search") { const q = $("#q"); renderSearch(q.value.trim(), [...TOPIC_COUNT].sort((a, b) => b[1] - a[1]).slice(0, 24)); }
    else rerender();
  }

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || el.disabled) return;
    if (el.tagName === "A" && el.getAttribute("href")) return;
    const act = el.dataset.act;
    if (!ACTIONS[act]) return;
    e.preventDefault(); e.stopPropagation();
    if (el.closest("#sheet") && !queueOpen()) closeSheet();
    ACTIONS[act](el);
  });
  document.addEventListener("change", (e) => {
    const s = e.target.closest("select[data-filter]");
    if (!s) return;
    FILTERS[s.dataset.filter][s.dataset.name] = s.value;
    refreshFiltered(s.dataset.filter);
  });
  $("#sheetBackdrop").addEventListener("click", closeSheet);
  window.addEventListener("hashchange", () => { closeSheet(); route(); });

  // ---------- boot ----------
  loadData().then(() => { updateBadge(); route(); }).catch((err) => {
    $("#view").innerHTML = empty("Couldn't load talks", "Run fetch-talks.py first, then serve this folder. " + err.message);
  });
})();
