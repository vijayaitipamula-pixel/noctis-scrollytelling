# NOCTIS — Scrollytelling Experience

A luxury, minimal, single-page scrollytelling web experience for **NOCTIS**, a fictional nocturnal electric car brand.

> *"A city in total blackout at night where the car's light is the only light in the world."*

---

## ✦ Design System & Tokens

- **Palette**:
  - `--asphalt: #07080A` (Background void)
  - `--graphite: #121418` (Subtle structure)
  - `--fog: #8A8F98` (Secondary text & HUD)
  - `--bone: #EDEAE4` (Primary typography)
  - `--xenon: #CFE3FF` (Light accent & headlights)
  - `--taillight: #E1251B` (Active telemetry accent)
  - `--hairline: rgba(237, 234, 228, 0.12)` (1px precision dividers)
- **Typography**:
  - **Display**: [Archivo](https://fonts.google.com/specimen/Archivo) (Variable font loaded with `wdth 125%`, expanded, weights 300/400, uppercase).
  - **Body**: [Inter](https://fonts.google.com/specimen/Inter) (400, 15–17px, line-height 1.6, max 52ch).
  - **HUD / Telemetry**: [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (400, 11–12px, uppercase, letter-spacing 0.12em).
- **Strict Styling**: Flat solid colors and 1px hairlines only. Zero gradients, zero glassmorphism, zero blur, zero drop-shadows.

---

## ✦ Technical Highlights

- **Pure Vanilla Stack**: Zero frameworks, zero build tools, zero npm packages. Written strictly in clean HTML5, CSS3, and JavaScript (`index.html`, `styles.css`, `main.js`, `config.js`).
- **Canvas Scrollytelling Engine**: High-performance `<canvas>` rendering driven by a `requestAnimationFrame` loop with smooth lerp interpolation (`current += (target - current) * 0.15`).
- **Responsive Aspect Adaptation**: Automatic `cover-fit` for landscape viewports and `contain-fit` (vertically centered on `--asphalt` background) on portrait viewports, preventing car clipping on mobile.
- **Custom "Headlight" Cursor**: Desktop-only 6px xenon dot inside a 28px ring following the mouse with 0.18 lerp; morphs into a 44×2px horizontal light bar with contextual mono labels (`VIEW`, `RESERVE`, `OPEN`, `CONFIGURE`).
- **Real-Time Telemetry**: Left-edge HUD displaying active chapter with taillight-red tick indicator, live speed (`000` → `118 KM/H`), and distance (`0.0` → `4.2 KM`).
- **Technical Dismantle Calipers**: At >70% scroll progress in the dismantle section, 4 interactive callouts (`BODY`, `LIGHT`, `DRIVE`, `BATTERY`) fade in with SVG hairlines connecting vehicle components to their engineering specifications.
- **Interactive Lineup Accordion**: 5 full-height vertical slides with debounced hover (80ms), incoming car slide-in animation, color swatches, and full keyboard arrow navigation.
- **Procedural Film Grain**: Lightweight monochrome noise pattern shifted randomly at ~8 fps.
- **Accessibility & Reduced Motion**: Full fallback support for `prefers-reduced-motion` without pinning.

---

## ✦ Local Development

Run with any static local web server:

```bash
# Python
python -m http.server 8080

# Or Node.js
npx serve .
```

Open [http://localhost:8080](http://localhost:8080) in your browser.
