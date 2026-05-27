<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const STORAGE_KEY = 'novatech-chat';
const CONV_STORE_KEY = 'novatech-conversations';

const router = useRouter();

const QUICK_REPLIES = [
  { label: 'Browse Products', type: 'nav', route: { path: '/products' } },
  { label: 'View iPhones', type: 'nav', route: { path: '/products', query: { category: 'iphone' } } },
  { label: 'View MacBooks', type: 'nav', route: { path: '/products', query: { category: 'macbook' } } },
  { label: 'View iPads', type: 'nav', route: { path: '/products', query: { category: 'ipad' } } },
  {
    label: 'Check Order Status',
    type: 'auto',
    response: "To check your order status, please log into your account or provide your order number and we'll look it up for you.",
  },
  {
    label: 'Contact Information',
    type: 'auto',
    response: 'Store Hours: 8:00 AM - 12:00 AM (Daily)\nPhone: 1800-NOVATECH\nEmail: support@novatech.com\nLive chat available now!',
  },
  {
    label: 'Chat on Facebook Messenger',
    type: 'messenger',
    url: 'https://m.me/1188711524317937',
  },
];

const showQuickReplies = ref(false);
const inputText = ref('');
const isOpen = ref(false);
const phase = ref('form'); // 'form' | 'chat'
const conversationId = ref(null);

// Pre-chat form state
const formName = ref('');
const formPhone = ref('');
const formMessage = ref('');
const formError = ref('');

// Chat state — type: 'bot' | 'user' | 'admin'
const messages = ref([]);
const isTyping = ref(false);
const messagesEl = ref(null);

let pollTimer = null;

const isFormValid = computed(() => {
  const phone = formPhone.value.trim();
  return (
    formName.value.trim().length > 0 &&
    /^\d{10,11}$/.test(phone) &&
    formMessage.value.trim().length > 0
  );
});

function now() {
  return new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}

// ── Conversation store helpers ──────────────────────────────────────────────
function getConversations() {
  try { return JSON.parse(localStorage.getItem(CONV_STORE_KEY) || '[]'); }
  catch { return []; }
}

function saveConversations(convs) {
  localStorage.setItem(CONV_STORE_KEY, JSON.stringify(convs));
}

function createConversation() {
  const id = crypto.randomUUID();
  conversationId.value = id;
  const convs = getConversations();
  convs.push({
    id,
    customerName: formName.value.trim(),
    customerPhone: formPhone.value.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  });
  saveConversations(convs);
}

function appendToConversation(sender, text) {
  if (!conversationId.value) return;
  const convs = getConversations();
  const conv = convs.find(c => c.id === conversationId.value);
  if (!conv) return;
  conv.messages.push({ sender, text, time: now(), timestamp: new Date().toISOString() });
  conv.updatedAt = new Date().toISOString();
  saveConversations(convs);
}

// ── Polling for admin replies ───────────────────────────────────────────────
function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    if (!conversationId.value) return;
    const conv = getConversations().find(c => c.id === conversationId.value);
    if (!conv) return;
    const adminInStore = conv.messages.filter(m => m.sender === 'admin');
    const adminShown = messages.value.filter(m => m.type === 'admin').length;
    const fresh = adminInStore.slice(adminShown);
    for (const msg of fresh) {
      messages.value.push({ type: 'admin', text: msg.text, time: msg.time });
      nextTick(scrollToBottom);
    }
    if (fresh.length > 0) saveState();
  }, 5000);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

onUnmounted(stopPolling);

// ── Message helpers ─────────────────────────────────────────────────────────
function pushMessage(type, text) {
  messages.value.push({ type, text, time: now() });
  if (type !== 'admin') {
    appendToConversation(type === 'user' ? 'customer' : 'bot', text);
  }
  saveState();
  nextTick(scrollToBottom);
}

async function botReply(text, delay = 1200) {
  isTyping.value = true;
  await new Promise(r => setTimeout(r, delay));
  isTyping.value = false;
  pushMessage('bot', text);
}

function scrollToBottom() {
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
}

