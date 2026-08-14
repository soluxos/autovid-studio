// Compact hand-simplified world geography for the map blocks (blocks5.tsx).
// No external deps, no network: the continents are low-poly outlines authored
// as [lon, lat] rings (enough points that the world READS at a glance, few
// enough that they animate cheaply), plus a centroid table for named places
// and the two projections the blocks draw with. Europe and Asia share their
// Ural/Caucasus boundary points so the Eurasian seam is invisible when both
// are filled with the same ink.

export type LonLat = [number, number];

export interface GeoRegion {
  name: string;                 // canonical id, e.g. "north-america"
  polys: LonLat[][];            // one or more closed rings (mainland + islands)
}

// ---------------------------------------------------------------- outlines

// Shared Europe/Asia divide (Ural meridian down to the Caspian, then the
// Caucasus to the Black Sea), authored once, walked N->S here.
const EURASIA_DIVIDE: LonLat[] = [
  [64, 68.5], [59, 60], [58, 51], [49, 46.5], [44, 43], [39.5, 43.5],
];

const NORTH_AMERICA: LonLat[][] = [
  [ // mainland
    [-166, 65.5], [-161, 70], [-156.5, 71.3], [-141, 69.6], [-128, 70],
    [-115, 68.8], [-101, 68.2], [-96, 70.5], [-90, 71], [-86.5, 68.5],
    [-82, 69.5], [-81.5, 66.5], [-86, 66.3], [-87.5, 63.5], [-92.5, 62],
    [-94.5, 59], [-92, 57], [-85, 55.3], [-82.2, 55.1], [-80.5, 51.3],
    [-79.5, 54.6], [-77.5, 58], [-73.5, 62.2], [-69.5, 61], [-64.5, 60.3],
    [-61.5, 56.5], [-58, 54.5], [-55.7, 51.6], [-60, 50], [-66, 49],
    [-64.5, 45.5], [-60, 45.8], [-65.5, 43.6], [-70, 43], [-74, 40.6],
    [-75.5, 38], [-75.5, 35.2], [-79, 33], [-81, 30.5], [-80, 26.8],
    [-81.7, 24.6], [-82.8, 28], [-84.2, 30], [-89, 29.2], [-94, 29.5],
    [-97.2, 26], [-97.8, 22.2], [-95.5, 18.7], [-90.5, 21.3], [-86.8, 21.4],
    [-87.5, 18.2], [-88.3, 15.7], [-83.2, 15], [-83.7, 11], [-82.5, 9.4],
    [-80, 9.3], [-77.2, 8.6], [-78.2, 8.3], [-81.5, 7.5], [-85.5, 9.9],
    [-87.5, 13], [-91.5, 14], [-95.5, 15.9], [-101.5, 17.9], [-105.4, 20.2],
    [-105.5, 22.8], [-108, 25.5], [-111, 29], [-114.6, 31.6], [-112.8, 28.8],
    [-110.5, 24.3], [-109.8, 22.9], [-112.2, 26.2], [-114.8, 29.5],
    [-117.2, 32.6], [-120.7, 34.5], [-124.2, 40.4], [-124.6, 48.4],
    [-128.5, 51.5], [-132.5, 54.5], [-136.5, 58.2], [-140, 59.7],
    [-146.5, 60.8], [-151.5, 59.2], [-154.5, 58], [-160, 55.7], [-163, 54.8],
    [-160.5, 58.4], [-165.5, 60.5], [-166.2, 63], [-166, 65.5],
  ],
  [ // Greenland
    [-58, 76.5], [-68, 76.2], [-73, 78.2], [-66, 81], [-58, 82.5],
    [-45, 83.3], [-32, 83.6], [-22, 82], [-20, 79], [-19, 75], [-22, 70.5],
    [-26, 68.5], [-32, 67.5], [-38, 65], [-43.5, 59.8], [-49, 62.5],
    [-53, 66.5], [-53.8, 70], [-56, 74], [-58, 76.5],
  ],
];

