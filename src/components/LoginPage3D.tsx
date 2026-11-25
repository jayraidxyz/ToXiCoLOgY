import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  LogOut,
  Shield,
  Sparkles,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { signInWithGoogle, signOutUser } from '../lib/firebase';
import { CrownMark } from './CrownMark';
import { createCrownBeaconGroup } from '../three/buildModels';
import {
  createContactShadowTexture,
  createFloorGridTexture,
} from '../three/proceduralTextures';

interface LoginPage3DProps {
  user: User | null;
  onEnterArchive: () => void;
}

export function LoginPage3D({ user, onEnterArchive }: LoginPage3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const w = Math.max(container.clientWidth, 300);
    const h = Math.max(container.clientHeight, 300);
    renderer.setSize(w, h, false);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.055);

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 50);
    camera.position.set(0, 2.2, 4.8);
    camera.lookAt(0, 1.25, 0);

    // Studio Environment (RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Studio Lighting
    const hemi = new THREE.HemisphereLight(0xa5b4fc, 0x160909, 0.75);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff5ea, 2.4);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const rim = new THREE.PointLight(0xe10000, 4.0, 12, 1.6);
    rim.position.set(0, 2.8, -2.2);
    scene.add(rim);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const floorTex = createFloorGridTexture(maxAniso);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28),
      new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.8,
        metalness: 0.2,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    const shadowTex = createContactShadowTexture();
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 3.6),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.7,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.001;
    scene.add(shadow);

    // Hero 3D Crown Beacon + Mascot Visor
    const beacon = createCrownBeaconGroup();
    beacon.group.position.set(0, 0, 0);
    scene.add(beacon.group);

    // 4 Outer Satellite Beacon Rings
    const ringGeo = new THREE.TorusGeometry(1.65, 0.02, 16, 72);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xe10000,
      emissive: 0xaa0000,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.8,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo, ringMat);
    ringMesh1.position.y = 1.45;
    ringMesh1.rotation.x = Math.PI * 0.35;
    scene.add(ringMesh1);

    const ringMesh2 = new THREE.Mesh(ringGeo, ringMat);
    ringMesh2.position.y = 1.45;
    ringMesh2.rotation.y = Math.PI * 0.45;
    ringMesh2.rotation.x = -Math.PI * 0.25;
    scene.add(ringMesh2);

    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      beacon.crownGroup.position.y = 1.65 + Math.sin(elapsed * 1.6) * 0.08;
      beacon.crownGroup.rotation.y = elapsed * 0.45;
      beacon.orbRing.rotation.z = elapsed * 0.65;
      ringMesh1.rotation.z = elapsed * 0.35;
      ringMesh2.rotation.z = -elapsed * 0.35;

      camera.position.x = Math.sin(elapsed * 0.25) * 0.85;
      camera.position.z = 4.8 + Math.cos(elapsed * 0.25) * 0.35;
      camera.lookAt(0, 1.35, 0);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    const onResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      onEnterArchive();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Google authentication failed.';
      setAuthError(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100dvh-80px)] w-full items-center justify-center p-4">
      {/* 3D Background Viewport */}
      <div
        ref={mountRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-75 sm:opacity-90"
      />

      {/* Floating Center Authentication Card (Solid surface, no backdrop-blur over WebGL) */}
      <div className="relative z-10 w-full max-w-[460px] rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.85)] sm:p-8">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent)] bg-[#050505] shadow-[0_0_24px_var(--accent-glow)]">
            <CrownMark className="h-8 w-8" />
          </span>

          <p className="mt-4 font-mono text-xs font-bold tracking-widest uppercase text-[var(--accent-text)]">
            TOXICOLOGY ARCHIVE · GOOGLE AUTH
          </p>

          <h1 className="heading-section mt-1.5 font-display font-bold text-[var(--text)]">
            {user ? 'Welcome to the Archive' : 'Sign in with Google'}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {user
              ? 'Your Google Account is connected. AI research history and custom briefs are synced to your cloud account.'
              : 'Connect your Google account to unlock persistent Gemini AI research history and cloud-synced checklists.'}
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="mt-5 space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3.5 text-xs">
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Sparkles className="h-4 w-4 shrink-0 text-[var(--accent-text)]" />
            <span>Persistent Gemini AI due-diligence chat history</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text)]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>Synced 3-Step Filter and Archive Vault checklists</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Shield className="h-4 w-4 shrink-0 text-[var(--accent-text)]" />
            <span>Zero wallet risk · Hardened Firestore security rules</span>
          </div>
        </div>

        {authError && (
          <div className="mt-4 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 p-3 text-xs text-[var(--text)]">
            {authError}
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-6 space-y-3">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="h-10 w-10 rounded-full border border-[var(--accent)] object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                    <Lock className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-display text-sm font-bold text-[var(--text)]">
                    {user.displayName || 'Toxicology Member'}
                  </p>
                  <p className="truncate text-xs font-mono text-[var(--muted)]">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onEnterArchive}
                className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 text-sm font-bold text-white shadow-[0_0_24px_var(--accent-glow)] transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
              >
                <span>Enter Archive &amp; 3D Stage</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)]"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out ({user.email})</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSigningIn}
                className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-white px-5 text-sm font-bold text-black shadow-md transition-all hover:bg-neutral-100 active:scale-[0.98] disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>
                  {isSigningIn ? 'Connecting...' : 'Sign in with Google'}
                </span>
              </button>

              <button
                type="button"
                onClick={onEnterArchive}
                className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)]"
              >
                <span>Preview Archive as Guest</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
