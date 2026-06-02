<script setup lang="ts">
const colorMode = useColorMode();

const color = computed(() =>
  colorMode.value === "dark" ? "#1b1718" : "white",
);

useHead({
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { key: "theme-color", name: "theme-color", content: color },
  ],
  link: [{ rel: "icon", href: "/favicon.ico" }],
  htmlAttrs: {
    lang: "en",
  },
});

const title = "NYO AI Council";
const description =
  "NYO AI Council ist eine KI-Rats-Anwendung. Statt eines einzelnen Chatbots führt der Rat einen moderierten Rundtisch aus KI-Mitgliedern mit unterschiedlichen Rollen, Persönlichkeiten und Zielen durch.";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
});
</script>

<template>
  <UApp :toaster="{ position: 'top-right' }" :tooltip="{ delayDuration: 200 }">
    <NuxtLoadingIndicator color="var(--ui-primary)" />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
