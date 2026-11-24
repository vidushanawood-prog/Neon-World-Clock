import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Country } from '../data/countries';
import {
  getCulturalProfile,
  type CulturalCharacterProfile,
  type HeadgearStyle,
} from '../data/culturalProfiles';

interface CharacterTurntableStageProps {
  country: Country;
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

function buildHeadgear(
  style: HeadgearStyle,
  primaryHex: string,
  accentHex: string,
  disposables: Array<THREE.BufferGeometry | THREE.Material>
): THREE.Group | null {
  if (style === 'none') return null;

  const group = new THREE.Group();
  const track = <T extends THREE.BufferGeometry | THREE.Material>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const fabricMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(primaryHex),
      roughness: 0.78,
      metalness: 0.08,
    })
  );
  const goldMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentHex),
      roughness: 0.24,
      metalness: 0.82,
      emissive: new THREE.Color(accentHex),
      emissiveIntensity: 0.14,
    })
  );

  if (style === 'turban') {
    const wrap1 = new THREE.Mesh(track(new THREE.TorusGeometry(0.145, 0.052, 12, 24)), fabricMat);
    wrap1.rotation.x = Math.PI / 2;
    wrap1.position.y = 0.08;
    const wrap2 = new THREE.Mesh(track(new THREE.SphereGeometry(0.145, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58)), fabricMat);
    wrap2.position.y = 0.06;
    const jewel = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.032, 0)), goldMat);
    jewel.position.set(0, 0.12, 0.165);
    group.add(wrap1, wrap2, jewel);
  } else if (style === 'ghutra') {
    const whiteCloth = track(
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85, metalness: 0.04 })
    );
    const agalMat = track(
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.2 })
    );
    const cap = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.165, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56)),
      whiteCloth
    );
    cap.position.y = 0.03;
    const drape = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.162, 0.21, 0.26, 18, 1, true, Math.PI * 0.25, Math.PI * 1.5)),
      whiteCloth
    );
    drape.position.set(0, -0.08, -0.02);
    const agal = new THREE.Mesh(track(new THREE.TorusGeometry(0.155, 0.022, 10, 24)), agalMat);
    agal.rotation.x = Math.PI / 2;
    agal.position.y = 0.115;
    group.add(cap, drape, agal);
  } else if (style === 'beret') {
    const beret = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.14, 0.065, 20)), fabricMat);
    beret.position.set(0.02, 0.13, 0);
    beret.rotation.z = -0.22;
    const stem = new THREE.Mesh(track(new THREE.CylinderGeometry(0.012, 0.014, 0.035, 8)), fabricMat);
    stem.position.set(0.04, 0.175, 0);
    group.add(beret, stem);
  } else if (style === 'sombrero') {
    const brim = new THREE.Mesh(track(new THREE.CylinderGeometry(0.32, 0.34, 0.025, 24)), fabricMat);
    brim.position.y = 0.105;
    const trim = new THREE.Mesh(track(new THREE.TorusGeometry(0.33, 0.012, 8, 28)), goldMat);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 0.105;
    const crown = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.155, 0.17, 18)), fabricMat);
    crown.position.y = 0.19;
    const band = new THREE.Mesh(track(new THREE.TorusGeometry(0.148, 0.015, 8, 20)), goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.135;
    group.add(brim, trim, crown, band);
  } else if (style === 'kufi' || style === 'songkok') {
    const h = style === 'songkok' ? 0.12 : 0.095;
    const cap = new THREE.Mesh(track(new THREE.CylinderGeometry(0.145, 0.152, h, 20)), fabricMat);
    cap.position.y = 0.115;
    const band = new THREE.Mesh(track(new THREE.TorusGeometry(0.15, 0.012, 8, 24)), goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.085;
    group.add(cap, band);
  } else if (style === 'gat' || style === 'bowler') {
    const darkMat = track(
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.18 })
    );
    const brimR = style === 'gat' ? 0.28 : 0.21;
    const brim = new THREE.Mesh(track(new THREE.CylinderGeometry(brimR, brimR, 0.018, 24)), darkMat);
    brim.position.y = 0.11;
    const crown = new THREE.Mesh(
      track(
        style === 'gat'
          ? new THREE.CylinderGeometry(0.115, 0.125, 0.15, 18)
          : new THREE.SphereGeometry(0.148, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58)
      ),
      darkMat
    );
    crown.position.y = style === 'gat' ? 0.185 : 0.115;
    const ribbon = new THREE.Mesh(track(new THREE.TorusGeometry(0.135, 0.012, 8, 20)), goldMat);
    ribbon.rotation.x = Math.PI / 2;
    ribbon.position.y = 0.125;
    group.add(brim, crown, ribbon);
  } else if (style === 'highland-cap' || style === 'andean-cap') {
    const cap = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.158, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56)),
      fabricMat
    );
    cap.position.y = 0.06;
    const pom = new THREE.Mesh(track(new THREE.SphereGeometry(0.035, 10, 10)), goldMat);
    pom.position.y = 0.22;
    const band = new THREE.Mesh(track(new THREE.TorusGeometry(0.154, 0.018, 8, 20)), goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.075;
    group.add(cap, pom, band);
  } else if (style === 'crown-band') {
    const band = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.152, 0.013, 8, 24, Math.PI * 1.15)),
      goldMat
    );
    band.rotation.x = Math.PI / 2;
    band.rotation.z = -Math.PI * 0.08;
    band.position.y = 0.095;
    const ornament = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.028, 0)), goldMat);
    ornament.position.set(0, 0.092, 0.158);
    group.add(band, ornament);
  }

  return group;
}