const SOUTH_AMERICA: LonLat[][] = [
  [
    [-77.2, 8.6], [-75.5, 10.7], [-71.6, 12.4], [-68, 11.2], [-64, 10.6],
    [-60.5, 8.6], [-56, 5.9], [-51.5, 4.4], [-50, 0.2], [-44.5, -2.8],
    [-39.9, -4.6], [-35.2, -5.5], [-37, -11], [-39, -13.5], [-39.5, -18],
    [-42, -22.9], [-48.5, -25.5], [-51.5, -30.5], [-55.5, -34.5],
    [-58.4, -34.2], [-57.5, -37], [-62.2, -38.8], [-62.3, -41], [-65, -41],
    [-65.3, -45], [-67.5, -46.5], [-68.5, -50.5], [-69.3, -52.4],
    [-68.5, -54.9], [-71.5, -53.9], [-73.5, -49.5], [-73.7, -44],
    [-73.2, -39.5], [-71.6, -33], [-70.5, -25], [-70.2, -18.3], [-73, -16.5],
    [-76.2, -13.8], [-81.1, -6], [-80.9, -2], [-80.2, 0.7], [-77.8, 3.4],
    [-77.4, 6.5], [-77.2, 8.6],
  ],
];

const EUROPE: LonLat[][] = [
  [ // mainland (closes along the shared Eurasia divide)
    [-5.6, 36.1], [-9, 36.9], [-9.3, 38.7], [-8.7, 41.9], [-9.3, 43.1],
    [-4.5, 43.6], [-1.6, 43.5], [-1.1, 46.2], [-2.5, 47.4], [-4.8, 48.4],
    [-1.7, 49.6], [0.2, 49.7], [1.6, 50.9], [4.4, 52.2], [6.8, 53.5],
    [8.6, 54.2], [8.1, 56.6], [9.6, 57.6], [10.6, 56.6], [10, 54.7],
    [12, 54.3], [14.3, 53.9], [18.5, 54.8], [21, 55.5], [21.2, 57.2],
    [24.2, 57.9], [23.5, 59.3], [27, 59.6], [30, 59.9], [27.8, 61],
    [24.5, 62.5], [25.5, 64.9], [22.5, 65.8], [21, 63.5], [18.8, 62],
    [18.1, 59.3], [16.5, 57.4], [12.9, 55.5], [11.3, 58], [8, 58.2],
    [5.3, 60.4], [4.8, 62.5], [10.5, 64.5], [14, 67.5], [18.5, 69.5],
    [25.8, 71.2], [31, 70], [33, 68.8], [40, 67.5], [37, 65.5], [34.5, 64.5],
    [37.5, 63.8], [44, 65.8], [47, 67.8], [53.5, 68.5], [59, 68.8],
    ...EURASIA_DIVIDE,
    [38, 46.5], [35.5, 45.2], [33.5, 46.3], [31.5, 46.5], [29, 45.5],
    [28, 43], [29, 41.2], [26, 40.2], [24, 40.4], [22.7, 39], [23.2, 37.9],
    [22.4, 36.4], [21.2, 38.3], [19.4, 40.3], [19, 42], [16, 43.5],
    [13.6, 45.5], [12.3, 45.3], [13.8, 44.2], [16, 41.9], [18.4, 40.3],
    [16.8, 40.1], [16.5, 38.7], [15.7, 37.9], [15.9, 40], [13.8, 41.2],
    [11.8, 42.2], [10.3, 43.9], [8.9, 44.4], [6.5, 43.1], [4.2, 43.4],
    [3.2, 42.4], [3.2, 41.6], [0.5, 40.5], [0, 38.8], [-0.7, 37.6],
    [-2.1, 36.7], [-5.6, 36.1],
  ],
  [ // Great Britain
    [-5.7, 50.1], [-4.5, 51.2], [-5.2, 51.7], [-4.2, 52.9], [-3.1, 53.4],
    [-3.6, 54.6], [-5, 55.8], [-5.8, 57.5], [-5, 58.6], [-3.1, 58.6],
    [-2.2, 57.5], [-1.8, 55.6], [-0.1, 54.1], [0.3, 53], [1.7, 52.7],
    [1.4, 51.4], [0.3, 50.8], [-2.5, 50.6], [-5.7, 50.1],
  ],
  [ // Ireland
    [-9.9, 51.6], [-10, 53.4], [-8.3, 55.1], [-6.2, 55.2], [-6, 54],
    [-6.4, 52.3], [-9, 51.5], [-9.9, 51.6],
  ],
  [ // Iceland
    [-22.7, 63.8], [-24, 65.5], [-21.5, 66.4], [-16, 66.5], [-13.6, 65.5],
    [-15, 64.3], [-18, 63.4], [-22.7, 63.8],
  ],
];

