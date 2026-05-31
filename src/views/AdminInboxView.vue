<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { api } from '../services/api.js';

const conversations = ref([]);
const selectedId = ref(null);
const replyText = ref('');
const threadEl = ref(null);
let refreshTimer = null;

const selected = computed(() => conversations.value.find(c => c.id === selectedId.value) || null);

async function load() {
  try {
    conversations.value = await api.getChatConversations();
  } catch {
    conversations.value = [];
  }
}

function selectConversation(id) {
  selectedId.value = id;
  nextTick(scrollThread);
}

function scrollThread() {
  if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight;
}

async function deleteConversation(id) {
  if (!confirm('Delete this conversation? This cannot be undone.')) return;
  await api.deleteChatConversation(id);
  if (selectedId.value === id) selectedId.value = null;
  await load();
}

async function sendReply() {
  const text = replyText.value.trim();
  if (!text || !selectedId.value) return;
  replyText.value = '';
  await api.replyChatConversation(selectedId.value, text);
  await load();
  nextTick(scrollThread);
}

function onReplyKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendReply();
  }
}

function lastMessage(conv) {
  if (!conv.messages.length) return 'No messages yet';
  const last = conv.messages[conv.messages.length - 1];
  return last.text.length > 50 ? last.text.slice(0, 50) + '…' : last.text;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-AU', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function unreadCount(conv) {
  return conv.messages.filter(m => m.sender === 'customer').length;
}

onMounted(() => {
  load();
  refreshTimer = setInterval(load, 3000);
});

onUnmounted(() => clearInterval(refreshTimer));
</script>

<template>
  <div class="admin-inbox-page py-5">
    <div class="container">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 class="display-5 fw-bold">Chat Inbox</h1>
        </div>
        <span class="badge bg-dark fs-6">{{ conversations.length }} conversation{{ conversations.length !== 1 ? 's' : '' }}</span>
      </div>

      <div class="inbox-layout">
        <!-- Conversation List -->
        <div class="conv-list">
          <div v-if="conversations.length === 0" class="empty-state text-center py-5">
            <p class="text-secondary">No conversations yet.</p>
            <p class="small text-secondary">Customers who use the chat widget will appear here.</p>
          </div>

          <button
            v-for="conv in conversations"
            :key="conv.id"
            class="conv-item"
            :class="{ active: conv.id === selectedId }"
            @click="selectConversation(conv.id)"
          >
            <div class="conv-avatar">{{ conv.customerName.charAt(0).toUpperCase() }}</div>
            <div class="conv-info">
              <div class="d-flex justify-content-between align-items-center">
                <span class="conv-name">{{ conv.customerName }}</span>
                <span class="conv-time">{{ formatDate(conv.updatedAt) }}</span>
              </div>
              <div class="conv-phone text-secondary">{{ conv.customerPhone }}</div>
              <div class="conv-preview">{{ lastMessage(conv) }}</div>
            </div>
          </button>
        </div>

        <!-- Thread Panel -->
        <div class="thread-panel">
          <!-- Empty state -->
          <div v-if="!selected" class="thread-empty">
            <p class="text-secondary">Select a conversation to view messages</p>
          </div>

          <template v-else>
            <!-- Thread Header -->
            <div class="thread-header">
              <div class="thread-avatar">{{ selected.customerName.charAt(0).toUpperCase() }}</div>
              <div style="flex:1">
                <div class="fw-semibold">{{ selected.customerName }}</div>
                <div class="small text-secondary">{{ selected.customerPhone }} · Started {{ formatDate(selected.createdAt) }}</div>
              </div>
              <button class="delete-conv-btn" @click="deleteConversation(selected.id)" title="Delete conversation">
                Delete
              </button>
            </div>

            <!-- Messages -->
            <div class="thread-messages" ref="threadEl">
              <div
                v-for="(msg, i) in selected.messages"
                :key="i"
                :class="msg.sender === 'customer' ? 'tmsg-customer' : msg.sender === 'admin' ? 'tmsg-admin' : 'tmsg-bot'"
              >
                <div class="tmsg-label">
                  {{ msg.sender === 'customer' ? selected.customerName : msg.sender === 'admin' ? 'You (Admin)' : 'Bot' }}
                  <span class="tmsg-time">· {{ msg.time }}</span>
                </div>
                <div
                  class="tmsg-bubble"
                  :class="{
                    'tbubble-customer': msg.sender === 'customer',
                    'tbubble-admin': msg.sender === 'admin',
                    'tbubble-bot': msg.sender === 'bot',
                  }"
                >{{ msg.text }}</div>
              </div>
            </div>

            <!-- Reply Input -->
            <div class="thread-reply">
              <textarea
                v-model="replyText"
                class="reply-input"
                placeholder="Type your reply..."
                rows="2"
                @keydown="onReplyKeydown"
              ></textarea>
              <button class="reply-btn" :disabled="!replyText.trim()" @click="sendReply">
                Send Reply
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-inbox-page {
  color: var(--ink);
  min-height: calc(100vh - 73px);
}

.badge.bg-dark {
  background-color: #111111 !important;
  color: #ffffff;
}

.inbox-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.5rem;
  height: calc(100vh - 220px);
  min-height: 500px;
}

/* Conversation List */
.conv-list {
  background: #f5f5f7;
  border-radius: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
}

.conv-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: #111111;
  text-align: left;
  cursor: pointer;
  width: 100%;
  transition: background 0.15s;
}

