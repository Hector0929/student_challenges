// App wiring: scene, labels, panel, cards, log, day tour and input.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { buildIslands, buildBridges, buildGraph, GROUND_Y, R } from "./world.js";
import { createEnvironment } from "./environment.js";
import { createPeople, ROLE_LABEL } from "./people.js";
import { createFlows } from "./flows.js";

const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const hhmm = (m) => {
  m = ((Math.floor(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const isMobile = () => matchMedia("(max-width: 860px)").matches;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);
const quality = params.get("quality") || (innerWidth <= 860 || /Mobi|Android/i.test(navigator.userAgent) ? "medium" : "high");

const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* storage unavailable: progress lives only for this visit */
    }
  },
};

const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  tag: svg('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  pause: svg('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'),
  play: svg('<path d="M6 4l14 8-14 8Z"/>'),
  globe: svg('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>'),
  scroll: svg('<path d="M8 21h11a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M10 8h6M10 12h6"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  replay: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
};
const paintIcons = (root = document) => $$("i[data-icon]", root).forEach((i) => (i.innerHTML = ICONS[i.dataset.icon] || ""));
paintIcons();

try {
  const data = await fetch("./data.json").then((r) => {
    if (!r.ok) throw Error(`data.json: ${r.status}`);
    return r.json();
  });
  const islandDefs = new Map(data.islands.map((i) => [i.id, i]));
  const challengeDefs = new Map(data.islands.flatMap((i) => i.challenges.map((c) => [c.id, { ...c, island: i.id }])));
  const flowDefs = new Map(data.flows.map((f) => [f.id, f]));
  const totalChallenges = challengeDefs.size;

  // ---------- renderer / camera ----------
  const app = $("#app"),
    stage = $("#stage");
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality === "high" ? 2 : 1.5));
  renderer.shadowMap.enabled = quality !== "low";
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.appendChild(renderer.domElement);
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = "label-layer";
  stage.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 300);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 5, maxDistance: 85, maxPolarAngle: 1.25, minPolarAngle: 0.2, screenSpacePanning: false });

  // ---------- world ----------
  const { islands, pickables } = buildIslands(data, scene);
  const bridges = buildBridges(data, islands, scene);
  const nodes = buildGraph(islands, bridges);
  const env = createEnvironment(scene, islands, quality);
  const buildings = new Map();
  for (const isl of islands.values())
    for (const b of isl.buildings) {
      b.world = isl.center.clone().add(b.local);
      buildings.set(b.id, b);
    }
  const flows = createFlows(scene, data, buildings);

  // completion coins above finished buildings
  const coinGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.035, 18);
  coinGeo.rotateX(Math.PI / 2);
  const coinMat = new THREE.MeshStandardMaterial({ color: 0xf4c542, emissive: 0x6b4a00, emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.35 });
  for (const b of buildings.values()) {
    b.coin = new THREE.Mesh(coinGeo, coinMat);
    b.coin.position.set(b.local.x, b.height + 0.2, b.local.z);
    b.coin.visible = false;
    islands.get(b.island).group.add(b.coin);
  }

  // pulsing ring under the selected building
  const selRingGeo = new THREE.RingGeometry(0.5, 0.62, 32);
  selRingGeo.rotateX(-Math.PI / 2);
  const selRing = new THREE.Mesh(selRingGeo, new THREE.MeshBasicMaterial({ color: 0xdb6a41, transparent: true, depthWrite: false }));
  selRing.visible = false;
  scene.add(selRing);

  // ---------- state ----------
  const state = {
    minute: 480,
    paused: false,
    names: true,
    selected: null, // {type, id}
    hover: null,
    follow: null,
    fly: null,
    tour: null,
    tab: "list",
    query: "",
    done: new Set(store.get("ci-done", []).filter((id) => challengeDefs.has(id))),
  };

  // ---------- labels ----------
  const islandLabels = new Map();
  for (const isl of islands.values()) {
    const el = document.createElement("button");
    el.className = "lbl-island";
    el.addEventListener("click", () => selectIsland(isl.id));
    const obj = new CSS2DObject(el);
    obj.position.set(0, GROUND_Y + 0.3, R * 0.98);
    isl.group.add(obj);
    islandLabels.set(isl.id, el);
  }
  for (const b of buildings.values()) {
    const el = document.createElement("button");
    el.className = "lbl-b";
    el.textContent = `${b.def.icon} ${b.def.name}`;
    el.addEventListener("click", () => selectBuilding(b.id));
    const obj = new CSS2DObject(el);
    obj.position.set(b.local.x, b.height + 0.5, b.local.z);
    islands.get(b.island).group.add(obj);
    b.label = el;
  }
  const walkerTag = document.createElement("div");
  walkerTag.className = "lbl-walker";
  const walkerTagObj = new CSS2DObject(walkerTag);
  walkerTagObj.position.y = 0.48;
  walkerTagObj.visible = false;
  scene.add(walkerTagObj);

  function syncProgress() {
    for (const isl of islands.values()) {
      const n = isl.def.challenges.length,
        k = isl.def.challenges.filter((c) => state.done.has(c.id)).length;
      const el = islandLabels.get(isl.id);
      el.innerHTML = `<span>${isl.def.icon}</span>${esc(isl.def.name)}<small>${k}/${n}</small>`;
      el.classList.toggle("full", k === n);
      isl.flag.visible = k === n;
    }
    for (const b of buildings.values()) {
      const d = state.done.has(b.id);
      b.coin.visible = d;
      b.label.classList.toggle("done", d);
    }
    renderStats();
  }

  // ---------- people & log ----------
  const log = [];
  let lastAmbient = 0;
  const btn = (id) => {
    const c = challengeDefs.get(id);
    return `<button class="ref" data-building="${id}">${c.icon} ${esc(c.name)}</button>`;
  };
  const islBtn = (id) => `<button class="ref" data-island="${id}">${esc(islandDefs.get(id).name)}</button>`;
  const people = createPeople(scene, nodes, quality === "high" ? 40 : 26, (ev) => {
    const now = performance.now();
    const w = ev.walker;
    if (state.selected?.type === "building" && ev.building === state.selected.id) refreshLive();
    // ambient chatter is throttled; first visits and solves get through more often
    const gap = ev.type === "solved" || ev.first ? 1200 : 2600;
    if (now - lastAmbient < gap && w !== state.follow) return;
    lastAmbient = now;
    const who = `<b>${esc(w.name)}</b>`;
    if (ev.type === "arrive") pushLog(ev.first ? "🧭" : "🌉", ev.first ? `${who}（${ROLE_LABEL[w.role]}）第一次登上${islBtn(ev.island)}` : `${who} 走過橋，來到${islBtn(ev.island)}`);
    else if (ev.type === "challenge") pushLog("✏️", `${who} 開始挑戰 ${btn(ev.building)}`);
    else if (ev.type === "solved") pushLog("✨", `${who} 完成了 ${btn(ev.building)}`);
  });
  const walkerMeshes = people.walkers.flatMap((w) => w.mesh.children);

  function pushLog(icon, html, cls = "") {
    log.unshift({ minute: state.minute, icon, html, cls });
    if (log.length > 80) log.pop();
    const li = document.createElement("li");
    if (cls) li.className = cls;
    li.innerHTML = `<time>${hhmm(state.minute)}</time><span>${icon}</span><span>${html}</span>`;
    const ol = $("#log");
    ol.prepend(li);
    while (ol.children.length > 80) ol.lastElementChild.remove();
  }

  // ---------- panel ----------
  function renderStats() {
    $("#stats").innerHTML = [
      [islands.size, "座島"],
      [totalChallenges, "個挑戰"],
      [state.done.size, "已完成", "hl"],
      [flows.flows.length, "條連結"],
    ]
      .map(([v, t, c = ""]) => `<div class="stat ${c}"><b>${v}</b><span>${t}</span></div>`)
      .join("");
  }
  function highlight(text, q) {
    const s = esc(text);
    if (!q) return s;
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return s;
    return esc(text.slice(0, i)) + `<mark>${esc(text.slice(i, i + q.length))}</mark>` + esc(text.slice(i + q.length));
  }
  function renderList() {
    const q = state.query.trim().toLowerCase();
    let html = "";
    data.islands.forEach((isl, i) => {
      const islandHit = !q || [isl.name, isl.en, isl.summary].join(" ").toLowerCase().includes(q);
      const chs = isl.challenges.filter((c) => islandHit || [c.name, c.desc, ...c.tags].join(" ").toLowerCase().includes(q));
      if (!chs.length) return;
      const k = isl.challenges.filter((c) => state.done.has(c.id)).length;
      html += `<div class="isl"><button class="isl-head" data-island="${isl.id}"><span class="isl-no">${String(i + 1).padStart(2, "0")}</span><span class="dot" style="background:${isl.accent}"></span><span class="isl-name">${isl.icon} ${highlight(isl.name, q)}</span><span class="isl-prog">${k}/${isl.challenges.length}</span></button><div class="chs">${chs
        .map((c) => `<button class="ch" data-building="${c.id}"><span class="ico">${c.icon}</span><span class="nm">${highlight(c.name, q)}</span>${state.done.has(c.id) ? '<span class="done">✓</span>' : ""}</button>`)
        .join("")}</div></div>`;
    });
    $("#list").innerHTML = html || `<p class="empty">找不到「${esc(state.query)}」相關的挑戰。</p>`;
    markListSelection();
  }
  function markListSelection(scroll = false) {
    const s = state.selected;
    $$("#list .ch, #list .isl-head").forEach((el) => {
      const on = (s?.type === "building" && el.dataset.building === s.id) || (s?.type === "island" && el.dataset.island === s.id);
      el.classList.toggle("sel", on);
      if (on && scroll) el.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    });
  }
  function setTab(tab) {
    state.tab = tab;
    $$(".tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    $("#list").hidden = tab !== "list";
    $("#log").hidden = tab !== "log";
  }
  function setPanel(open) {
    app.classList.toggle("panel-open", open);
  }

  // ---------- camera moves ----------
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function flyTo(target, dist, polar = 0.85) {
    const az = controls.getAzimuthalAngle();
    const offset = new THREE.Vector3().setFromSphericalCoords(dist, polar, az);
    state.fly = {
      t: 0,
      dur: reduced ? 0.01 : 1.2,
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toTarget: target.clone(),
      toPos: target.clone().add(offset),
    };
  }
  function overviewDistance() {
    const fit = 17 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return fit / Math.min(1.3, Math.max(0.62, camera.aspect)) * 0.85;
  }
  function home() {
    clearSelection();
    state.follow = null;
    flyTo(env.centroid, overviewDistance(), 0.78);
  }

  // ---------- selection & cards ----------
  const card = $("#card");
  function showCard(html) {
    card.innerHTML = `<button class="close" aria-label="關閉">${ICONS.x}</button>${html}`;
    card.hidden = false;
    paintIcons(card);
  }
  function clearSelection() {
    state.selected = null;
    state.follow = null;
    card.hidden = true;
    selRing.visible = false;
    walkerTagObj.visible = false;
    flows.setFocus(null);
    for (const b of buildings.values()) b.label.classList.remove("sel");
    markListSelection();
  }
  function flowsTouching(ids) {
    return new Set(data.flows.filter((f) => ids.has(f.from) || ids.has(f.to)).map((f) => f.id));
  }

  function selectBuilding(id, { fly = true } = {}) {
    const b = buildings.get(id);
    if (!b) return;
    state.follow = null;
    walkerTagObj.visible = false;
    state.selected = { type: "building", id };
    for (const o of buildings.values()) o.label.classList.toggle("sel", o.id === id);
    flows.setFocus(flowsTouching(new Set([id])));
    selRing.position.set(b.world.x, GROUND_Y + 0.02, b.world.z);
    selRing.visible = true;
    if (fly) flyTo(new THREE.Vector3(b.world.x, GROUND_Y + 0.4, b.world.z), isMobile() ? 14 : 12, 0.88);
    const c = b.def,
      isl = islandDefs.get(b.island),
      done = state.done.has(id);
    const rel = data.flows
      .filter((f) => f.from === id || f.to === id)
      .map((f) => {
        const other = challengeDefs.get(f.from === id ? f.to : f.from);
        return `<button data-building="${other.id}" title="${esc(f.note)}"><span>${other.icon}</span><span>${f.from === id ? "→" : "←"} ${esc(other.name)}</span><small>${esc(f.label)}</small></button>`;
      });
    const href = c.launch === "app" ? "/" : c.launch;
    showCard(`
      <p class="kicker">${isl.icon} ${esc(isl.name)} · ${esc(isl.en.toUpperCase())}</p>
      <h3><span class="big">${c.icon}</span>${esc(c.name)}</h3>
      <p>${esc(c.desc)}</p>
      <div class="pills">${c.tags.map((t) => `<span class="pill">${esc(t)}</span>`).join("")}<span class="pill hot" id="live-count" hidden></span></div>
      ${rel.length ? `<p class="sub">知識連結 · ${rel.length}</p><div class="rel">${rel.join("")}</div>` : ""}
      <div class="actions">
        <a class="primary" href="${esc(href)}" ${c.launch === "app" ? "" : 'target="_blank" rel="noopener"'}>${c.launch === "app" ? "在 QuestMon 開啟" : "開始挑戰"} ${ICONS.arrow}</a>
        <button class="ghost ${done ? "is-done" : ""}" data-done="${id}">${done ? "✓ 已完成" : "標記完成"}</button>
      </div>`);
    refreshLive();
    markListSelection(true);
  }
  function refreshLive() {
    const el = $("#live-count");
    if (!el || state.selected?.type !== "building") return;
    const n = people.walkers.filter((w) => w.busy === state.selected.id).length;
    el.hidden = !n;
    el.textContent = `${n} 位小夥伴正在挑戰`;
  }

  function selectIsland(id, { fly = true } = {}) {
    const isl = islands.get(id);
    state.follow = null;
    walkerTagObj.visible = false;
    state.selected = { type: "island", id };
    selRing.visible = false;
    for (const b of buildings.values()) b.label.classList.remove("sel");
    flows.setFocus(flowsTouching(new Set(isl.def.challenges.map((c) => c.id))));
    if (fly) flyTo(new THREE.Vector3(isl.center.x, GROUND_Y, isl.center.z), isMobile() ? 17 : 14, 0.85);
    const n = isl.def.challenges.length,
      k = isl.def.challenges.filter((c) => state.done.has(c.id)).length;
    const idx = data.islands.findIndex((d) => d.id === id) + 1;
    showCard(`
      <p class="kicker">ISLAND ${String(idx).padStart(2, "0")} · ${esc(isl.def.en.toUpperCase())}</p>
      <h3><span class="big">${isl.def.icon}</span>${esc(isl.def.name)}</h3>
      <p>${esc(isl.def.summary)}</p>
      <p class="sub">完成進度 · ${k} / ${n}</p>
      <div class="progress"><div style="width:${(k / n) * 100}%"></div></div>
      <div class="rel">${isl.def.challenges
        .map((c) => `<button data-building="${c.id}"><span>${c.icon}</span><span>${esc(c.name)}</span><small>${state.done.has(c.id) ? "✓ 已完成" : esc(c.tags[0])}</small></button>`)
        .join("")}</div>`);
    markListSelection(true);
  }

  function selectWalker(w) {
    clearSelection();
    state.selected = { type: "walker", id: w.id };
    state.follow = w;
    walkerTag.textContent = w.name;
    walkerTagObj.visible = true;
    flyTo(w.mesh.position.clone(), 7, 0.9);
    showCard(`
      <p class="kicker">島民 · ${ROLE_LABEL[w.role]}</p>
      <h3><span class="big">🧒</span>${esc(w.name)}</h3>
      <p id="walker-now"></p>
      <div class="pills"><span class="pill" id="walker-solved"></span><span class="pill" id="walker-visited"></span></div>
      <div class="actions"><button class="ghost" data-action="unfollow">停止跟隨</button></div>`);
    refreshWalker();
  }
  function refreshWalker() {
    const w = state.follow;
    if (!w || card.hidden) return;
    const now = $("#walker-now");
    if (!now) return;
    now.innerHTML = w.busy ? `正在 ${btn(w.busy)} 專心挑戰中…` : `正在${islBtn(w.island)}散步，找下一個挑戰。`;
    $("#walker-solved").textContent = `完成 ${w.solved} 次挑戰`;
    $("#walker-visited").textContent = `去過 ${w.visited.size} 座島`;
  }

  function selectFlow(id) {
    const f = flowDefs.get(id);
    if (!f) return;
    clearSelection();
    state.selected = { type: "flow", id };
    flows.setFocus(new Set([id]));
    const A = buildings.get(f.from),
      B = buildings.get(f.to);
    const mid = A.world.clone().lerp(B.world, 0.5);
    flyTo(mid, Math.max(11, A.world.distanceTo(B.world) * 1.6), 0.8);
    const a = challengeDefs.get(f.from),
      b = challengeDefs.get(f.to);
    showCard(`
      <p class="kicker">知識連結</p>
      <h3>${esc(f.label)}</h3>
      <p>${esc(f.note)}</p>
      <div class="rel">
        <button data-building="${a.id}"><span>${a.icon}</span><span>${esc(a.name)}</span><small>${esc(islandDefs.get(a.island).name)}</small></button>
        <button data-building="${b.id}"><span>${b.icon}</span><span>→ ${esc(b.name)}</span><small>${esc(islandDefs.get(b.island).name)}</small></button>
      </div>`);
  }

  function toggleDone(id) {
    const c = challengeDefs.get(id);
    if (state.done.has(id)) state.done.delete(id);
    else {
      state.done.add(id);
      pushLog("🎉", `你完成了 ${btn(id)}！`, "me");
      const isl = islandDefs.get(c.island);
      if (isl.challenges.every((x) => state.done.has(x.id))) pushLog("🏁", `${islBtn(isl.id)} 的挑戰全部完成，插上旗子！`, "me");
    }
    store.set("ci-done", [...state.done]);
    syncProgress();
    renderList();
    if (state.selected?.type === "building") selectBuilding(state.selected.id, { fly: false });
  }

  // delegated clicks for every [data-building] / [data-island] / [data-flow] button
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) return;
    if (t.classList.contains("close") && t.parentElement === card) return clearSelection();
    if (t.dataset.done) return toggleDone(t.dataset.done);
    if (t.dataset.action === "unfollow") return clearSelection();
    if (t.dataset.building && !t.classList.contains("lbl-b")) {
      if (state.tour) pauseTour(true);
      if (isMobile() && t.closest("#panel")) setPanel(false);
      return selectBuilding(t.dataset.building);
    }
    if (t.dataset.island && !t.classList.contains("lbl-island")) {
      if (isMobile() && t.closest("#panel")) setPanel(false);
      return selectIsland(t.dataset.island);
    }
    if (t.dataset.flow) return selectFlow(t.dataset.flow);
  });

  // ---------- picking ----------
  const ray = new THREE.Raycaster(),
    ndc = new THREE.Vector2();
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const targets = flows.visible ? [...walkerMeshes, ...pickables, ...flows.pickables] : [...walkerMeshes, ...pickables];
    for (const h of ray.intersectObjects(targets, false)) if (h.object.userData.pick) return h.object.userData.pick;
    return null;
  }
  const tip = $("#tip");
  const nameOf = (p) =>
    p.type === "building" ? `${challengeDefs.get(p.id).icon} ${challengeDefs.get(p.id).name}` : p.type === "island" ? islandDefs.get(p.id).name : p.type === "walker" ? `${people.walkers[p.id].name}・${ROLE_LABEL[people.walkers[p.id].role]}` : flowDefs.get(p.id).label;
  let down = null,
    hoverQueued = null;
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY }));
  canvas.addEventListener("pointerup", (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6) return;
    const p = pick(e);
    if (!p) return;
    if (state.tour && p.type !== "walker") pauseTour(true);
    if (p.type === "building") selectBuilding(p.id);
    else if (p.type === "island") selectIsland(p.id);
    else if (p.type === "walker") selectWalker(people.walkers[p.id]);
    else if (p.type === "flow") selectFlow(p.id);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    hoverQueued = e;
  });
  canvas.addEventListener("pointerleave", () => {
    hoverQueued = null;
    state.hover = null;
    tip.hidden = true;
    canvas.style.cursor = "";
  });
  function processHover() {
    if (!hoverQueued) return;
    const e = hoverQueued;
    hoverQueued = null;
    const p = down ? null : pick(e);
    state.hover = p;
    canvas.style.cursor = p ? "pointer" : "";
    if (p) {
      const ar = app.getBoundingClientRect();
      tip.textContent = nameOf(p);
      tip.style.left = `${e.clientX - ar.left}px`;
      tip.style.top = `${e.clientY - ar.top}px`;
      tip.hidden = false;
    } else tip.hidden = true;
  }

  // ---------- tools ----------
  function setToggle(tool, on) {
    const b = $(`.tg[data-tool="${tool}"]`);
    b.classList.toggle("on", on);
    return b;
  }
  function setPaused(p) {
    state.paused = p;
    const b = $('.tg[data-tool="pause"]');
    b.classList.toggle("active", p);
    b.querySelector("i").dataset.icon = p ? "play" : "pause";
    b.querySelector("span").textContent = p ? "繼續" : "暫停";
    paintIcons(b);
  }
  $(".toolbar").addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.time) {
      if (state.tour) stopTour();
      state.minute = +t.dataset.time;
      return;
    }
    switch (t.dataset.tool) {
      case "names":
        state.names = !state.names;
        setToggle("names", state.names);
        break;
      case "flows":
        flows.visible = !flows.visible;
        setToggle("flows", flows.visible);
        break;
      case "pause":
        setPaused(!state.paused);
        break;
      case "home":
        home();
        break;
      case "log":
        setPanel(true);
        setMode("list", { keepPanel: true });
        setTab("log");
        break;
    }
  });
  $$(".tabs [data-tab]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $("#search").addEventListener("input", (e) => {
    state.query = e.target.value;
    setTab("list");
    renderList();
  });
  $(".sheet-handle").addEventListener("click", () => setPanel(!app.classList.contains("panel-open")));

  // ---------- view modes ----------
  let mode = "list";
  function setMode(m, { keepPanel = false } = {}) {
    if (m !== "time" && state.tour) stopTour(false);
    mode = m;
    $$(".seg [data-mode]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === m)));
    if (m === "overview") {
      setPanel(false);
      home();
    } else if (m === "list" && !keepPanel) {
      setPanel(true);
      setTab("list");
    } else if (m === "time") startTour();
  }
  $$(".seg [data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

  // ---------- day tour ----------
  const T0 = 360,
    T1 = 1380;
  const schedule = data.schedule.filter((s) => buildings.has(s.challenge)).sort((a, b) => a.time - b.time);
  $("#tl-ticks").innerHTML = schedule.map((s, i) => `<i data-i="${i}" style="left:${((s.time - T0) / (T1 - T0)) * 100}%" title="${hhmm(s.time)} ${esc(s.text)}"></i>`).join("");
  function startTour() {
    clearSelection();
    setPaused(false);
    state.tour = { idx: 0, hold: 0, playing: true };
    state.minute = T0;
    app.classList.add("touring");
    $("#timeline").hidden = false;
    $("#tl-text").textContent = "新的一天開始了，跟著行程逛群島。";
    if (isMobile()) setPanel(false);
    else setTab("log");
    pushLog("🌅", "一天的學習行程開始。", "plan");
    home();
    syncTourUI();
  }
  function pauseTour(p) {
    if (!state.tour) return;
    state.tour.playing = !p;
    syncTourUI();
  }
  function stopTour(resetMode = true) {
    if (!state.tour) return;
    state.tour = null;
    app.classList.remove("touring");
    $("#timeline").hidden = true;
    if (resetMode) setMode(isMobile() ? "overview" : "list");
  }
  function syncTourUI() {
    const tr = state.tour;
    if (!tr) return;
    $("#tl-time").textContent = hhmm(state.minute);
    $("#tl-fill").style.width = `${Math.min(100, Math.max(0, ((state.minute - T0) / (T1 - T0)) * 100))}%`;
    $("#tl-count").textContent = `${String(tr.idx).padStart(2, "0")} / ${String(schedule.length).padStart(2, "0")}`;
    $$("#tl-ticks i").forEach((i) => i.classList.toggle("past", +i.dataset.i < tr.idx));
    const b = $('[data-tl="toggle"]');
    b.querySelector("i").dataset.icon = tr.playing ? "pause" : "play";
    b.querySelector("span").textContent = tr.playing ? "暫停" : "繼續";
    paintIcons(b);
  }
  function tickTour(dt) {
    const tr = state.tour;
    if (!tr || !tr.playing) return;
    if (tr.hold > 0) {
      tr.hold -= dt;
      state.minute += dt * 1.5;
    } else state.minute += dt * 18;
    while (tr.idx < schedule.length && state.minute >= schedule[tr.idx].time) {
      const s = schedule[tr.idx++];
      tr.hold = reduced ? 2.5 : 4.5;
      state.minute = Math.max(state.minute, s.time);
      selectBuilding(s.challenge);
      $("#tl-text").textContent = s.text;
      pushLog("📅", `${esc(s.text)} ${btn(s.challenge)}`, "plan");
    }
    if (state.minute >= T1) {
      state.minute = T1;
      tr.playing = false;
      $("#tl-text").textContent = "今天的行程結束，晚安 🌙";
      pushLog("🌙", "今天的學習行程結束，晚安！", "plan");
      home();
    }
    syncTourUI();
  }
  $("#timeline").addEventListener("click", (e) => {
    const t = e.target.closest("[data-tl]");
    if (!t) return;
    if (t.dataset.tl === "toggle") {
      if (state.tour && !state.tour.playing && state.minute >= T1) startTour();
      else pauseTour(state.tour?.playing);
    } else if (t.dataset.tl === "replay") startTour();
    else stopTour();
  });

  // ---------- keyboard ----------
  addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea") || !$("#intro").hidden) return;
    const k = e.key.toLowerCase();
    if (k === "escape") {
      if (state.tour) stopTour();
      else clearSelection();
    } else if (k === "n") $('.tg[data-tool="names"]').click();
    else if (k === "l") $('.tg[data-tool="flows"]').click();
    else if (k === "h") home();
    else if (k === " ") {
      e.preventDefault();
      if (state.tour) pauseTour(state.tour.playing);
      else setPaused(!state.paused);
    }
  });

  // ---------- intro ----------
  const INTRO = [
    ["每座島是一個學習主題", `${islands.size} 座六角島拼成一片群島，島上每棟建築都是一個挑戰。點島或建築看細節，也可以用右側清單搜尋。`],
    ["橘色弧線是知識的連結", "乘法幫你算面積、除法會變成分數。點一條連結線，看看兩個挑戰怎麼互相幫忙。"],
    ["跟著時間走一天", "按上方「時間」播放一天的學習行程。島上的小夥伴也一直在挑戰，打開「日誌」就能看到他們的動態，點小人可以跟隨他。"],
  ];
  let introStep = 0;
  function showIntro(i) {
    introStep = i;
    $("#intro-kicker").textContent = `HELLO, LEARNER / ${String(i + 1).padStart(2, "0")}`;
    $("#intro-title").textContent = INTRO[i][0];
    $("#intro-body").textContent = INTRO[i][1];
    $("#intro-next").textContent = i === INTRO.length - 1 ? "開始探索" : "下一步 →";
    $("#intro").hidden = false;
    $("#intro-next").focus();
  }
  function closeIntro() {
    $("#intro").hidden = true;
    store.set("ci-intro", true);
  }
  $("#intro-next").addEventListener("click", () => (introStep < INTRO.length - 1 ? showIntro(introStep + 1) : closeIntro()));
  $("#intro-skip").addEventListener("click", closeIntro);

  // ---------- resize ----------
  function resize() {
    const w = stage.clientWidth,
      h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---------- loop ----------
  const timer = new THREE.Timer();
  let simT = 0,
    labelTimer = 0,
    shownMinute = -1;
  const camDelta = new THREE.Vector3();
  function animate(now) {
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    const run = !state.paused;
    if (run) simT += dt;

    if (state.tour) tickTour(dt);
    else if (run) state.minute = (state.minute + dt * 4) % 1440;
    env.setTime(state.minute);
    env.update(simT, run ? dt : 0);
    if (run) people.update(dt);
    flows.update(simT);

    for (const b of buildings.values()) if (b.coin.visible) b.coin.rotation.y = simT * 2;
    for (const isl of islands.values()) if (isl.flag.visible) isl.flag.userData.cloth.rotation.y = Math.sin(simT * 3 + isl.center.x) * 0.25;
    if (selRing.visible) {
      const k = (simT * 1.4) % 1;
      selRing.scale.setScalar(0.9 + k * 0.5);
      selRing.material.opacity = 1 - k;
    }
    const hovered = state.hover?.type === "building" ? state.hover.id : null;
    for (const b of buildings.values()) {
      const s = b.id === hovered ? 1.08 : 1;
      b.group.scale.setScalar(THREE.MathUtils.lerp(b.group.scale.x, s, 0.2));
    }

    if (state.fly) {
      const f = state.fly;
      f.t = Math.min(1, f.t + dt / f.dur);
      const k = ease(f.t);
      camera.position.lerpVectors(f.fromPos, f.toPos, k);
      controls.target.lerpVectors(f.fromTarget, f.toTarget, k);
      if (f.t >= 1) state.fly = null;
    } else if (state.follow) {
      camDelta.copy(state.follow.mesh.position).sub(controls.target).multiplyScalar(0.08);
      controls.target.add(camDelta);
      camera.position.add(camDelta);
    }
    if (state.follow) walkerTagObj.position.copy(state.follow.mesh.position).setY(state.follow.mesh.position.y + 0.48);
    // keep panning near the archipelago
    const off = camDelta.copy(controls.target).sub(env.centroid).setY(0);
    if (off.length() > 22) {
      off.setLength(off.length() - 22);
      controls.target.sub(off);
      camera.position.sub(off);
    }
    controls.update();
    // fog follows zoom so the far overview never washes out
    const camDist = camera.position.distanceTo(controls.target);
    scene.fog.near = camDist * 0.9;
    scene.fog.far = camDist * 2.6 + 20;

    labelTimer -= dt;
    if (labelTimer <= 0) {
      labelTimer = 0.15;
      const dist = camDist;
      const near = dist < 30;
      for (const b of buildings.values()) {
        const show = b.label.classList.contains("sel") || b.id === hovered || (state.names && near);
        b.label.classList.toggle("lbl-hidden", !show);
      }
      for (const el of islandLabels.values()) el.classList.toggle("lbl-hidden", !state.names && dist < 30);
      refreshWalker();
    }
    const m = Math.floor(state.minute);
    if (m !== shownMinute) {
      shownMinute = m;
      $("#clock").textContent = hhmm(m);
    }
    processHover();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  // ---------- boot ----------
  syncProgress();
  renderList();
  // start high above, then glide into the overview
  camera.position.copy(env.centroid).add(new THREE.Vector3(0, 70, 40));
  controls.target.copy(env.centroid);
  home();
  if (isMobile()) setMode("overview");
  renderer.setAnimationLoop(animate);
  pushLog("👋", "歡迎來到學習挑戰群島！點一棟建築開始。");
  $("#loading").classList.add("gone");
  if (!store.get("ci-intro", false) && !params.has("nointro")) showIntro(0);
} catch (err) {
  console.error(err);
  $("#loading").innerHTML = `無法載入群島：${esc(err.message)}`;
}
