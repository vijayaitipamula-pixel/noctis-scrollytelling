/**
 * NOCTIS Configuration
 * All section heights, chapter ranges, frame counts, frame paths and callout coordinates.
 */
const CONFIG = {
  // Frame sequences
  frames: {
    hero: {
      count: 750,
      desktopPath: 'assets/frames/hero/frame_{index}.webp',
      mobilePath: 'assets/frames/hero-mobile/frame_{index}.webp',
      preloadInitial: 40, // load frames 1-40 first before unblocking screen
    },
    dismantle: {
      count: 250,
      desktopPath: 'assets/frames/dismantle/frame_{index}.webp',
      mobilePath: 'assets/frames/dismantle-mobile/frame_{index}.webp',
      calloutStartProgress: 0.70,
    }
  },

  // Section heights (applied via CSS / inline)
  heights: {
    hero: '600vh',
    statement: '100vh',
    dismantle: '350vh',
    lineup: '100vh',
    reserve: '100vh',
  },

  // Hero Scrollytelling Chapters [startProgress, endProgress]
  heroChapters: [
    {
      id: 'chapter-1',
      index: 1,
      range: [0.00, 0.12],
      title: 'NOCTIS',
      subtitle: 'The city is asleep.',
      actionHint: 'SCROLL TO WAKE IT',
    },
    {
      id: 'chapter-2',
      index: 2,
      range: [0.22, 0.40],
      text: "It doesn't need the city's light.",
    },
    {
      id: 'chapter-3',
      index: 3,
      range: [0.50, 0.68],
      text: 'It brings its own.',
    },
    {
      id: 'chapter-4',
      index: 4,
      range: [0.80, 1.00],
      title: 'GT-E',
      specs: '0–100 KM/H 3.1S · 640 KM RANGE · DUAL MOTOR',
      linkText: 'Discover the GT-E',
      linkHref: '#lineup',
    }
  ],

  // Left-edge HUD telemetry limits
  hud: {
    maxSpeed: 118,      // KM/H
    maxDistance: 4.2,   // KM
    speedUnit: 'KM/H',
    distUnit: 'KM',
  },

  // Hero canvas fade to black range
  heroBlackoutRange: [0.95, 1.00],

  // Dismantle interactive callouts (anchored to physical parts on the car)
  // X and Y are percentage coordinates (0% to 100%) on the canvas image space
  dismantleCallouts: [
    {
      id: 'callout-body',
      code: 'BODY',
      title: 'Carbon composite monocoque',
      revealAt: 0.72,
      // Target position on car component
      x: 48,
      y: 28,
      // Label offset relative to dot (positive = right/down)
      labelOffsetX: -160,
      labelOffsetY: -50,
      lineDirection: 'left-up'
    },
    {
      id: 'callout-light',
      code: 'LIGHT',
      title: 'Single-line LED signature',
      revealAt: 0.80,
      x: 78,
      y: 52,
      labelOffsetX: 60,
      labelOffsetY: -40,
      lineDirection: 'right-up'
    },
    {
      id: 'callout-drive',
      code: 'DRIVE',
      title: 'Dual axial-flux motors, 680 kW',
      revealAt: 0.88,
      x: 64,
      y: 62,
      labelOffsetX: 80,
      labelOffsetY: 40,
      lineDirection: 'right-down'
    },
    {
      id: 'callout-battery',
      code: 'BATTERY',
      title: '110 kWh structural pack',
      revealAt: 0.94,
      x: 50,
      y: 78,
      labelOffsetX: -180,
      labelOffsetY: 35,
      lineDirection: 'left-down'
    }
  ],

  // Product Lineup Data
  lineup: [
    {
      id: 'gt-e',
      num: '01',
      name: 'GT-E',
      tagline: 'The grand tourer.',
      image: 'assets/cars/gt-e.webp',
      alt: 'NOCTIS GT-E matte graphite electric grand tourer coupe',
      specs: [
        { label: 'RANGE', value: '640 km' },
        { label: '0–100 KM/H', value: '3.1 s' },
        { label: 'POWER', value: '680 kW' }
      ],
      swatches: ['#1A1D20', '#2D3136', '#EDEAE4', '#0E141B'],
      activeSwatch: 0,
      desc: 'Form sculpted for stillness at 280 km/h. Dual-motor architecture, low drag profile.'
    },
    {
      id: 's',
      num: '02',
      name: 'S',
      tagline: 'Four doors, no compromise.',
      image: 'assets/cars/s.webp',
      alt: 'NOCTIS S satin bone white electric sport sedan',
      specs: [
        { label: 'RANGE', value: '600 km' },
        { label: '0–100 KM/H', value: '3.6 s' },
        { label: 'POWER', value: '520 kW' }
      ],
      swatches: ['#EDEAE4', '#121418', '#20262E', '#3D424A'],
      activeSwatch: 0,
      desc: 'Extended wheelbase, executive isolation, instant dual-axis torque distribution.'
    },
    {
      id: 'x',
      num: '03',
      name: 'X',
      tagline: 'Higher, never heavier.',
      image: 'assets/cars/x.webp',
      alt: 'NOCTIS X midnight blue electric coupe SUV',
      specs: [
        { label: 'RANGE', value: '560 km' },
        { label: '0–100 KM/H', value: '4.2 s' },
        { label: 'POWER', value: '480 kW' }
      ],
      swatches: ['#0E1A29', '#121418', '#313835', '#EDEAE4'],
      activeSwatch: 0,
      desc: 'Adaptive ground clearance with an unbroken aerodynamic silhouette and intelligent AWD.'
    },
    {
      id: 'r',
      num: '04',
      name: 'R',
      tagline: 'Built for the track.',
      image: 'assets/cars/r.webp',
      alt: 'NOCTIS R track-focused lightweight electric coupe',
      specs: [
        { label: 'RANGE', value: '420 km' },
        { label: '0–100 KM/H', value: '2.4 s' },
        { label: 'POWER', value: '900 kW' }
      ],
      swatches: ['#0A0B0D', '#1B1E22', '#631210', '#D6D3CD'],
      activeSwatch: 0,
      desc: 'Carbon aero package, active rear wing, tri-motor vectoring with continuous thermal cooling.'
    },
    {
      id: 'one',
      num: '05',
      name: 'ONE',
      tagline: 'The future, early.',
      image: 'assets/cars/one.webp',
      alt: 'NOCTIS ONE liquid silver concept hypercar',
      specs: [
        { label: 'RANGE', value: '720 km' },
        { label: '0–100 KM/H', value: '1.9 s' },
        { label: 'POWER', value: 'Concept' }
      ],
      swatches: ['#9EA5AE', '#121418', '#252930', '#E5E2DC'],
      activeSwatch: 0,
      desc: 'A pure research study in solid-state energy storage and zero-boundary cockpit integration.'
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