const AFRICA: LonLat[][] = [
  [
    [-5.9, 35.8], [-2, 35.2], [3.2, 36.9], [8, 37], [10.2, 37.3],
    [11.1, 33.8], [15.3, 32.3], [19.6, 30.5], [25.1, 31.7], [29, 31],
    [31.2, 31.5], [32.3, 31.2], [32.6, 29.9], [34.5, 28], [35.8, 23.9],
    [37.4, 18.7], [39.7, 15.4], [43.3, 12.5], [44.5, 10.4], [47.5, 11.2],
    [51.2, 11.8], [50.8, 10.4], [46, 2.5], [41.5, -1.7], [39.2, -6.5],
    [40.5, -11], [40.5, -15.5], [36.3, -18.7], [35, -22], [32.6, -25.7],
    [31, -29.9], [27.8, -33.1], [20, -34.8], [18.4, -34.1], [17.9, -31.5],
    [15.3, -27.5], [11.8, -18.5], [13.2, -12.5], [12.2, -6.1], [9.5, -2],
    [9.3, 3.9], [8.5, 4.7], [6, 4.3], [4.4, 6.3], [-1.5, 5], [-4.9, 5.1],
    [-7.6, 4.4], [-13.2, 8.5], [-16.6, 12.5], [-17.5, 14.7], [-16.2, 17.5],
    [-16.5, 20.5], [-14.8, 24], [-13, 27.7], [-9.8, 31], [-9.5, 33.6],
    [-6.5, 34.3], [-5.9, 35.8],
  ],
  [ // Madagascar
    [49.9, -13], [50.5, -15.7], [49.6, -18.5], [47.1, -24.9], [45.2, -25.6],
    [43.9, -21.5], [43.9, -17.5], [46.3, -15.8], [48, -14.8], [49.9, -13],
  ],
];

const ASIA: LonLat[][] = [
  [ // mainland (closes along the shared Eurasia divide, walked S->N)
    ...[...EURASIA_DIVIDE].reverse(),
    [66.5, 69.5], [73, 68], [72, 71.5], [75.5, 72.5], [82, 71.5], [86, 74],
    [95, 74.5], [100, 77.7], [105, 78], [110, 76.5], [113, 74], [123, 73.5],
    [130, 72], [140, 72.5], [150, 71], [160, 70.5], [170, 70], [178.5, 68.5],
    [180, 65.5], [178, 64], [174, 61.5], [166, 60.5], [162.5, 61.5],
    [159, 61], [162, 58.5], [162.5, 55.5], [160.5, 53], [156.7, 50.9],
    [156, 55], [153, 59], [148, 59.5], [142, 59], [136.5, 55], [140.5, 51],
    [140, 48.5], [135, 44.5], [131.9, 43.1], [129.7, 40.8], [129.5, 37.2],
    [129.2, 35.2], [126.5, 34.5], [125.5, 37.7], [124, 39.7], [121.5, 39.1],
    [117.8, 39], [119.2, 37.2], [120.9, 36.5], [119.5, 34.5], [121.8, 31],
    [121.5, 28.3], [119, 25.5], [116, 22.9], [114.2, 22.4], [110.5, 21.3],
    [108.2, 21.5], [105.8, 19.9], [107.5, 16.7], [109.2, 13.5], [109, 11.3],
    [104.8, 8.5], [102.5, 12], [100.5, 13.5], [100.2, 9.2], [103.5, 1.4],
    [101.3, 2.8], [98.5, 8.3], [98.2, 13.5], [97.5, 16.5], [94.5, 15.9],
    [92.3, 20.5], [90.5, 22], [88, 21.6], [86.9, 20.5], [83.3, 17.6],
    [80.3, 15.5], [80.2, 12.5], [77.5, 8.1], [74.5, 13], [72.8, 19],
    [72.6, 21.6], [69.2, 22.4], [70, 20.9], [68, 23.5], [66, 25.2],
    [61.6, 25.1], [57.5, 25.6], [56.4, 27], [54, 26.5], [51.5, 27.8],
    [50, 30], [48.5, 29.9], [50.5, 27], [51.2, 25.5], [52.5, 24],
    [54.5, 24.2], [56.3, 26.2], [58.5, 23.6], [59.8, 22.5], [57.8, 19],
    [55.5, 17], [52, 15.6], [48.5, 14], [45, 12.7], [43.5, 12.7],
    [42.7, 15.5], [40.8, 19.8], [39, 21.3], [37.8, 24.5], [34.9, 27.8],
    [34.6, 28.1], [32.6, 29.9], [32.3, 31.2], [34.5, 31.7], [35.9, 35.8],
    [36.2, 36.8], [32.8, 36.1], [30.5, 36.3], [29.1, 36.4], [27.3, 37],
    [26.3, 38.5], [26.8, 39.5], [26.2, 40.1], [29.1, 41.1], [31.3, 41.6],
    [35, 42.1], [39.5, 41.1], [41.5, 41.5], [39.5, 43.5],
  ],
  [ // Japan (merged low-poly arc)
    [129.5, 31.2], [130.8, 31], [131.8, 33.1], [134.5, 33.4], [136.9, 34.3],
    [139.8, 34.9], [140.9, 35.7], [141.6, 39], [141.3, 41.5], [142, 42.1],
    [145.3, 43.3], [143.5, 44.7], [141.5, 45.4], [140.2, 43.2], [140.5, 41.5],
    [139.8, 40], [138, 37.5], [135.5, 35.6], [132.5, 35.4], [129.9, 33.3],
    [129.5, 31.2],
  ],
  [ // Sumatra
    [95.3, 5.6], [97.5, 5.2], [100, 2.5], [103, -0.5], [106, -3],
    [105.9, -5.8], [104.5, -5.6], [100.9, -2.5], [98.5, 1], [95.3, 5.6],
  ],
  [ // Java
    [105.3, -6.8], [110, -6.9], [114.4, -7.6], [114.5, -8.6], [110.5, -8.2],
    [106.5, -7.9], [105.3, -6.8],
  ],
  [ // Borneo
    [109.5, 1.9], [109, -0.9], [110.2, -2.9], [114.4, -3.5], [116.2, -4],
    [116.5, -1.8], [117.5, 0.3], [118.9, 0.9], [117.6, 3.5], [117.2, 6.7],
    [115.2, 5.4], [113, 3.1], [110.5, 1.6], [109.5, 1.9],
  ],
];

