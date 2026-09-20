(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const STORAGE = {
    days: "sdd-days",
    notes: "sdd-notes",
    extras: "sdd-extra-photos",
    cycle: "sdd-cycle",
    gate: "sdd-gate-opened",
  };

  const WORDS = [
    "今天也要被好好爱着。",
    "你一笑，连奶油都甜了一点。",
    "世界很大，我只要三多多这一小块温柔。",
    "想把所有粉色的晚霞，都寄给你。",
    "慢慢来，我在。",
    "你是我偷偷收藏的春天。",
  ];

  const BUILTIN_PHOTOS = [
    { src: "assets/photos/01-winter.png", caption: "暖暖的冬日" },
    { src: "assets/photos/02-night.png", caption: "夜色里的你" },
    { src: "assets/photos/03-home.png", caption: "家里的笑容" },
    { src: "assets/photos/04-mountain.png", caption: "山风轻轻经过" },
    { src: "assets/photos/05-dance.png", caption: "开心的热舞" },
    { src: "assets/photos/06-smile.png", caption: "比心的瞬间" },
  ];

  const load = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`);

  const todayISO = () => {
    const d = new Date();
    const z = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  };

  const fmtDate = (iso) => {
    const [y, m, d] = iso.split("-");
    return `${y}年${Number(m)}月${Number(d)}日`;
  };

  const dayDiff = (iso) => {
    const a = new Date(`${iso}T00:00:00`);
    const b = new Date(`${todayISO()}T00:00:00`);
    return Math.round((a - b) / 86400000);
  };

  /* ---------- petals ---------- */
  const layer = $(".petal-layer");
  if (layer && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (let i = 0; i < 14; i++) {
      const p = document.createElement("i");
      p.className = "petal";
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${10 + Math.random() * 12}s`;
      p.style.animationDelay = `${-Math.random() * 12}s`;
      p.style.transform = `scale(${0.6 + Math.random()})`;
      layer.appendChild(p);
    }
  }

  /* ---------- gate ---------- */
  const gate = $("#gate");
  if (sessionStorage.getItem(STORAGE.gate) === "1") gate.classList.add("hide");
  $("#open-gate").addEventListener("click", () => {
    gate.classList.add("hide");
    sessionStorage.setItem(STORAGE.gate, "1");
  });

  /* ---------- greeting ---------- */
  const hour = new Date().getHours();
  const hello = hour < 6 ? "夜深了，多多" : hour < 11 ? "早安呀，多多" : hour < 14 ? "中午好，多多" : hour < 18 ? "下午好，多多" : "晚上好呀，多多";
  $("#greeting").textContent = hello;
  $("#today-word").textContent = WORDS[new Date().getDate() % WORDS.length];

  /* ---------- router ---------- */
  const go = (name) => {
    $$(".page").forEach((p) => p.classList.toggle("active", p.dataset.page === name));
    $$("[data-go]").forEach((b) => b.classList.toggle("active", b.dataset.go === name));
    history.replaceState(null, "", `#${name}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-go]");
    if (btn) go(btn.dataset.go);
  });
  const startPage = location.hash.replace("#", "") || "home";
  go(["home", "photos", "days", "notes", "cycle"].includes(startPage) ? startPage : "home");

  /* ---------- photos ---------- */
  let extras = load(STORAGE.extras, []);
  let album = [];
  let currentIndex = 0;

  const renderPhotos = () => {
    album = [...BUILTIN_PHOTOS, ...extras];
    const wall = $("#polaroid-wall");
    wall.innerHTML = album
      .map(
        (p, i) => `
      <button class="polaroid" data-index="${i}" type="button">
        <span class="tape"></span>
        <img src="${p.src}" alt="${p.caption}" />
        <figcaption>${p.caption}</figcaption>
      </button>`
      )
      .join("");
    $("#mini-stack").innerHTML = album
      .slice(0, 3)
      .map((p) => `<img src="${p.src}" alt="" />`)
      .join("");
  };

  const lightbox = $("#lightbox");
  const openLight = (i) => {
    currentIndex = (i + album.length) % album.length;
    const item = album[currentIndex];
    $("#lightbox-img").src = item.src;
    $("#lightbox-img").alt = item.caption;
    $("#lightbox-cap").textContent = item.caption;
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
  };
  const closeLight = () => {
    lightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
  };

  $("#polaroid-wall").addEventListener("click", (e) => {
    const card = e.target.closest(".polaroid");
    if (card) openLight(Number(card.dataset.index));
  });
  $("#lightbox-close").addEventListener("click", closeLight);
  $("#lightbox-prev").addEventListener("click", () => openLight(currentIndex - 1));
  $("#lightbox-next").addEventListener("click", () => openLight(currentIndex + 1));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLight();
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLight();
    if (e.key === "ArrowLeft") openLight(currentIndex - 1);
    if (e.key === "ArrowRight") openLight(currentIndex + 1);
  });

  $("#photo-input").addEventListener("change", async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      const src = await compressImage(file);
      extras.push({ src, caption: file.name.replace(/\.[^.]+$/, "") || "新的一帧" });
    }
    save(STORAGE.extras, extras);
    renderPhotos();
    e.target.value = "";
  });

  function compressImage(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 1200;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = url;
    });
  }

  renderPhotos();

  /* ---------- days ---------- */
  let days = load(STORAGE.days, [
    { id: "born", title: "小站诞生", date: "2026-09-20", note: "三多多专属小宇宙上线的日子" },
  ]);

  const nearest = () => {
    const upcoming = days
      .map((d) => ({ ...d, diff: nextOccurrence(d.date) }))
      .sort((a, b) => a.diff - b.diff);
    return upcoming[0];
  };

  const nextOccurrence = (iso) => {
    const now = new Date(`${todayISO()}T00:00:00`);
    const [y, m, d] = iso.split("-").map(Number);
    let next = new Date(now.getFullYear(), m - 1, d);
    if (next < now) next = new Date(now.getFullYear() + 1, m - 1, d);
    return Math.round((next - now) / 86400000);
  };

  const renderDays = () => {
    const n = nearest();
    $("#countdown-hero").innerHTML = n
      ? `<p>最近的纪念日</p><strong>${n.title}</strong><div>还有 <em>${n.diff}</em> 天</div>`
      : `<p>还没有纪念日</p><strong>先收下今天吧</strong>`;
    $("#day-list").innerHTML = days
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const diff = dayDiff(d.date);
        const label = diff > 0 ? `还有 ${diff} 天` : diff === 0 ? "就是今天" : `已经 ${Math.abs(diff)} 天`;
        return `<article class="day-card">
          <div>
            <strong>${d.title}</strong>
            <div>${fmtDate(d.date)} · ${label}</div>
            <small>${d.note || ""}</small>
          </div>
          <button type="button" data-del-day="${d.id}">放下</button>
        </article>`;
      })
      .join("");
  };

  $("#day-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    days.push({
      id: uid(),
      title: data.get("title").trim(),
      date: data.get("date"),
      note: data.get("note").trim(),
    });
    save(STORAGE.days, days);
    e.target.reset();
    renderDays();
  });
  $("#day-list").addEventListener("click", (e) => {
    const id = e.target.dataset.delDay;
    if (!id) return;
    days = days.filter((d) => d.id !== id);
    save(STORAGE.days, days);
    renderDays();
  });
  renderDays();

  /* ---------- notes ---------- */
  let notes = load(STORAGE.notes, [
    { id: "n1", author: "我", text: "多多，今天也好看。想把这一页永远留着。", time: Date.now() - 86400000 },
    { id: "n2", author: "我", text: "如果累了，就在这个小站里歇一歇。", time: Date.now() - 3600000 },
  ]);

  const renderNotes = () => {
    $("#note-wall").innerHTML = notes
      .slice()
      .sort((a, b) => b.time - a.time)
      .map(
        (n) => `<article class="sticky">
          <strong>${n.author}</strong>
          <p>${n.text}</p>
          <footer>
            <span>${new Date(n.time).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            <button type="button" data-del-note="${n.id}">收起</button>
          </footer>
        </article>`
      )
      .join("");
  };

  $("#note-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    notes.unshift({
      id: uid(),
      author: data.get("author").trim() || "我",
      text: data.get("text").trim(),
      time: Date.now(),
    });
    save(STORAGE.notes, notes);
    e.target.reset();
    renderNotes();
  });
  $("#note-wall").addEventListener("click", (e) => {
    const id = e.target.dataset.delNote;
    if (!id) return;
    notes = notes.filter((n) => n.id !== id);
    save(STORAGE.notes, notes);
    renderNotes();
  });
  renderNotes();

  /* ---------- cycle ---------- */
  let cycleState = load(STORAGE.cycle, {
    cycleLength: 28,
    periodLength: 5,
    starts: [],
  });
  let view = new Date();

  const addDays = (iso, n) => {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + n);
    const z = (x) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  };

  const lastStart = () => cycleState.starts.slice().sort().at(-1);

  const predictedStarts = () => {
    const last = lastStart();
    if (!last) return [];
    const out = [];
    for (let i = 1; i <= 6; i++) out.push(addDays(last, cycleState.cycleLength * i));
    return out;
  };

  const inRange = (iso, start, len) => {
    const diff = dayDiff(iso) - dayDiff(start);
    return diff >= 0 && diff < len;
  };

  const isPeriod = (iso) => cycleState.starts.some((s) => inRange(iso, s, cycleState.periodLength));
  const isPredict = (iso) => predictedStarts().some((s) => inRange(iso, s, cycleState.periodLength));
  const isFertile = (iso) => {
    const last = lastStart();
    if (!last) return false;
    const ovulation = cycleState.cycleLength - 14;
    const starts = [last, ...predictedStarts()];
    return starts.some((s) => {
      const diff = dayDiff(iso) - dayDiff(s);
      return diff >= ovulation - 5 && diff <= ovulation + 1;
    });
  };

  const renderCycle = () => {
    const y = view.getFullYear();
    const m = view.getMonth();
    $("#cal-title").textContent = `${y}年${m + 1}月`;
    const first = new Date(y, m, 1);
    const startWeek = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const dow = ["日", "一", "二", "三", "四", "五", "六"].map((d) => `<div class="dow">${d}</div>`).join("");
    let cells = "";
    for (let i = 0; i < startWeek; i++) cells += "<div></div>";
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const cls = [
        isPeriod(iso) ? "period" : "",
        !isPeriod(iso) && isPredict(iso) ? "predict" : "",
        isFertile(iso) ? "fertile" : "",
        iso === todayISO() ? "today" : "",
      ]
        .filter(Boolean)
        .join(" ");
      cells += `<button type="button" class="${cls}" data-iso="${iso}">${d}</button>`;
    }
    $("#calendar").innerHTML = dow + cells;

    const last = lastStart();
    let summary = "还没有记录，点选日历上的日期，标记经期开始。";
    if (last) {
      const next = addDays(last, cycleState.cycleLength);
      const left = dayDiff(next);
      if (isPeriod(todayISO())) summary = "今天在经期里，慢慢来，对自己再温柔一点。";
      else if (left >= 0) summary = `距离下次经期大约还有 ${left} 天`;
      else summary = "可以记下新的一次开始啦";
    }
    $("#cycle-summary").innerHTML = `<p>此刻</p><strong>${summary}</strong>`;
    $("#cycle-form").cycleLength.value = cycleState.cycleLength;
    $("#cycle-form").periodLength.value = cycleState.periodLength;
  };

  $("#cal-prev").addEventListener("click", () => {
    view.setMonth(view.getMonth() - 1);
    renderCycle();
  });
  $("#cal-next").addEventListener("click", () => {
    view.setMonth(view.getMonth() + 1);
    renderCycle();
  });
  $("#calendar").addEventListener("click", (e) => {
    const iso = e.target.dataset.iso;
    if (!iso) return;
    if (cycleState.starts.includes(iso)) {
      cycleState.starts = cycleState.starts.filter((s) => s !== iso);
    } else {
      cycleState.starts.push(iso);
    }
    save(STORAGE.cycle, cycleState);
    renderCycle();
  });
  $("#cycle-form").addEventListener("submit", (e) => {
    e.preventDefault();
    cycleState.cycleLength = Number(e.target.cycleLength.value) || 28;
    cycleState.periodLength = Number(e.target.periodLength.value) || 5;
    save(STORAGE.cycle, cycleState);
    renderCycle();
  });
  renderCycle();

  /* ---------- background music ---------- */
  const NETEASE_ID = "25730757";
  const NETEASE_URL = `https://music.163.com/song/media/outer/url?id=${NETEASE_ID}.mp3`;
  const audio = $("#bgm");
  audio.volume = 0.72;

  const setPlaying = (on) => {
    $("#player").classList.toggle("playing", on);
    $("#play-song").textContent = on ? "⏸" : "▶";
  };

  const showNeteaseEmbed = () => {
    const box = $("#player-embed");
    if (!box.hidden && box.querySelector("iframe")) return;
    box.hidden = false;
    $("#player").classList.add("embed-mode");
    box.innerHTML = `<iframe title="稳稳的幸福 陈奕迅" allow="autoplay" src="https://music.163.com/outchain/player?type=2&id=${NETEASE_ID}&auto=1&height=66"></iframe>`;
  };

  const playBgm = async () => {
    if (!audio.getAttribute("src")) audio.src = NETEASE_URL;
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      showNeteaseEmbed();
    }
  };

  audio.addEventListener("playing", () => setPlaying(true));
  audio.addEventListener("pause", () => {
    if (!audio.ended) setPlaying(false);
  });
  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    $("#seek").value = Math.floor((audio.currentTime / audio.duration) * 1000);
  });
  audio.addEventListener("error", showNeteaseEmbed);
  audio.addEventListener("error", showNeteaseEmbed);

  $("#play-song").addEventListener("click", () => {
    if (audio.paused) playBgm();
    else audio.pause();
  });
  $("#player-toggle").addEventListener("click", () => $("#play-song").click());
  $("#seek").addEventListener("input", (e) => {
    if (!audio.duration) return;
    audio.currentTime = (Number(e.target.value) / 1000) * audio.duration;
  });
  $("#open-gate").addEventListener("click", () => playBgm());
})();