/**
 * Builds a composite multi-part procedural cultural character (10-14 meshes)
 * grounded cleanly at y = 0.
 */
function buildCulturalCharacter(
  variant: 'A' | 'B',
  profile: CulturalCharacterProfile,
  disposables: Array<THREE.BufferGeometry | THREE.Material>
): THREE.Group {
  const root = new THREE.Group();
  const track = <T extends THREE.BufferGeometry | THREE.Material>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const isA = variant === 'A';
  const skinMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(isA ? profile.skinToneA : profile.skinToneB),
      roughness: 0.56,
      metalness: 0.04,
    })
  );
  const hairMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(isA ? profile.hairColorA : profile.hairColorB),
      roughness: 0.72,
      metalness: 0.08,
    })
  );
  const primaryMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(isA ? profile.primaryA : profile.primaryB),
      roughness: 0.76,
      metalness: 0.1,
    })
  );
  const secondaryMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(isA ? profile.secondaryA : profile.secondaryB),
      roughness: 0.68,
      metalness: 0.14,
    })
  );
  const accentMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(isA ? profile.accentA : profile.accentB),
      roughness: 0.25,
      metalness: 0.84,
      emissive: new THREE.Color(isA ? profile.accentA : profile.accentB),
      emissiveIntensity: 0.18,
    })
  );
  const shoeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.36,
      metalness: 0.28,
    })
  );

  // 1. Grounded Shoes (flush with turntable deck y = 0)
  const shoeGeo = track(new THREE.CapsuleGeometry(0.052, 0.08, 6, 10));
  shoeGeo.rotateX(Math.PI / 2);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(-0.095, 0.052, 0.025);
  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0.095, 0.052, 0.025);
  root.add(leftShoe, rightShoe);

  // 2. Lower Garment (Trousers vs Robe/Skirt/Sari/Kimono/Kilt via LatheGeometry)
  const useLongRobe =
    !isA ||
    profile.garmentA === 'thobe' ||
    profile.garmentA === 'agbada' ||
    profile.garmentA === 'nilame-national' ||
    profile.garmentA === 'haori-hakama';

  if (useLongRobe) {
    const hemRadius = !isA
      ? profile.garmentB === 'hanbok-chima' || profile.garmentB === 'folk-skirt'
        ? 0.32
        : 0.24
      : 0.21;
    const lathePts = [
      new THREE.Vector2(hemRadius, 0.07),
      new THREE.Vector2(hemRadius * 0.88, 0.36),
      new THREE.Vector2(0.175, 0.72),
      new THREE.Vector2(0.165, 0.84),
    ];
    const robeGeo = track(new THREE.LatheGeometry(lathePts, 24));
    const robeMat =
      isA && (profile.garmentA === 'nilame-national' || profile.garmentA === 'haori-hakama')
        ? secondaryMat
        : primaryMat;
    const robeMesh = new THREE.Mesh(robeGeo, robeMat);
    root.add(robeMesh);

    // Metallic woven border at hem
    const hemBorder = new THREE.Mesh(
      track(new THREE.TorusGeometry(hemRadius * 0.99, 0.015, 8, 28)),
      accentMat
    );
    hemBorder.rotation.x = Math.PI / 2;
    hemBorder.position.y = 0.085;
    root.add(hemBorder);
  } else {
    // Dual tapered legs / kilt combo
    const legGeo = track(new THREE.CylinderGeometry(0.068, 0.056, 0.76, 14));
    const leftLeg = new THREE.Mesh(legGeo, secondaryMat);
    leftLeg.position.set(-0.095, 0.44, 0);
    const rightLeg = new THREE.Mesh(legGeo, secondaryMat);
    rightLeg.position.set(0.095, 0.44, 0);
    root.add(leftLeg, rightLeg);

    if (profile.garmentA === 'kilt-jacket') {
      const kiltPts = [
        new THREE.Vector2(0.24, 0.36),
        new THREE.Vector2(0.20, 0.62),
        new THREE.Vector2(0.175, 0.82),
      ];
      const kilt = new THREE.Mesh(track(new THREE.LatheGeometry(kiltPts, 22)), secondaryMat);
      const sporran = new THREE.Mesh(track(new THREE.BoxGeometry(0.11, 0.14, 0.045)), accentMat);
      sporran.position.set(0, 0.56, 0.21);
      root.add(kilt, sporran);
    }
  }

  // 3. Sculpted Upper Torso / Tunic / Blouse
  const torsoPts = isA
    ? [
        new THREE.Vector2(0.175, 0.76),
        new THREE.Vector2(0.195, 1.02),
        new THREE.Vector2(0.225, 1.24),
        new THREE.Vector2(0.16, 1.32),
        new THREE.Vector2(0.085, 1.35),
      ]
    : [
        new THREE.Vector2(0.16, 0.78),
        new THREE.Vector2(0.155, 0.98),
        new THREE.Vector2(0.195, 1.18),
        new THREE.Vector2(0.14, 1.27),
        new THREE.Vector2(0.075, 1.30),
      ];
  const torsoMesh = new THREE.Mesh(track(new THREE.LatheGeometry(torsoPts, 22)), primaryMat);
  root.add(torsoMesh);

  // 4. Poncho / Cape / Wide Jacket Overlay for distinct silhouettes
  if (isA && (profile.garmentA === 'poncho' || profile.garmentA === 'agbada')) {
    const capePts = [
      new THREE.Vector2(0.31, 0.78),
      new THREE.Vector2(0.27, 1.08),
      new THREE.Vector2(0.15, 1.32),
    ];
    const cape = new THREE.Mesh(track(new THREE.LatheGeometry(capePts, 20)), primaryMat);
    const capeTrim = new THREE.Mesh(track(new THREE.TorusGeometry(0.305, 0.016, 8, 24)), accentMat);
    capeTrim.rotation.x = Math.PI / 2;
    capeTrim.position.y = 0.8;
    root.add(cape, capeTrim);
  }

  // 5. Waist Sash / Obi / Ornamental Gold Belt
  const beltHeight = !isA && profile.garmentB === 'kimono-obi' ? 0.14 : 0.065;
  const belt = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.178, 0.185, beltHeight, 22)),
    !isA && profile.garmentB === 'kimono-obi' ? secondaryMat : accentMat
  );
  belt.position.y = isA ? 0.84 : 0.86;
  root.add(belt);

  // 6. Diagonal Cultural Drape (Osariya / Sari Pallu / Tartan Shawl / Sash)
  const hasShoulderDrape =
    (!isA &&
      (profile.garmentB === 'osariya-sari' ||
        profile.garmentB === 'sari-drape' ||
        profile.garmentB === 'tartan-shawl' ||
        profile.garmentB === 'kebaya-sash')) ||
    (isA && profile.garmentA === 'nilame-national');

  if (hasShoulderDrape) {
    const sashCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.15, 0.84, 0.16),
      new THREE.Vector3(0.02, 1.06, 0.19),
      new THREE.Vector3(0.14, 1.26, 0.08),
      new THREE.Vector3(0.13, 1.18, -0.15),
      new THREE.Vector3(0.06, 0.86, -0.18),
    ]);
    const sashGeo = track(new THREE.TubeGeometry(sashCurve, 22, 0.036, 8, false));
    const sashMesh = new THREE.Mesh(sashGeo, !isA ? secondaryMat : accentMat);
    root.add(sashMesh);
  }

  // 7. Decorative Collar / Lapel / Necklace
  const collar = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.095, 0.018, 8, 20)),
    accentMat
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = isA ? 1.32 : 1.27;
  root.add(collar);

  // 8. Articulated Sleeves + Hands
  const shoulderY = isA ? 1.24 : 1.19;
  const armSpread = isA ? 0.255 : 0.22;
  const sleeveRadius = !isA && profile.garmentB === 'kimono-obi' ? 0.072 : 0.055;
  const armGeo = track(new THREE.CapsuleGeometry(sleeveRadius, 0.34, 6, 12));
  const handGeo = track(new THREE.SphereGeometry(0.044, 10, 10));

  const leftArm = new THREE.Mesh(armGeo, primaryMat);
  leftArm.position.set(-armSpread, shoulderY - 0.19, 0.02);
  leftArm.rotation.z = 0.16;

  const rightArm = new THREE.Mesh(armGeo, primaryMat);
  rightArm.position.set(armSpread, shoulderY - 0.19, 0.02);
  rightArm.rotation.z = -0.16;

  const leftHand = new THREE.Mesh(handGeo, skinMat);
  leftHand.position.set(-armSpread - 0.035, shoulderY - 0.41, 0.03);
  const rightHand = new THREE.Mesh(handGeo, skinMat);
  rightHand.position.set(armSpread + 0.035, shoulderY - 0.41, 0.03);

  root.add(leftArm, rightArm, leftHand, rightHand);

  // 9. Neck & Sculpted Head
  const headY = isA ? 1.50 : 1.44;
  const neck = new THREE.Mesh(track(new THREE.CylinderGeometry(0.056, 0.068, 0.11, 12)), skinMat);
  neck.position.y = headY - 0.14;

  const head = new THREE.Mesh(track(new THREE.SphereGeometry(0.148, 22, 18)), skinMat);
  head.position.y = headY;
  head.scale.set(0.95, 1.04, 0.96);
  root.add(neck, head);

  // 10. Stylized Hair Cap + Traditional Bun (for Character B)
  const hairCap = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.154, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.58)),
    hairMat
  );
  hairCap.position.set(0, headY + 0.015, -0.01);
  hairCap.rotation.x = -0.22;
  root.add(hairCap);

  if (!isA) {
    const bun = new THREE.Mesh(track(new THREE.SphereGeometry(0.072, 14, 12)), hairMat);
    bun.position.set(0, headY - 0.01, -0.155);
    const bunPin = new THREE.Mesh(track(new THREE.TorusGeometry(0.074, 0.01, 6, 16)), accentMat);
    bunPin.position.set(0, headY - 0.01, -0.15);
    root.add(bun, bunPin);
  }

  // 11. Cultural Headgear / Accessories
  const headgear = buildHeadgear(
    isA ? profile.headgearA : profile.headgearB,
    isA ? profile.secondaryA : profile.primaryB,
    isA ? profile.accentA : profile.accentB,
    disposables
  );
  if (headgear) {
    headgear.position.y = headY;
    root.add(headgear);
  }

  return root;
}

