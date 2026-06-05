<script setup>
import DefaultTheme from 'vitepress/theme'
import { useRoute } from 'vitepress'
import { computed } from 'vue'
import Feedback from './Feedback.vue'
import WidthToggle from './WidthToggle.vue'
import RouteProgress from './RouteProgress.vue'

const { Layout } = DefaultTheme
const route = useRoute()
const isDocPage = computed(() => route.data?.relativePath && !route.data.frontmatter?.layout)
</script>

<template>
  <RouteProgress />
  <Layout>
    <template #doc-after>
      <Feedback />
    </template>
    <template #layout-bottom>
      <WidthToggle v-if="isDocPage" />
    </template>
  </Layout>
</template>
