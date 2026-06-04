<script setup>
import { ref } from 'vue'

const isFullWidth = ref(false)

function toggle() {
  isFullWidth.value = !isFullWidth.value
  document.body.classList.toggle('full-width-mode', isFullWidth.value)
}
</script>

<template>
  <button
    class="width-toggle-floating"
    :class="{ active: isFullWidth }"
    @click="toggle"
    :title="isFullWidth ? '恢复默认宽度' : '切换全宽模式'"
  >
    <svg v-if="!isFullWidth" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" stroke-dasharray="2 2" />
      <line x1="15" y1="3" x2="15" y2="21" stroke-dasharray="2 2" />
    </svg>
    <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
    <span>{{ isFullWidth ? '恢复' : '全宽' }}</span>
  </button>
</template>

<style scoped>
.width-toggle-floating {
  position: fixed;
  bottom: 80px;
  right: 24px;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--vp-font-family-base);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.width-toggle-floating:hover {
  border-color: var(--vp-c-accent);
  color: var(--vp-c-accent);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.width-toggle-floating.active {
  border-color: var(--vp-c-accent);
  color: #fff;
  background: var(--vp-c-accent);
  box-shadow: 0 4px 12px rgba(201, 164, 74, 0.3);
}

@media (max-width: 768px) {
  .width-toggle-floating {
    bottom: 60px;
    right: 12px;
    padding: 6px 10px;
    font-size: 12px;
  }
}
</style>
