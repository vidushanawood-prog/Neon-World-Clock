import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Expand,
  Info,
  RotateCcw,
  Satellite,
} from 'lucide-react';
import type { Country } from '../data/countries';
import type { IssPosition } from '../services/iss';
import { formatClockForZone } from '../utils/time';
import {
  formatLkrRateShort,
  formatTemperature,
  type WeatherEntry,
} from '../services/intelligence';
import { WeatherIcon } from './WeatherIcon';

interface EarthGlobeProps {
  countries: readonly Country[];
  focusedCountry: Country;
  issPosition: IssPosition;
  pinnedSet: Set<string>;
  displayDate: Date;
  is24Hour: boolean;
  tempUnit: 'C' | 'F';
  weatherMap: Record<string, WeatherEntry>;
  rates: Record<string, number>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectCountry: (country: Country) => void;
  onInspectCountry: (country: Country) => void;
}

// High-definition public satellite Earth texture URLs (Three-Globe / NASA Blue Marble)
const EARTH_TEXTURE_URLS = {
  day: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
  water: 'https://unpkg.com/three-globe/example/img/earth-water.png',
  night: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
} as const;

// Reusable scratch objects (zero GC allocations in animation loop)
const _vec3 = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

/**
 * Exact spherical mapping aligned with Three.js SphereGeometry UV layout:
 * u = (lng + 180) / 360, v = (90 - lat) / 180
 */
function latLngToVec3(lat: number, lng: number, radius: number, out: THREE.Vector3): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  out.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
  return out;
}

// Simplified landmass polygons used strictly for instant pre-CDN fallback & 2D WebGL fallback
const CONTINENT_POLYGONS: Array<Array<[number, number]>> = [
  [
    [-168, 66], [-160, 71], [-140, 70], [-125, 70], [-108, 68], [-94, 69], [-80, 64],
    [-64, 60], [-55, 52], [-64, 44], [-71, 41], [-76, 35], [-81, 25], [-84, 30],
    [-90, 29], [-97, 26], [-97, 19], [-88, 21], [-83, 15], [-79, 9], [-83, 8],
    [-87, 13], [-93, 15], [-105, 20], [-110, 24], [-114, 31], [-117, 33], [-124, 40],
    [-125, 49], [-134, 57], [-148, 61], [-161, 56], [-166, 60],
  ],
  [[-52, 60], [-42, 60], [-34, 68], [-22, 74], [-18, 81], [-35, 83], [-54, 82], [-68, 77], [-58, 70]],
  [[-84, 22], [-75, 20], [-74, 21], [-82, 23]],
  [
    [-79, 9], [-72, 12], [-62, 10], [-51, 2], [-35, -6], [-38, -14], [-41, -22],
    [-48, -26], [-53, -34], [-58, -38], [-65, -42], [-67, -50], [-69, -55],
    [-74, -52], [-73, -42], [-71, -30], [-71, -18], [-77, -12], [-81, -5], [-78, 2],
  ],
  [
    [-9, 37], [-9, 43], [-2, 43], [-4, 48], [2, 51], [8, 54], [10, 57], [14, 54],
    [20, 55], [24, 59], [28, 60], [24, 65], [29, 70], [18, 69], [10, 64], [5, 60],
    [11, 58], [16, 60], [21, 61], [30, 60], [42, 66], [58, 68], [60, 56], [48, 46],
    [38, 45], [30, 46], [28, 41], [23, 38], [20, 40], [14, 45], [16, 40], [12, 42],
    [7, 44], [3, 42], [-5, 36],
  ],
  [[-5, 50], [2, 51], [0, 54], [-2, 58], [-6, 57], [-5, 52]],
  [[-10, 52], [-6, 52], [-6, 55], [-9, 55]],
  [[-24, 64], [-14, 64], [-14, 66], [-23, 66]],
  [
    [-17, 15], [-16, 21], [-10, 32], [-5, 36], [10, 37], [12, 33], [24, 32],
    [32, 31], [35, 25], [40, 15], [44, 11], [51, 12], [48, 5], [41, -2],
    [40, -11], [35, -20], [33, -26], [28, -33], [19, -35], [15, -26], [12, -16],
    [12, -6], [9, 4], [2, 6], [-8, 5], [-15, 10],
  ],
  [[44, -25], [47, -25], [50, -13], [48, -12], [44, -19]],
  [
    [27, 41], [36, 41], [42, 42], [49, 40], [52, 46], [60, 55], [60, 68], [72, 72],
    [95, 76], [118, 73], [142, 72], [170, 68], [176, 62], [162, 56], [155, 60],
    [141, 54], [136, 45], [129, 40], [129, 35], [125, 38], [121, 37], [122, 31],
    [120, 24], [114, 22], [108, 21], [109, 12], [104, 10], [100, 13], [104, 2],
    [100, 5], [98, 16], [92, 22], [88, 22], [80, 13], [77, 8], [72, 20], [67, 25],
    [57, 26], [51, 29], [56, 23], [60, 21], [52, 16], [44, 13], [39, 21], [35, 29],
    [36, 36], [28, 37],
  ],
  [[79.7, 9.7], [81.8, 7.6], [80.7, 5.9], [79.8, 7.1]],
  [[130, 31], [136, 34], [141, 36], [141, 41], [145, 44], [140, 43], [137, 37], [131, 34]],
  [[120.2, 22.0], [121.9, 25.1], [121.6, 22.8]],
  [[120, 18], [123, 16], [126, 7], [122, 6], [120, 14]],
  [[95, 5], [105, -6], [103, -6], [95, 3]],
  [[105, -6], [114, -8], [114, -7], [106, -6]],
  [[109, 2], [118, 6], [117, -3], [111, -3]],
  [[119, 1], [125, 1], [122, -5], [119, -5]],
  [[131, -2], [141, -3], [150, -10], [144, -8], [135, -4]],
  [
    [114, -22], [122, -17], [131, -12], [136, -12], [142, -11], [146, -18],
    [153, -27], [150, -37], [141, -38], [135, -34], [125, -33], [115, -34], [113, -26],
  ],
  [[172, -35], [178, -38], [174, -42], [167, -46], [169, -42], [174, -39]],
  [[-180, -72], [-120, -73], [-60, -65], [0, -70], [60, -68], [120, -67], [180, -72], [180, -90], [-180, -90]],
];

