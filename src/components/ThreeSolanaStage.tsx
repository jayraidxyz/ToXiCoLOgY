import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Compass, RotateCcw } from 'lucide-react';
import {
  FLASHCARDS,
  USER_ASSETS,
  type SceneId,
  type SceneSpec,
} from '../data/documentary';
import {
  createCrownBeaconGroup,
  createFlashcard3DGroup,
  createQuicPacketsMesh,
  createValidatorRigGroup,
  createVaultNodeGroup,
  type InteractiveNodeMeta,
} from '../three/buildModels';
import {
  createContactShadowTexture,
  createFloorGridTexture,
} from '../three/proceduralTextures';

export type CameraPreset =
  | 'auto'
  | 'crown'
  | 'flashcards'
  | 'validators'
  | 'vaults';

interface ThreeSolanaStageProps {
  currentTime: number;
  activeScene: SceneSpec;
  isPlaying: boolean;
  manualFlips: Record<string, boolean>;
  manualPulseTick: number;
  cameraPreset: CameraPreset;
  onCameraPresetChange: (preset: CameraPreset) => void;
  onToggleCard: (id: string) => void;
  onAssetSelect?: () => void;
  className?: string;
}

interface CameraGoal {
  pos: THREE.Vector3;
  target: THREE.Vector3;
}

const SCENE_CAMERAS: Record<SceneId, CameraGoal> = {
  hook: {
    pos: new THREE.Vector3(0, 2.5, 5.4),
    target: new THREE.Vector3(0, 1.35, 0),
  },
  flashcards: {
    pos: new THREE.Vector3(0, 3.0, 5.15),
    target: new THREE.Vector3(0, 2.35, -1.6),
  },
  protocol: {
    pos: new THREE.Vector3(0, 2.9, 6.4),
    target: new THREE.Vector3(0, 1.15, -0.5),
  },
  users: {
    pos: new THREE.Vector3(0, 2.45, 5.8),
    target: new THREE.Vector3(0, 0.75, 2.05),
  },
  'bigger-picture': {
    pos: new THREE.Vector3(5.8, 4.6, 6.2),
    target: new THREE.Vector3(0, 1.15, 0),
  },
  outro: {
    pos: new THREE.Vector3(0, 2.2, 4.6),
    target: new THREE.Vector3(0, 1.45, 0),
  },
};

const PRESET_CAMERAS: Record<Exclude<CameraPreset, 'auto'>, CameraGoal> = {
  crown: SCENE_CAMERAS.hook,
  flashcards: SCENE_CAMERAS.flashcards,
  validators: SCENE_CAMERAS.protocol,
  vaults: SCENE_CAMERAS.users,
};

