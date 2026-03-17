/**
 * Globe map visual enhancements — enhanced materials, glow effects, star fields,
 * satellite beams, render quality, and performance profiles.
 *
 * Extracted from GlobeMap.ts.
 */

import type { GlobeInstance } from 'globe.gl';
import type { SatellitePosition } from '@/services/satellites';
import { isDesktopRuntime } from '@/services/runtime';
import {
  getGlobeRenderScale, resolveGlobePixelRatio,
  type GlobeRenderScale, type GlobePerformanceProfile, type GlobeVisualPreset,
} from '@/services/globe-render-settings';
import type { GlobePath } from './globe-map-types';

// ─── Coordinate conversion ───────────────────────────────────────────────────

export function latLngAltToVec3(lat: number, lng: number, alt: number, vec3Ctor: any): any {
  const GLOBE_R = 100;
  const r = GLOBE_R * (1 + alt / 6371);
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (90 - lng) * (Math.PI / 180);
  const sinPhi = Math.sin(phi);
  return new vec3Ctor(
    r * sinPhi * Math.cos(theta),
    r * Math.cos(phi),
    r * sinPhi * Math.sin(theta),
  );
}

// ─── Satellite beams ─────────────────────────────────────────────────────────

export async function rebuildSatBeams(
  positions: SatellitePosition[],
  globe: GlobeInstance,
  destroyed: boolean,
  layerVisible: boolean,
  existingGroup: any,
): Promise<any> {
  if (!globe || destroyed) return null;
  const THREE = await import('three');
  const scene = globe.scene();

  if (existingGroup) {
    scene.remove(existingGroup);
    existingGroup.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
  const satBeamGroup = new THREE.Group();
  satBeamGroup.name = 'satBeams';

  if (!layerVisible || positions.length === 0) return satBeamGroup;

  const colorMap: Record<string, number> = {
    CN: 0xff2020, RU: 0xff8800, US: 0x4488ff, EU: 0x44cc44,
    KR: 0xaa66ff, IN: 0xff66aa, TR: 0xff4466, OTHER: 0xccccff,
  };

  const RAY_COUNT = 6;
  const GLOBE_R = 100;
  const BEAM_HEIGHT = 25;
  const GROUND_SPREAD_RAD = 4.0;

  const allRayPositions: number[] = [];
  const allRayColors: number[] = [];
  const allConePositions: number[] = [];
  const allConeColors: number[] = [];

  const tmpColor = new THREE.Color();

  for (const s of positions) {
    const groundCenter = latLngAltToVec3(s.lat, s.lng, 0, THREE.Vector3);
    const beamTop = new THREE.Vector3().copy(groundCenter).normalize().multiplyScalar(GLOBE_R + BEAM_HEIGHT);

    const hex = colorMap[s.country] ?? 0xccccff;
    tmpColor.setHex(hex);
    const r = tmpColor.r, g = tmpColor.g, b = tmpColor.b;

    const dir = new THREE.Vector3().copy(groundCenter).normalize().negate();
    const up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.dot(up)) > 0.99) up.set(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const forward = new THREE.Vector3().crossVectors(right, dir).normalize();

    const groundPts: InstanceType<typeof THREE.Vector3>[] = [];
    for (let i = 0; i < RAY_COUNT; i++) {
      const angle = (i / RAY_COUNT) * Math.PI * 2;
      const gp = new THREE.Vector3()
        .copy(groundCenter)
        .addScaledVector(right, Math.cos(angle) * GROUND_SPREAD_RAD)
        .addScaledVector(forward, Math.sin(angle) * GROUND_SPREAD_RAD)
        .normalize().multiplyScalar(GLOBE_R);
      groundPts.push(gp);
      allRayPositions.push(beamTop.x, beamTop.y, beamTop.z, gp.x, gp.y, gp.z);
      allRayColors.push(r, g, b, r * 0.3, g * 0.3, b * 0.3);
    }

    for (let i = 0; i < RAY_COUNT; i++) {
      const next = (i + 1) % RAY_COUNT;
      const gi = groundPts[i]!;
      const gn = groundPts[next]!;
      allConePositions.push(
        beamTop.x, beamTop.y, beamTop.z,
        gi.x, gi.y, gi.z,
        gn.x, gn.y, gn.z,
      );
      allConeColors.push(r, g, b, r * 0.2, g * 0.2, b * 0.2, r * 0.2, g * 0.2, b * 0.2);
    }
  }

  if (allRayPositions.length > 0) {
    const rayGeo = new THREE.BufferGeometry();
    rayGeo.setAttribute('position', new THREE.Float32BufferAttribute(allRayPositions, 3));
    rayGeo.setAttribute('color', new THREE.Float32BufferAttribute(allRayColors, 3));
    const rayMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false,
    });
    satBeamGroup.add(new THREE.LineSegments(rayGeo, rayMat));
  }

  if (allConePositions.length > 0) {
    const coneGeo = new THREE.BufferGeometry();
    coneGeo.setAttribute('position', new THREE.Float32BufferAttribute(allConePositions, 3));
    coneGeo.setAttribute('color', new THREE.Float32BufferAttribute(allConeColors, 3));
    const coneMat = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.1,
      side: THREE.DoubleSide, depthWrite: false,
    });
    satBeamGroup.add(new THREE.Mesh(coneGeo, coneMat));
  }

  satBeamGroup.visible = !!layerVisible;
  scene.add(satBeamGroup);
  return satBeamGroup;
}

// ─── Enhanced visuals (glow, stars, material upgrade) ────────────────────────

