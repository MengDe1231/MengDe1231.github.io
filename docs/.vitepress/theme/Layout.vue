<script setup>
import DefaultTheme from 'vitepress/theme'
import Feedback from './Feedback.vue'
import WidthToggle from './WidthToggle.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-before>
      <WidthToggle class="doc-width-toggle-wrapper" />
    </template>
    <template #doc-after>
      <Feedback />
    </template>
  </Layout>
</template>
