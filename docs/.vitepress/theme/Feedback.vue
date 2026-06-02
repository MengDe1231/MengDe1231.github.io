<script setup>
import { useRoute } from 'vitepress'

const route = useRoute()

function getEditUrl() {
  return `https://github.com/MengDe1231/mengde-blog/issues/new?title=反馈: ${encodeURIComponent(route.data.title || '页面')}&body=页面: ${encodeURIComponent(window.location.href)}\n\n反馈内容:`
}

function vote(value) {
  const url = getEditUrl()
  window.open(url, '_blank')
}
</script>

<template>
  <div class="feedback-section">
    <p class="feedback-title">这篇文档对你有帮助吗？</p>
    <div class="feedback-buttons">
      <button class="feedback-btn feedback-yes" @click="vote('yes')">
        👍 有帮助
      </button>
      <button class="feedback-btn feedback-no" @click="vote('no')">
        👎 需要改进
      </button>
    </div>
    <p class="feedback-hint">
      点击按钮可提交反馈并跳转至 GitHub Issues
    </p>
  </div>
</template>

<style scoped>
.feedback-section {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vp-c-divider);
  text-align: center;
}

.feedback-title {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.75rem;
}

.feedback-buttons {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.feedback-btn {
  padding: 0.5rem 1.25rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.feedback-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  background: transparent;
}

.feedback-hint {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-top: 0.5rem;
}
</style>
