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

interface AnimatedCharacterRig {
  root: THREE.Group;
  upperBody: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  phaseOffset: number;
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
      roughness: 0.22,
      metalness: 0.85,
      emissive: new THREE.Color(accentHex),
      emissiveIntensity: 0.16,
    })
  );

  if (style === 'turban') {
    const wrap1 = new THREE.Mesh(track(new THREE.TorusGeometry(0.118, 0.042, 12, 24)), fabricMat);
    wrap1.rotation.x = Math.PI / 2;
    wrap1.position.y = 0.075;
    const wrap2 = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.122, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58)),
      fabricMat
    );
    wrap2.position.y = 0.055;
    const jewel = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.025, 0)), goldMat);
    jewel.position.set(0, 0.098, 0.138);
    group.add(wrap1, wrap2, jewel);
  } else if (style === 'ghutra') {
    const whiteCloth = track(
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85, metalness: 0.04 })
    );
    const agalMat = track(
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.36, metalness: 0.2 })
    );
    const cap = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.132, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56)),
      whiteCloth
    );
    cap.position.y = 0.025;
    const drape = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.13, 0.175, 0.24, 18, 1, true, Math.PI * 0.26, Math.PI * 1.48)),
      whiteCloth
    );
    drape.position.set(0, -0.075, -0.015);
    const agal = new THREE.Mesh(track(new THREE.TorusGeometry(0.126, 0.018, 10, 24)), agalMat);
    agal.rotation.x = Math.PI / 2;
    agal.position.y = 0.095;
    group.add(cap, drape, agal);
  } else if (style === 'beret') {
    const beret = new THREE.Mesh(track(new THREE.CylinderGeometry(0.145, 0.112, 0.055, 20)), fabricMat);
    beret.position.set(0.018, 0.105, 0);
    beret.rotation.z = -0.22;
    const stem = new THREE.Mesh(track(new THREE.CylinderGeometry(0.01, 0.012, 0.03, 8)), fabricMat);
    stem.position.set(0.035, 0.142, 0);
    group.add(beret, stem);
  } else if (style === 'sombrero') {
    const brim = new THREE.Mesh(track(new THREE.CylinderGeometry(0.27, 0.29, 0.022, 24)), fabricMat);
    brim.position.y = 0.09;
    const trim = new THREE.Mesh(track(new THREE.TorusGeometry(0.28, 0.01, 8, 28)), goldMat);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 0.09;
    const crown = new THREE.Mesh(track(new THREE.CylinderGeometry(0.095, 0.13, 0.145, 18)), fabricMat);
    crown.position.y = 0.16;
    const band = new THREE.Mesh(track(new THREE.TorusGeometry(0.122, 0.012, 8, 20)), goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.11;
    group.add(brim, trim, crown, band);
  } else if (style === 'kufi' || style === 'songkok') {
    const h = style === 'songkok' ? 0.105 : 0.082;
    const cap = new THREE.Mesh(track(new THREE.CylinderGeometry(0.118, 0.124, h, 20)), fabricMat);
    cap.position.y = 0.095;
    const band = new THREE.Mesh(track(new THREE.TorusGeometry(0.122, 0.01, 8, 24)), goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.068;
    group.add(cap, band);
  } else if (style === 'gat' || style === 'bowler') {
    const darkMat = track(
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.18 })
    );
    const brimR = style === 'gat' ? 0.24 : 0.175;
    const brim = new THREE.Mesh(track(new THREE.CylinderGeometry(brimR, brimR, 0.015, 24)), darkMat);
    brim.position.y = 0.09;
    const crown = new THREE.Mesh(
      track(
        style === 'gat'
          ? new THREE.CylinderGeometry(0.095, 0.105, 0.125, 18)
          : new THREE.SphereGeometry(0.122, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58)
      ),
      darkMat
    );
    crown.position.y = style === 'gat' ? 0.155 : 0.095;
    const ribbon = new THREE.Mesh(track(new THREE.TorusGeometry(0.11, 0.01, 8, 20)), goldMat);
    ribbon.rotation.x = Math.PI / 2;
    ribbon.position.y = 0.105;
    group.add(brim, crown, ribbon);
  } else if (style === 'highland-cap' || style === 'andean-cap') {
    const cap = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.128, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56)),
      fabricMat
    );
    cap.position.y = 0.048;
    const pom = new THREE.Mesh(track(new THREE.SphereGeometry(0.028, 10, 10)), goldMat);
    pom.position.y = 0.18;
    const band = new THREE.Mesh(track(new THREE.TorusGeometry(0.126, 0.014, 8, 20)), goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.062;
    group.add(cap, pom, band);
  } else if (style === 'crown-band') {
    // Elegant forehead ornament / Kanzashi / Nalalpatiya hairpin
    const band = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.122, 0.01, 8, 24, Math.PI * 1.15)),
      goldMat
    );
    band.rotation.x = Math.PI / 2;
    band.rotation.z = -Math.PI * 0.08;
    band.position.y = 0.075;
    const ornament = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.022, 0)), goldMat);
    ornament.position.set(0, 0.072, 0.128);
    // Side floral blossom accent for Kimono / Sari / Folk styles
    const sidePin = new THREE.Mesh(track(new THREE.SphereGeometry(0.028, 10, 10)), goldMat);
    sidePin.position.set(0.115, 0.068, -0.025);
    group.add(band, ornament, sidePin);
  }

  return group;
}