// ── localStorage persistence ────────────────────────────────────────────────
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    phase: phase.value,
    userName: formName.value,
    userPhone: formPhone.value,
    conversationId: conversationId.value,
    messages: messages.value,
  }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (saved.phase === 'chat') {
      formName.value = saved.userName || '';
      formPhone.value = saved.userPhone || '';
      conversationId.value = saved.conversationId || null;
      messages.value = saved.messages || [];
      phase.value = 'chat';
      nextTick(scrollToBottom);
      startPolling();
    }
  } catch { /* ignore corrupt storage */ }
}

loadState();

// ── Actions ─────────────────────────────────────────────────────────────────
function toggleChat() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) nextTick(scrollToBottom);
}

function closeChat() {
  isOpen.value = false;
}

function newConversation() {
  stopPolling();
  localStorage.removeItem(STORAGE_KEY);
  messages.value = [];
  formName.value = '';
  formPhone.value = '';
  formMessage.value = '';
  formError.value = '';
  showQuickReplies.value = false;
  inputText.value = '';
  conversationId.value = null;
  phase.value = 'form';
}

async function submitForm() {
  if (!isFormValid.value) {
    formError.value = 'Please fill in all fields correctly.';
    return;
  }
  formError.value = '';
  phase.value = 'chat';
  createConversation();
  saveState();

  await nextTick(scrollToBottom);
  await botReply(`Hello ${formName.value.trim()}! Welcome to NovaTech. I'm here to help you.`, 600);
  pushMessage('user', formMessage.value.trim());
  await botReply("Thank you for your message! Please wait while our team reviews your inquiry. We'll respond as soon as possible.");
  showQuickReplies.value = true;
  nextTick(scrollToBottom);
  startPolling();
}

async function sendMessage() {
  const text = inputText.value.trim();
  if (!text || isTyping.value) return;
  inputText.value = '';
  showQuickReplies.value = false;
  pushMessage('user', text);
  await botReply("Thank you for your message! Please wait while our team reviews your inquiry. We'll respond as soon as possible.");
  showQuickReplies.value = true;
  nextTick(scrollToBottom);
}

function onInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

async function handleQuickReply(reply) {
  showQuickReplies.value = false;
  pushMessage('user', reply.label);
  if (reply.type === 'nav') {
    await botReply(`Taking you to ${reply.label}...`, 600);
    setTimeout(() => { router.push(reply.route); closeChat(); }, 400);
  } else if (reply.type === 'messenger') {
    await botReply('Opening Facebook Messenger for you. You can continue the conversation there with our team.', 600);
    showQuickReplies.value = true;
    nextTick(scrollToBottom);
    setTimeout(() => window.open(reply.url, '_blank', 'noopener'), 800);
  } else {
    await botReply(reply.response);
    showQuickReplies.value = true;
    nextTick(scrollToBottom);
  }
}
</script>