const OCEANIA: LonLat[][] = [
  [ // Australia
    [114, -21.9], [113.4, -24.5], [114.1, -26.5], [115.1, -34.3],
    [117.9, -35.1], [123.5, -33.9], [129, -31.7], [131.5, -31.5],
    [135.5, -34.6], [137.8, -35.1], [139.7, -37.3], [143.5, -38.8],
    [146.4, -39.1], [148, -37.8], [150.1, -35.9], [151.3, -33.9],
    [153, -30.5], [153.6, -28.2], [152.9, -25.3], [150.8, -22.6],
    [148.8, -20.1], [146.3, -18.9], [145.3, -14.9], [142.6, -10.7],
    [141.6, -12.9], [141.4, -16.5], [139.8, -17.7], [136.9, -15.9],
    [135.4, -14.8], [136, -12.4], [132.6, -12.2], [130.8, -12.4],
    [129.4, -14.9], [127.5, -14], [124.5, -16.4], [122.2, -17.3],
    [119.5, -20], [114, -21.9],
  ],
  [ // New Guinea
    [131.2, -0.8], [134.2, -2.5], [137.5, -1.7], [141, -2.6], [144.5, -3.8],
    [147.5, -5.9], [149.5, -7.5], [150.5, -10.4], [147.3, -8.6], [144, -7.7],
    [142.5, -9.2], [140.9, -8.2], [138.5, -8.3], [135, -4.5], [132.2, -2.7],
    [131.2, -0.8],
  ],
  [ // New Zealand, North Island
    [172.8, -34.4], [175.4, -36.5], [175.9, -37.6], [177.9, -37.6],
    [176.9, -39.5], [174.7, -41.3], [174.6, -38.9], [172.8, -34.4],
  ],
  [ // New Zealand, South Island
    [172.7, -40.6], [174.3, -41.4], [172.6, -43.7], [171, -44.3],
    [168.3, -46.6], [166.5, -45.9], [170, -43.2], [172.7, -40.6],
  ],
];

/** The world, as low-poly filled regions. Order is draw order. */
export const WORLD: GeoRegion[] = [
  { name: "north-america", polys: NORTH_AMERICA },
  { name: "south-america", polys: SOUTH_AMERICA },
  { name: "europe", polys: EUROPE },
  { name: "africa", polys: AFRICA },
  { name: "asia", polys: ASIA },
  { name: "oceania", polys: OCEANIA },
];

