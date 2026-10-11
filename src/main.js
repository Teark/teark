import { thinkers as defaultThinkers } from './data.js';
import portraitCredits from './portraitCredits.js';
import { showcaseConversations } from './showcaseConversations.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORAGE = {
  messages: 'guandao-conversations',
  threads: 'guandao-threads',
  activeThread: 'guandao-active-thread',
  customPeople: 'guandao-custom-people',
  removedPeople: 'guandao-removed-people',
  settings: 'guandao-settings',
  showcaseSeeded: 'guandao-showcase-seeded-v3',
};
const settingsDefaults = { apiBase: 'https://api.deepseek.com', apiModel: 'deepseek-flash', apiKey: '' };
const savedSettings = readLocal(STORAGE.settings, {});
const settings = { ...settingsDefaults, apiKey: savedSettings.apiKey || '' };
const removedPeople = new Set(readLocal(STORAGE.removedPeople, []));
const customPeople = readLocal(STORAGE.customPeople, []);
const people = [...defaultThinkers.filter((person) => !removedPeople.has(person.id)), ...customPeople];

function readLocal(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; }
}
function saveLocal(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function makeId() { return crypto.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function esc(value = '') { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function toast(message) {
  const element = $('#toast'); element.textContent = message; element.classList.add('visible');
  clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => element.classList.remove('visible'), 3000);
}
function normalizeMessages(rows) {
  return rows.flatMap((row, index) => {
    if (row.role && row.content) return [{ ...row, id: row.id || `message-${index}`, threadId: row.threadId || 'legacy' }];
    if (!row.question && !row.answer) return [];
    const threadId = row.threadId || 'legacy';
    return [
      ...(row.question ? [{ id: `${row.id || index}-user`, threadId, personId: row.personId, personName: row.person, role: 'user', content: row.question, time: row.time }] : []),
      ...(row.answer ? [{ id: `${row.id || index}-assistant`, threadId, personId: row.personId, personName: row.person, role: 'assistant', content: row.answer, time: row.time }] : []),
    ];
  });
}
const messages = normalizeMessages(readLocal(STORAGE.messages, []));
const storedThreads = readLocal(STORAGE.threads, []);
{
  const peopleById = new Map([...defaultThinkers, ...customPeople].map((person) => [person.id, person]));
  const seededAt = Date.now();
  let addedShowcase = false;
  showcaseConversations.forEach((conversation, conversationIndex) => {
    const person = peopleById.get(conversation.personId);
    const threadId = `showcase-${conversation.personId}`;
    const threadTime = new Date(seededAt - conversationIndex * 60_000).toISOString();
    if (!storedThreads.some((thread) => thread.id === threadId)) {
      storedThreads.push({ id: threadId, title: conversation.title, personId: conversation.personId, updatedAt: threadTime });
      addedShowcase = true;
    }
    if (!messages.some((message) => message.threadId === threadId)) {
      conversation.messages.forEach(([role, content], messageIndex) => {
        messages.push({
          id: `${threadId}-${messageIndex + 1}`,
          threadId,
          personId: conversation.personId,
          personName: person?.name || conversation.personId,
          role,
          content,
          time: new Date(seededAt - conversationIndex * 60_000 + messageIndex * 1000).toISOString(),
        });
      });
      addedShowcase = true;
    }
  });
  if (addedShowcase) {
    saveLocal(STORAGE.messages, messages);
    saveLocal(STORAGE.threads, storedThreads);
  }
  if (storedThreads.some((thread) => thread.id === 'showcase-confucius') && !localStorage.getItem(STORAGE.activeThread)) {
    localStorage.setItem(STORAGE.activeThread, 'showcase-confucius');
  }
  saveLocal(STORAGE.showcaseSeeded, true);
}
const inferredThreads = [...new Set(messages.map((message) => message.threadId))].map((id) => {
  const first = messages.find((message) => message.threadId === id && message.role === 'user');
  const last = messages.findLast?.((message) => message.threadId === id) || [...messages].reverse().find((message) => message.threadId === id);
  return { id, title: first?.content?.slice(0, 28) || '历史对话', personId: last?.personId || first?.personId, updatedAt: last?.time || new Date().toISOString() };
});
const state = {
  people, messages, threads: storedThreads.length ? storedThreads : inferredThreads,
  index: 0, activeThreadId: localStorage.getItem(STORAGE.activeThread) || '',
  busy: false, toastTimer: null, dragging: false, dragX: 0,
};
if (!state.threads.length) state.threads.push({ id: makeId(), title: '新建对话', personId: people[0]?.id, updatedAt: new Date().toISOString() });
if (!state.threads.some((thread) => thread.id === state.activeThreadId)) state.activeThreadId = state.threads.at(-1).id;
if (!state.people.length) state.people.push(...defaultThinkers.slice(0, 1));
const startupPersonIndex = state.people.findIndex((person) => person.id === currentThread()?.personId);
if (startupPersonIndex >= 0) state.index = startupPersonIndex;

function currentPerson() { return state.people[state.index]; }
function currentThread() { return state.threads.find((thread) => thread.id === state.activeThreadId); }
function persistMessages() { saveLocal(STORAGE.messages, state.messages); }
function persistThreads() { saveLocal(STORAGE.threads, state.threads); localStorage.setItem(STORAGE.activeThread, state.activeThreadId); }
function portraitSource(person) {
  if (portraitCredits[person.id]?.src) return portraitCredits[person.id].src;
  return '/portraits/portrait-unavailable.svg';
}

function wheelPosition(delta, stage) {
  const radiusX = Math.min(520, stage.clientWidth * .41);
  const radiusY = Math.min(82, stage.clientHeight * .2);
  const angle = delta * Math.PI * 2 / 13;
  return {
    x: Math.sin(angle) * radiusX,
    y: (Math.cos(angle) - 1) * radiusY,
    depth: (1 + Math.cos(angle)) / 2,
  };
}
// Render a complete, dense orbit around the featured portrait. Only the near
// side remains interactive; rear portraits are visual context for the ring.
const GALLERY_OFFSETS = Array.from({ length: 29 }, (_, index) => index - 14);
const galleryMotion = { position: state.index, target: state.index, velocity: 0, frame: 0, time: 0 };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function wrappedIndex(index) { return ((index % state.people.length) + state.people.length) % state.people.length; }
function galleryDelta(index) {
  const count = state.people.length;
  return ((index - state.index + count / 2) % count + count) % count - count / 2;
}
function renderGallery() {
  const gallery = $('#gallery');
  const stage = $('.gallery-stage');
  const indices = [...new Set(GALLERY_OFFSETS.map((offset) => wrappedIndex(state.index + offset)))];
  const existing = new Map([...gallery.children].map((card) => [Number(card.dataset.index), card]));
  indices.forEach((index) => {
    if (existing.has(index)) return;
    const person = state.people[index];
    const delta = galleryDelta(index);
    const point = wheelPosition(delta, stage);
    gallery.insertAdjacentHTML('beforeend', `<button type="button" class="portrait-card" data-index="${index}" data-id="${esc(person.id)}" aria-label="选择${esc(person.name)}" style="--x:${point.x}px;--y:${point.y}px;--accent:${esc(person.color || '#aa9575')}"><img loading="lazy" decoding="async" src="${portraitSource(person)}" alt="${esc(person.name)}${portraitCredits[person.id] ? '肖像' : '肖像待补'}" draggable="false"><span class="portrait-wash"></span><span class="portrait-caption">${esc(person.name)}</span></button>`);
  });
  updateGallery();
}
function paintGallery() {
  const stage = $('.gallery-stage');
  $$('.portrait-card').forEach((card) => {
    const index = Number(card.dataset.index);
    const delta = ((index - galleryMotion.position) % state.people.length + state.people.length * 1.5) % state.people.length - state.people.length / 2;
    const distance = Math.abs(delta);
    const { x, y, depth } = wheelPosition(delta, stage);
    card.style.setProperty('--x', `${x}px`); card.style.setProperty('--y', `${y}px`);
    card.classList.toggle('active', index === state.index);
    const focus = Math.pow(Math.max(0, 1 - distance), 2);
    const edge = Math.max(0, Math.min(1, 14 - distance));
    card.style.zIndex = String(Math.round(depth * 10 + focus * 20));
    card.style.opacity = String((.4 + depth * .56 + focus * .04) * edge);
    card.style.filter = `brightness(${.68 + depth * .27 + focus * .05}) saturate(${.58 + depth * .36 + focus * .06})`;
    const smallScale = .45 * (.38 + depth * .32);
    card.style.transform = `translate3d(calc(-50% + var(--x)),calc(-50% + var(--y)),0) scale(${smallScale + (1.12 - smallScale) * focus})`;
    const interactive = distance <= 2;
    card.disabled = !interactive;
    card.setAttribute('aria-disabled', String(!interactive));
  });
}
function animateGallery(time) {
  const dt = Math.min((time - (galleryMotion.time || time)) / 1000, .032);
  galleryMotion.time = time;
  // Critically damped motion preserves momentum when another click arrives.
  const offset = galleryMotion.position - galleryMotion.target;
  const decay = Math.exp(-12 * dt);
  const momentum = galleryMotion.velocity + 12 * offset;
  galleryMotion.position = galleryMotion.target + (offset + momentum * dt) * decay;
  galleryMotion.velocity = (galleryMotion.velocity - 12 * momentum * dt) * decay;
  const settled = Math.abs(galleryMotion.position - galleryMotion.target) < .001 && Math.abs(galleryMotion.velocity) < .01;
  if (settled) { galleryMotion.position = galleryMotion.target; galleryMotion.velocity = 0; }
  paintGallery();
  if (!settled) galleryMotion.frame = requestAnimationFrame(animateGallery);
  else {
    galleryMotion.frame = 0;
    galleryMotion.time = 0;
    $$('.portrait-card').forEach((card) => { if (Math.abs(galleryDelta(Number(card.dataset.index))) > 14) card.remove(); });
  }
}
function updateGallery() {
  galleryMotion.target -= galleryDelta(wrappedIndex(galleryMotion.target));
  if (reducedMotion.matches) {
    cancelAnimationFrame(galleryMotion.frame);
    galleryMotion.frame = 0;
    galleryMotion.position = galleryMotion.target;
    galleryMotion.velocity = 0;
    galleryMotion.time = 0;
  }
  paintGallery();
  if (!reducedMotion.matches && !galleryMotion.frame) galleryMotion.frame = requestAnimationFrame(animateGallery);
  const person = currentPerson();
  if (!person) return;
  $('#person-index').textContent = String(state.index + 1).padStart(2, '0');
  $('#person-total').textContent = String(state.people.length).padStart(2, '0');
  $('#person-era').textContent = person.era || '年代未注明';
  $('#person-role').textContent = person.role || '思想者';
  $('#person-name').textContent = person.name;
  $('#person-summary').textContent = person.summary || '';
  const quote = $('#person-quote');
  const quoteSource = $('#quote-source');
  if (quote) quote.textContent = person.quote || '';
  if (quoteSource) quoteSource.textContent = person.source || '';
  $('#composer-name').textContent = person.name;
  renderChat();
}
function selectPerson(index) {
  state.index = (index + state.people.length) % state.people.length;
  const person = currentPerson();
  const threadsForPerson = state.threads.filter((thread) => thread.personId === person.id);
  const threadsWithMessages = new Set(state.messages.map((message) => message.threadId));
  const threadWithHistory = threadsForPerson
    .filter((thread) => threadsWithMessages.has(thread.id))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
  let thread = threadWithHistory || threadsForPerson.find((item) => !threadsWithMessages.has(item.id));
  if (!thread) {
    const current = currentThread();
    if (current && !current.showEmpty && !threadsWithMessages.has(current.id)) {
      thread = current;
      thread.personId = person.id;
    } else {
      thread = { id: makeId(), title: '新建对话', personId: person.id, updatedAt: new Date().toISOString() };
      state.threads.push(thread);
    }
  }
  state.activeThreadId = thread.id;
  persistThreads();
  renderGallery();
}
function movePerson(direction) {
  selectPerson(state.index + direction);
}

function getThreadMessages(threadId = state.activeThreadId) {
  return state.messages.filter((message) => message.threadId === threadId);
}
function renderThreadList() {
  const query = $('#history-search-input').value.trim().toLowerCase();
  const rows = [...state.threads].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .filter((thread) => thread.showEmpty || getThreadMessages(thread.id).length > 0)
    .filter((thread) => `${thread.title} ${state.people.find((person) => person.id === thread.personId)?.name || ''}`.toLowerCase().includes(query));
  $('#history-count').textContent = String(rows.length).padStart(2, '0');
  $('#thread-list').innerHTML = rows.length ? rows.map((thread) => {
    const person = state.people.find((item) => item.id === thread.personId);
    return `<button class="thread-row ${thread.id === state.activeThreadId ? 'active' : ''}" data-thread-id="${esc(thread.id)}"><span class="thread-row-mark">◌</span><span class="thread-row-copy"><b>${esc(thread.title || '新建对话')}</b><small>${esc(person?.name || '人物对话')} · ${new Date(thread.updatedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</small></span></button>`;
  }).join('') : '<div class="thread-empty">没有匹配的对话</div>';
}
function renderChat() {
  const threadMessages = getThreadMessages();
  const list = $('#chat-messages');
  const transcript = $('.chat-transcript');
  transcript.classList.toggle('is-mature', threadMessages.filter((message) => message.role === 'user').length > 4);
  list.innerHTML = threadMessages.length ? threadMessages.map((message) => {
    const isUser = message.role === 'user';
    const speaker = isUser ? '我' : (message.personName || currentPerson().name);
    return `<article class="chat-message ${isUser ? 'from-user' : 'from-person'}"><span class="message-avatar" aria-label="${esc(speaker)}" title="${esc(speaker)}">${esc(speaker)}</span><p>${esc(message.content)}</p></article>`;
  }).join('') : '<div class="chat-welcome"><span class="welcome-orbit">✦</span><span>把你的问题交给此刻的思想者。</span></div>';
  requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
  renderThreadList();
}
function openThread(threadId) {
  state.activeThreadId = threadId; persistThreads();
  const thread = currentThread();
  const personIndex = state.people.findIndex((person) => person.id === thread?.personId);
  if (personIndex >= 0) state.index = personIndex;
  renderGallery();
}
function newConversation() {
  const thread = { id: makeId(), title: '新建对话', personId: currentPerson().id, updatedAt: new Date().toISOString(), showEmpty: true };
  state.threads.push(thread); state.activeThreadId = thread.id; persistThreads();
  $('#message-input').value = ''; renderChat(); $('#message-input').focus();
}

function buildPrompt(person, history) {
  const background = `你是著名的思想者「${person.name}」（${person.era || '年代未注明'}，${person.role || '思想者'}）。请以他的口吻与思想气质，用中文回答。自然、真诚、有洞见；合适时结合经典名言或核心思想，不要生硬拼接，也不要把生成内容冒充史实原话。回答简洁有力。人物背景：${person.summary || '以自己的思想经历回应问题。'}`;
  return [{ role: 'system', content: background }, ...history.slice(-12).map(({ role, content }) => ({ role, content }))];
}
async function askModel(question, history, person) {
  if (!settings.apiKey) throw new Error('请先在左下角设置中填写 DeepSeek API Key');
  const response = await fetch(`${settingsDefaults.apiBase}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({ model: settingsDefaults.apiModel, temperature: .78, max_tokens: 520, messages: buildPrompt(person, [...history, { role: 'user', content: question }]) }),
  });
  if (!response.ok) throw new Error(`模型接口返回 ${response.status}`);
  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error('模型没有返回回答，请稍后重试');
  return answer;
}
async function sendMessage(text) {
  const question = text.trim();
  if (!question || state.busy) return;
  const person = currentPerson();
  const thread = currentThread();
  const threadId = state.activeThreadId;
  const history = getThreadMessages().map(({ role, content }) => ({ role, content }));
  const userMessage = { id: makeId(), threadId, personId: person.id, personName: person.name, role: 'user', content: question, time: new Date().toISOString() };
  state.messages.push(userMessage);
  if (!thread.title || thread.title === '新建对话') thread.title = question.slice(0, 28);
  thread.personId = person.id; thread.updatedAt = userMessage.time;
  persistMessages(); persistThreads();
  $('#message-input').value = ''; fitInput();
  state.busy = true; $('#send-button').disabled = true; renderChat();
  const pending = document.createElement('article'); pending.className = 'chat-message from-person pending';
  pending.innerHTML = `<span class="message-avatar" aria-label="${esc(person.name)}">${esc(person.name)}</span><p>正在思考…</p>`;
  $('#chat-messages').append(pending); $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight;
  try {
    const answer = await askModel(question, history, person);
    state.messages.push({ id: makeId(), threadId, personId: person.id, personName: person.name, role: 'assistant', content: answer, time: new Date().toISOString() });
    thread.updatedAt = new Date().toISOString();
    persistMessages(); persistThreads(); renderChat();
  } catch (error) {
    pending.classList.remove('pending'); pending.querySelector('p').textContent = error.message || '暂时无法连接模型，请检查设置后重试。';
  } finally {
    state.busy = false; $('#send-button').disabled = false;
  }
}

const MANAGED_PAGE_SIZE = 100;
let managedMatches = [];
let managedVisibleCount = 0;
function managedPersonMarkup(person) {
  return `<div class="managed-person"><img loading="lazy" decoding="async" src="${portraitSource(person)}" alt="${esc(person.name)}${portraitCredits[person.id] ? '肖像' : '肖像待补'}"><span><b>${esc(person.name)}</b><small>${esc(person.region || '自定义')} · ${esc(person.role || '思想者')}</small></span><button type="button" data-remove-person="${esc(person.id)}" aria-label="删除${esc(person.name)}">×</button></div>`;
}
function renderManagedPeople(reset = true) {
  const query = $('#person-search').value.trim().toLowerCase();
  if (reset) {
    managedMatches = state.people.filter((person) => `${person.name} ${person.region || ''} ${person.role || ''}`.toLowerCase().includes(query));
    managedVisibleCount = 0;
  }
  $('#managed-count').textContent = `${state.people.length} 位人物`;
  const list = $('#managed-people-list');
  if (reset) list.replaceChildren();
  const nextBatch = managedMatches.slice(managedVisibleCount, managedVisibleCount + MANAGED_PAGE_SIZE);
  if (nextBatch.length) {
    list.insertAdjacentHTML('beforeend', nextBatch.map(managedPersonMarkup).join(''));
    managedVisibleCount += nextBatch.length;
  }
  list.querySelector('#managed-load-more')?.remove();
  if (managedVisibleCount < managedMatches.length) {
    const more = document.createElement('button');
    more.id = 'managed-load-more'; more.type = 'button'; more.className = 'managed-load-more';
    more.textContent = `加载更多人物（${managedMatches.length - managedVisibleCount}）`;
    list.append(more);
  }
  if (!managedMatches.length) list.innerHTML = '<p class="managed-empty">没有找到人物</p>';
}
function openPersonManager() { $('#person-modal').classList.add('open'); $('#person-modal').setAttribute('aria-hidden', 'false'); renderManagedPeople(); }
function closePersonManager() { $('#person-modal').classList.remove('open'); $('#person-modal').setAttribute('aria-hidden', 'true'); }
async function addPerson(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = String(formData.get('name') || '').trim();
  if (!name) { toast('请填写人物姓名'); return; }
  if (state.people.some((person) => person.name === name)) { toast('相册中已经有这位人物'); return; }
  if (!settings.apiKey) { toast('请先在设置中填写 DeepSeek API Key，再补全人物资料'); return; }
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true; submitButton.textContent = '正在补全资料…';
  try {
    const response = await fetch(`${settingsDefaults.apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
      body: JSON.stringify({
        model: settingsDefaults.apiModel, temperature: .2, max_tokens: 420,
        messages: [
          { role: 'system', content: '你是严谨的历史人物资料整理员。根据常识知识为用户给出的历史或神话人物生成简体中文资料。仅返回 JSON 对象，字段为 era、role、region、summary、quote、source。时代或身份无法确认时明确写“未详”；人物简介简明准确；语录只有确定可归于此人的经典语句才填写，否则留空。不要编造史实。region 限定为中国、国外、神话之一。' },
          { role: 'user', content: `请补全这位人物的资料，姓名是：${name}` },
        ],
      }),
    });
    if (!response.ok) throw new Error(`模型接口返回 ${response.status}`);
    const result = await response.json();
    const raw = result.choices?.[0]?.message?.content?.trim() || '';
    const json = raw.match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error('模型没有返回可用的人物资料');
    const profile = JSON.parse(json);
    const person = {
      id: makeId(), custom: true, name,
      era: String(profile.era || '年代未详').slice(0, 60),
      role: String(profile.role || '思想者').slice(0, 60),
      summary: String(profile.summary || `关于${name}的资料尚待补充。`).slice(0, 220),
      quote: String(profile.quote || '').slice(0, 220),
      source: String(profile.source || ''),
      region: ['中国', '国外', '神话'].includes(profile.region) ? profile.region : '国外',
      color: '#b8a275',
    };
    customPeople.push(person); saveLocal(STORAGE.customPeople, customPeople);
    state.people.push(person); state.index = state.people.length - 1;
    form.reset(); renderGallery(); renderManagedPeople();
    toast(`${name}已补全资料并加入相册`);
  } catch (error) {
    toast(error.message || '人物资料补全失败，请检查密钥后重试');
  } finally {
    submitButton.disabled = false; submitButton.innerHTML = '加入相册 <span>→</span>';
  }
}
function removePerson(personId) {
  if (state.people.length <= 1) { toast('相册至少保留一位人物'); return; }
  const person = state.people.find((item) => item.id === personId);
  if (!person) return;
  const currentId = currentPerson().id;
  if (person.custom) {
    const customIndex = customPeople.findIndex((item) => item.id === personId);
    if (customIndex >= 0) customPeople.splice(customIndex, 1);
    saveLocal(STORAGE.customPeople, customPeople);
  } else {
    removedPeople.add(personId); saveLocal(STORAGE.removedPeople, [...removedPeople]);
  }
  state.people = state.people.filter((item) => item.id !== personId);
  const keepIndex = state.people.findIndex((item) => item.id === currentId);
  state.index = keepIndex >= 0 ? keepIndex : 0;
  state.threads.forEach((thread) => { if (thread.personId === personId) thread.personId = currentPerson().id; });
  persistThreads(); renderGallery(); renderManagedPeople(); toast(`${person.name}已从相册移除`);
}

function openSettings() { $('#settings-modal').classList.add('open'); $('#settings-modal').setAttribute('aria-hidden', 'false'); $('#api-key').value = settings.apiKey; $('#api-key').focus(); }
function closeSettings() { $('#settings-modal').classList.remove('open'); $('#settings-modal').setAttribute('aria-hidden', 'true'); }
function saveSettings() {
  settings.apiKey = $('#api-key').value.trim();
  saveLocal(STORAGE.settings, { apiKey: settings.apiKey });
  $('#settings-feedback').textContent = '已保存到此设备'; toast('设置已保存'); setTimeout(closeSettings, 450);
}

function setupStarfield() {
  const canvas = document.createElement('canvas'); canvas.className = 'star-canvas'; canvas.setAttribute('aria-hidden', 'true'); $('.starfield').append(canvas);
  const context = canvas.getContext('2d');
  function draw() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio;
    canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(420, Math.round(innerWidth * innerHeight / 4000));
    context.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = 0; i < count; i += 1) {
      const x = Math.random() * innerWidth, y = Math.random() * innerHeight;
      const radius = Math.random() * 1.35 + .25;
      context.beginPath(); context.fillStyle = `rgba(225,232,255,${Math.random() * .65 + .25})`;
      context.shadowColor = 'rgba(175,194,255,.55)'; context.shadowBlur = radius > 1.1 ? 5 : 0;
      context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
    }
    context.shadowBlur = 0;
  }
  draw(); addEventListener('resize', draw);
}
function fitInput() { const input = $('#message-input'); input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 130)}px`; }
function init() {
  setupStarfield(); renderGallery(); renderThreadList(); renderChat();
  const sidebarToggle = $('#sidebar-toggle');
  sidebarToggle.addEventListener('click', () => {
    const collapsed = document.querySelector('.app-shell').classList.toggle('sidebar-collapsed');
    sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
    sidebarToggle.setAttribute('aria-label', collapsed ? '展开侧栏' : '收起侧栏');
    sidebarToggle.title = collapsed ? '展开侧栏' : '收起侧栏';
    sidebarToggle.querySelector('path').setAttribute('d', collapsed ? 'm9.5 5 7 7-7 7' : 'm14.5 5-7 7 7 7');
  });
  const activateControl = (target) => {
    const button = target.closest('.side-arrow,.portrait-card');
    if (!button || button.disabled) return;
    if (button.matches('.side-arrow-left')) movePerson(-1);
    else if (button.matches('.side-arrow-right')) movePerson(1);
    else if (button.matches('.portrait-card')) selectPerson(Number(button.dataset.index));
  };
  $('#prev-person').addEventListener('click', (event) => activateControl(event.target));
  $('#next-person').addEventListener('click', (event) => activateControl(event.target));
  $('#gallery').addEventListener('click', (event) => activateControl(event.target));
  $('#send-button').addEventListener('click', () => sendMessage($('#message-input').value));
  $('#message-input').addEventListener('input', fitInput);
  $('#message-input').addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(event.currentTarget.value); } });
  $('#new-conversation').addEventListener('click', newConversation);
  $('#thread-list').addEventListener('click', (event) => { const button = event.target.closest('[data-thread-id]'); if (button) openThread(button.dataset.threadId); });
  $('#history-search-input').addEventListener('input', renderThreadList);
  $('#person-manager-open').addEventListener('click', openPersonManager);
  $('#person-manager-close').addEventListener('click', closePersonManager);
  $('#person-form').addEventListener('submit', addPerson);
  $('#person-search').addEventListener('input', renderManagedPeople);
  $('#managed-people-list').addEventListener('click', (event) => {
    if (event.target.closest('#managed-load-more')) { renderManagedPeople(false); return; }
    const button = event.target.closest('[data-remove-person]'); if (button) removePerson(button.dataset.removePerson);
  });
  $('#settings-open').addEventListener('click', openSettings);
  $('#settings-close').addEventListener('click', closeSettings);
  $('#settings-cancel').addEventListener('click', closeSettings);
  $('#settings-save').addEventListener('click', saveSettings);
  $('#settings-modal').addEventListener('click', (event) => { if (event.target.id === 'settings-modal') closeSettings(); });
  $('#person-modal').addEventListener('click', (event) => { if (event.target.id === 'person-modal') closePersonManager(); });
  $('#key-visibility').addEventListener('click', () => { $('#api-key').type = $('#api-key').type === 'password' ? 'text' : 'password'; });
  const stage = $('.gallery-stage');
  let lastWheelTurn = 0;
  stage.addEventListener('wheel', (event) => {
    const rawDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const delta = rawDelta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1);
    if (Math.abs(delta) < 1) return;
    event.preventDefault();
    const now = performance.now();
    if (now - lastWheelTurn < 220 || Math.abs(delta) < 2) return;
    lastWheelTurn = now;
    movePerson(delta > 0 ? 1 : -1);
  }, { passive: false });
  stage.addEventListener('pointerdown', (event) => { if (event.target.closest('.side-arrow,.portrait-card')) return; state.dragging = true; state.dragX = event.clientX; stage.setPointerCapture(event.pointerId); });
  stage.addEventListener('pointerup', (event) => { if (state.dragging && Math.abs(event.clientX - state.dragX) > 35) movePerson(event.clientX < state.dragX ? 1 : -1); state.dragging = false; });
  stage.addEventListener('pointercancel', () => { state.dragging = false; });
  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.matches('input,textarea,[contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      movePerson(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(updateGallery);
  }, { passive: true });
}
init();