<template>
  <!-- Chat Widget Button -->
  <button class="chat-widget-btn" @click="toggleChat" aria-label="Open chat support">
    Need Help?
  </button>

  <!-- Backdrop: click outside to close -->
  <div v-if="isOpen" class="chat-backdrop" @click="closeChat" />

  <!-- Chat Window -->
  <Transition name="chat-slide">
    <div v-if="isOpen" class="chat-window" role="dialog" aria-label="NovaTech Support Chat">
      <!-- Header -->
      <div class="chat-header">
        <div class="d-flex align-items-center gap-2">
          <div class="chat-avatar">
            <img src="/chatbot.png" alt="NovaTech Bot" class="chat-avatar-img" />
          </div>
          <div>
            <div class="fw-semibold" style="font-size: 0.9rem;">NovaTech Support</div>
            <div style="font-size: 0.72rem; opacity: 0.8;">Available 8AM – 12AM</div>
          </div>
        </div>
        <div class="d-flex align-items-center gap-1">
          <button v-if="phase === 'chat'" class="chat-new-btn" @click="newConversation" title="Start new conversation" aria-label="New conversation"><img src="/re.png" alt="Refresh" class="re-button-img" /></button>
          <button class="chat-close-btn" @click="closeChat" aria-label="Close chat"><img src="/close.png" alt="Close" class="close-button-img" /></button>
        </div>
      </div>

      <!-- Body -->
      <div class="chat-body">
        <!-- Phase: Chat Messages -->
        <div v-if="phase === 'chat'" class="chat-messages" ref="messagesEl">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            :class="msg.type === 'user' ? 'msg-user' : 'msg-bot'"
          >
            <div v-if="msg.type !== 'user'" class="msg-avatar">
              <img v-if="msg.type === 'bot'" src="/chatbot.png" alt="Bot" class="chat-avatar-img" />
            </div>
            <div class="msg-content">
              <div v-if="msg.type === 'admin'" class="msg-sender-label">Admin</div>
              <div
                class="bubble"
                :class="{
                  'bubble-bot': msg.type === 'bot',
                  'bubble-user': msg.type === 'user',
                  'bubble-admin': msg.type === 'admin',
                }"
              >{{ msg.text }}</div>
              <div class="msg-time">{{ msg.time }}</div>
            </div>
          </div>

          <!-- Typing indicator -->
          <div v-if="isTyping" class="msg-bot">
            <div class="msg-avatar">
              <img src="/chatbot.png" alt="Bot" class="chat-avatar-img" />
            </div>
            <div class="msg-content">
              <div class="bubble bubble-bot typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Reply Buttons -->
        <div v-if="phase === 'chat' && showQuickReplies && !isTyping" class="quick-replies">
          <button
            v-for="reply in QUICK_REPLIES"
            :key="reply.label"
            class="quick-reply-btn"
            @click="handleQuickReply(reply)"
          >
            {{ reply.label }}
          </button>
        </div>

        <!-- Message Input Bar -->
        <div v-if="phase === 'chat'" class="chat-input-bar">
          <textarea
            v-model="inputText"
            class="chat-input"
            placeholder="Type your message..."
            rows="1"
            :disabled="isTyping"
            @keydown="onInputKeydown"
          ></textarea>
          <button class="chat-send-btn" :disabled="!inputText.trim() || isTyping" @click="sendMessage" aria-label="Send message">
            <img src="/sentarrow.png" alt="Arrow" class="sent-arrow-img" />
          </button>
        </div>

        <!-- Phase: Pre-Chat Form -->
        <div v-if="phase === 'form'" class="pre-chat-form">
          <p class="form-intro">Let's get started! Fill in your details and we'll connect you with our team.</p>

          <form @submit.prevent="submitForm" novalidate>
            <div class="form-group">
              <label for="chat-name">Name <span class="required">*</span></label>
              <input id="chat-name" v-model="formName" type="text" placeholder="Your name" autocomplete="name" />
            </div>

            <div class="form-group">
              <label for="chat-phone">Phone <span class="required">*</span></label>
              <input id="chat-phone" v-model="formPhone" type="tel" placeholder="10–11 digit phone number" autocomplete="tel" />
            </div>

            <div class="form-group">
              <label for="chat-msg">Message <span class="required">*</span></label>
              <textarea id="chat-msg" v-model="formMessage" placeholder="How can we help you?" rows="3"></textarea>
            </div>

            <p v-if="formError" class="form-error">{{ formError }}</p>

            <button type="submit" class="start-chat-btn" :disabled="!isFormValid">
              Start Chat
            </button>
          </form>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.chat-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1031;
  background: transparent;
  cursor: default;
}


/* ── Mobile-first base: small phones (< 480px) ── */
.chat-widget-btn {
  position: fixed;
  bottom: 14px;
  right: 14px;
  background: #111111;
  color: #ffffff;
  border: 1px solid transparent;
  padding: 11px 16px;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  z-index: 1033;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

:global(.app-shell.dark-mode .chat-widget-btn) {
  border: 2px solid #ffffff !important;
}

.chat-widget-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.chat-window {
  position: fixed;
  bottom: 0;
  right: 0;
  width: 100%;
  height: 100%;
  max-height: 100dvh;
  background: #ffffff;
  border-radius: 0;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  z-index: 1032;
  overflow: hidden;
}

/* ── Tablet: large phones / tablets (≥ 480px) ── */
@media (min-width: 480px) {
  .chat-widget-btn {
    bottom: 20px;
    right: 20px;
    padding: 12px 19px;
    font-size: 0.87rem;
  }

  .chat-window {
    bottom: 0;
    right: 16px;
    width: min(92%, 400px);
    height: 72dvh;
    max-height: 560px;
    border-radius: 16px 16px 0 0;
  }
}

/* ── Desktop (≥ 768px) ── */
@media (min-width: 768px) {
  .chat-widget-btn {
    bottom: 24px;
    right: 24px;
    padding: 14px 22px;
    font-size: 0.9rem;
  }

  .chat-window {
    bottom: 88px;
    right: 24px;
    width: 360px;
    height: 600px;
    max-height: 85vh;
    border-radius: 16px;
  }
}

.chat-header {
  background: #111111;
  color: #ffffff;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.chat-avatar {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 1rem;
}

.chat-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.chat-new-btn {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.chat-new-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.15);
}