// ---------------------------------------------------------------- places

/** Centroids for named places (continents, countries, cities), lon/lat. */
export const PLACES: Record<string, LonLat> = {
  // continents (visual centroids)
  "north-america": [-100, 45], "south-america": [-60, -14], europe: [15, 50],
  africa: [19, 4], asia: [95, 42], oceania: [134, -25],
  // countries
  usa: [-98.5, 39.8], canada: [-106, 58], mexico: [-102, 23.6],
  brazil: [-53, -10.8], argentina: [-64.5, -35], chile: [-70.8, -32],
  colombia: [-73.5, 4], peru: [-75.5, -10], uk: [-1.8, 52.8],
  ireland: [-8, 53.2], france: [2.2, 46.6], germany: [10.4, 51.1],
  spain: [-3.7, 40.2], portugal: [-8.1, 39.6], italy: [12.9, 42.5],
  greece: [22.5, 39.3], norway: [9, 61.5], sweden: [15.5, 62.5],
  finland: [26, 63.5], poland: [19.4, 52.1], ukraine: [31.4, 49],
  russia: [82, 60], turkey: [34, 39.2], egypt: [29.8, 26.6],
  nigeria: [8.1, 9.6], kenya: [37.9, 0.5], ethiopia: [39.6, 8.6],
  "south-africa": [24.7, -29], morocco: [-6.3, 32], india: [78.9, 22],
  china: [104, 35.8], japan: [138.5, 36.5], indonesia: [110, -3],
  australia: [134.4, -25.6], "new-zealand": [171.5, -42],
  "saudi-arabia": [45, 24], iran: [53.7, 32.4], thailand: [101, 15.8],
  vietnam: [106.3, 16.5], "south-korea": [127.8, 36.5], pakistan: [69.4, 30.4],
  iceland: [-18.6, 65], greenland: [-42, 72], madagascar: [46.7, -19.5],
  // cities
  london: [-0.13, 51.51], paris: [2.35, 48.86], rome: [12.5, 41.9],
  florence: [11.25, 43.77], madrid: [-3.7, 40.4], lisbon: [-9.14, 38.72],
  berlin: [13.4, 52.52], amsterdam: [4.9, 52.37], stockholm: [18.07, 59.33],
  athens: [23.73, 37.98], istanbul: [28.98, 41.01], moscow: [37.62, 55.75],
  "new-york": [-74.01, 40.71], "los-angeles": [-118.24, 34.05],
  chicago: [-87.63, 41.88], "san-francisco": [-122.42, 37.77],
  "mexico-city": [-99.13, 19.43], toronto: [-79.38, 43.65],
  "sao-paulo": [-46.63, -23.55], "buenos-aires": [-58.38, -34.6],
  lima: [-77.04, -12.05], "rio-de-janeiro": [-43.2, -22.9],
  cairo: [31.24, 30.04], lagos: [3.39, 6.45], nairobi: [36.82, -1.29],
  "cape-town": [18.42, -33.93], dubai: [55.27, 25.2], mumbai: [72.88, 19.08],
  delhi: [77.21, 28.61], singapore: [103.85, 1.29], jakarta: [106.85, -6.21],
  "hong-kong": [114.17, 22.32], shanghai: [121.47, 31.23],
  beijing: [116.41, 39.9], seoul: [126.98, 37.57], tokyo: [139.69, 35.69],
  sydney: [151.21, -33.87], melbourne: [144.96, -37.81],
  auckland: [174.76, -36.85], anchorage: [-149.9, 61.22],
  honolulu: [-157.86, 21.31], reykjavik: [-21.94, 64.15],
  // US cities (top ~60 by size/story-relevance) — sub-national pins for the
  // state-level zooms (geo-countries.ts US_STATES_TIER)
  milwaukee: [-87.91, 43.04], madison: [-89.4, 43.07], "green-bay": [-88.02, 44.51],
  houston: [-95.37, 29.76], phoenix: [-112.07, 33.45], philadelphia: [-75.17, 39.95],
  "san-antonio": [-98.49, 29.42], "san-diego": [-117.16, 32.72], dallas: [-96.8, 32.78],
  austin: [-97.74, 30.27], jacksonville: [-81.66, 30.33], "fort-worth": [-97.33, 32.76],
  columbus: [-82.99, 39.96], charlotte: [-80.84, 35.23], indianapolis: [-86.16, 39.77],
  seattle: [-122.33, 47.61], denver: [-104.99, 39.74], "washington-dc": [-77.04, 38.91],
  boston: [-71.06, 42.36], "el-paso": [-106.49, 31.76], nashville: [-86.78, 36.16],
  detroit: [-83.05, 42.33], "oklahoma-city": [-97.52, 35.47], "las-vegas": [-115.14, 36.17],
  portland: [-122.68, 45.52], memphis: [-90.05, 35.15], louisville: [-85.76, 38.25],
  baltimore: [-76.61, 39.29], albuquerque: [-106.65, 35.08], tucson: [-110.97, 32.22],
  fresno: [-119.79, 36.74], sacramento: [-121.49, 38.58], "kansas-city": [-94.58, 39.1],
  atlanta: [-84.39, 33.75], omaha: [-95.94, 41.26], "colorado-springs": [-104.82, 38.83],
  raleigh: [-78.64, 35.78], miami: [-80.19, 25.76], "virginia-beach": [-75.98, 36.85],
  oakland: [-122.27, 37.8], minneapolis: [-93.27, 44.98], "st-paul": [-93.09, 44.95],
  tulsa: [-95.99, 36.15], tampa: [-82.46, 27.95], "new-orleans": [-90.07, 29.95],
  wichita: [-97.34, 37.69], cleveland: [-81.69, 41.5], "st-louis": [-90.2, 38.63],
  pittsburgh: [-79.99, 40.44], cincinnati: [-84.51, 39.1], buffalo: [-78.88, 42.89],
  "salt-lake-city": [-111.89, 40.76], richmond: [-77.44, 37.54], birmingham: [-86.8, 33.52],
  boise: [-116.2, 43.62], "des-moines": [-93.61, 41.59], "little-rock": [-92.29, 34.75],
  providence: [-71.41, 41.82], hartford: [-72.68, 41.77], orlando: [-81.38, 28.54],
};