// Pre-allocated module-scope helpers for zero GC in render loop
const _dummy = new THREE.Object3D();
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();
const _goalPos = new THREE.Vector3();
const _goalTarget = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function ThreeSolanaStage({
  currentTime,
  activeScene,
  isPlaying,
  manualFlips,
  manualPulseTick,
  cameraPreset,
  onCameraPresetChange,
  onToggleCard,
  onAssetSelect,
  className = '',
}: ThreeSolanaStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<InteractiveNodeMeta | null>(
    null
  );
  const [webglError, setWebglError] = useState<string | null>(null);

  // Sync latest React props into refs so WebGL mounts strictly once
  const stateRef = useRef({
    currentTime,
    activeScene,
    isPlaying,
    manualFlips,
    manualPulseTick,
    cameraPreset,
  });
  stateRef.current = {
    currentTime,
    activeScene,
    isPlaying,
    manualFlips,
    manualPulseTick,
    cameraPreset,
  };

  const callbacksRef = useRef({
    onToggleCard,
    onAssetSelect,
  });
  callbacksRef.current = {
    onToggleCard,
    onAssetSelect,
  };

  const userInteractingRef = useRef(false);
  const lastCameraKeyRef = useRef<string>('');

  // Re-enable smooth scripted camera when timeline scene or explicit preset changes
  useEffect(() => {
    const key =
      cameraPreset === 'auto'
        ? `scene:${activeScene.id}`
        : `preset:${cameraPreset}`;
    if (lastCameraKeyRef.current !== key) {
      lastCameraKeyRef.current = key;
      userInteractingRef.current = false;
    }
  }, [activeScene.id, cameraPreset]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('3D WebGL context unavailable on this browser.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';

    const initW = Math.max(container.clientWidth, 280);
    const initH = Math.max(container.clientHeight, 260);
    renderer.setSize(initW, initH, false);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.048);

    const camera = new THREE.PerspectiveCamera(44, initW / initH, 0.1, 80);
    camera.position.copy(SCENE_CAMERAS.hook.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(SCENE_CAMERAS.hook.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.8;
    controls.maxDistance = 12.5;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI * 0.48;

    const handleControlStart = () => {
      userInteractingRef.current = true;
    };
    controls.addEventListener('start', handleControlStart);

    // Mandatory studio environment reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    // Warm Key + Cool Hemisphere Fill + Neon-Red Rim Light
    const hemiLight = new THREE.HemisphereLight(0xa5b4fc, 0x160909, 0.72);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1e6, 2.2);
    keyLight.position.set(5.5, 8.5, 6.0);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 26;
    keyLight.shadow.camera.left = -7;
    keyLight.shadow.camera.right = 7;
    keyLight.shadow.camera.top = 7;
    keyLight.shadow.camera.bottom = -7;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const redRimLight = new THREE.PointLight(0xe10000, 4.5, 16, 1.6);
    redRimLight.position.set(0, 3.2, -2.5);
    scene.add(redRimLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // Ground telemetry floor (offset slightly down with polygonOffset)
    const floorTex = createFloorGridTexture(maxAnisotropy);
    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.85,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    scene.add(floor);

    // Contact shadow plane directly beneath central beacon
    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(4.0, 4.0);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -0.005;
    scene.add(contactShadow);

    // 1. Centerpiece Toxicology Crown Beacon
    const beacon = createCrownBeaconGroup();
    beacon.group.position.set(0, 0, 0);
    scene.add(beacon.group);

    // 2. Agave & Firedancer Multi-Client Validator Rigs
    const agaveRig = createValidatorRigGroup(
      'AGAVE',
      'RUST CLIENT · MAINNET',
      '#FFFFFF',
      isSoftwareGl,
      maxAnisotropy,
      'validator-agave',
      'Primary Rust validator client hardened by Solana 1.0 local fee markets & QUIC.'
    );
    agaveRig.group.position.set(-2.55, 0, -0.55);
    agaveRig.group.rotation.y = 0.28;
    scene.add(agaveRig.group);

    const firedancerRig = createValidatorRigGroup(
      'FIREDANCER',
      'C/C++ CLIENT · INDEPENDENT',
      '#E10000',
      isSoftwareGl,
      maxAnisotropy,
      'validator-firedancer',
      'Independent Jump Crypto C client eliminating single-client failure risk.'
    );
    firedancerRig.group.position.set(2.55, 0, -0.55);
    firedancerRig.group.rotation.y = -0.28;
    scene.add(firedancerRig.group);

    // 3. QUIC Data Conduit Track + Instanced Packets
    const quicArcPoints = [
      new THREE.Vector3(-2.55, 1.3, -0.55),
      new THREE.Vector3(-1.35, 1.9, -1.3),
      new THREE.Vector3(0, 2.15, -1.55),
      new THREE.Vector3(1.35, 1.9, -1.3),
      new THREE.Vector3(2.55, 1.3, -0.55),
    ];
    const quicCurve = new THREE.CatmullRomCurve3(quicArcPoints);
    const quicRailGeo = new THREE.TubeGeometry(quicCurve, 48, 0.025, 10, false);
    const quicRailMat = new THREE.MeshStandardMaterial({
      color: 0x3b3b42,
      roughness: 0.35,
      metalness: 0.85,
    });
    const quicRail = new THREE.Mesh(quicRailGeo, quicRailMat);
    scene.add(quicRail);

    const PACKET_COUNT = 36;
    const quicPackets = createQuicPacketsMesh(PACKET_COUNT);
    scene.add(quicPackets);

    // 4. 3D Flashcards Arc (accessible in 3D space + synced with React state)
    const flashcardEntries = FLASHCARDS.map((card, index) => {
      const x = (index - 1) * 1.75;
      const z = -1.65 - (index === 1 ? 0.15 : 0);
      const built = createFlashcard3DGroup(card, maxAnisotropy);
      built.group.position.set(x, 2.75, z);
      built.group.rotation.y = (1 - index) * 0.14;
      scene.add(built.group);
      return {
        spec: card,
        ...built,
        angleY: 0,
      };
    });

    // 5. 4 User Asset Vault Monoliths in Front Arc
    const vaultNodes = USER_ASSETS.map((asset, idx) => {
      const built = createVaultNodeGroup(asset.id, asset.label, asset.summary);
      const x = (idx - 1.5) * 1.32;
      const z = 2.05 + (idx === 0 || idx === 3 ? -0.18 : 0.08);
      built.group.position.set(x, 0, z);
      scene.add(built.group);
      return {
        spec: asset,
        ...built,
      };
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting on dedicated layer 1
    _raycaster.layers.set(1);
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverTime = 0;

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 65) return;
      lastHoverTime = now;
      updatePointer(e.clientX, e.clientY);
      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects(scene.children, true);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      if (dist > 8) return; // Ignore drags

      updatePointer(e.clientX, e.clientY);
      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects(scene.children, true);
      if (hits.length === 0) return;

      const meta = hits[0].object.userData?.meta as
        | InteractiveNodeMeta
        | undefined;
      if (!meta) return;

      setSelectedNode(meta);
      if (meta.kind === 'flashcard' && meta.flashcardId) {
        callbacksRef.current.onToggleCard(meta.flashcardId);
      } else if (meta.kind === 'vault') {
        callbacksRef.current.onAssetSelect?.();
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Responsive ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(240, Math.floor(entry.contentRect.width));
        const h = Math.max(220, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    resizeObserver.observe(container);

    // Software WebGL fence-sync pacing helper
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    let prevPulseTick = stateRef.current.manualPulseTick;
    let pulseBoost = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.elapsedTime;
      const s = stateRef.current;

      if (s.manualPulseTick !== prevPulseTick) {
        prevPulseTick = s.manualPulseTick;
        pulseBoost = 1.0;
      }
      pulseBoost = THREE.MathUtils.damp(pulseBoost, 0, 3.5, dt);

      // Beacon floating crown & ring rotation
      beacon.crownGroup.position.y = 1.65 + Math.sin(elapsed * 1.8) * 0.06;
      beacon.crownGroup.rotation.y = Math.sin(elapsed * 0.7) * 0.25;
      beacon.orbRing.rotation.z = elapsed * (0.45 + pulseBoost * 1.4);

      // Flashcards smooth Y flip + hover bob
      const flashSceneTime = Math.max(0, s.currentTime - 5);
      flashcardEntries.forEach((entry, idx) => {
        const autoFlipped =
          s.activeScene.id === 'flashcards'
            ? flashSceneTime >= entry.spec.flipOffsetSec
            : s.currentTime >= 20;
        const manualVal = s.manualFlips[entry.spec.id];
        const isFlipped =
          typeof manualVal === 'boolean' ? manualVal : autoFlipped;
        const targetAngle = isFlipped ? Math.PI : 0;
        entry.angleY = THREE.MathUtils.damp(entry.angleY, targetAngle, 6.5, dt);
        entry.pivot.rotation.y = entry.angleY;
        entry.group.position.y = 2.78 + Math.sin(elapsed * 1.5 + idx * 1.1) * 0.05;
      });

      // QUIC InstancedMesh data packets racing between Agave <-> Firedancer
      const speedMul =
        s.activeScene.id === 'protocol' || s.activeScene.id === 'bigger-picture'
          ? 0.42
          : 0.22;
      for (let i = 0; i < PACKET_COUNT; i++) {
        const lane = (i % 3) - 1;
        const t = ((elapsed * (speedMul + pulseBoost * 0.35) + i / PACKET_COUNT) % 1);
        const point = quicCurve.getPointAt(i % 2 === 0 ? t : 1 - t);
        _dummy.position.set(
          point.x,
          point.y + lane * 0.09,
          point.z + lane * 0.12
        );
        _dummy.rotation.y = elapsed * 2 + i;
        const scale = 0.85 + (i % 3) * 0.12 + pulseBoost * 0.3;
        _dummy.scale.setScalar(scale);
        _dummy.updateMatrix();
        quicPackets.setMatrixAt(i, _dummy.matrix);
      }
      quicPackets.instanceMatrix.needsUpdate = true;

      // Validator waveguide pulse
      const valEmissive =
        (s.activeScene.id === 'protocol' ? 1.85 : 1.05) +
        Math.sin(elapsed * 3.5) * 0.35 +
        pulseBoost;
      (agaveRig.coreTube.material as THREE.MeshStandardMaterial).emissiveIntensity =
        valEmissive;
      (
        firedancerRig.coreTube.material as THREE.MeshStandardMaterial
      ).emissiveIntensity = valEmissive * 1.1;

      // User Asset Vault sequential lock illumination in Scene 04
      const usersElapsed = Math.max(0, s.currentTime - 32);
      vaultNodes.forEach((node, idx) => {
        const isLocked =
          s.activeScene.id === 'users'
            ? usersElapsed >= node.spec.lockOffsetSec
            : s.currentTime >= 42;
        node.core.rotation.y = elapsed * (isLocked ? 1.4 : 0.4) + idx;
        node.core.position.y = 1.1 + Math.sin(elapsed * 2 + idx) * 0.04;
        const ringMat = node.ring.material as THREE.MeshStandardMaterial;
        const coreMat = node.core.material as THREE.MeshPhysicalMaterial;
        if (isLocked) {
          ringMat.color.setHex(0xe10000);
          ringMat.emissive.setHex(0xe10000);
          ringMat.emissiveIntensity = 0.9;
          coreMat.emissive.setHex(0x880000);
          coreMat.emissiveIntensity = 0.7;
        } else {
          ringMat.color.setHex(0x55555d);
          ringMat.emissive.setHex(0x000000);
          ringMat.emissiveIntensity = 0;
          coreMat.emissive.setHex(0x220000);
          coreMat.emissiveIntensity = 0.25;
        }
      });

      // Smooth exponential camera damping unless user is orbiting
      if (!userInteractingRef.current) {
        const goal =
          s.cameraPreset === 'auto'
            ? SCENE_CAMERAS[s.activeScene.id]
            : PRESET_CAMERAS[s.cameraPreset];
        _goalPos.copy(goal.pos);
        _goalTarget.copy(goal.target);

        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _goalPos.x,
          4.2,
          dt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _goalPos.y,
          4.2,
          dt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _goalPos.z,
          4.2,
          dt
        );

        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          _goalTarget.x,
          4.6,
          dt
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          _goalTarget.y,
          4.6,
          dt
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          _goalTarget.z,
          4.6,
          dt
        );
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', handleControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          mats.forEach((mat) => {
            if (!mat) return;
            const std = mat as THREE.MeshStandardMaterial;
            std.map?.dispose();
            std.dispose();
          });
        }
      });

      envTex.dispose();
      floorTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const presets: { id: CameraPreset; label: string }[] = [
    { id: 'auto', label: 'Auto Sync' },
    { id: 'crown', label: 'Crown' },
    { id: 'flashcards', label: '3D Cards' },
    { id: 'validators', label: 'Clients' },
    { id: 'vaults', label: 'Vaults' },
  ];

  return (
    <div
      className={`relative overflow-hidden rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#050505] ${className}`}
    >
      {/* Dedicated isolated WebGL canvas container (no sibling overlay bloat inside) */}
      <div
        ref={mountRef}
        className="h-full w-full"
        aria-label="Interactive 3D Solana 1.0 Toxicology Stage"
      />

      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050505] p-6 text-center text-sm text-[#A3A3A3]">
          {webglError}
        </div>
      )}

      {/* Minimal Top-Left Static Badge (No backdrop-filter, no pulsating dots) */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[85%] items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#0E0E0E]/95 px-3 py-1.5 text-xs text-white">
        <span className="font-mono font-bold text-[#FF6B63]">3D STAGE</span>
        <span aria-hidden="true" className="text-[#525252]">
          ·
        </span>
        <span className="truncate font-medium">
          {activeScene.number}. {activeScene.title}
        </span>
      </div>

      {/* Selected 3D Object Inspector Toast (solid bg, no backdrop-filter) */}
      {selectedNode && (
        <div className="absolute right-3 top-3 z-10 max-w-[240px] rounded-xl border border-[#E10000]/70 bg-[#0E0E0E]/95 p-3 text-left text-xs shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display font-bold text-white">
              {selectedNode.title}
            </p>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              aria-label="Dismiss 3D object info"
              className="shrink-0 cursor-pointer text-[11px] font-semibold text-[#FF6B63] hover:text-white"
            >
              Close
            </button>
          </div>
          <p className="mt-1 leading-snug text-[#A3A3A3]">
            {selectedNode.subtitle}
          </p>
        </div>
      )}

      {/* Compact Bottom Camera Angle Switcher (zero viewport occlusion, no backdrop-filter) */}
      <div className="pointer-events-auto absolute bottom-3 left-1/2 z-10 flex max-w-[94%] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-[#2A2A2A] bg-[#0E0E0E]/95 p-1 no-scrollbar">
        <Compass
          className="ml-2 h-3.5 w-3.5 shrink-0 text-[#FF6B63]"
          aria-hidden="true"
        />
        {presets.map((p) => {
          const active = cameraPreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                userInteractingRef.current = false;
                onCameraPresetChange(p.id);
              }}
              className={`min-h-[34px] shrink-0 cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] ${
                active
                  ? 'bg-[#E10000] text-white'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            userInteractingRef.current = false;
            onCameraPresetChange('auto');
          }}
          aria-label="Reset 3D camera"
          title="Reset camera"
          className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full text-[#A3A3A3] transition-colors hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
