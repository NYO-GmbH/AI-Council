<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

useSeoMeta({
  title: 'Seite nicht gefunden',
  description: 'Leider konnte diese Seite nicht gefunden werden.'
})

useHead({
  htmlAttrs: {
    lang: 'de'
  }
})
</script>

<template>
  <UApp>
    <UError :error="error" />
  </UApp>
</template>