.chat-close-btn {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.chat-close-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.15);
}

.chat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Chat Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f5f7;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg-bot,
.msg-user {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.msg-user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 28px;
  height: 28px;
  background: #e5e5ea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  flex-shrink: 0;
  overflow: hidden;
}

.msg-content {
  display: flex;
  flex-direction: column;
  max-width: 76%;
}

.msg-user .msg-content {
  align-items: flex-end;
}

.msg-sender-label {
  font-size: 0.68rem;
  color: #0071e3;
  font-weight: 600;
  margin-bottom: 3px;
  padding: 0 2px;
}

.bubble {
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 0.84rem;
  line-height: 1.45;
  word-break: break-word;
  white-space: pre-wrap;
}

.bubble-bot {
  background: #ffffff;
  color: #111111;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.bubble-user {
  background: #111111;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.bubble-admin {
  background: #0071e3;
  color: #ffffff;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.msg-time {
  font-size: 0.68rem;
  color: #6e6e73;
  margin-top: 4px;
  padding: 0 2px;
}

/* Typing indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
}

.typing-indicator span {
  width: 7px;
  height: 7px;
  background: #6e6e73;
  border-radius: 50%;
  animation: typing-bounce 1.2s infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

/* Message Input Bar */
.chat-input-bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 14px;
  background: #ffffff;
  border-top: 1px solid #e5e5ea;
  flex-shrink: 0;
}

.chat-input {
  flex: 1;
  padding: 9px 12px;
  border: 1.5px solid #e5e5ea;
  border-radius: 20px;
  font-size: 0.84rem;
  font-family: inherit;
  color: #111111;
  background: #f5f5f7;
  outline: none;
  resize: none;
  max-height: 90px;
  overflow-y: auto;
  line-height: 1.4;
  transition: border-color 0.2s;
}

.chat-input:focus {
  border-color: #0071e3;
  background: #ffffff;
}

.chat-send-btn {
  width: 36px;
  height: 36px;
  background: #111111;
  color: #ffffff;
  border: none;
  border-radius: 50%;
  font-size: 0.9rem;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.chat-send-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.chat-send-btn:not(:disabled):hover {
  opacity: 0.8;
}

/* Quick Replies */
.quick-replies {
  padding: 10px 14px 14px;
  background: #ffffff;
  border-top: 1px solid #e5e5ea;
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex-shrink: 0;
}

.quick-reply-btn {
  width: 100%;
  padding: 9px 14px;
  background: #ffffff;
  color: #0071e3;
  border: 1.5px solid #0071e3;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.18s, color 0.18s;
}

.quick-reply-btn:hover {
  background: #0071e3;
  color: #ffffff;
}

/* Pre-Chat Form */
.pre-chat-form {
  padding: 20px 18px;
  overflow-y: auto;
  flex: 1;
}

.form-intro {
  font-size: 0.82rem;
  color: #6e6e73;
  margin-bottom: 18px;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: 5px;
  color: #111111;
}

.required {
  color: #0071e3;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid #e5e5ea;
  border-radius: 10px;
  font-size: 0.85rem;
  font-family: inherit;
  color: #111111;
  background: #f5f5f7;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
  resize: none;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #0071e3;
  background: #ffffff;
}

.form-error {
  font-size: 0.78rem;
  color: #e3000b;
  margin-bottom: 10px;
}

.start-chat-btn {
  width: 100%;
  padding: 11px;
  background: #111111;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s;
}

.start-chat-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.start-chat-btn:not(:disabled):hover {
  opacity: 0.85;
}

/* Slide-up animation */
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

</style>
