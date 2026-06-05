<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vitepress'

const visible = ref(false)
const width = ref(0)
let timer = null

function start() {
  width.value = 0
  visible.value = true
  timer = setInterval(() => {
    if (width.value < 90) {
      width.value += Math.random() * 12
    }
  }, 80)
}

function done() {
  clearInterval(timer)
  width.value = 100
  setTimeout(() => {
    visible.value = false
    width.value = 0
  }, 300)
}

onMounted(() => {
  const router = useRouter()
  router.onBeforeRouteChange = () => {
    start()
    return true
  }
  router.onAfterRouteChanged = () => {
    done()
  }
})
</script>

<template>
  <div v-show="visible" class="route-progress">
    <div class="route-progress-bar" :style="{ width: width + '%' }" />
  </div>
</template>

<style scoped>
.route-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 9999;
  pointer-events: none;
}

.route-progress-bar {
  height: 100%;
  background: var(--vp-c-brand-1, #646cff);
  transition: width 0.15s ease;
  box-shadow: 0 0 6px var(--vp-c-brand-1, #646cff);
}
</style>