export interface EnhancedVisualRefs {
  outerGlow: any;
  innerGlow: any;
  starField: any;
  cyanLight: any;
  extrasAnimFrameId: number | null;
}

export async function applyEnhancedVisuals(
  globe: GlobeInstance,
  destroyed: boolean,
): Promise<EnhancedVisualRefs | null> {
  if (!globe || destroyed) return null;
  try {
    const THREE = await import('three');
    const scene = globe.scene();

    const oldMat = globe.globeMaterial();
    if (oldMat) {
      const stdMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.8, metalness: 0.1,
        emissive: new THREE.Color(0x0a1f2e), emissiveIntensity: 0.3,
      });
      if ((oldMat as any).map) stdMat.map = (oldMat as any).map;
      (globe as any).globeMaterial(stdMat);
    }

    const cyanLight = new THREE.PointLight(0x00d4ff, 0.3);
    cyanLight.position.set(-10, -10, -10);
    scene.add(cyanLight);

    const outerGeo = new THREE.SphereGeometry(2.15, 24, 24);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff, side: THREE.BackSide, transparent: true, opacity: 0.15,
    });
    const outerGlow = new THREE.Mesh(outerGeo, outerMat);
    scene.add(outerGlow);

    const innerGeo = new THREE.SphereGeometry(2.08, 24, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x00a8cc, side: THREE.BackSide, transparent: true, opacity: 0.1,
    });
    const innerGlow = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerGlow);

    const starCount = 600;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
      const brightness = 0.5 + Math.random() * 0.5;
      starColors[i * 3] = brightness;
      starColors[i * 3 + 1] = brightness;
      starColors[i * 3 + 2] = brightness;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    return { outerGlow, innerGlow, starField, cyanLight, extrasAnimFrameId: null };
  } catch { return null; }
}

export function removeEnhancedVisuals(
  globe: GlobeInstance | null,
  refs: EnhancedVisualRefs | null,
  savedDefaultMaterial: any,
): void {
  if (!globe || !refs) return;
  if (refs.extrasAnimFrameId != null) {
    cancelAnimationFrame(refs.extrasAnimFrameId);
    refs.extrasAnimFrameId = null;
  }
  const scene = globe.scene();
  for (const obj of [refs.outerGlow, refs.innerGlow, refs.starField, refs.cyanLight]) {
    if (!obj) continue;
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }
  const mat = globe.globeMaterial();
  if (mat && (mat as any).isMeshStandardMaterial) {
    const texMap = (mat as any).map;
    mat.dispose();
    if (savedDefaultMaterial) {
      if (texMap) (savedDefaultMaterial as any).map = texMap;
      (globe as any).globeMaterial(savedDefaultMaterial);
    }
  }
  refs.outerGlow = null;
  refs.innerGlow = null;
  refs.starField = null;
  refs.cyanLight = null;
}

export function startExtrasLoop(
  refs: EnhancedVisualRefs,
  destroyed: boolean,
): void {
  if (refs.extrasAnimFrameId != null) return;
  const animateExtras = () => {
    if (destroyed) return;
    if (refs.outerGlow) refs.outerGlow.rotation.y += 0.0003;
    if (refs.starField) refs.starField.rotation.y += 0.00005;
    refs.extrasAnimFrameId = requestAnimationFrame(animateExtras);
  };
  animateExtras();
}

// ─── Render quality & performance profile ────────────────────────────────────

export function applyRenderQuality(
  globe: GlobeInstance,
  scale?: GlobeRenderScale,
  width?: number,
  height?: number,
  containerWidth?: number,
  containerHeight?: number,
): void {
  if (!globe) return;
  try {
    const desktop = isDesktopRuntime();
    const pr = desktop
      ? Math.min(resolveGlobePixelRatio(scale ?? getGlobeRenderScale()), 1.25)
      : resolveGlobePixelRatio(scale ?? getGlobeRenderScale());
    const renderer = globe.renderer();
    renderer.setPixelRatio(pr);
    const w = (width ?? containerWidth) || window.innerWidth;
    const h = (height ?? containerHeight) || window.innerHeight;
    if (w > 0 && h > 0) globe.width(w).height(h);
  } catch { /* best-effort */ }
}

export function applyPerformanceProfile(
  globe: GlobeInstance,
  profile: GlobePerformanceProfile,
  initialized: boolean,
  destroyed: boolean,
  webglLost: boolean,
  prevPulseEnabled: boolean,
  outerGlow: any,
  innerGlow: any,
): { pulseEnabled: boolean; needFlush: boolean } {
  if (!globe || !initialized || destroyed || webglLost) return { pulseEnabled: prevPulseEnabled, needFlush: false };

  const pulseEnabled = !profile.disablePulseAnimations;

  if (profile.disableDashAnimations) {
    (globe as any).arcDashAnimateTime(0);
    (globe as any).pathDashAnimateTime(0);
  } else {
    (globe as any).arcDashAnimateTime(5000);
    (globe as any).pathDashAnimateTime((d: GlobePath) => {
      if (!d) return 5000;
      if (d.pathType === 'orbit') return 0;
      if (d.pathType === 'cable') return 0;
      return 5000;
    });
  }

  if (profile.disableAtmosphere) {
    globe.atmosphereAltitude(0);
    if (outerGlow) outerGlow.visible = false;
    if (innerGlow) innerGlow.visible = false;
  } else {
    globe.atmosphereAltitude(0.18);
    if (outerGlow) outerGlow.visible = true;
    if (innerGlow) innerGlow.visible = true;
  }

  return { pulseEnabled, needFlush: prevPulseEnabled !== pulseEnabled };
}
