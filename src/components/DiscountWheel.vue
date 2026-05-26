<script setup>
import { computed, ref } from 'vue';
import { api } from '../services/api';

const segments = [
  { label: '5% OFF', color: '#0d6efd' },
  { label: '10% OFF', color: '#198754' },
  { label: '15% OFF', color: '#fd7e14' },
  { label: '20% OFF', color: '#dc3545' },
  { label: 'Free Shipping', lines: ['Free', 'Shipping'], color: '#6f42c1' },
  { label: '25% OFF', color: '#20c997' }
];

const WHEEL_SIZE = 200;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = CENTER;
const SEGMENT_ANGLE = 360 / segments.length;

const rotation = ref(0);
const isSpinning = ref(false);
const showEmailModal = ref(false);
const email = ref('');
const emailError = ref('');
const submitError = ref('');
const successMessage = ref('');
const spinResultLabel = ref('');
const spinId = ref('');
const waitingForSpinFinish = ref(false);
const isSending = ref(false);

const wheelStyle = computed(() => ({
  transform: `rotate(${rotation.value}deg)`,
  transition: isSpinning.value ? 'transform 4.5s cubic-bezier(0.2, 0.9, 0.2, 1)' : 'none'
}));

function pointOnCircle(degrees, radius = RADIUS) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(radians),
    y: CENTER - radius * Math.cos(radians)
  };
}

function segmentPath(index) {
  const start = index * SEGMENT_ANGLE;
  const end = start + SEGMENT_ANGLE;
  const startPoint = pointOnCircle(start);
  const endPoint = pointOnCircle(end);
  const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;

  return [
    `M ${CENTER} ${CENTER}`,
    `L ${startPoint.x} ${startPoint.y}`,
    `A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`,
    'Z'
  ].join(' ');
}

