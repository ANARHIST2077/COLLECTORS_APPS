<!-- Временная заглушка логотипа: огненная плашка с наклонной надписью (не знак Hot Wheels) -->
<template>
  <svg class="logo" viewBox="0 0 220 70" role="img" aria-label="Garage">
    <defs>
      <linearGradient id="logo-fire" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#d81e05" />
        <stop offset=".6" stop-color="#f2541b" />
        <stop offset="1" stop-color="#ff8a1c" />
      </linearGradient>
    </defs>
    <path
      d="M8 54 C30 50 38 20 68 15 C64 23 70 27 79 19 C85 10 97 6 111 8 C105 16 112 21 123 13 C134 6 150 6 166 10 C160 17 166 21 178 15 C192 8 206 10 214 15 C200 27 197 46 176 57 C128 65 58 65 8 54 Z"
      fill="url(#logo-fire)"
      stroke="#ffb81c"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <text
      x="114"
      y="49"
      text-anchor="middle"
      transform="skewX(-12) translate(10 0)"
      font-family="Unbounded Variable, sans-serif" font-weight="900"
      font-size="24"
      fill="#fff"
      stroke="#7a0f00"
      stroke-width="2.5"
      paint-order="stroke"
      letter-spacing="1"
    >GARAGE</text>
  </svg>
</template>

<style scoped>
.logo { width: 150px; height: auto; filter: drop-shadow(0 4px 12px rgba(242, 84, 27, .35)); }
</style>