const ALIASES: Record<string, string> = {
  "united states": "usa", "united states of america": "usa", america: "usa",
  us: "usa", "united kingdom": "uk", britain: "uk", "great britain": "uk",
  england: "uk", nyc: "new-york", "new york city": "new-york",
  holland: "amsterdam", netherlands: "amsterdam", "la": "los-angeles",
  "são paulo": "sao-paulo", "rio": "rio-de-janeiro",
  "south korea": "south-korea", korea: "south-korea",
  "latin america": "south-america", "the americas": "north-america",
  antarctica: "oceania", // no polygon; keep lookups non-fatal
  constantinople: "istanbul", persia: "iran", siam: "thailand",
  washington: "washington-dc", "washington d.c.": "washington-dc", dc: "washington-dc",
  "st. louis": "st-louis", "saint louis": "st-louis", "st. paul": "st-paul",
  "saint paul": "st-paul", vegas: "las-vegas", nola: "new-orleans", philly: "philadelphia",
};

/** Forgiving name normalization shared by every geo lookup (also used by
 *  geo-countries.ts for the country-level dataset). */
export const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/[\s_]+/g, " ");

/** Find a place centroid by (forgiving) name; null when unknown. */
export const findPlace = (name: string): LonLat | null => {
  const n = norm(name);
  const key = ALIASES[n] ?? n.replace(/ /g, "-");
  return PLACES[key] ?? PLACES[ALIASES[key] ?? ""] ?? null;
};

const REGION_ALIASES: Record<string, string> = {
  "north america": "north-america", na: "north-america",
  "south america": "south-america", "latin america": "south-america",
  eu: "europe", apac: "asia", australia: "oceania", australasia: "oceania",
  "the americas": "north-america", eurasia: "asia",
};

/** Find a continent region (its highlight polygons) by forgiving name. */
export const findRegion = (name: string): GeoRegion | null => {
  const n = norm(name);
  const key = REGION_ALIASES[n] ?? n.replace(/ /g, "-");
  return WORLD.find((r) => r.name === key) ?? null;
};

// ---------------------------------------------------------------- projections

const RAD = Math.PI / 180;

/** Plate carrée: lon/lat -> x/y in a W×H frame (full -180..180 / 90..-90). */
export const equirectangular = (lon: number, lat: number, W: number, H: number): [number, number] =>
  [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];