/**
 * Immediate fallback Earth surface texture so frame 1 is never blank
 * while high-definition satellite CDN textures stream in.
 */
function createFallbackEarthTexture(maxAnisotropy: number) {
  const width = 1024;
  const height = 512;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#102d52');
  oceanGrad.addColorStop(0.5, '#0a2240');
  oceanGrad.addColorStop(1, '#102d52');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < CONTINENT_POLYGONS.length; i++) {
    const poly = CONTINENT_POLYGONS[i];
    const isAntarctica = i === CONTINENT_POLYGONS.length - 1;
    ctx.beginPath();
    poly.forEach(([lng, lat], idx) => {
      const x = ((lng + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = isAntarctica ? '#dce6f2' : '#2f5d46';
    ctx.fill();
  }

  const albedoTexture = new THREE.CanvasTexture(colorCanvas);
  albedoTexture.colorSpace = THREE.SRGBColorSpace;
  albedoTexture.anisotropy = Math.min(8, maxAnisotropy);
  albedoTexture.needsUpdate = true;

  return albedoTexture;
}

/**
 * Converts a white=water / black=land mask image into a physically-based roughness map
 * (glossy oceans ~0.30 roughness, matte land ~0.86 roughness).
 */
function createRoughnessFromWaterMask(image: HTMLImageElement, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const w = Math.min(1024, image.naturalWidth || 1024);
  const h = Math.min(512, image.naturalHeight || 512);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, w, h);

  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      // Water mask is bright (255) on ocean, dark (0) on land
      const isWater = data[i] / 255;
      // Map ocean -> 78 (~0.31 roughness), land -> 224 (~0.88 roughness)
      const rough = Math.round(224 - isWater * 146);
      data[i] = rough;
      data[i + 1] = rough;
      data[i + 2] = rough;
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Keep neutral matte fallback if canvas pixel read is tainted
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, w, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

function detectWebGLSupport(): { supported: boolean; isSoftwareGl: boolean } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { supported: false, isSoftwareGl: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

export const EarthGlobe: React.FC<EarthGlobeProps> = ({
  countries,
  focusedCountry,
  issPosition,
  pinnedSet,
  displayDate,
  is24Hour,
  tempUnit,
  weatherMap,
  rates,
  collapsed,
  onToggleCollapse,
  onSelectCountry,
  onInspectCountry,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [trackingIss, setTrackingIss] = useState(false);

  // Refs synced from React props without tearing down WebGL context
  const focusedRef = useRef<Country>(focusedCountry);
  const issRef = useRef<IssPosition>(issPosition);
  const trackingIssRef = useRef<boolean>(false);
  const pinnedRef = useRef<Set<string>>(pinnedSet);
  const countriesRef = useRef<readonly Country[]>(countries);
  const onSelectRef = useRef(onSelectCountry);
  const needsFocusGlideRef = useRef<boolean>(true);
  const resetViewRef = useRef<(() => void) | null>(null);
  const updateMarkersRef = useRef<(() => void) | null>(null);
  const updateIssMeshRef = useRef<(() => void) | null>(null);
  const pauseAutoRotateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    focusedRef.current = focusedCountry;
    trackingIssRef.current = false;
    setTrackingIss(false);
    needsFocusGlideRef.current = true;
    pauseAutoRotateRef.current?.();
    updateMarkersRef.current?.();
  }, [focusedCountry]);

  useEffect(() => {
    issRef.current = issPosition;
    updateIssMeshRef.current?.();
    if (trackingIssRef.current) {
      needsFocusGlideRef.current = true;
    }
  }, [issPosition]);

  const handleTrackIss = () => {
    trackingIssRef.current = true;
    setTrackingIss(true);
    needsFocusGlideRef.current = true;
    pauseAutoRotateRef.current?.();
  };

  useEffect(() => {
    pinnedRef.current = pinnedSet;
    updateMarkersRef.current?.();
  }, [pinnedSet]);

  useEffect(() => {
    countriesRef.current = countries;
  }, [countries]);

  useEffect(() => {
    onSelectRef.current = onSelectCountry;
  }, [onSelectCountry]);

  // Live telemetry for focused country HUD
  const focusedClock = useMemo(
    () => formatClockForZone(displayDate, focusedCountry.timezone, is24Hour),
    [displayDate, focusedCountry.timezone, is24Hour]
  );
  const focusedWeather = weatherMap[focusedCountry.iso];
  const focusedLkrRate = useMemo(
    () => formatLkrRateShort(focusedCountry.currency, rates),
    [focusedCountry.currency, rates]
  );

  // Mount Photorealistic Three.js Globe when expanded
  useEffect(() => {
    if (collapsed) return;
    const container = mountRef.current;
    if (!container) return;

    const { supported, isSoftwareGl } = detectWebGLSupport();
    if (!supported) {
      setWebglUnavailable(true);
      return;
    }

    let disposed = false;
    let frameId = 0;

    const scene = new THREE.Scene();
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 380;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    latLngToVec3(focusedRef.current.lat, focusedRef.current.lng, 2.8, camera.position);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    // Crucial for mobile touchscreens: prevent page scroll while hand-rotating or pinch-zooming globe
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // WebGL context loss safety
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    const handleContextRestored = () => {
      setWebglUnavailable(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // Studio RoomEnvironment reflection map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // Solar direction aligned to current UTC hour so day/night hemisphere matches reality
    const nowUtc = new Date();
    const utcHours = nowUtc.getUTCHours() + nowUtc.getUTCMinutes() / 60;
    const solarLng = (12 - utcHours) * 15;
    const sunDirection = latLngToVec3(12, solarLng, 1, new THREE.Vector3()).normalize();

    // Realistic orbital lighting rig (Sun Key + Cool Space Hemisphere + Soft Cyan Rim)
    const hemiLight = new THREE.HemisphereLight(0xbfe0ff, 0x0b162c, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff6e8, 2.5);
    keyLight.position.copy(sunDirection).multiplyScalar(8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rimLight.position.copy(sunDirection).multiplyScalar(-5).add(new THREE.Vector3(0, 2.5, 0));
    scene.add(rimLight);

    // Composite Photorealistic Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const fallbackAlbedo = createFallbackEarthTexture(maxAniso);
    const loadedTextures: THREE.Texture[] = [];

    // Part 1: High-Definition Satellite Earth Sphere with dynamic Day/Night city-light shader blending
    const earthGeo = new THREE.SphereGeometry(1, 72, 54);
    const sunDirUniform = { value: sunDirection.clone() };
    const nightLightsMixUniform = { value: 0.0 }; // ramps to 1.0 once night texture loads

    const earthMat = new THREE.MeshStandardMaterial({
      map: fallbackAlbedo,
      roughness: 0.72,
      metalness: 0.06,
      bumpScale: 0.032,
      emissive: new THREE.Color(0xffdfa0),
      emissiveIntensity: 1.05,
    });

    earthMat.onBeforeCompile = (shader) => {
      shader.uniforms.uSunDir = sunDirUniform;
      shader.uniforms.uNightMix = nightLightsMixUniform;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vEarthWorldNormal;`
        )
        .replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
           vEarthWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform vec3 uSunDir;
           uniform float uNightMix;
           varying vec3 vEarthWorldNormal;`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           float earthSunDot = dot(normalize(vEarthWorldNormal), normalize(uSunDir));
           float nightSideMask = smoothstep(0.16, -0.22, earthSunDot);
           totalEmissiveRadiance *= nightSideMask * uNightMix;`
        );
    };

    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earthMesh);

    // Stream real NASA Blue Marble, Terrain Topology, Water Roughness, and Night Lights from CDN
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    textureLoader.load(
      EARTH_TEXTURE_URLS.day,
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(8, maxAniso);
        loadedTextures.push(tex);
        earthMat.map = tex;
        earthMat.needsUpdate = true;
      },
      undefined,
      () => {
        // Keep clean fallback texture gracefully if CDN is blocked
      }
    );

    textureLoader.load(
      EARTH_TEXTURE_URLS.bump,
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.NoColorSpace;
        tex.anisotropy = Math.min(4, maxAniso);
        loadedTextures.push(tex);
        earthMat.bumpMap = tex;
        earthMat.bumpScale = 0.032;
        earthMat.needsUpdate = true;
      }
    );

    textureLoader.load(
      EARTH_TEXTURE_URLS.water,
      (waterTex) => {
        if (disposed) {
          waterTex.dispose();
          return;
        }
        const img = waterTex.image as HTMLImageElement | undefined;
        waterTex.dispose();
        if (img) {
          const roughTex = createRoughnessFromWaterMask(img, maxAniso);
          loadedTextures.push(roughTex);
          earthMat.roughnessMap = roughTex;
          earthMat.roughness = 0.92;
          earthMat.needsUpdate = true;
        }
      }
    );

    textureLoader.load(
      EARTH_TEXTURE_URLS.night,
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(8, maxAniso);
        loadedTextures.push(tex);
        earthMat.emissiveMap = tex;
        nightLightsMixUniform.value = 1.0;
        earthMat.needsUpdate = true;
      }
    );

    // Part 2: Outer Atmospheric Fresnel Halo (soft blue/cyan orbital scattering)
    const atmosOuterGeo = new THREE.SphereGeometry(1.07, 56, 40);
    const atmosOuterMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float rim = pow(clamp(0.64 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.0);
          gl_FragColor = vec4(0.24, 0.72, 1.0, 1.0) * rim * 0.95;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosOuterMesh = new THREE.Mesh(atmosOuterGeo, atmosOuterMat);
    globeGroup.add(atmosOuterMesh);

    // Part 3: Inner Atmospheric Limb Scatter (subtle blue rim hugging horizon)
    const atmosInnerGeo = new THREE.SphereGeometry(1.008, 56, 40);
    const atmosInnerMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.6);
          gl_FragColor = vec4(0.32, 0.78, 1.0, 1.0) * fresnel * 0.42;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosInnerMesh = new THREE.Mesh(atmosInnerGeo, atmosInnerMat);
    globeGroup.add(atmosInnerMesh);

    // Part 4: InstancedMesh of all capital markers cleanly floating just above the Earth surface
    const pinGeo = new THREE.SphereGeometry(0.013, 10, 10);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.25,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.5,
    });
    const pinsMesh = new THREE.InstancedMesh(pinGeo, pinMat, countriesRef.current.length);
    pinsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    globeGroup.add(pinsMesh);

    // Part 5: Selected country 3D beacon (needle + luminous tip + surface ring)
    const beaconGroup = new THREE.Group();
    const needleGeo = new THREE.CylinderGeometry(0.0038, 0.0075, 0.135, 10);
    needleGeo.translate(0, 0.0675, 0);
    const needleMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.95,
      roughness: 0.22,
      metalness: 0.65,
    });
    const needleMesh = new THREE.Mesh(needleGeo, needleMat);

    const tipGeo = new THREE.SphereGeometry(0.019, 14, 14);
    tipGeo.translate(0, 0.14, 0);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.15,
      roughness: 0.18,
      metalness: 0.1,
    });
    const tipMesh = new THREE.Mesh(tipGeo, tipMat);

    const haloGeo = new THREE.RingGeometry(0.025, 0.043, 24);
    haloGeo.rotateX(-Math.PI / 2);
    haloGeo.translate(0, 0.009, 0);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);

    beaconGroup.add(needleMesh, tipMesh, haloMesh);
    globeGroup.add(beaconGroup);

    // Part 6: Live ISS Orbital Station (composite 3-part assembly + nadir ground line)
    const issGroup = new THREE.Group();
    const issCoreGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.048, 10);
    issCoreGeo.rotateZ(Math.PI / 2);
    const issCoreMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.45,
    });
    const issCoreMesh = new THREE.Mesh(issCoreGeo, issCoreMat);

    const issPanelGeo = new THREE.BoxGeometry(0.018, 0.003, 0.068);
    const issPanelMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.65,
      roughness: 0.25,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
    });
    const issPanelLeft = new THREE.Mesh(issPanelGeo, issPanelMat);
    issPanelLeft.position.x = -0.022;
    const issPanelRight = new THREE.Mesh(issPanelGeo, issPanelMat);
    issPanelRight.position.x = 0.022;

    const issRingGeo = new THREE.RingGeometry(0.036, 0.046, 20);
    issRingGeo.rotateX(-Math.PI / 2);
    const issRingMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    const issRingMesh = new THREE.Mesh(issRingGeo, issRingMat);
    issGroup.add(issCoreMesh, issPanelLeft, issPanelRight, issRingMesh);
    globeGroup.add(issGroup);

    const issNadirPositions = new Float32Array(6);
    const issNadirGeo = new THREE.BufferGeometry();
    issNadirGeo.setAttribute('position', new THREE.BufferAttribute(issNadirPositions, 3));
    const issNadirMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.7,
    });
    const issNadirLine = new THREE.Line(issNadirGeo, issNadirMat);
    globeGroup.add(issNadirLine);

    const syncIssMesh = () => {
      const iss = issRef.current;
      latLngToVec3(iss.latitude, iss.longitude, 1.095, _vec3);
      issGroup.position.copy(_vec3);
      _normal.copy(_vec3).normalize();
      _quat.setFromUnitVectors(_up, _normal);
      issGroup.quaternion.copy(_quat);

      latLngToVec3(iss.latitude, iss.longitude, 1.008, _vec3B);
      const posAttr = issNadirGeo.getAttribute('position') as THREE.BufferAttribute;
      posAttr.setXYZ(0, _vec3.x, _vec3.y, _vec3.z);
      posAttr.setXYZ(1, _vec3B.x, _vec3B.y, _vec3B.z);
      posAttr.needsUpdate = true;
    };

    syncIssMesh();
    updateIssMeshRef.current = syncIssMesh;

    // Part 7: Deep Space Starfield
    const starCount = 520;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 9 + Math.random() * 16;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xdbeafe,
      size: 0.052,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const syncMarkers = () => {
      const list = countriesRef.current;
      const focusedIso = focusedRef.current.iso;
      const pinned = pinnedRef.current;

      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        latLngToVec3(c.lat, c.lng, 1.014, _vec3);
        _dummy.position.copy(_vec3);
        const isFocused = c.iso === focusedIso;
        const isPinned = pinned.has(c.iso);
        const s = isFocused ? 1.55 : isPinned ? 1.22 : 0.72;
        _dummy.scale.setScalar(s);
        _dummy.updateMatrix();
        pinsMesh.setMatrixAt(i, _dummy.matrix);

        if (isFocused) {
          _color.setHex(0xfbbf24);
        } else if (isPinned) {
          _color.setHex(0x38bdf8);
        } else {
          _color.setHex(0xcbd5e1);
        }
        pinsMesh.setColorAt(i, _color);
      }
      pinsMesh.instanceMatrix.needsUpdate = true;
      if (pinsMesh.instanceColor) pinsMesh.instanceColor.needsUpdate = true;
      pinsMesh.computeBoundingSphere();

      // Orient active beacon along surface normal of focused country
      latLngToVec3(focusedRef.current.lat, focusedRef.current.lng, 1.008, _vec3);
      beaconGroup.position.copy(_vec3);
      _normal.copy(_vec3).normalize();
      _quat.setFromUnitVectors(_up, _normal);
      beaconGroup.quaternion.copy(_quat);
    };

    syncMarkers();
    updateMarkersRef.current = syncMarkers;

    // Smooth Hand/Touch & Mouse OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 1.55;
    controls.maxDistance = 4.8;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.85;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.autoRotate = !isSoftwareGl;
    controls.autoRotateSpeed = 0.35;

    // Pause auto-rotation immediately on manual drag/touch or country focus
    controls.addEventListener('start', () => {
      needsFocusGlideRef.current = false;
      controls.autoRotate = false;
    });

    pauseAutoRotateRef.current = () => {
      controls.autoRotate = false;
    };

    resetViewRef.current = () => {
      needsFocusGlideRef.current = true;
      if (!isSoftwareGl) controls.autoRotate = true;
    };

    // Click / Tap Raycasting on capital markers
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownX = 0;
    let pointerDownY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownX;
      const dy = e.clientY - pointerDownY;
      if (dx * dx + dy * dy > 25) return; // Ignore drag gestures

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(pinsMesh, false);
      if (hits.length > 0 && typeof hits[0].instanceId === 'number') {
        const picked = countriesRef.current[hits[0].instanceId];
        if (picked) {
          onSelectRef.current(picked);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // Responsive ResizeObserver
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(1, Math.floor(entry.contentRect.width));
      const h = Math.max(1, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Software WebGL fence-based pacing (per threejs skill)
    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 6);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 6);
      } else {
        frameId = window.setTimeout(cb, 90);
      }
    };

    const clock = new THREE.Clock();

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);

      // Smooth exponential glide toward focused country OR live ISS coordinates
      if (needsFocusGlideRef.current) {
        const dist = THREE.MathUtils.clamp(camera.position.length(), 2.3, 3.0);
        const targetLat = trackingIssRef.current
          ? issRef.current.latitude
          : focusedRef.current.lat;
        const targetLng = trackingIssRef.current
          ? issRef.current.longitude
          : focusedRef.current.lng;
        latLngToVec3(targetLat, targetLng, dist, _targetCamPos);

        if (isSoftwareGl) {
          camera.position.copy(_targetCamPos);
          needsFocusGlideRef.current = false;
        } else {
          const factor = 1 - Math.exp(-5.4 * dt);
          camera.position.lerp(_targetCamPos, factor).setLength(dist);
          if (camera.position.distanceTo(_targetCamPos) < 0.018) {
            camera.position.copy(_targetCamPos);
            needsFocusGlideRef.current = false;
          }
        }
        camera.lookAt(0, 0, 0);
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      earthGeo.dispose();
      earthMat.dispose();
      fallbackAlbedo.dispose();
      loadedTextures.forEach((t) => t.dispose());
      atmosOuterGeo.dispose();
      atmosOuterMat.dispose();
      atmosInnerGeo.dispose();
      atmosInnerMat.dispose();
      pinGeo.dispose();
      pinMat.dispose();
      needleGeo.dispose();
      needleMat.dispose();
      tipGeo.dispose();
      tipMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      issCoreGeo.dispose();
      issCoreMat.dispose();
      issPanelGeo.dispose();
      issPanelMat.dispose();
      issRingGeo.dispose();
      issRingMat.dispose();
      issNadirGeo.dispose();
      issNadirMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      envTarget.dispose();
      renderer.dispose();
      updateMarkersRef.current = null;
      updateIssMeshRef.current = null;
      resetViewRef.current = null;
      pauseAutoRotateRef.current = null;
    };
  }, [collapsed]);

  const callBadgeClasses =
    focusedClock.callStatus.level === 'good'
      ? 'text-emerald-300'
      : focusedClock.callStatus.level === 'window'
        ? 'text-amber-300'
        : 'text-rose-300';

  const callDotClasses =
    focusedClock.callStatus.level === 'good'
      ? 'bg-emerald-400'
      : focusedClock.callStatus.level === 'window'
        ? 'bg-amber-400'
        : 'bg-rose-400';

  // Collapsed sleek bar
  if (collapsed) {
    return (
      <section
        aria-label="Interactive 3D Earth Globe (collapsed)"
        className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-3.5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-900/60 dark:shadow-none"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Compass className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm">
            <span className="font-semibold text-slate-900 dark:text-white">
              3D Earth Globe
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              ·
            </span>
            <span className="truncate text-slate-600 dark:text-slate-300">
              Focused: {focusedCountry.name} ({focusedCountry.capital})
            </span>
            <span className="tabular-clock font-semibold text-sky-600 dark:text-sky-400">
              {focusedClock.hours}:{focusedClock.minutes}
              {!is24Hour && focusedClock.dayPeriod ? ` ${focusedClock.dayPeriod}` : ''}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12]"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          Show 3D Globe
        </button>
      </section>
    );
  }

  // Fallback 2D coordinate projection coordinates for focused country & ISS
  const fallbackX = ((focusedCountry.lng + 180) / 360) * 100;
  const fallbackY = ((90 - focusedCountry.lat) / 180) * 100;
  const issFallbackX = ((issPosition.longitude + 180) / 360) * 100;
  const issFallbackY = ((90 - issPosition.latitude) / 180) * 100;

  return (
    <section
      aria-label="Interactive 3D Earth Globe"
      className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-[#040914] shadow-[0_12px_40px_-12px_rgba(2,6,23,0.5)] dark:border-white/[0.09]"
    >
      {/* Subtle deep-space backdrop behind canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(14,165,233,0.14),rgba(4,9,20,0.98)_70%)]"
      />

      {/* Top Overlay Header (No backdrop-filter over WebGL; solid rgba surfaces) */}
      <div className="pointer-events-none relative z-10 flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-white/10 bg-[#081226]/92 px-3 py-1.5 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300">
            <Satellite className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{issPosition.isLive ? 'ISS Live' : 'ISS Orbit'}</span>
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="tabular-clock text-slate-200">
            {Math.abs(issPosition.latitude).toFixed(2)}°{issPosition.latitude >= 0 ? 'N' : 'S'},{' '}
            {Math.abs(issPosition.longitude).toFixed(2)}°{issPosition.longitude >= 0 ? 'E' : 'W'}
          </span>
          <span aria-hidden="true" className="hidden text-slate-600 sm:inline">
            ·
          </span>
          <span className="tabular-clock hidden text-slate-400 sm:inline">
            Alt {Math.round(issPosition.altitudeKm)} km
          </span>
          <span aria-hidden="true" className="hidden text-slate-600 md:inline">
            ·
          </span>
          <span className="tabular-clock hidden text-slate-400 md:inline">
            {Math.round(issPosition.velocityKmh).toLocaleString()} km/h
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {!webglUnavailable && (
            <>
              <button
                type="button"
                onClick={handleTrackIss}
                title="Rotate globe to live International Space Station position"
                className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  trackingIss
                    ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                    : 'border-white/10 bg-[#081226]/90 text-slate-200 hover:border-white/20 hover:text-white'
                }`}
              >
                <Satellite className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span>Track ISS</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  trackingIssRef.current = false;
                  setTrackingIss(false);
                  resetViewRef.current?.();
                }}
                title="Re-center on focused country and resume gentle orbit"
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-[#081226]/90 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Recenter</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse 3D Globe"
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-[#081226]/90 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Hide Globe</span>
          </button>
        </div>
      </div>

      {/* 3D Photorealistic Earth Canvas Viewport (touch-none prevents mobile scroll interference) */}
      <div className="relative h-[320px] w-full sm:h-[380px] lg:h-[420px]">
        {webglUnavailable ? (
          <div className="flex h-full w-full items-center justify-center p-6">
            <div className="relative h-full w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#071428]">
              <svg
                viewBox="0 0 100 50"
                preserveAspectRatio="none"
                className="h-full w-full opacity-40"
                aria-hidden="true"
              >
                {[10, 20, 30, 40].map((y) => (
                  <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#38bdf8" strokeWidth="0.15" />
                ))}
                {[16.6, 33.3, 50, 66.6, 83.3].map((x) => (
                  <line key={x} x1={x} y1="0" x2={x} y2="50" stroke="#38bdf8" strokeWidth="0.15" />
                ))}
                {CONTINENT_POLYGONS.map((poly, idx) => (
                  <polygon
                    key={idx}
                    points={poly
                      .map(([lng, lat]) => `${((lng + 180) / 360) * 100},${((90 - lat) / 180) * 50}`)
                      .join(' ')}
                    fill="#164e63"
                    stroke="#38bdf8"
                    strokeWidth="0.2"
                  />
                ))}
              </svg>
              <div
                style={{ left: `${fallbackX}%`, top: `${fallbackY}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                title={`${focusedCountry.name} (${focusedCountry.capital})`}
              >
                <span className="block h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-400 shadow-lg" />
              </div>
              <div
                style={{ left: `${issFallbackX}%`, top: `${issFallbackY}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                title="International Space Station"
              >
                <span className="block h-3 w-3 rounded-full border-2 border-white bg-emerald-400 shadow-lg" />
              </div>
              <p className="absolute right-3 bottom-2.5 text-[11px] text-slate-400">
                2D coordinate view (WebGL unavailable)
              </p>
            </div>
          </div>
        ) : (
          <div
            ref={mountRef}
            className="h-full w-full touch-none select-none cursor-grab active:cursor-grabbing"
          />
        )}
      </div>

      {/* Unified Bottom Dock HUD (Zero side-panel occlusion, no backdrop-filter over WebGL) */}
      <div className="relative z-10 border-t border-white/[0.08] bg-[#081226]/95 px-5 py-3.5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          {/* Focused Country Flag + Name + Capital + Coords */}
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={`https://flagcdn.com/w80/${focusedCountry.iso}.png`}
              srcSet={`https://flagcdn.com/w160/${focusedCountry.iso}.png 2x`}
              alt={`Flag of ${focusedCountry.name}`}
              width={40}
              height={27}
              referrerPolicy="no-referrer"
              className="h-7 w-10 shrink-0 rounded-[5px] object-cover ring-1 ring-white/20"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-semibold tracking-tight text-white">
                  {focusedCountry.name}
                </h2>
                <span className="truncate text-xs text-slate-400">
                  {focusedCountry.capital}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                <span className="tabular-clock">
                  {Math.abs(focusedCountry.lat).toFixed(2)}°{focusedCountry.lat >= 0 ? 'N' : 'S'},{' '}
                  {Math.abs(focusedCountry.lng).toFixed(2)}°{focusedCountry.lng >= 0 ? 'E' : 'W'}
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="tabular-clock text-slate-300">{focusedClock.utcOffset}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className={`inline-flex items-center gap-1.5 font-medium ${callBadgeClasses}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${callDotClasses}`} aria-hidden="true" />
                  {focusedClock.callStatus.label}
                </span>
              </div>
            </div>
          </div>

          {/* Focused Country Live Time, Weather, LKR Rate & Inspect CTA */}
          <div className="flex flex-wrap items-center justify-between gap-4 md:justify-end">
            <div className="flex items-center gap-4">
              <div className="text-left md:text-right">
                <div className="tabular-clock text-xl font-semibold tracking-tight text-white">
                  {focusedClock.hours}:{focusedClock.minutes}
                  <span className="text-sm font-medium text-slate-400">
                    :{focusedClock.seconds}
                  </span>
                  {!is24Hour && focusedClock.dayPeriod && (
                    <span className="ml-1 text-xs font-semibold text-sky-400">
                      {focusedClock.dayPeriod}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">{focusedClock.shortDate}</div>
              </div>

              <div className="hidden h-8 w-px bg-white/10 sm:block" aria-hidden="true" />

              <div className="hidden flex-col text-xs sm:flex">
                <span className="flex items-center gap-1.5 font-medium text-slate-200">
                  {focusedWeather ? (
                    <>
                      <WeatherIcon kind={focusedWeather.icon} className="h-3.5 w-3.5" />
                      <span className="tabular-clock">
                        {formatTemperature(focusedWeather.tempC, tempUnit)}
                      </span>
                      <span className="text-slate-400">{focusedWeather.label}</span>
                    </>
                  ) : (
                    <span className="text-slate-400">Loading weather…</span>
                  )}
                </span>
                <span className="tabular-clock mt-0.5 text-slate-400">
                  {focusedLkrRate}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onInspectCountry(focusedCountry)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Country Details</span>
              <Expand className="h-3 w-3 opacity-70" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
