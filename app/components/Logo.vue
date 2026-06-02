<template>
  <svg
    width="687"
    height="206"
    viewBox="0 0 687 206"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0 0V206H45.827V45.8499H135.56L229.097 139.433V206H275V120.523L154.537 0H0Z"
      :fill="fill"
    />
    <path
      d="M532.468 0L412 120.523V206H687V0H532.456H532.468ZM641.184 160.15H457.905V139.42L551.446 45.8372H641.184V160.15Z"
      :fill="fill"
    />
    <path
      d="M467 0H402.079L343.494 58.5881L284.921 0H220L320.543 100.582V206H366.457V100.582L467 0Z"
      :fill="fill"
    />
  </svg>
</template>

<script setup lang="ts">
const colorMode = useColorMode();
const fill = computed(() => (colorMode.value === "dark" ? "white" : "black"));
</script>
