import { useRef, useEffect, useCallback } from 'preact/hooks';
import * as THREE from 'three';
import { countries, getRiskLevel, getRiskColor } from '../data/countries';
import type { Country } from '../data/countries';

interface GlobeProps {
  onCountryClick: (country: Country) => void;
  selectedCountry: Country | null;
}

interface CountryMarker {
  mesh: THREE.Mesh;
  country: Country;
  baseScale: number;
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createStarfield(): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  for (let i = 0; i < 6000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    const dist = Math.sqrt(x * x + y * y + z * z);
    if (dist > 200) {
      vertices.push(x, y, z);
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.7,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  });
  return new THREE.Points(geometry, material);
}

export function Globe({ onCountryClick, selectedCountry }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    globe: THREE.Mesh;
    markers: CountryMarker[];
    autoRotate: boolean;
    isDragging: boolean;
    mouseDown: { x: number; y: number } | null;
    rotation: { x: number; y: number };
    targetRotation: { x: number; y: number };
    animId: number;
  } | null>(null);

  const onCountryClickRef = useRef(onCountryClick);
  onCountryClickRef.current = onCountryClick;

  const handleResize = useCallback(() => {
    const s = sceneRef.current;
    const el = containerRef.current;
    if (!s || !el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    s.camera.aspect = w / h;
    s.camera.updateProjectionMatrix();
    s.renderer.setSize(w, h);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x06060e, 1);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    camera.position.z = 300;

    scene.add(createStarfield());

    const ambientLight = new THREE.AmbientLight(0x444466, 1.5);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    const globeRadius = 100;
    const globeGeo = new THREE.SphereGeometry(globeRadius, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('/textures/earth-blue-marble.jpg');
    const globeMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 15,
      specular: new THREE.Color(0x111122),
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // Atmosphere glow
    const atmosGeo = new THREE.SphereGeometry(globeRadius * 1.02, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
    });
    const atmos = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmos);

    // Country markers
    const markers: CountryMarker[] = [];
    const markerGeo = new THREE.SphereGeometry(1, 12, 12);
    for (const country of countries) {
      const level = getRiskLevel(country.cii);
      const color = getRiskColor(level);
      const size = country.cii >= 76 ? 1.8 : country.cii >= 56 ? 1.4 : 1.0;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(markerGeo, mat);
      const pos = latLngToVector3(country.lat, country.lng, globeRadius + 1.2);
      mesh.position.copy(pos);
      mesh.scale.setScalar(size);
      globe.add(mesh);
      markers.push({ mesh, country, baseScale: size });
    }

    const state = {
      renderer, scene, camera, globe, markers,
      autoRotate: true,
      isDragging: false,
      mouseDown: null as { x: number; y: number } | null,
      rotation: { x: 0.3, y: 0 },
      targetRotation: { x: 0.3, y: 0 },
      animId: 0,
    };
    sceneRef.current = state;

    // Raycaster for hover / click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredMarker: CountryMarker | null = null;

    function getMarkerAtMouse(e: MouseEvent): CountryMarker | null {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const meshes = markers.map(m => m.mesh);
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        return markers.find(m => m.mesh === hits[0].object) || null;
      }
      return null;
    }

    function onMouseDown(e: MouseEvent) {
      state.mouseDown = { x: e.clientX, y: e.clientY };
      state.isDragging = false;
    }

    function onMouseMove(e: MouseEvent) {
      // Dragging
      if (state.mouseDown) {
        const dx = e.clientX - state.mouseDown.x;
        const dy = e.clientY - state.mouseDown.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          state.isDragging = true;
          state.autoRotate = false;
          state.targetRotation.y += dx * 0.005;
          state.targetRotation.x += dy * 0.003;
          state.targetRotation.x = Math.max(-1.2, Math.min(1.2, state.targetRotation.x));
          state.mouseDown = { x: e.clientX, y: e.clientY };
        }
      }

      // Hover tooltip
      const marker = getMarkerAtMouse(e);
      const tip = tooltipRef.current;
      if (marker && tip) {
        const c = marker.country;
        const level = getRiskLevel(c.cii);
        tip.innerHTML = `<strong>${c.flag} ${c.name}</strong><br/>CII: ${c.cii} — ${level}`;
        tip.style.display = 'block';
        tip.style.left = `${e.clientX - (containerRef.current?.getBoundingClientRect().left || 0) + 12}px`;
        tip.style.top = `${e.clientY - (containerRef.current?.getBoundingClientRect().top || 0) - 10}px`;
        renderer.domElement.style.cursor = 'pointer';
        if (hoveredMarker && hoveredMarker !== marker) {
          hoveredMarker.mesh.scale.setScalar(hoveredMarker.baseScale);
        }
        marker.mesh.scale.setScalar(marker.baseScale * 1.6);
        hoveredMarker = marker;
      } else {
        if (tip) tip.style.display = 'none';
        renderer.domElement.style.cursor = 'grab';
        if (hoveredMarker) {
          hoveredMarker.mesh.scale.setScalar(hoveredMarker.baseScale);
          hoveredMarker = null;
        }
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (!state.isDragging && state.mouseDown) {
        const marker = getMarkerAtMouse(e);
        if (marker) {
          onCountryClickRef.current(marker.country);
        }
      }
      state.mouseDown = null;
      // Resume auto-rotate after 4s
      if (state.isDragging) {
        setTimeout(() => { state.autoRotate = true; }, 4000);
      }
      state.isDragging = false;
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      camera.position.z = Math.max(160, Math.min(500, camera.position.z + e.deltaY * 0.3));
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    // Pulse animation time
    let time = 0;

    function animate() {
      state.animId = requestAnimationFrame(animate);
      time += 0.02;

      if (state.autoRotate) {
        state.targetRotation.y += 0.001;
      }

      state.rotation.x += (state.targetRotation.x - state.rotation.x) * 0.05;
      state.rotation.y += (state.targetRotation.y - state.rotation.y) * 0.05;
      globe.rotation.x = state.rotation.x;
      globe.rotation.y = state.rotation.y;

      // Pulse critical markers
      for (const m of markers) {
        if (m.country.cii >= 76) {
          const pulse = 1 + Math.sin(time * 2) * 0.2;
          if (m !== hoveredMarker) {
            m.mesh.scale.setScalar(m.baseScale * pulse);
          }
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(state.animId);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      el.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, [handleResize]);

  return (
    <div ref={containerRef} class="globe-wrapper">
      <div ref={tooltipRef} class="globe-tooltip" />
    </div>
  );
}
