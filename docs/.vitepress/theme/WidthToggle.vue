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
    class="full-width-toggle"
    :class="{ active: isFullWidth }"
    @click="toggle"
    :title="isFullWidth ? '恢复默认宽度' : '切换全宽模式'"
  >
    <svg v-if="!isFullWidth" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 4h16v16H4z" />
      <path d="M9 4v16M15 4v16" stroke-dasharray="2 2" />
    </svg>
    <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 4h16v16H4z" />
      <path d="M9 4v16" />
    </svg>
    <span>{{ isFullWidth ? '恢复' : '全宽' }}</span>
  </button>
</template>

<style scoped>
.full-width-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--vp-font-family-base);
}

.full-width-toggle:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-text-1);
}

.full-width-toggle.active {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}
</style>