export const CharacterTurntableStage: React.FC<CharacterTurntableStageProps> = ({ country }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const profile = useMemo(() => getCulturalProfile(country), [country]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { supported, isSoftwareGl } = detectWebGLSupport();
    if (!supported) {
      setWebglUnavailable(true);
      return;
    }

    let disposed = false;
    let frameId = 0;
    const disposables: Array<THREE.BufferGeometry | THREE.Material> = [];
    const track = <T extends THREE.BufferGeometry | THREE.Material>(item: T): T => {
      disposables.push(item);
      return item;
    };

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050a18, 0.14);

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 260;

    // Static showcase camera framing both characters on the glowing neon turntable
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 40);
    camera.position.set(0, 1.55, 3.65);
    camera.lookAt(0, 0.88, 0);

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
    // Strict non-interactive lock: zero manual drag, touch, pan, or zoom
    renderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.style.userSelect = 'none';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // Studio 3-point lighting rig (Warm Key + Cool Sky Fill + Neon Cyan Rim)
    const hemiLight = new THREE.HemisphereLight(0xcbe8ff, 0x0b1224, 1.0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e4, 2.2);
    keyLight.position.set(2.4, 3.8, 3.2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x22d3ee, 1.45);
    rimLight.position.set(-2.6, 2.2, -2.5);
    scene.add(rimLight);

    const neonAccentLight = new THREE.PointLight(
      new THREE.Color(profile.neonPedestalHex),
      1.6,
      5.5
    );
    neonAccentLight.position.set(0, 0.28, 0.6);
    scene.add(neonAccentLight);

    // Auto-Rotating Turntable Group (strictly auto-rotate 360°, zero OrbitControls)
    const turntableGroup = new THREE.Group();
    scene.add(turntableGroup);

    const neonColor = new THREE.Color(profile.neonPedestalHex);

    // Multi-tiered Neon Turntable Plinth
    const deckTopMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x0b152a,
        roughness: 0.24,
        metalness: 0.72,
      })
    );
    const deckBaseMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x060b18,
        roughness: 0.45,
        metalness: 0.55,
      })
    );
    const neonRingMat = track(
      new THREE.MeshStandardMaterial({
        color: neonColor,
        emissive: neonColor,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        metalness: 0.3,
      })
    );
    const cyanRingMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 1.35,
        roughness: 0.2,
        metalness: 0.3,
      })
    );

    const upperDeck = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.06, 1.12, 0.1, 48)),
      deckTopMat
    );
    upperDeck.position.y = -0.05;

    const lowerBase = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.22, 1.3, 0.14, 48)),
      deckBaseMat
    );
    lowerBase.position.y = -0.17;

    const topNeonRim = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.07, 0.018, 12, 64)),
      cyanRingMat
    );
    topNeonRim.rotation.x = Math.PI / 2;
    topNeonRim.position.y = -0.004;

    const lowerNeonRim = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.24, 0.015, 10, 64)),
      neonRingMat
    );
    lowerNeonRim.rotation.x = Math.PI / 2;
    lowerNeonRim.position.y = -0.12;

    // Subtle holographic radial tick ring on turntable floor
    const floorRing = new THREE.Mesh(
      track(new THREE.RingGeometry(0.84, 0.875, 48)),
      track(
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        })
      )
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.004;

    // Soft contact shadow discs directly under each character's feet
    const shadowMat = track(
      new THREE.MeshBasicMaterial({
        color: 0x020617,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      })
    );
    const shadowGeo = track(new THREE.CircleGeometry(0.29, 24));
    shadowGeo.rotateX(-Math.PI / 2);

    const shadowLeft = new THREE.Mesh(shadowGeo, shadowMat);
    shadowLeft.position.set(-0.42, 0.003, 0);
    const shadowRight = new THREE.Mesh(shadowGeo, shadowMat);
    shadowRight.position.set(0.42, 0.003, 0);

    turntableGroup.add(
      upperDeck,
      lowerBase,
      topNeonRim,
      lowerNeonRim,
      floorRing,
      shadowLeft,
      shadowRight
    );

    // Side-by-side Dual Cultural Characters standing on the turntable
    const charA = buildCulturalCharacter('A', profile, disposables);
    charA.position.set(-0.42, 0, 0);
    charA.rotation.y = 0.14;

    const charB = buildCulturalCharacter('B', profile, disposables);
    charB.position.set(0.42, 0, 0);
    charB.rotation.y = -0.14;

    turntableGroup.add(charA, charB);

    // Floating Outer Holographic Orbit Ring (counter-rotates subtly around the turntable)
    const outerHoloRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.42, 0.008, 8, 72)),
      track(
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        })
      )
    );
    outerHoloRing.rotation.x = Math.PI / 2 + 0.08;
    outerHoloRing.position.y = 0.06;
    scene.add(outerHoloRing);

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

      // Smooth continuous 360-degree automatic rotation (locked, non-interactive)
      turntableGroup.rotation.y += dt * 0.62;
      outerHoloRing.rotation.z -= dt * 0.28;

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
      disposables.forEach((d) => d.dispose());
      envTarget.dispose();
      renderer.dispose();
    };
  }, [profile]);

  if (webglUnavailable) {
    // Graceful non-interactive CSS/SVG fallback if WebGL is unavailable
    return (
      <div className="pointer-events-none relative flex h-[230px] w-full select-none items-center justify-center overflow-hidden bg-[#050a18] sm:h-[260px]">
        <div
          aria-hidden="true"
          className="absolute bottom-5 h-10 w-56 rounded-full border border-sky-400/50 bg-sky-500/15 shadow-[0_0_32px_rgba(56,189,248,0.35)]"
        />
        <svg viewBox="0 0 220 150" className="relative z-10 h-44 w-64" aria-hidden="true">
          {/* Stylized Character A */}
          <g transform="translate(70, 22)">
            <circle cx="0" cy="18" r="13" fill={profile.skinToneA} />
            <path d="M-16 36 Q0 30 16 36 L20 105 L-20 105 Z" fill={profile.primaryA} />
            <rect x="-17" y="62" width="34" height="7" rx="3" fill={profile.accentA} />
          </g>
          {/* Stylized Character B */}
          <g transform="translate(150, 26)">
            <circle cx="0" cy="18" r="12.5" fill={profile.skinToneB} />
            <path d="M-14 35 Q0 29 14 35 L24 102 L-24 102 Z" fill={profile.primaryB} />
            <line x1="-14" y1="68" x2="12" y2="35" stroke={profile.secondaryB} strokeWidth="6" />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none relative h-[230px] w-full select-none overflow-hidden bg-[#050a18] sm:h-[265px]"
      aria-label={`Auto-rotating 3D cultural showcase for ${country.name}: ${profile.attireSummary}`}
    >
      {/* Subtle Radial Studio Neon Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 68% 60% at 50% 62%, rgba(14, 165, 233, 0.2), rgba(5, 10, 24, 0.96) 72%)',
        }}
      />
      <div ref={mountRef} className="pointer-events-none relative z-10 h-full w-full select-none" />
    </div>
  );
};
