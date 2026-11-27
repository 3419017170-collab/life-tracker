(() => {
  "use strict";

  const APP_KEY = "gk-light-v2";
  const LEGACY_KEY = "life-feedback-v1";
  const XP_PER_LIGHT = 12;
  const XP_PER_OLD_CHECK = 8;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const stats = [
    { id: "body", name: "体魄", hint: "身体建设与照顾" },
    { id: "vitality", name: "活力", hint: "日常节奏与休息" },
    { id: "wisdom", name: "智慧", hint: "新知与思考" },
    { id: "creation", name: "创造", hint: "研究与兴趣" },
    { id: "exploration", name: "探索", hint: "走向新的地方" },
    { id: "connection", name: "连接", hint: "善意与勇气" }
  ];

  const lights = [
    { id: "body", icon: "⌁", title: "建设身体", subtitle: "让身体得到支持", description: "运动、伸展、好好吃饭，或为健康做了一件小事。", stat: "body" },
    { id: "routine", icon: "☼", title: "照顾日常", subtitle: "找到舒服的节奏", description: "完成一段日常安排，也可以把休息当成今天的选择。", stat: "vitality" },
    { id: "learning", icon: "✎", title: "获得新知", subtitle: "保持好奇心", description: "读到一个新观点、学会一件事，或多想明白一点。", stat: "wisdom" },
    { id: "research", icon: "⌘", title: "科研与创造", subtitle: "推进一点想做的事", description: "研究、写作、创作，或把一个念头向前推了一小步。", stat: "creation" },
    { id: "explore", icon: "⌖", title: "出去转转", subtitle: "看看熟悉之外", description: "出门走走、晒晒太阳，或探索一个新的角落。", stat: "exploration" },
    { id: "interest", icon: "♫", title: "享受兴趣", subtitle: "为喜欢的事留时间", description: "做一件让你投入、放松或感到快乐的事情。", stat: "creation" },
    { id: "kindness", icon: "♡", title: "传递善意", subtitle: "让连接发生", description: "关心一个人、提供帮助，或好好回应一份善意。", stat: "connection" },
    { id: "courage", icon: "✦", title: "勇敢行动", subtitle: "带着不确定也能前进", description: "面对一件不容易的事，或踏出了以前犹豫的一步。", stat: "connection" },
    { id: "selfcare", icon: "☾", title: "善待自己", subtitle: "也把自己放在心上", description: "休息、求助、设下界线，或用温柔的方式照顾自己。", stat: "vitality" },
    { id: "notice", icon: "✧", title: "发现美好", subtitle: "留意日子里的微光", description: "记住一个好看的瞬间、一句话，或一件值得感谢的小事。", stat: "wisdom" }
  ];

  const oldTasks = ["按时起床", "吃早餐", "正常吃午餐", "适合身体状态的运动或休息", "正常吃晚餐", "按需晚间加餐", "做一件喜欢的事情", "按时睡觉"];
  const oldStatMap = ["vitality", "vitality", "vitality", "body", "vitality", "vitality", "creation", "vitality"];
  const metricNames = {
    weight: { label: "体重", unit: "斤", legacy: "weight" },
    waist: { label: "腰围", unit: "cm", legacy: "waist" },
    fat: { label: "体脂率", unit: "%", legacy: "fat" },
    heartRate: { label: "静息心率", unit: "次/分", legacy: "heartRate" },
    sleep: { label: "睡眠", unit: "小时", legacy: "sleep" },
    mood: { label: "心情", unit: "", legacy: "mood" }
  };

  let storage = null;
  let state = null;
  let storageCorrupt = false;
  let storageUnavailable = false;
  let activeDate = todayKey();
  let seenToday = activeDate;
  let calendarCursor = firstOfMonth(parseLocalDate(activeDate));
  let chartRange = "7";
  let reportRange = "7";
  let chartMetric = "weight";
  let toastTimer = 0;

  try { storage = window.localStorage; } catch { storageUnavailable = true; }

  function makeState() {
    return { schemaVersion: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), records: {}, plans: [], awards: {}, legacy: {}, meta: { legacySource: LEGACY_KEY } };
  }

  function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }

  function readState() {
    if (!storage) return makeState();
    let raw;
    try { raw = storage.getItem(APP_KEY); } catch { storageUnavailable = true; return makeState(); }
    if (raw === null) return makeState();
    try {
      const saved = JSON.parse(raw);
      if (!isObject(saved) || saved.schemaVersion !== 2 || !isObject(saved.records) || !Array.isArray(saved.plans) || !isObject(saved.awards) || !isObject(saved.legacy)) throw new Error("Unsupported local data");
      saved.meta = isObject(saved.meta) ? saved.meta : {};
      return saved;
    } catch {
      storageCorrupt = true;
      return makeState();
    }
  }

  function setSaveStatus(message, warning = false) {
    const label = $("#saveStatus");
    const dot = $(".status-dot");
    if (label) label.textContent = message;
    if (dot) dot.classList.toggle("is-warning", warning);
  }

  function persist() {
    if (storageCorrupt) { setSaveStatus("新版数据需先导入备份", true); return false; }
    if (!storage || storageUnavailable) { setSaveStatus("浏览器目前无法保存", true); return false; }
    try {
      state.updatedAt = new Date().toISOString();
      storage.setItem(APP_KEY, JSON.stringify(state));
      setSaveStatus("已保存在本机");
      return true;
    } catch {
      setSaveStatus("保存空间不足，请先导出备份", true);
      return false;
    }
  }

  function todayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function parseLocalDate(key) {
    const [year, month, day] = String(key).split("-").map(Number);
    return new Date(year || 2000, (month || 1) - 1, day || 1, 12, 0, 0, 0);
  }

  function firstOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1, 12); }
  function addDays(key, amount) { const date = parseLocalDate(key); date.setDate(date.getDate() + amount); return todayKey(date); }
  function validDateKey(key) { return /^\d{4}-\d{2}-\d{2}$/.test(String(key)) && todayKey(parseLocalDate(key)) === key; }
  function formatDate(key, options = { month: "long", day: "numeric", weekday: "short" }) { return new Intl.DateTimeFormat("zh-CN", options).format(parseLocalDate(key)); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]); }
  function makeId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
  function own(object, key) { return Object.prototype.hasOwnProperty.call(object || {}, key); }
  function copyJson(value) { return JSON.parse(JSON.stringify(value)); }

  function blankRecord() { return { logs: {}, notes: {}, drafts: {}, plansDone: {}, workouts: [], body: {} }; }
  function recordFor(date) { return state.records[date] || blankRecord(); }
  function ensureRecord(date) {
    if (!isObject(state.records[date])) state.records[date] = blankRecord();
    const record = state.records[date];
    record.logs = isObject(record.logs) ? record.logs : {};
    record.notes = isObject(record.notes) ? record.notes : {};
    record.drafts = isObject(record.drafts) ? record.drafts : {};
    record.plansDone = isObject(record.plansDone) ? record.plansDone : {};
    record.workouts = Array.isArray(record.workouts) ? record.workouts : [];
    record.body = isObject(record.body) ? record.body : {};
    return record;
  }

  function awardOnce(id, date, statId, xp, source, category = "") {
    if (own(state.awards, id)) return false;
    state.awards[id] = { date, stat: statId, xp, source, category, earnedAt: new Date().toISOString() };
    return true;
  }

  function isLegacySnapshot(value) {
    if (!isObject(value)) return false;
    return Object.entries(value).some(([date, row]) => validDateKey(date) && isObject(row) && Array.isArray(row.checks));
  }

  function mergeLegacySnapshot(snapshot) {
    if (!isLegacySnapshot(snapshot)) return { changed: false, count: 0 };
    let changed = false;
    let count = 0;
    for (const [date, row] of Object.entries(snapshot)) {
      if (!validDateKey(date) || !isObject(row) || !Array.isArray(row.checks)) continue;
      let preserved;
      try { preserved = copyJson(row); } catch { continue; }
      if (JSON.stringify(state.legacy[date]) !== JSON.stringify(preserved)) {
        state.legacy[date] = preserved;
        changed = true;
      }
      row.checks.forEach((checked, index) => {
        if (!checked) return;
        const statId = oldStatMap[index] || "vitality";
        const earned = awardOnce(`legacy:${date}:check:${index}`, date, statId, XP_PER_OLD_CHECK, "legacy", `v1-${index}`);
        if (earned) changed = true;
      });
      count += 1;
    }
    if (count) {
      state.meta.legacySource = LEGACY_KEY;
      state.meta.legacyLastRead = new Date().toISOString();
    }
    return { changed, count };
  }

  function readLegacyStorage() {
    if (!storage) return null;
    try {
      const raw = storage.getItem(LEGACY_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function awardList() { return Object.values(state.awards).filter(isObject); }
  function totalXp() { return awardList().reduce((total, award) => total + (Number(award.xp) || 0), 0); }
  function xpForDate(date) { return awardList().filter(award => award.date === date).reduce((sum, award) => sum + (Number(award.xp) || 0), 0); }
  function statValue(statId) { return awardList().filter(award => award.stat === statId).length; }

  function metricValue(date, key) {
    const record = state.records[date];
    if (record && isObject(record.body) && own(record.body, key)) return record.body[key];
    const legacy = state.legacy[date];
    const legacyKey = metricNames[key]?.legacy;
    return legacy && legacyKey ? legacy[legacyKey] ?? "" : "";
  }

  function metricNumber(date, key) {
    const value = metricValue(date, key);
    if (value === "" || value == null || !Number.isFinite(Number(value))) return null;
    return Number(value);
  }

  function recordDates() {
    const keys = new Set([...Object.keys(state.records), ...Object.keys(state.legacy)]);
    return [...keys].filter(date => validDateKey(date) && hasAnyRecord(date)).sort();
  }

  function hasAnyRecord(date) {
    const record = state.records[date];
    const legacy = state.legacy[date];
    if (legacy && (Array.isArray(legacy.checks) || Object.keys(legacy).length > 0)) return true;
    if (!record) return false;
    return Object.keys(record.logs || {}).length > 0 || Object.keys(record.body || {}).length > 0 || Object.keys(record.plansDone || {}).length > 0 || (record.workouts || []).length > 0;
  }

  function dateRange(range, end = activeDate) {
    if (range === "all") return recordDates().filter(date => date <= end);
    const days = Number(range) || 7;
    const start = addDays(end, -(days - 1));
    const result = [];
    for (let date = start; date <= end; date = addDays(date, 1)) result.push(date);
    return result;
  }

  function statMarkup() {
    const maximum = Math.max(1, ...stats.map(item => statValue(item.id)));
    return stats.map(item => {
      const value = statValue(item.id);
      const percent = Math.max(5, Math.round(value / maximum * 100));
      return `<div class="stat-item" title="${escapeHtml(item.hint)}"><div class="stat-topline"><span class="stat-name">${item.name}</span><span class="stat-count">${value}</span></div><div class="stat-track"><span style="width:${percent}%"></span></div></div>`;
    }).join("");
  }

  function renderHome() {
    const xp = totalXp();
    const level = Math.floor(Math.sqrt(xp / 100)) + 1;
    const levelBase = (level - 1) ** 2 * 100;
    const levelTarget = level ** 2 * 100;
    const progress = Math.max(0, Math.min(100, (xp - levelBase) / Math.max(1, levelTarget - levelBase) * 100));
    const title = level >= 15 ? "光之守护者" : level >= 7 ? "星火旅者" : level >= 3 ? "暖灯同行者" : "初见微光";
    const note = level >= 15 ? "你的光已经可以照亮更远的路。" : level >= 7 ? "一路收集的微光，正成为自己的方向。" : level >= 3 ? "小屋有了新的暖意，旅程正在展开。" : "每一束光，都来自你真实走过的日子。";
    const lightsDone = Object.keys(recordFor(activeDate).logs || {}).length;
    const earned = xpForDate(activeDate);
    const count = recordDates().length;
    const todayMode = activeDate === todayKey();
    const hour = new Date().getHours();
    const dayPart = hour < 6 ? "夜深了 · 好好休息" : hour < 11 ? "早晨 · 一起慢慢来" : hour < 17 ? "午后 · 一起慢慢来" : hour < 21 ? "夜色 · 一起慢慢来" : "夜深了 · 好好休息";
    $("#dateCaption").textContent = `${todayMode ? "今天" : "回看"} · ${formatDate(activeDate, { year: "numeric", month: "long", day: "numeric", weekday: "long" })}`;
    $("#dayPart").textContent = dayPart;
    $("#roomMood").textContent = hour >= 19 || hour < 6 ? "夜灯已亮" : "灯火温柔";
    $("#levelSeal").textContent = `Lv. ${level}`;
    $("#characterTitle").textContent = title;
    $("#characterNote").textContent = note;
    $("#totalXp").textContent = xp.toLocaleString("zh-CN");
    $("#xpProgress").style.width = `${progress}%`;
    $("#xpLevelText").textContent = `Lv. ${level}`;
    $("#xpNext").textContent = `距下一等级还需 ${Math.max(0, levelTarget - xp)} XP`;
    $("#todayLights").textContent = String(lightsDone);
    $("#todayEarned").textContent = String(earned);
    $("#recordDays").textContent = String(count);
    $$(".today-mini span").forEach((node, index) => { if (index === 0) node.textContent = todayMode ? "今日微光" : "所选微光"; if (index === 1) node.textContent = todayMode ? "今日 XP" : "所选 XP"; });
    $("#todayCountLabel").textContent = `${lightsDone} / 10`;
    $("#todayProgress").style.width = `${Math.min(100, lightsDone * 10)}%`;
    $("#homeQuote").textContent = ["给自己留一点空间，生活会慢慢展开。", "今天不必完整，留下的一点也算数。", "那些看似微小的事，正在成为你的日常。", "先照顾好此刻，已经是一种前进。"][(parseLocalDate(activeDate).getDate() - 1) % 4];
    $("#statGrid").innerHTML = statMarkup();
    const traveler = $("#pixelTraveler");
    traveler.dataset.stage = level >= 15 ? "guide" : level >= 7 ? "bright" : level >= 3 ? "warm" : "first";
  }

  function renderLight() {
    const record = recordFor(activeDate);
    $("#lightDatePill").textContent = formatDate(activeDate, { month: "long", day: "numeric", weekday: "short" });
    $("#lightGrid").innerHTML = lights.map(item => {
      const logged = Boolean(record.logs?.[item.id]);
      const note = record.notes?.[item.id] ?? record.drafts?.[item.id] ?? "";
      return `<article class="light-card ${logged ? "is-recorded" : ""}"><div class="light-card-top"><span class="light-icon" aria-hidden="true">${item.icon}</span><div class="light-card-title"><strong>${item.title}</strong><small>${item.subtitle}</small></div><span class="light-reward">+${XP_PER_LIGHT} XP</span></div><p class="light-description">${item.description}</p><textarea class="light-note" data-light-note="${item.id}" maxlength="500" placeholder="可以写一句，也可以留白">${escapeHtml(note)}</textarea><button class="light-save" type="button" data-record-light="${item.id}">${logged ? "已留存微光 · 编辑不重复奖励" : "记下这一束光"}</button></article>`;
    }).join("");
  }

  function visiblePlans(date) {
    return state.plans.filter(plan => isObject(plan) && (!plan.createdOn || plan.createdOn <= date) && (!plan.inactiveFrom || date < plan.inactiveFrom));
  }

  function renderPlans() {
    const plans = visiblePlans(activeDate).sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")) || String(a.title || "").localeCompare(String(b.title || ""), "zh-CN"));
    const record = recordFor(activeDate);
    const done = plans.filter(plan => record.plansDone?.[plan.id]).length;
    $("#planDatePill").textContent = formatDate(activeDate, { month: "long", day: "numeric", weekday: "short" });
    $("#planCount").textContent = `${done} / ${plans.length} 项`;
    if (!plans.length) {
      $("#planList").innerHTML = `<div class="empty-state">还没有日常计划。<br>从一件容易做到的小事开始。</div>`;
      return;
    }
    $("#planList").innerHTML = plans.map(plan => {
      const isDone = Boolean(record.plansDone?.[plan.id]);
      return `<div class="plan-row ${isDone ? "is-done" : ""}"><input type="checkbox" aria-label="完成 ${escapeHtml(plan.title)}" data-plan-done="${escapeHtml(plan.id)}" ${isDone ? "checked" : ""}><span class="plan-time">${escapeHtml(plan.time || "弹性")}</span><span class="plan-copy"><strong>${escapeHtml(plan.title)}</strong><small>${escapeHtml(plan.kind || "生活节奏")}</small></span><button class="archive-plan" type="button" data-archive-plan="${escapeHtml(plan.id)}" aria-label="归档 ${escapeHtml(plan.title)}">归档</button></div>`;
    }).join("");
  }

  function workoutSetCount(date) { return (recordFor(date).workouts || []).reduce((sum, session) => sum + (Array.isArray(session.sets) ? session.sets.length : 0), 0); }

  function renderWorkouts() {
    const record = recordFor(activeDate);
    const workouts = Array.isArray(record.workouts) ? record.workouts : [];
    const setCount = workouts.reduce((sum, session) => sum + (session.sets || []).length, 0);
    $("#trainingDatePill").textContent = formatDate(activeDate, { month: "long", day: "numeric", weekday: "short" });
    $("#workoutCount").textContent = `${workouts.length} 个动作 · ${setCount} 组`;
    if (!workouts.length) $("#workoutList").innerHTML = `<div class="empty-state">今天还没有训练记录。<br>可以记录适合自己的休息，不必为了打卡勉强训练。</div>`;
    else $("#workoutList").innerHTML = workouts.map(session => {
      const sets = Array.isArray(session.sets) ? session.sets : [];
      return `<article class="workout-card"><div class="workout-head"><strong>${escapeHtml(session.exercise || "未命名动作")}</strong><button type="button" data-delete-workout="${escapeHtml(session.id)}">移除此动作</button></div><div class="set-list">${sets.map((set, index) => `<div class="set-row"><span>第 ${index + 1} 组</span><label>kg<input type="number" min="0" step="0.1" inputmode="decimal" aria-label="第 ${index + 1} 组重量" data-session-id="${escapeHtml(session.id)}" data-set-id="${escapeHtml(set.id)}" data-set-field="weight" value="${escapeHtml(set.weight ?? "")}"></label><label>次<input type="number" min="0" step="1" inputmode="numeric" aria-label="第 ${index + 1} 组次数" data-session-id="${escapeHtml(session.id)}" data-set-id="${escapeHtml(set.id)}" data-set-field="reps" value="${escapeHtml(set.reps ?? "")}"></label><label>RPE<input type="number" min="0" max="10" step="0.5" inputmode="decimal" aria-label="第 ${index + 1} 组主觀强度" data-session-id="${escapeHtml(session.id)}" data-set-id="${escapeHtml(set.id)}" data-set-field="rpe" value="${escapeHtml(set.rpe ?? "")}"></label><button type="button" data-delete-set="${escapeHtml(session.id)}" data-set-id="${escapeHtml(set.id)}" aria-label="刪除第 ${index + 1} 组">×</button></div>`).join("")}</div><button class="add-set" type="button" data-add-set="${escapeHtml(session.id)}">＋ 添加一组</button></article>`;
    }).join("");
    const oldTraining = state.legacy[activeDate]?.training;
    const legacyBox = $("#legacyTraining");
    if (oldTraining) { legacyBox.hidden = false; legacyBox.textContent = `V1 旧版训练文字\n${oldTraining}`; }
    else { legacyBox.hidden = true; legacyBox.textContent = ""; }
  }

  function renderBodyForm() {
    $("#bodyDatePill").textContent = formatDate(activeDate, { month: "long", day: "numeric", weekday: "short" });
    $$('[data-metric]').forEach(input => {
      const value = metricValue(activeDate, input.dataset.metric);
      input.value = value == null ? "" : String(value);
    });
    renderChart();
  }

  function svgNode(name, attrs = {}, text = "") {
    const node = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    if (text) node.textContent = text;
    return node;
  }

  function shortDate(date) { return date.slice(5).replace("-", "/"); }

  function renderChart() {
    const svg = $("#trendChart");
    const meta = metricNames[chartMetric];
    const values = dateRange(chartRange).map(date => ({ date, value: metricNumber(date, chartMetric) })).filter(point => point.value !== null);
    svg.replaceChildren();
    svg.setAttribute("aria-label", `${meta.label}趋势图，${values.length} 个记录日期`);
    if (!values.length) {
      svg.append(svgNode("text", { x: 320, y: 105, "text-anchor": "middle", fill: "#a59ca6", "font-size": 12 }, "这段时间还没有可绘制的记录"));
      $("#trendSummary").innerHTML = `<span>还没有${meta.label}数据</span>`;
      $("#chartFootnote").textContent = "填写一笔记录后，这里会显示你的个人趋势。";
      return;
    }

    const chartValues = values.length > 180 ? values.filter((_, index) => index % Math.ceil(values.length / 180) === 0 || index === values.length - 1) : values;
    const nums = chartValues.map(point => point.value);
    let min = Math.min(...nums);
    let max = Math.max(...nums);
    if (min === max) { min -= Math.max(1, Math.abs(min) * .06); max += Math.max(1, Math.abs(max) * .06); }
    const pad = (max - min) * .14;
    min -= pad;
    max += pad;
    const left = 47, right = 625, top = 18, bottom = 174;
    const xAt = index => chartValues.length === 1 ? (left + right) / 2 : left + index * (right - left) / (chartValues.length - 1);
    const yAt = value => bottom - (value - min) / (max - min) * (bottom - top);

    for (let index = 0; index < 4; index++) {
      const y = top + index * (bottom - top) / 3;
      const label = max - index * (max - min) / 3;
      svg.append(svgNode("line", { x1: left, y1: y, x2: right, y2: y, stroke: "#ece6eb", "stroke-width": 1 }));
      svg.append(svgNode("text", { x: left - 8, y: y + 3, "text-anchor": "end", fill: "#aaa1ab", "font-size": 8 }, label.toFixed(label >= 100 ? 0 : 1)));
    }
    const path = chartValues.map((point, index) => `${index ? "L" : "M"}${xAt(index).toFixed(1)},${yAt(point.value).toFixed(1)}`).join(" ");
    const area = `${path} L${xAt(chartValues.length - 1).toFixed(1)},${bottom} L${xAt(0).toFixed(1)},${bottom} Z`;
    svg.append(svgNode("path", { d: area, fill: "rgba(170, 151, 181, .14)" }));
    svg.append(svgNode("path", { d: path, fill: "none", stroke: "#8d789a", "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    chartValues.forEach((point, index) => {
      svg.append(svgNode("circle", { cx: xAt(index), cy: yAt(point.value), r: 4, fill: "#f8f3e8", stroke: "#9b845d", "stroke-width": 2 }));
      svg.append(svgNode("title", {}, `${point.date} · ${point.value} ${meta.unit}`));
    });
    const labelIndices = [...new Set([0, Math.floor((chartValues.length - 1) / 3), Math.floor((chartValues.length - 1) * 2 / 3), chartValues.length - 1])];
    labelIndices.forEach(index => svg.append(svgNode("text", { x: xAt(index), y: 198, "text-anchor": "middle", fill: "#a39aa5", "font-size": 8 }, shortDate(chartValues[index].date))));
    const first = values[0].value, last = values[values.length - 1].value;
    const change = last - first;
    $("#trendSummary").innerHTML = `<strong>${last.toFixed(1)} ${meta.unit}</strong><span>${values.length} 笔记录</span><span>区间变化 ${change > 0 ? "+" : ""}${change.toFixed(1)} ${meta.unit}</span>`;
    $("#chartFootnote").textContent = `${shortDate(values[0].date)} 至 ${shortDate(values.at(-1).date)} · 按日期顺序查看，不代表诊断或目标。`;
  }

  function renderCalendar() {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    $("#calendarTitle").textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(calendarCursor);
    const first = new Date(year, month, 1, 12);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset, 12);
    const today = todayKey();
    let html = "";
    for (let index = 0; index < 42; index++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12);
      const key = todayKey(date);
      const classes = ["calendar-day"];
      if (date.getMonth() !== month) classes.push("is-other");
      if (key === today) classes.push("is-today");
      if (key === activeDate) classes.push("is-selected");
      if (hasAnyRecord(key)) classes.push("has-record");
      html += `<button type="button" class="${classes.join(" ")}" data-calendar-date="${key}" aria-label="${formatDate(key, { year: "numeric", month: "long", day: "numeric", weekday: "long" })}">${date.getDate()}</button>`;
    }
    $("#calendarGrid").innerHTML = html;
  }

  function renderHistoryDetail() {
    const record = recordFor(activeDate);
    const legacy = state.legacy[activeDate];
    const lines = [];
    const logIds = Object.keys(record.logs || {});
    if (logIds.length) {
      lines.push(`V2 光之记录：${logIds.length} 项`);
      for (const id of logIds) {
        const item = lights.find(light => light.id === id);
        const note = record.notes?.[id] || record.drafts?.[id];
        lines.push(`・${item?.title || id}${note ? `：${note}` : ""}`);
      }
    }
    if (legacy && Array.isArray(legacy.checks)) {
      const checks = legacy.checks.map((checked, index) => checked ? oldTasks[index] || `旧版项目 ${index + 1}` : "").filter(Boolean);
      if (checks.length) lines.push(`V1 旧版打卡：${checks.length} 项\n・${checks.join("、")}`);
    }
    const bodyRows = ["weight", "waist", "fat", "heartRate", "sleep"].map(key => {
      const value = metricValue(activeDate, key);
      return value !== "" && value != null ? `${metricNames[key].label} ${value}${metricNames[key].unit}` : "";
    }).filter(Boolean);
    if (bodyRows.length) lines.push(`身体记录：${bodyRows.join(" · ")}`);
    const mood = metricValue(activeDate, "mood");
    if (mood) lines.push(`心情：${mood}`);
    const workouts = record.workouts || [];
    const setCount = workouts.reduce((sum, session) => sum + (session.sets || []).length, 0);
    if (workouts.length) lines.push(`训练：${workouts.length} 个动作、${setCount} 组`);
    if (legacy?.training) lines.push(`V1 旧版训练文字：${legacy.training}`);
    const plans = visiblePlans(activeDate);
    const done = plans.filter(plan => record.plansDone?.[plan.id]).length;
    if (plans.length) lines.push(`生活计划：完成 ${done} / ${plans.length} 项`);
    const earned = xpForDate(activeDate);
    if (earned) lines.push(`当日累计：${earned} XP（永久保留）`);
    $("#historyDetailTitle").textContent = formatDate(activeDate, { year: "numeric", month: "long", day: "numeric", weekday: "long" });
    $("#historyDetail").textContent = lines.length ? lines.join("\n\n") : "这一天还没有保存记录。你可以在顶部选择日期，再补记光之记录、生活计划或身体状态。";
  }

  function renderHistory() {
    $("#historyDatePill").textContent = formatDate(activeDate, { month: "long", day: "numeric", weekday: "short" });
    renderCalendar();
    renderHistoryDetail();
    const dates = recordDates().filter(date => date <= activeDate).sort().reverse().slice(0, 12);
    $("#recentDays").innerHTML = dates.length ? dates.map(date => `<button type="button" class="recent-date" data-calendar-date="${date}">${formatDate(date, { month: "numeric", day: "numeric" })}</button>`).join("") : `<span class="form-hint">还没有历史记录。</span>`;
  }

  function reportTextFor(range) {
    const dates = dateRange(range);
    const existing = dates.filter(hasAnyRecord);
    const firstDate = existing[0] || dates[0] || activeDate;
    const lastDate = existing.at(-1) || activeDate;
    const newLightCount = existing.reduce((sum, date) => sum + Object.keys(recordFor(date).logs || {}).length, 0);
    const oldCheckCount = existing.reduce((sum, date) => sum + (state.legacy[date]?.checks || []).filter(Boolean).length, 0);
    const earned = awardList().filter(award => award.date >= firstDate && award.date <= lastDate).reduce((sum, award) => sum + (Number(award.xp) || 0), 0);
    const sessions = existing.reduce((sum, date) => sum + (recordFor(date).workouts || []).length, 0);
    const sets = existing.reduce((sum, date) => sum + workoutSetCount(date), 0);
    const planDone = existing.reduce((sum, date) => sum + Object.values(recordFor(date).plansDone || {}).filter(Boolean).length, 0);
    const titleRange = range === "all" ? `${firstDate} 至 ${lastDate}` : `截至 ${activeDate} 的最近 ${range} 天`;
    const lines = [
      "GK · 光之力量｜生活成长回顾",
      `回顾区间：${titleRange}`,
      "",
      `留下记录的日子：${existing.length} 天`,
      `V2 光之记录：${newLightCount} 项`,
      ...(oldCheckCount ? [`V1 历史打卡：${oldCheckCount} 项（已保留原始数据）`] : []),
      `本区间累计 XP：${earned}`,
      `永久总 XP：${totalXp()}`,
      `生活计划完成：${planDone} 项`,
      `训练：${sessions} 个动作、${sets} 组`,
      "",
      "身体趋势摘要"
    ];
    for (const key of ["weight", "waist", "fat", "heartRate", "sleep"]) {
      const values = existing.map(date => ({ date, value: metricNumber(date, key) })).filter(item => item.value !== null);
      if (!values.length) continue;
      const average = values.reduce((sum, item) => sum + item.value, 0) / values.length;
      const change = values.at(-1).value - values[0].value;
      lines.push(`${metricNames[key].label}：平均 ${average.toFixed(1)} ${metricNames[key].unit}；首末变化 ${change > 0 ? "+" : ""}${change.toFixed(1)} ${metricNames[key].unit}（${values.length} 笔）`);
    }
    if (!lines.some(line => line.startsWith("体重：") || line.startsWith("腰围：") || line.startsWith("体脂率：") || line.startsWith("静息心率：") || line.startsWith("睡眠："))) lines.push("目前没有可汇总的身体数据。");
    lines.push("", "每一点成长都已算数。休息与空白没有扣分。", "数据仅依本机浏览器中的记录整理。");
    return lines.join("\n");
  }

  function renderReports() {
    $("#reportDatePill").textContent = formatDate(activeDate, { month: "long", day: "numeric", weekday: "short" });
    $("#reportText").textContent = reportTextFor(reportRange);
    $$('[data-report-range]').forEach(button => button.classList.toggle("is-active", button.dataset.reportRange === reportRange));
  }

  function render() {
    if (storageCorrupt) setSaveStatus("新版数据需先导入备份", true);
    else if (storageUnavailable) setSaveStatus("浏览器目前无法保存", true);
    $("#activeDate").value = activeDate;
    renderHome();
    renderLight();
    renderPlans();
    renderWorkouts();
    renderBodyForm();
    renderHistory();
    renderReports();
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2300);
  }

  function setView(view) {
    const valid = ["home", "light", "plans", "training", "body", "history", "reports"].includes(view) ? view : "home";
    $$(".view").forEach(panel => {
      const active = panel.id === `view-${valid}`;
      panel.classList.toggle("is-visible", active);
      panel.hidden = !active;
    });
    $$(".nav-item").forEach(button => button.classList.toggle("is-active", button.dataset.view === valid));
    if (valid === "body") renderChart();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectDate(date, view = null) {
    if (!validDateKey(date)) return;
    activeDate = date;
    calendarCursor = firstOfMonth(parseLocalDate(date));
    render();
    if (view) setView(view);
  }

  function addLight(id) {
    const item = lights.find(light => light.id === id);
    if (!item) return;
    const noteInput = $(`[data-light-note="${id}"]`);
    const record = ensureRecord(activeDate);
    const note = noteInput ? noteInput.value.trim() : record.drafts[id] || "";
    record.notes[id] = note;
    record.drafts[id] = note;
    const already = Boolean(record.logs[id]);
    if (!already) {
      record.logs[id] = { at: new Date().toISOString() };
      awardOnce(`light:${activeDate}:${id}`, activeDate, item.stat, XP_PER_LIGHT, "light", id);
    }
    persist();
    render();
    showToast(already ? "内容已更新，原有奖励保持不变。" : `已留下一束光，永久获得 ${XP_PER_LIGHT} XP。`);
  }

  function addPlan(event) {
    event.preventDefault();
    const title = $("#planTitleInput").value.trim();
    if (!title) return;
    state.plans.push({ id: makeId(), title, time: $("#planTimeInput").value, kind: $("#planKindInput").value, createdOn: activeDate, inactiveFrom: "" });
    $("#planForm").reset();
    $("#planStatus").textContent = "已添加。你可以随时在某一天勾选完成，没有连续打卡要求。";
    persist();
    render();
    showToast("生活计划已加入。" );
  }

  function saveBody(event) {
    event.preventDefault();
    const fields = $$('[data-metric]');
    const values = fields.map(input => input.value.trim());
    const record = recordFor(activeDate);
    const hasOldValues = ["weight", "waist", "fat", "mood"].some(key => {
      const value = metricValue(activeDate, key);
      return value !== "" && value != null;
    });
    if (values.every(value => !value) && !Object.keys(record.body || {}).length && !hasOldValues) {
      $("#bodyStatus").textContent = "先填入一项想保存的内容即可。";
      return;
    }
    const body = ensureRecord(activeDate).body;
    fields.forEach(input => { body[input.dataset.metric] = input.value.trim(); });
    persist();
    render();
    $("#bodyStatus").textContent = "已保存到本机，可在上方趋势图中回顾。";
    showToast("身体记录已保存。" );
  }

  function addWorkout(event) {
    event.preventDefault();
    const exercise = $("#exerciseInput").value.trim();
    if (!exercise) return;
    const set = { id: makeId(), weight: $("#setWeightInput").value.trim(), reps: $("#setRepsInput").value.trim(), rpe: $("#setRpeInput").value.trim() };
    ensureRecord(activeDate).workouts.push({ id: makeId(), exercise, sets: [set] });
    $("#exerciseInput").value = "";
    $("#setWeightInput").value = "";
    $("#setRepsInput").value = "";
    $("#setRpeInput").value = "";
    persist();
    render();
    showToast("动作和第 1 组已保存。" );
  }

  function mergeRecordFromBackup(local, incoming) {
    const merged = { ...copyJson(incoming), ...copyJson(local) };
    for (const key of ["logs", "notes", "drafts", "plansDone"]) merged[key] = { ...(incoming[key] || {}), ...(local[key] || {}) };
    merged.body = { ...(incoming.body || {}), ...(local.body || {}) };
    const localWorkouts = Array.isArray(local.workouts) ? local.workouts : [];
    const incomingWorkouts = Array.isArray(incoming.workouts) ? incoming.workouts : [];
    const ids = new Set(localWorkouts.map(session => session.id));
    merged.workouts = [...incomingWorkouts.filter(session => !ids.has(session.id)), ...localWorkouts];
    return merged;
  }

  function mergeV2Backup(saved) {
    let changed = false;
    for (const [date, incoming] of Object.entries(saved.records || {})) {
      if (!validDateKey(date) || !isObject(incoming)) continue;
      state.records[date] = state.records[date] ? mergeRecordFromBackup(state.records[date], incoming) : copyJson(incoming);
      changed = true;
    }
    const planIds = new Set(state.plans.map(plan => plan.id));
    for (const plan of saved.plans || []) if (isObject(plan) && plan.id && !planIds.has(plan.id)) { state.plans.push(copyJson(plan)); planIds.add(plan.id); changed = true; }
    for (const [id, award] of Object.entries(saved.awards || {})) if (!own(state.awards, id) && isObject(award)) { state.awards[id] = copyJson(award); changed = true; }
    for (const [date, row] of Object.entries(saved.legacy || {})) if (validDateKey(date) && !own(state.legacy, date) && isObject(row)) { state.legacy[date] = copyJson(row); changed = true; }
    return changed;
  }

  function exportBackup() {
    const payload = { format: "gk-light-v2-backup", schemaVersion: 2, exportedAt: new Date().toISOString(), state };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `GK-light-V2-backup-${todayKey()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    $("#backupStatus").textContent = "备份已生成并下载到本机；请妥善保管文件。";
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const status = $("#backupStatus");
    try {
      const payload = JSON.parse(await file.text());
      let kind = "";
      let changed = false;
      if (isObject(payload) && payload.format === "gk-light-v2-backup" && payload.schemaVersion === 2 && isObject(payload.state) && payload.state.schemaVersion === 2) {
        kind = "V2";
        if (storageCorrupt) {
          state = makeState();
          const currentLegacy = readLegacyStorage();
          if (currentLegacy) mergeLegacySnapshot(currentLegacy);
          storageCorrupt = false;
        }
        changed = mergeV2Backup(payload.state) || changed;
      } else if (isLegacySnapshot(payload)) {
        kind = "V1";
        if (storageCorrupt) { state = makeState(); storageCorrupt = false; }
        changed = mergeLegacySnapshot(payload).changed || changed;
      } else {
        throw new Error("unknown backup format");
      }
      if (!changed && !state.updatedAt) throw new Error("empty backup");
      persist();
      render();
      status.textContent = kind === "V1" ? "V1 历史记录已合并到新版副本；原始数据键未被修改。" : "V2 备份已合并。相同日期以本机内容为优先，XP 奖励不会重复计算。";
      showToast(`${kind} 备份导入完成。`);
    } catch {
      status.textContent = "无法读取这个备份文件。原有记录没有被改动。";
      showToast("备份格式无法识别。" );
    } finally { event.target.value = ""; }
  }

  async function copyReport() {
    const content = $("#reportText").textContent;
    try {
      await navigator.clipboard.writeText(content);
      showToast("报告已复制。" );
    } catch {
      const helper = document.createElement("textarea");
      helper.value = content;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.append(helper);
      helper.select();
      const copied = document.execCommand("copy");
      helper.remove();
      showToast(copied ? "报告已复制。" : "请选取报告文字并手动复制。" );
    }
  }

  function renderRangeButtons() {
    $$('[data-range]').forEach(button => button.classList.toggle("is-active", button.dataset.range === chartRange));
    $$('[data-report-range]').forEach(button => button.classList.toggle("is-active", button.dataset.reportRange === reportRange));
  }

  function checkDayBoundary() {
    const now = todayKey();
    if (now === seenToday) return;
    if (activeDate === seenToday) {
      activeDate = now;
      calendarCursor = firstOfMonth(parseLocalDate(now));
    }
    seenToday = now;
    render();
  }

  document.addEventListener("click", event => {
    const nav = event.target.closest("[data-view]");
    if (nav) { setView(nav.dataset.view); return; }
    const open = event.target.closest("[data-open-view]");
    if (open) { setView(open.dataset.openView); return; }
    const recordButton = event.target.closest("[data-record-light]");
    if (recordButton) { addLight(recordButton.dataset.recordLight); return; }
    const archiveButton = event.target.closest("[data-archive-plan]");
    if (archiveButton) {
      const plan = state.plans.find(item => item.id === archiveButton.dataset.archivePlan);
      if (plan) { plan.inactiveFrom = activeDate; persist(); render(); showToast("计划已从这一天起归档。" ); }
      return;
    }
    const addSetButton = event.target.closest("[data-add-set]");
    if (addSetButton) {
      const session = ensureRecord(activeDate).workouts.find(item => item.id === addSetButton.dataset.addSet);
      if (session) { session.sets.push({ id: makeId(), weight: "", reps: "", rpe: "" }); persist(); render(); }
      return;
    }
    const deleteSetButton = event.target.closest("[data-delete-set]");
    if (deleteSetButton) {
      const session = ensureRecord(activeDate).workouts.find(item => item.id === deleteSetButton.dataset.deleteSet);
      if (session) { session.sets = session.sets.filter(set => set.id !== deleteSetButton.dataset.setId); persist(); render(); }
      return;
    }
    const deleteWorkoutButton = event.target.closest("[data-delete-workout]");
    if (deleteWorkoutButton) {
      const record = ensureRecord(activeDate);
      record.workouts = record.workouts.filter(session => session.id !== deleteWorkoutButton.dataset.deleteWorkout);
      persist(); render(); showToast("这个动作记录已移除。" );
      return;
    }
    const calendarButton = event.target.closest("[data-calendar-date]");
    if (calendarButton) { selectDate(calendarButton.dataset.calendarDate); return; }
    const rangeButton = event.target.closest("[data-range]");
    if (rangeButton) { chartRange = rangeButton.dataset.range; renderRangeButtons(); renderChart(); return; }
    const reportButton = event.target.closest("[data-report-range]");
    if (reportButton) { reportRange = reportButton.dataset.reportRange; renderReports(); return; }
  });

  document.addEventListener("input", event => {
    const note = event.target.closest("[data-light-note]");
    if (note) {
      const record = ensureRecord(activeDate);
      record.drafts[note.dataset.lightNote] = note.value;
      if (record.logs[note.dataset.lightNote]) record.notes[note.dataset.lightNote] = note.value;
      persist();
      return;
    }
    const setInput = event.target.closest("[data-set-field]");
    if (setInput) {
      const record = ensureRecord(activeDate);
      const session = record.workouts.find(item => item.id === setInput.dataset.sessionId);
      const set = session?.sets.find(item => item.id === setInput.dataset.setId);
      if (set) { set[setInput.dataset.setField] = setInput.value; persist(); }
    }
  });

  document.addEventListener("change", event => {
    const planBox = event.target.closest("[data-plan-done]");
    if (planBox) {
      ensureRecord(activeDate).plansDone[planBox.dataset.planDone] = planBox.checked;
      persist(); render();
      return;
    }
  });

  $("#activeDate").addEventListener("change", event => selectDate(event.target.value));
  $("#todayButton").addEventListener("click", () => selectDate(todayKey()));
  $("#planForm").addEventListener("submit", addPlan);
  $("#bodyForm").addEventListener("submit", saveBody);
  $("#trainingForm").addEventListener("submit", addWorkout);
  $("#metricSelect").addEventListener("change", event => { chartMetric = event.target.value; renderChart(); });
  $("#prevMonth").addEventListener("click", () => { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1, 12); renderCalendar(); });
  $("#nextMonth").addEventListener("click", () => { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1, 12); renderCalendar(); });
  $("#copyReport").addEventListener("click", copyReport);
  $("#refreshReport").addEventListener("click", () => { renderReports(); showToast("报告已更新。" ); });
  $("#exportBackup").addEventListener("click", exportBackup);
  $("#restoreBackup").addEventListener("change", importBackup);

  state = readState();
  if (storageCorrupt) setSaveStatus("新版数据需先导入备份", true);
  else if (storageUnavailable) setSaveStatus("浏览器目前无法保存", true);
  else {
    const oldSnapshot = readLegacyStorage();
    if (oldSnapshot) {
      const result = mergeLegacySnapshot(oldSnapshot);
      if (result.changed) persist();
    } else if (!storage?.getItem(APP_KEY)) persist();
  }
  render();

  window.setInterval(checkDayBoundary, 30000);
  document.addEventListener("visibilitychange", checkDayBoundary);
  window.addEventListener("focus", checkDayBoundary);
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("./sw.js").catch(() => {});
})();
