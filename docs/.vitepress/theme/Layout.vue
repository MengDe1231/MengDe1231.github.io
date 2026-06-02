<script setup>
import DefaultTheme from 'vitepress/theme'
import Feedback from './Feedback.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-after>
      <Feedback />
    </template>
  </Layout>
</template>
