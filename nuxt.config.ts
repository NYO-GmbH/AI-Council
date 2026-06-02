// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@nuxtjs/mdc", "nuxt-charts"],

  runtimeConfig: {
    accessCode: '',
  },

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

  ssr: false,

  mdc: {
    headings: {
      anchorLinks: false,
    },
    highlight: {
      // noApiRoute: true
      shikiEngine: "javascript",
    },
  },

  experimental: {
    viewTransition: true,
  },

  compatibilityDate: "2024-07-11",

  nitro: {
    experimental: {
      openAPI: true,
    },
  },
  vite: {
    optimizeDeps: {
      include: ["striptags"],
    },
  },
});
