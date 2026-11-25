<!-- Временный логотип: угловатая рамка со срезанными углами и надпись с лёгким
     цветовым расслоением — сдержанный киберпанк (не знак Hot Wheels) -->
<template>
  <svg class="logo" viewBox="0 0 200 56" role="img" aria-label="Garage">
    <defs>
      <linearGradient id="logo-edge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f2541b" />
        <stop offset=".55" stop-color="#ff2d75" />
        <stop offset="1" stop-color="#f2541b" stop-opacity=".35" />
      </linearGradient>
      <linearGradient id="logo-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1c1820" />
        <stop offset="1" stop-color="#0e0e13" />
      </linearGradient>
    </defs>

    <!-- рамка со срезанными углами -->
    <polygon points="16,3 197,3 197,40 184,53 3,53 3,16" fill="url(#logo-fill)" stroke="url(#logo-edge)" stroke-width="2" stroke-linejoin="miter" />
    <!-- технические штрихи -->
    <polygon points="3,16 16,3 16,7 7,16" fill="#f2541b" />
    <rect x="12" y="46" width="16" height="2" fill="#f2541b" />
    <rect x="31" y="46" width="3" height="2" fill="#f2541b" opacity=".6" />
    <rect x="37" y="46" width="3" height="2" fill="#f2541b" opacity=".35" />
    <text x="186" y="13" text-anchor="end" font-family="Inter Variable, sans-serif" font-size="6.5" font-weight="700" letter-spacing="1.6" fill="#7d7d8c">COLLECTION</text>

    <!-- надпись: голубая и розовая копии со сдвигом дают «сбой экрана» -->
    <g transform="translate(0 0) skewX(-8) translate(5 0)" font-family="Unbounded Variable, sans-serif" font-weight="800" font-size="21" letter-spacing="2.5" text-anchor="middle">
      <text x="101.2" y="38" fill="#22d3ee" opacity=".7">GARAGE</text>
      <text x="98.8" y="38" fill="#ff2d75" opacity=".65">GARAGE</text>
      <text x="100" y="38" fill="#f4f4f6">GARAGE</text>
    </g>
  </svg>
</template>

<style scoped>
.logo { width: 132px; height: auto; flex: none; filter: drop-shadow(0 0 10px rgba(255, 45, 117, .18)); }
@media (min-width: 720px) { .logo { width: 170px; } }
</style>