.conv-item:hover {
  background: #e5e5ea;
}

.conv-item.active {
  background: #111111;
  color: #ffffff;
}

.conv-item.active .conv-phone,
.conv-item.active .conv-time,
.conv-item.active .conv-preview {
  color: rgba(255, 255, 255, 0.65) !important;
}

.conv-avatar {
  width: 40px;
  height: 40px;
  background: #0071e3;
  color: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.conv-item.active .conv-avatar {
  background: rgba(255, 255, 255, 0.2);
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-name {
  font-weight: 600;
  font-size: 0.88rem;
}

.conv-phone {
  font-size: 0.75rem;
  margin-top: 1px;
}

.conv-time {
  font-size: 0.7rem;
  color: #6e6e73;
  white-space: nowrap;
}

.conv-preview {
  font-size: 0.78rem;
  color: #6e6e73;
  margin-top: 3px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Thread Panel */
.thread-panel {
  background: #f5f5f7;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.thread-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thread-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e5e5ea;
  flex-shrink: 0;
}

.thread-avatar {
  width: 40px;
  height: 40px;
  background: #0071e3;
  color: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.thread-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tmsg-customer,
.tmsg-admin,
.tmsg-bot {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.tmsg-admin,
.tmsg-bot {
  align-self: flex-end;
  align-items: flex-end;
}

.tmsg-customer {
  align-self: flex-start;
  align-items: flex-start;
}

.tmsg-label {
  font-size: 0.7rem;
  color: #6e6e73;
  margin-bottom: 4px;
  font-weight: 600;
}

.tmsg-time {
  font-weight: 400;
}

.tmsg-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 0.85rem;
  line-height: 1.45;
  word-break: break-word;
  white-space: pre-wrap;
}

.tbubble-customer {
  background: #111111;
  color: #ffffff;
  border-bottom-left-radius: 4px;
}

.tbubble-admin {
  background: #0071e3;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.tbubble-bot {
  background: #ffffff;
  color: #111111;
  border-bottom-right-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* Reply Input */
.thread-reply {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  background: #ffffff;
  border-top: 1px solid #e5e5ea;
  align-items: flex-end;
  flex-shrink: 0;
}

.delete-conv-btn {
  padding: 6px 14px;
  background: transparent;
  color: #e3000b;
  border: 1.5px solid #e3000b;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.18s, color 0.18s;
}

.delete-conv-btn:hover {
  background: #e3000b;
  color: #ffffff;
}

.reply-input {
  flex: 1;
  padding: 10px 14px;
  border: 1.5px solid #e5e5ea;
  border-radius: 12px;
  font-size: 0.85rem;
  font-family: inherit;
  color: #111111;
  background: #f5f5f7;
  outline: none;
  resize: none;
  line-height: 1.4;
  transition: border-color 0.2s;
}

.reply-input:focus {
  border-color: #0071e3;
  background: #ffffff;
}

.reply-btn {
  padding: 10px 20px;
  background: #111111;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.reply-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.reply-btn:not(:disabled):hover {
  opacity: 0.8;
}

@media (max-width: 767px) {
  .inbox-layout {
    grid-template-columns: 1fr;
    height: auto;
  }

  .conv-list {
    height: 300px;
  }

  .thread-panel {
    height: 500px;
  }
}
</style>

<style>
.admin-inbox-page {
  background:
    radial-gradient(circle at top left, rgba(0, 113, 227, 0.12), transparent 28rem),
    #111111;
  color: var(--ink);
}

.admin-inbox-page .badge.bg-dark {
  background-color: #f5f5f7 !important;
  color: #111111;
}

.admin-inbox-page .conv-list,
.admin-inbox-page .thread-panel {
  background: #18181b;
  border: 1px solid #2f2f35;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24);
}

.admin-inbox-page .conv-item {
  color: var(--ink);
}

.admin-inbox-page .conv-item:hover {
  background: #24242a;
}

.admin-inbox-page .conv-item.active {
  background: #f5f5f7;
  color: #111111;
}

.admin-inbox-page .conv-item.active .conv-phone,
.admin-inbox-page .conv-item.active .conv-time,
.admin-inbox-page .conv-item.active .conv-preview {
  color: rgba(17, 17, 17, 0.62) !important;
}

.admin-inbox-page .conv-phone,
.admin-inbox-page .conv-time,
.admin-inbox-page .conv-preview,
.admin-inbox-page .thread-empty .text-secondary,
.admin-inbox-page .thread-header .text-secondary,
.admin-inbox-page .tmsg-label {
  color: var(--muted) !important;
}

.admin-inbox-page .thread-header,
.admin-inbox-page .thread-reply {
  background: #1f1f23;
  border-color: #2f2f35;
}

.admin-inbox-page .tbubble-customer,
.admin-inbox-page .tbubble-bot {
  background: #2a2a30;
  border: 1px solid #3a3a42;
  color: var(--ink);
  box-shadow: none;
}

.admin-inbox-page .reply-input {
  background: #111111;
  border-color: #3a3a42;
  color: var(--ink);
}

.admin-inbox-page .reply-input::placeholder {
  color: var(--muted);
}

.admin-inbox-page .reply-input:focus {
  background: #111111;
  border-color: #f5f5f7;
}

.admin-inbox-page .reply-btn {
  background: #f5f5f7;
  color: #111111;
}
</style>