/**
 * Builds a richly structured, anatomically proportioned, articulated human character
 * (head + facial silhouette + ears + hair + neck + shoulders + sculpted torso + layered attire +
 * upper/lower arms + hands + thighs/calves + footwear), grounded flush at y = 0.
 */
function buildArticulatedHumanCharacter(
  variant: 'A' | 'B',
  profile: CulturalCharacterProfile,
  disposables: Array<THREE.BufferGeometry | THREE.Material>
): AnimatedCharacterRig {
  const root = new THREE.Group();
  const track = <T extends THREE.BufferGeometry | THREE.Material>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const isA = variant === 'A';
  const skinColor = new THREE.Color(isA ? profile.skinToneA : profile.skinToneB);
  const lipColor = skinColor.clone().lerp(new THREE.Color('#8f3b3b'), 0.42);

  const skinMat = track(
    new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.54,
      metalness: 0.03,
    })
  );
  const lipMat = track(
    new THREE.MeshStandardMaterial({
      color: lipColor,
      roughness: 0.45,
      metalness: 0.05,
    })
  );
  const eyeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0b1120,
      roughness: 0.12,
      metalness: 0.25,
    })
  );
  const eyeGlintMat = track(
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  const hairMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(isA ? profile.hairColorA : profile.hairColorB),
      roughness: 0.66,
      metalness: 0.1,
    })
  );
  const primaryMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(isA ? profile.primaryA : profile.primaryB),
      roughness: 0.78,
      metalness: 0.08,
    })
  );
  const secondaryMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(isA ? profile.secondaryA : profile.secondaryB),
      roughness: 0.7,
      metalness: 0.12,
    })
  );
  const innerWhiteMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.82,
      metalness: 0.04,
    })
  );
  const accentMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(isA ? profile.accentA : profile.accentB),
      roughness: 0.24,
      metalness: 0.86,
      emissive: new THREE.Color(isA ? profile.accentA : profile.accentB),
      emissiveIntensity: 0.16,
    })
  );
  const shoeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.34,
      metalness: 0.3,
    })
  );

  // =========================================================================
  // 1. FOOTWEAR & ARTICULATED LOWER BODY (grounded flush at y = 0)
  // =========================================================================
  const stanceX = isA ? 0.095 : 0.075;
  const isJapanStyle = profile.garmentA === 'haori-hakama' || profile.garmentB === 'kimono-obi';

  // Sculpted shoes / Zori sandals
  const buildShoe = (sideSign: number) => {
    const shoeGroup = new THREE.Group();
    if (isJapanStyle) {
      // Japanese Tabi socks + Zori sandal platform
      const sole = new THREE.Mesh(track(new THREE.BoxGeometry(0.082, 0.028, 0.17)), shoeMat);
      sole.position.set(0, 0.014, 0.02);
      const tabi = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.036, 0.07, 6, 10)), innerWhiteMat);
      tabi.rotation.x = Math.PI / 2;
      tabi.position.set(0, 0.044, 0.022);
      const strap = new THREE.Mesh(track(new THREE.TorusGeometry(0.038, 0.008, 6, 14, Math.PI)), accentMat);
      strap.position.set(0, 0.035, 0.045);
      shoeGroup.add(sole, tabi, strap);
    } else {
      const sole = new THREE.Mesh(track(new THREE.BoxGeometry(0.082, 0.022, 0.18)), shoeMat);
      sole.position.set(0, 0.011, 0.025);
      const upper = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.039, 0.085, 6, 12)), shoeMat);
      upper.rotation.x = Math.PI / 2;
      upper.position.set(0, 0.042, 0.025);
      const heel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.035, 0.038, 0.045, 10)), shoeMat);
      heel.position.set(0, 0.03, -0.045);
      shoeGroup.add(sole, upper, heel);
    }
    shoeGroup.position.set(sideSign * stanceX, 0, 0);
    shoeGroup.rotation.y = sideSign * 0.09;
    return shoeGroup;
  };
  root.add(buildShoe(-1), buildShoe(1));

  // Articulated Legs (Thigh -> Knee -> Calf -> Ankle) underneath or visible depending on attire
  const buildLeg = (sideSign: number, mat: THREE.Material) => {
    const legGroup = new THREE.Group();
    const calf = new THREE.Mesh(track(new THREE.CylinderGeometry(0.056, 0.04, 0.37, 14)), mat);
    calf.position.y = 0.24;
    const knee = new THREE.Mesh(track(new THREE.SphereGeometry(0.056, 12, 10)), mat);
    knee.position.y = 0.43;
    const thigh = new THREE.Mesh(track(new THREE.CylinderGeometry(0.074, 0.056, 0.37, 14)), mat);
    thigh.position.y = 0.62;
    legGroup.add(calf, knee, thigh);
    legGroup.position.x = sideSign * stanceX;
    return legGroup;
  };

  const usesLongGarment =
    !isA ||
    profile.garmentA === 'thobe' ||
    profile.garmentA === 'agbada' ||
    profile.garmentA === 'nilame-national' ||
    profile.garmentA === 'haori-hakama';

  if (usesLongGarment) {
    // Still render subtle lower ankles/calves near hem so underside looks grounded
    root.add(buildLeg(-1, skinMat), buildLeg(1, skinMat));

    const isWideSkirt =
      !isA && (profile.garmentB === 'hanbok-chima' || profile.garmentB === 'folk-skirt');
    const isHakama = isA && profile.garmentA === 'haori-hakama';
    const hemR = isWideSkirt ? 0.31 : isHakama ? 0.23 : !isA ? 0.215 : 0.195;

    const robePts = [
      new THREE.Vector2(hemR, 0.065),
      new THREE.Vector2(hemR * 0.91, 0.34),
      new THREE.Vector2(isA ? 0.175 : 0.168, 0.68),
      new THREE.Vector2(isA ? 0.155 : 0.135, 0.85),
    ];
    const robeMat =
      isA && (profile.garmentA === 'nilame-national' || profile.garmentA === 'haori-hakama')
        ? secondaryMat
        : primaryMat;
    const robeMesh = new THREE.Mesh(track(new THREE.LatheGeometry(robePts, 28)), robeMat);
    root.add(robeMesh);

    // Pleat ridges for Hakama / Sari / Folk Skirt silhouette richness
    if (isHakama || !isA) {
      const pleatCount = isHakama ? 6 : 5;
      for (let i = 0; i < pleatCount; i++) {
        const angle = -0.55 + (i / (pleatCount - 1)) * 1.1;
        const pleat = new THREE.Mesh(
          track(new THREE.BoxGeometry(0.016, 0.72, 0.025)),
          isHakama ? secondaryMat : primaryMat
        );
        pleat.position.set(
          Math.sin(angle) * (hemR * 0.8),
          0.44,
          Math.cos(angle) * (hemR * 0.8)
        );
        pleat.rotation.y = angle;
        pleat.rotation.x = -0.06;
        root.add(pleat);
      }
    }

    // Metallic woven lower border trim
    const hemTrim = new THREE.Mesh(
      track(new THREE.TorusGeometry(hemR * 0.99, 0.013, 8, 32)),
      accentMat
    );
    hemTrim.rotation.x = Math.PI / 2;
    hemTrim.position.y = 0.082;
    root.add(hemTrim);
  } else {
    const legMat = profile.garmentA === 'kilt-jacket' ? skinMat : secondaryMat;
    root.add(buildLeg(-1, legMat), buildLeg(1, legMat));

    // Pelvis / hip connector
    const hips = new THREE.Mesh(track(new THREE.CylinderGeometry(0.155, 0.162, 0.18, 20)), secondaryMat);
    hips.position.y = 0.82;
    root.add(hips);

    if (profile.garmentA === 'kilt-jacket') {
      const kiltPts = [
        new THREE.Vector2(0.22, 0.4),
        new THREE.Vector2(0.19, 0.64),
        new THREE.Vector2(0.16, 0.84),
      ];
      const kilt = new THREE.Mesh(track(new THREE.LatheGeometry(kiltPts, 24)), secondaryMat);
      const sporran = new THREE.Mesh(track(new THREE.BoxGeometry(0.095, 0.125, 0.042)), accentMat);
      sporran.position.set(0, 0.61, 0.195);
      // Highland knee socks
      const sockGeo = track(new THREE.CylinderGeometry(0.052, 0.042, 0.24, 12));
      const sockL = new THREE.Mesh(sockGeo, innerWhiteMat);
      sockL.position.set(-stanceX, 0.19, 0);
      const sockR = new THREE.Mesh(sockGeo, innerWhiteMat);
      sockR.position.set(stanceX, 0.19, 0);
      root.add(kilt, sporran, sockL, sockR);
    }
  }

  // =========================================================================
  // 2. UPPER BODY GROUP (animated with subtle breathing & poised sway)
  // =========================================================================
  const upperBody = new THREE.Group();
  upperBody.position.y = 0.84;
  root.add(upperBody);

  // Sculpted Anatomical Torso (Waist -> Ribcage -> Chest -> Shoulders)
  const torsoPts = isA
    ? [
        new THREE.Vector2(0.15, 0.0),
        new THREE.Vector2(0.158, 0.12),
        new THREE.Vector2(0.188, 0.29),
        new THREE.Vector2(0.205, 0.42),
        new THREE.Vector2(0.145, 0.49),
        new THREE.Vector2(0.068, 0.52),
      ]
    : [
        new THREE.Vector2(0.132, 0.0),
        new THREE.Vector2(0.122, 0.12),
        new THREE.Vector2(0.162, 0.27),
        new THREE.Vector2(0.168, 0.37),
        new THREE.Vector2(0.125, 0.44),
        new THREE.Vector2(0.06, 0.47),
      ];
  const torsoMesh = new THREE.Mesh(track(new THREE.LatheGeometry(torsoPts, 24)), primaryMat);
  torsoMesh.scale.set(1.06, 1, 0.84); // Natural human chest width vs depth ratio
  upperBody.add(torsoMesh);

  // Layered Outer Garments & Cultural Details
  if (isA && profile.garmentA === 'haori-hakama') {
    // Japanese Indigo Haori open-front panels + white Eri under-collar + Haori-himo tie
    const panelGeo = track(new THREE.BoxGeometry(0.115, 0.54, 0.045));
    const leftPanel = new THREE.Mesh(panelGeo, primaryMat);
    leftPanel.position.set(-0.11, 0.22, 0.155);
    leftPanel.rotation.y = 0.22;
    const rightPanel = new THREE.Mesh(panelGeo, primaryMat);
    rightPanel.position.set(0.11, 0.22, 0.155);
    rightPanel.rotation.y = -0.22;

    const eriVLeft = new THREE.Mesh(track(new THREE.BoxGeometry(0.032, 0.2, 0.025)), innerWhiteMat);
    eriVLeft.position.set(-0.038, 0.41, 0.142);
    eriVLeft.rotation.z = -0.28;
    const eriVRight = new THREE.Mesh(track(new THREE.BoxGeometry(0.032, 0.2, 0.025)), innerWhiteMat);
    eriVRight.position.set(0.038, 0.41, 0.142);
    eriVRight.rotation.z = 0.28;

    const himoCord = new THREE.Mesh(track(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8)), accentMat);
    himoCord.rotation.z = Math.PI / 2;
    himoCord.position.set(0, 0.27, 0.178);
    upperBody.add(leftPanel, rightPanel, eriVLeft, eriVRight, himoCord);
  } else if (!isA && profile.garmentB === 'kimono-obi') {
    // Japanese Sakura Kimono crossover white collar + tall sculpted Obi + Back Taiko Bow Knot
    const eriL = new THREE.Mesh(track(new THREE.BoxGeometry(0.034, 0.21, 0.024)), innerWhiteMat);
    eriL.position.set(-0.034, 0.37, 0.125);
    eriL.rotation.z = -0.3;
    const eriR = new THREE.Mesh(track(new THREE.BoxGeometry(0.034, 0.21, 0.024)), innerWhiteMat);
    eriR.position.set(0.034, 0.37, 0.125);
    eriR.rotation.z = 0.3;

    const obiBelt = new THREE.Mesh(track(new THREE.CylinderGeometry(0.154, 0.162, 0.165, 24)), secondaryMat);
    obiBelt.scale.set(1.06, 1, 0.88);
    obiBelt.position.y = 0.095;

    const obijime = new THREE.Mesh(track(new THREE.TorusGeometry(0.158, 0.01, 8, 28)), accentMat);
    obijime.rotation.x = Math.PI / 2;
    obijime.scale.set(1.06, 0.88, 1);
    obijime.position.y = 0.095;

    // Structured Taiko Obi Bow on the back (visible during 360° auto-rotation!)
    const taikoBow = new THREE.Mesh(track(new THREE.BoxGeometry(0.19, 0.19, 0.075)), secondaryMat);
    taikoBow.position.set(0, 0.12, -0.17);
    const taikoTrim = new THREE.Mesh(track(new THREE.BoxGeometry(0.202, 0.026, 0.082)), accentMat);
    taikoTrim.position.set(0, 0.12, -0.172);
    upperBody.add(eriL, eriR, obiBelt, obijime, taikoBow, taikoTrim);
  } else {
    // General tailored waist belt / sash
    const belt = new THREE.Mesh(track(new THREE.CylinderGeometry(0.152, 0.16, 0.058, 22)), accentMat);
    belt.scale.set(1.06, 1, 0.86);
    belt.position.y = 0.02;
    upperBody.add(belt);

    // Poncho / Agbada flowing shoulder cape
    if (isA && (profile.garmentA === 'poncho' || profile.garmentA === 'agbada')) {
      const capePts = [
        new THREE.Vector2(0.29, -0.02),
        new THREE.Vector2(0.25, 0.24),
        new THREE.Vector2(0.14, 0.48),
      ];
      const cape = new THREE.Mesh(track(new THREE.LatheGeometry(capePts, 22)), primaryMat);
      const capeTrim = new THREE.Mesh(track(new THREE.TorusGeometry(0.285, 0.014, 8, 26)), accentMat);
      capeTrim.rotation.x = Math.PI / 2;
      capeTrim.position.y = 0.0;
      upperBody.add(cape, capeTrim);
    }

    // Tailored Jacket Lapels & Center Button Placket for Coats / Sherwani / Nilame
    if (
      isA &&
      (profile.garmentA === 'tailored-coat' ||
        profile.garmentA === 'sherwani' ||
        profile.garmentA === 'nilame-national' ||
        profile.garmentA === 'charro-jacket' ||
        profile.garmentA === 'tangzhuang')
    ) {
      const placket = new THREE.Mesh(track(new THREE.BoxGeometry(0.026, 0.42, 0.025)), accentMat);
      placket.position.set(0, 0.25, 0.165);
      upperBody.add(placket);
    }
  }

  // Diagonal Cultural Shoulder Drape (Osariya / Sari Pallu / Tartan Shawl / Nilame Sash)
  const hasShoulderDrape =
    (!isA &&
      (profile.garmentB === 'osariya-sari' ||
        profile.garmentB === 'sari-drape' ||
        profile.garmentB === 'tartan-shawl' ||
        profile.garmentB === 'kebaya-sash')) ||
    (isA && profile.garmentA === 'nilame-national');

  if (hasShoulderDrape) {
    const sashCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.145, 0.02, 0.145),
      new THREE.Vector3(0.01, 0.22, 0.165),
      new THREE.Vector3(0.125, 0.41, 0.065),
      new THREE.Vector3(0.115, 0.34, -0.135),
      new THREE.Vector3(0.05, 0.02, -0.155),
    ]);
    const sashGeo = track(new THREE.TubeGeometry(sashCurve, 24, 0.032, 8, false));
    const sashMesh = new THREE.Mesh(sashGeo, !isA ? secondaryMat : accentMat);
    upperBody.add(sashMesh);
  }

  // Collar / Ornamental Necklace
  const collarY = isA ? 0.485 : 0.445;
  const collar = new THREE.Mesh(track(new THREE.TorusGeometry(0.082, 0.015, 8, 22)), accentMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = collarY;
  upperBody.add(collar);

  // =========================================================================
  // 3. ARTICULATED SHOULDERS, UPPER ARMS, ELBOWS, FOREARMS & HANDS
  // =========================================================================
  const shoulderY = isA ? 0.425 : 0.385;
  const shoulderX = isA ? 0.225 : 0.185;
  const isWideSleeve =
    (!isA && profile.garmentB === 'kimono-obi') ||
    (isA && profile.garmentA === 'haori-hakama') ||
    (!isA && profile.garmentB === 'hanbok-chima');

  const buildArticulatedArm = (sideSign: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(sideSign * shoulderX, shoulderY, 0);

    // Shoulder Deltoid Cap
    const deltoid = new THREE.Mesh(
      track(new THREE.SphereGeometry(isA ? 0.062 : 0.052, 14, 12)),
      primaryMat
    );
    armPivot.add(deltoid);

    // Upper Arm
    const upperArmR = isWideSleeve ? 0.066 : isA ? 0.048 : 0.04;
    const upperArm = new THREE.Mesh(
      track(new THREE.CylinderGeometry(upperArmR * 0.92, upperArmR, 0.22, 12)),
      primaryMat
    );
    upperArm.position.y = -0.11;
    armPivot.add(upperArm);

    // Flowing Kimono / Haori Hanging Sleeve Panel
    if (isWideSleeve) {
      const sleeveDrape = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.045, 0.3, 0.145)),
        primaryMat
      );
      sleeveDrape.position.set(sideSign * 0.015, -0.22, -0.025);
      const sleeveCuffTrim = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.048, 0.022, 0.15)),
        accentMat
      );
      sleeveCuffTrim.position.set(sideSign * 0.015, -0.365, -0.025);
      armPivot.add(sleeveDrape, sleeveCuffTrim);
    }

    // Elbow Joint + Forearm Group (gentle natural inward/forward bend)
    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -0.22, 0);
    forearmGroup.rotation.x = isA ? -0.18 : -0.32;
    forearmGroup.rotation.z = sideSign * (isA ? -0.06 : -0.14);

    const elbow = new THREE.Mesh(
      track(new THREE.SphereGeometry(isA ? 0.044 : 0.036, 10, 10)),
      isWideSleeve ? primaryMat : primaryMat
    );
    const forearmMat = !isA && (profile.garmentB === 'osariya-sari' || profile.garmentB === 'sari-drape')
      ? skinMat
      : primaryMat;
    const forearm = new THREE.Mesh(
      track(new THREE.CylinderGeometry(isA ? 0.042 : 0.034, isA ? 0.033 : 0.027, 0.21, 12)),
      forearmMat
    );
    forearm.position.y = -0.105;

    // Gold cuff / bangle at wrist
    const wristBangle = new THREE.Mesh(
      track(new THREE.TorusGeometry(isA ? 0.035 : 0.029, 0.007, 6, 16)),
      accentMat
    );
    wristBangle.rotation.x = Math.PI / 2;
    wristBangle.position.y = -0.205;

    // Sculpted Palm + Thumb
    const palm = new THREE.Mesh(
      track(new THREE.BoxGeometry(isA ? 0.046 : 0.038, 0.072, 0.026)),
      skinMat
    );
    palm.position.set(0, -0.245, 0.005);
    const thumb = new THREE.Mesh(
      track(new THREE.CapsuleGeometry(0.01, 0.026, 4, 8)),
      skinMat
    );
    thumb.position.set(-sideSign * 0.026, -0.232, 0.018);
    thumb.rotation.z = sideSign * 0.48;

    forearmGroup.add(elbow, forearm, wristBangle, palm, thumb);
    armPivot.add(forearmGroup);

    // Relaxed natural posture angle
    armPivot.rotation.z = sideSign * (isA ? 0.14 : 0.16);
    armPivot.rotation.x = 0.06;

    return armPivot;
  };

  const leftArmPivot = buildArticulatedArm(-1);
  const rightArmPivot = buildArticulatedArm(1);
  upperBody.add(leftArmPivot, rightArmPivot);

  // =========================================================================
  // 4. NECK, SCULPTED HEAD, FACIAL SILHOUETTE, HAIR & HEADGEAR
  // =========================================================================
  const neckY = isA ? 0.545 : 0.50;
  const neck = new THREE.Mesh(track(new THREE.CylinderGeometry(0.048, 0.058, 0.11, 14)), skinMat);
  neck.position.y = neckY;
  upperBody.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = neckY + 0.135;
  upperBody.add(headGroup);

  // Cranium + Sculpted Jawline / Chin
  const cranium = new THREE.Mesh(track(new THREE.SphereGeometry(0.118, 22, 18)), skinMat);
  cranium.scale.set(0.92, 1.04, 0.96);
  cranium.position.y = 0.015;

  const jaw = new THREE.Mesh(track(new THREE.SphereGeometry(0.088, 16, 14)), skinMat);
  jaw.scale.set(0.86, 0.82, 0.9);
  jaw.position.set(0, -0.05, 0.025);
  headGroup.add(cranium, jaw);

  // Ears
  const earGeo = track(new THREE.SphereGeometry(0.022, 10, 10));
  const leftEar = new THREE.Mesh(earGeo, skinMat);
  leftEar.scale.set(0.55, 1.15, 0.8);
  leftEar.position.set(-0.108, -0.005, -0.005);
  const rightEar = new THREE.Mesh(earGeo, skinMat);
  rightEar.scale.set(0.55, 1.15, 0.8);
  rightEar.position.set(0.108, -0.005, -0.005);
  headGroup.add(leftEar, rightEar);

  // Nose bridge + tip
  const nose = new THREE.Mesh(track(new THREE.ConeGeometry(0.015, 0.042, 8)), skinMat);
  nose.position.set(0, -0.012, 0.115);
  nose.rotation.x = Math.PI * 0.45;
  headGroup.add(nose);

  // Expressive Stylized Eyes + Glint + Eyebrows
  const eyeGeo = track(new THREE.SphereGeometry(0.013, 10, 10));
  const glintGeo = track(new THREE.SphereGeometry(0.004, 6, 6));
  const browGeo = track(new THREE.BoxGeometry(0.032, 0.006, 0.008));

  for (const sideSign of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sideSign * 0.04, 0.014, 0.102);
    const glint = new THREE.Mesh(glintGeo, eyeGlintMat);
    glint.position.set(sideSign * 0.044, 0.018, 0.113);
    const brow = new THREE.Mesh(browGeo, hairMat);
    brow.position.set(sideSign * 0.04, 0.036, 0.102);
    brow.rotation.z = -sideSign * 0.08;
    headGroup.add(eye, glint, brow);
  }

  // Subtle Lip Contour
  const lips = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.007, 0.026, 4, 8)), lipMat);
  lips.rotation.z = Math.PI / 2;
  lips.position.set(0, -0.052, 0.101);
  headGroup.add(lips);

  // Sculpted Layered Hair
  const hairCrown = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.125, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62)),
    hairMat
  );
  hairCrown.scale.set(0.95, 1.05, 1.0);
  hairCrown.position.set(0, 0.025, -0.012);
  hairCrown.rotation.x = -0.2;
  headGroup.add(hairCrown);

  if (isA) {
    // Swept front hair volume
    const frontWave = new THREE.Mesh(track(new THREE.BoxGeometry(0.15, 0.036, 0.065)), hairMat);
    frontWave.position.set(0, 0.105, 0.062);
    frontWave.rotation.x = 0.25;
    headGroup.add(frontWave);
  } else {
    // Soft side hair locks + traditional chignon bun with gold ornamental ring
    const sideLockGeo = track(new THREE.CapsuleGeometry(0.026, 0.11, 6, 10));
    const lockL = new THREE.Mesh(sideLockGeo, hairMat);
    lockL.position.set(-0.098, -0.025, 0.022);
    lockL.rotation.z = 0.12;
    const lockR = new THREE.Mesh(sideLockGeo, hairMat);
    lockR.position.set(0.098, -0.025, 0.022);
    lockR.rotation.z = -0.12;

    const bun = new THREE.Mesh(track(new THREE.SphereGeometry(0.062, 14, 12)), hairMat);
    bun.position.set(0, 0.005, -0.132);
    const bunRing = new THREE.Mesh(track(new THREE.TorusGeometry(0.064, 0.009, 6, 18)), accentMat);
    bunRing.position.set(0, 0.005, -0.125);
    headGroup.add(lockL, lockR, bun, bunRing);
  }

  // Cultural Headgear / Accessories
  const headgear = buildHeadgear(
    isA ? profile.headgearA : profile.headgearB,
    isA ? profile.secondaryA : profile.primaryB,
    isA ? profile.accentA : profile.accentB,
    disposables
  );
  if (headgear) {
    headGroup.add(headgear);
  }

  return {
    root,
    upperBody,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    phaseOffset: isA ? 0 : Math.PI * 0.65,
  };
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
    scene.fog = new THREE.FogExp2(0x050a18, 0.13);

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 275;

    // Locked studio showcase camera — ZERO OrbitControls or manual interaction
    const camera = new THREE.PerspectiveCamera(33, width / height, 0.1, 40);
    camera.position.set(0, 1.48, 3.68);
    camera.lookAt(0, 0.86, 0);

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
    renderer.toneMappingExposure = 1.2;
    const isMobileViewport =
      window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, isMobileViewport ? 1.5 : 2)
    );
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    // Strict Auto-Rotation Lock: completely disable mouse/touch/wheel interaction on canvas
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

    // Studio 3-Point + Neon Rim Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xd4ecff, 0x0b1224, 1.05);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e4, 2.25);
    keyLight.position.set(2.5, 4.0, 3.3);
    scene.add(keyLight);

    const cyanRimLight = new THREE.DirectionalLight(0x22d3ee, 1.65);
    cyanRimLight.position.set(-2.8, 2.4, -2.6);
    scene.add(cyanRimLight);

    const warmRimLight = new THREE.DirectionalLight(0xfbbf24, 0.9);
    warmRimLight.position.set(2.6, 1.8, -2.4);
    scene.add(warmRimLight);

    const neonAccentLight = new THREE.PointLight(
      new THREE.Color(profile.neonPedestalHex),
      1.75,
      5.5
    );
    neonAccentLight.position.set(0, 0.3, 0.65);
    scene.add(neonAccentLight);

    // Strictly Auto-Rotating 360° Turntable Stage
    const turntableGroup = new THREE.Group();
    scene.add(turntableGroup);

    const neonColor = new THREE.Color(profile.neonPedestalHex);

    const deckTopMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x0b152a,
        roughness: 0.22,
        metalness: 0.76,
      })
    );
    const deckBaseMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x060b18,
        roughness: 0.42,
        metalness: 0.58,
      })
    );
    const neonRingMat = track(
      new THREE.MeshStandardMaterial({
        color: neonColor,
        emissive: neonColor,
        emissiveIntensity: 1.55,
        roughness: 0.2,
        metalness: 0.3,
      })
    );
    const cyanRingMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 1.4,
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

    const floorRing = new THREE.Mesh(
      track(new THREE.RingGeometry(0.84, 0.875, 48)),
      track(
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.52,
          depthWrite: false,
        })
      )
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.004;

    const shadowMat = track(
      new THREE.MeshBasicMaterial({
        color: 0x020617,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      })
    );
    const shadowGeo = track(new THREE.CircleGeometry(0.28, 24));
    shadowGeo.rotateX(-Math.PI / 2);

    const shadowLeft = new THREE.Mesh(shadowGeo, shadowMat);
    shadowLeft.position.set(-0.43, 0.003, 0);
    const shadowRight = new THREE.Mesh(shadowGeo, shadowMat);
    shadowRight.position.set(0.43, 0.003, 0);

    turntableGroup.add(
      upperDeck,
      lowerBase,
      topNeonRim,
      lowerNeonRim,
      floorRing,
      shadowLeft,
      shadowRight
    );

    // Dual Articulated Human Characters Standing Side-by-Side
    const rigA = buildArticulatedHumanCharacter('A', profile, disposables);
    rigA.root.position.set(-0.43, 0, 0);
    rigA.root.rotation.y = 0.14;

    const rigB = buildArticulatedHumanCharacter('B', profile, disposables);
    rigB.root.position.set(0.43, 0, 0);
    rigB.root.rotation.y = -0.14;

    turntableGroup.add(rigA.root, rigB.root);

    // Outer Holographic Halo Ring
    const outerHoloRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.44, 0.008, 8, 72)),
      track(
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.36,
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
    let elapsed = 0;

    const applyIdleMotion = (rig: AnimatedCharacterRig, t: number, baseArmSign: number) => {
      const breath = Math.sin(t * 1.9 + rig.phaseOffset);
      const sway = Math.sin(t * 0.95 + rig.phaseOffset);
      rig.upperBody.position.y = 0.84 + breath * 0.008;
      rig.headGroup.rotation.y = sway * 0.055;
      rig.headGroup.rotation.x = breath * 0.025;
      rig.leftArmPivot.rotation.x = 0.06 + breath * 0.035;
      rig.rightArmPivot.rotation.x = 0.06 - breath * 0.035;
      rig.leftArmPivot.rotation.z = -baseArmSign * (0.15 + breath * 0.015);
      rig.rightArmPivot.rotation.z = baseArmSign * (0.15 + breath * 0.015);
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      elapsed += dt;

      // Smooth continuous 360-degree automatic turntable rotation (strictly non-interactive)
      turntableGroup.rotation.y += dt * 0.6;
      outerHoloRing.rotation.z -= dt * 0.28;

      // Subtle living idle breathing & head poise on both articulated characters
      applyIdleMotion(rigA, elapsed, 1);
      applyIdleMotion(rigB, elapsed, 1);

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
    return (
      <div className="pointer-events-none relative flex h-[240px] w-full select-none items-center justify-center overflow-hidden bg-[#050a18] sm:h-[275px]">
        <div
          aria-hidden="true"
          className="absolute bottom-5 h-10 w-60 rounded-full border border-sky-400/50 bg-sky-500/15 shadow-[0_0_32px_rgba(56,189,248,0.35)]"
        />
        <svg viewBox="0 0 240 160" className="relative z-10 h-48 w-68" aria-hidden="true">
          <g transform="translate(76, 20)">
            <circle cx="0" cy="18" r="13" fill={profile.skinToneA} />
            <path d="M-18 38 Q0 31 18 38 L22 112 L-22 112 Z" fill={profile.primaryA} />
            <rect x="-18" y="66" width="36" height="7" rx="3" fill={profile.accentA} />
          </g>
          <g transform="translate(164, 24)">
            <circle cx="0" cy="18" r="12.5" fill={profile.skinToneB} />
            <path d="M-16 36 Q0 30 16 36 L25 108 L-25 108 Z" fill={profile.primaryB} />
            <line x1="-15" y1="70" x2="12" y2="36" stroke={profile.secondaryB} strokeWidth="6" />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none relative h-[240px] w-full select-none overflow-hidden bg-[#050a18] sm:h-[275px]"
      aria-label={`Auto-rotating 3D articulated cultural showcase for ${country.name}: ${profile.attireSummary}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 68% 60% at 50% 62%, rgba(14, 165, 233, 0.22), rgba(5, 10, 24, 0.96) 72%)',
        }}
      />
      <div ref={mountRef} className="pointer-events-none relative z-10 h-full w-full select-none" />
    </div>
  );
};