function segmentLabel(index) {
  const midAngle = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
  const position = pointOnCircle(midAngle, RADIUS * 0.62);

  return {
    x: position.x,
    y: position.y,
    rotate: midAngle
  };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatWinMessage(label) {
  const display = label === 'Free Shipping' ? 'FREE SHIPPING' : label;
  return `You won ${display}!`;
}

function applySpinRotation(stopAngle) {
  const extraSpins = 5;
  const currentMod = ((rotation.value % 360) + 360) % 360;
  let delta = (stopAngle - currentMod + 360) % 360;
  if (delta === 0) delta = 360;
  rotation.value += extraSpins * 360 + delta;
}

async function spinWheel() {
  submitError.value = '';
  successMessage.value = '';
  emailError.value = '';

  if (isSpinning.value) return;

  isSpinning.value = true;
  showEmailModal.value = false;

  try {
    const result = await api.spinDiscount();
    spinId.value = result.spinId;
    const segmentIndex = result.segmentIndex ?? segments.findIndex((s) => s.label === result.discountLabel);
    spinResultLabel.value = segments[segmentIndex]?.label ?? result.discountLabel;
    waitingForSpinFinish.value = true;
    applySpinRotation(result.stopAngle);
  } catch (error) {
    submitError.value = error.message || 'Unable to spin right now. Please try again.';
    isSpinning.value = false;
  }
}

function handleWheelTransitionEnd() {
  if (!waitingForSpinFinish.value) return;
  waitingForSpinFinish.value = false;
  isSpinning.value = false;
  showEmailModal.value = true;
}

async function submitEmail() {
  submitError.value = '';
  emailError.value = '';
  successMessage.value = '';

  if (!isValidEmail(email.value)) {
    emailError.value = 'Please enter a valid email address.';
    return;
  }

  if (isSending.value) return;

  isSending.value = true;

  try {
    await api.claimDiscount({
      spinId: spinId.value,
      email: email.value.trim()
    });

    successMessage.value = 'Your discount code has been sent to your email.';
    showEmailModal.value = false;
    email.value = '';
  } catch (error) {
    submitError.value = error.message || 'Unable to send your discount code. Please try again.';
  } finally {
    isSending.value = false;
  }
}
</script>

<template>
  <section class="container py-5" aria-labelledby="discount-wheel-heading">
    <div class="promo-panel p-4 p-lg-5">
      <div class="row align-items-center g-4">
        <div class="col-12 col-lg-6 text-center text-lg-start">
          <p class="eyebrow mb-2">Limited-time offer</p>
          <h2 id="discount-wheel-heading" class="h1 mb-3">Spin the wheel for your discount</h2>
          <p class="text-secondary mb-4">
            Every spin is generated securely on our server, then your voucher is sent by email.
          </p>
          <button
            class="btn btn-dark btn-lg rounded-pill px-4"
            type="button"
            :disabled="isSpinning"
            @click="spinWheel"
          >
            {{ isSpinning ? 'Spinning...' : 'Spin Now' }}
          </button>
          <p v-if="submitError" class="text-danger mt-3 mb-0" role="alert">{{ submitError }}</p>
          <p v-if="successMessage" class="text-success mt-3 mb-0" role="status">{{ successMessage }}</p>
        </div>

        <div class="col-12 col-lg-6 d-flex justify-content-center">
          <div class="wheel-wrapper">
            <div class="wheel-pointer" aria-hidden="true"></div>
            <div
              class="discount-wheel"
              :style="wheelStyle"
              role="img"
              aria-label="Discount wheel with multiple reward segments"
              @transitionend="handleWheelTransitionEnd"
            >
              <svg
                class="wheel-svg"
                :viewBox="`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <g v-for="(segment, index) in segments" :key="segment.label">
                  <path :d="segmentPath(index)" :fill="segment.color" stroke="#fff" stroke-width="1.5" />
                  <text
                    :x="segmentLabel(index).x"
                    :y="segmentLabel(index).y"
                    :transform="`rotate(${segmentLabel(index).rotate}, ${segmentLabel(index).x}, ${segmentLabel(index).y})`"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    class="wheel-label"
                  >
                    <template v-if="segment.lines">
                      <tspan
                        v-for="(line, lineIndex) in segment.lines"
                        :key="line"
                        :x="segmentLabel(index).x"
                        :dy="lineIndex === 0 ? '-0.55em' : '1.1em'"
                      >
                        {{ line }}
                      </tspan>
                    </template>
                    <template v-else>{{ segment.label }}</template>
                  </text>
                </g>
              </svg>
              <div class="wheel-hub" aria-hidden="true"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div
    v-if="showEmailModal"
    class="modal fade show d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="discountEmailModalLabel"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content" :aria-busy="isSending">
        <div class="modal-header">
          <h3 id="discountEmailModalLabel" class="modal-title h5">{{ formatWinMessage(spinResultLabel) }}</h3>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            :disabled="isSending"
            @click="showEmailModal = false"
          ></button>
        </div>
        <div class="modal-body">
          <label for="discount-email" class="form-label">Email address</label>
          <input
            id="discount-email"
            v-model="email"
            type="email"
            class="form-control"
            placeholder="name@example.com"
            autocomplete="email"
            :aria-invalid="Boolean(emailError)"
            :disabled="isSending"
            @keyup.enter="submitEmail"
          />
          <p v-if="emailError" class="text-danger small mt-2 mb-0" role="alert">{{ emailError }}</p>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-outline-secondary"
            :disabled="isSending"
            @click="showEmailModal = false"
          >
            Cancel
          </button>
          <button type="button" class="btn btn-dark" :disabled="isSending" @click="submitEmail">
            {{ isSending ? 'Sending...' : 'Send code' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showEmailModal" class="modal-backdrop fade show"></div>
</template>

<style scoped>
.promo-panel {
  border-radius: 1.5rem;
  background: #f8f9fa;
}

.wheel-wrapper {
  position: relative;
  width: min(320px, 78vw);
  aspect-ratio: 1 / 1;
}

.wheel-pointer {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 14px solid transparent;
  border-right: 14px solid transparent;
  border-top: 28px solid #111;
  z-index: 4;
}

.discount-wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 10px solid #fff;
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.16);
  position: relative;
  overflow: hidden;
  background: #fff;
}

.wheel-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.wheel-label {
  fill: #fff;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  pointer-events: none;
}

.wheel-hub {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18%;
  height: 18%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #fff;
  border: 4px solid #dee2e6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  z-index: 2;
  pointer-events: none;
}

@media (max-width: 575.98px) {
  .wheel-label {
    font-size: 7px;
  }
}
</style>