// The flat-map blocks crop the empty poles: this band keeps every outline and
// place while filling the frame. One shared crop so all maps line up.
export const MAP_LAT_TOP = 84, MAP_LAT_BOT = -58;

/** Cropped world map projection: x spans W, y spans the 84°N..58°S band. */
export const worldXY = (lon: number, lat: number, W: number): [number, number] =>
  [((lon + 180) / 360) * W, ((MAP_LAT_TOP - lat) / (MAP_LAT_TOP - MAP_LAT_BOT)) * (W * (MAP_LAT_TOP - MAP_LAT_BOT)) / 360];

/** Height of the cropped world map for a given width. */
export const worldH = (W: number) => (W * (MAP_LAT_TOP - MAP_LAT_BOT)) / 360;

export interface OrthoPoint { x: number; y: number; visible: boolean }

/** Orthographic globe: lon/lat -> x/y offsets from the globe centre (radius R,
 *  centered on centerLon/centerLat). `visible` is false on the back hemisphere. */
export const orthographic = (
  lon: number, lat: number, R: number, centerLon: number, centerLat: number,
): OrthoPoint => {
  const phi = lat * RAD, lam = (lon - centerLon) * RAD, phi0 = centerLat * RAD;
  const cosc = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lam);
  return {
    x: R * Math.cos(phi) * Math.sin(lam),
    y: -R * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lam)),
    visible: cosc >= 0,
  };
};

// ---------------------------------------------------------------- geometry helpers

/** Point along the great circle from a to b at t (0..1), as [lon, lat]. */
export const greatArc = (aa: LonLat, bb: LonLat, t: number): LonLat => {
  const [l1, p1] = [aa[0] * RAD, aa[1] * RAD], [l2, p2] = [bb[0] * RAD, bb[1] * RAD];
  const x1 = Math.cos(p1) * Math.cos(l1), y1 = Math.cos(p1) * Math.sin(l1), z1 = Math.sin(p1);
  const x2 = Math.cos(p2) * Math.cos(l2), y2 = Math.cos(p2) * Math.sin(l2), z2 = Math.sin(p2);
  const d = Math.acos(Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2))) || 1e-9;
  const A = Math.sin((1 - t) * d) / Math.sin(d), B = Math.sin(t * d) / Math.sin(d);
  const x = A * x1 + B * x2, y = A * y1 + B * y2, z = A * z1 + B * z2;
  return [Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD];
};

/** Great-circle distance in km (for route readouts). */
export const distanceKm = (aa: LonLat, bb: LonLat): number => {
  const [l1, p1] = [aa[0] * RAD, aa[1] * RAD], [l2, p2] = [bb[0] * RAD, bb[1] * RAD];
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Even-odd point-in-ring test in lon/lat space. */
export const inRing = (pt: LonLat, ring: LonLat[]): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/** Bounding box of a region's rings: [minLon, minLat, maxLon, maxLat]. */
export const regionBounds = (region: GeoRegion): [number, number, number, number] => {
  let a = 180, b = 90, cMax = -180, d = -90;
  for (const ring of region.polys) for (const [lon, lat] of ring) {
    a = Math.min(a, lon); b = Math.min(b, lat); cMax = Math.max(cMax, lon); d = Math.max(d, lat);
  }
  return [a, b, cMax, d];
};

/** Tiny deterministic PRNG (mulberry32) — mapdots scatter must be identical
 *  on every frame and every render. */
export const seededRandom = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** N deterministic points inside a region's largest ring (lon/lat). */
export const scatterInRegion = (region: GeoRegion, n: number, seed = 7): LonLat[] => {
  const ring = region.polys.reduce((best, r) => (r.length > best.length ? r : best), region.polys[0]);
  const [minLon, minLat, maxLon, maxLat] = regionBounds({ name: region.name, polys: [ring] });
  const rnd = seededRandom(seed + n * 101);
  const out: LonLat[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 220) {
    const pt: LonLat = [minLon + rnd() * (maxLon - minLon), minLat + rnd() * (maxLat - minLat)];
    if (inRing(pt, ring)) out.push(pt);
  }
  return out;
};

/** SVG path string for a ring under a projection fn. */
export const ringPath = (ring: LonLat[], proj: (lon: number, lat: number) => [number, number]): string =>
  ring.map(([lon, lat], i) => {
    const [x, y] = proj(lon, lat);
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ") + " Z";
