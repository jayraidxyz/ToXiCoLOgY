import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Flame,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Shield,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  registerWithEmail,
  sendFirebasePasswordReset,
  signInGuestFirebase,
  signInWithEmail,
  signOutUser,
} from '../lib/firebase';
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

function mapFirebaseAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/auth\/operation-not-allowed|admin-restricted-operation/i.test(raw)) {
    return 'Enable this sign-in provider in Firebase Console → Authentication → Sign-in method (Email/Password or Anonymous).';
  }
  if (/auth\/invalid-credential|auth\/wrong-password|auth\/user-not-found/i.test(raw)) {
    return 'Invalid email or password. Try again or switch to Create Account.';
  }
  if (/auth\/email-already-in-use/i.test(raw)) {
    return 'An account with this email already exists. Switch to Sign In.';
  }
  if (/auth\/weak-password/i.test(raw)) {
    return 'Password must be at least 6 characters.';
  }
  if (/auth\/invalid-email/i.test(raw)) {
    return 'Please enter a valid email address.';
  }
  if (/auth\/too-many-requests/i.test(raw)) {
    return 'Too many attempts. Wait a moment before retrying.';
  }
  return raw || 'Firebase authentication failed.';
}

export function LoginPage3D({ user, onEnterArchive }: LoginPage3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

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

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

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

    const beacon = createCrownBeaconGroup();
    beacon.group.position.set(0, 0, 0);
    scene.add(beacon.group);

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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setAuthError('Enter both email and password.');
      return;
    }
    setIsSubmitting(true);
    setAuthError(null);
    setResetMessage(null);
    try {
      if (authMode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, displayName);
      }
      onEnterArchive();
    } catch (err: unknown) {
      setAuthError(mapFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestFirebaseSession = async () => {
    setIsGuestLoading(true);
    setAuthError(null);
    setResetMessage(null);
    try {
      await signInGuestFirebase();
      onEnterArchive();
    } catch (err: unknown) {
      setAuthError(mapFirebaseAuthError(err));
    } finally {
      setIsGuestLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setAuthError('Enter your email address first to reset your password.');
      return;
    }
    setAuthError(null);
    setResetMessage(null);
    try {
      await sendFirebasePasswordReset(email);
      setResetMessage('Password reset email dispatched via Firebase Auth.');
    } catch (err: unknown) {
      setAuthError(mapFirebaseAuthError(err));
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

      {/* Floating Center Firebase Authentication Card (Solid surface, no backdrop-blur over WebGL) */}
      <div className="relative z-10 w-full max-w-[460px] rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.85)] sm:p-8">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent)] bg-[#050505] shadow-[0_0_24px_var(--accent-glow)]">
            <CrownMark className="h-8 w-8" />
          </span>

          <p className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs font-bold tracking-widest uppercase text-[var(--accent-text)]">
            <Flame className="h-3.5 w-3.5" />
            <span>TOXICOLOGY ARCHIVE · FIREBASE CLOUD</span>
          </p>

          <h1 className="heading-section mt-1.5 font-display font-bold text-[var(--text)]">
            {user ? 'Firebase Session Active' : 'Firebase Archive Access'}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {user
              ? 'Connected directly to Cloud Firestore. Gemini research history and custom archive briefs sync across sessions.'
              : 'Sign in with Firebase Email & Password or start an instant anonymous Firebase cloud session to sync history and vaults.'}
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="mt-5 space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3.5 text-xs">
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Sparkles className="h-4 w-4 shrink-0 text-[var(--accent-text)]" />
            <span>Persistent Gemini AI chat history stored in Firestore</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Database className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>Cross-device Archive Vault &amp; live threat sync</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Shield className="h-4 w-4 shrink-0 text-[var(--accent-text)]" />
            <span>Strict per-user Firestore isolation &amp; security rules</span>
          </div>
        </div>

        {authError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 p-3 text-xs text-[var(--text)]"
          >
            {authError}
          </div>
        )}

        {resetMessage && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300"
          >
            {resetMessage}
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-6 space-y-3">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent-text)]">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-display text-sm font-bold text-[var(--text)]">
                    {user.displayName ||
                      (user.isAnonymous ? 'Anonymous Firebase Session' : 'Firebase Member')}
                  </p>
                  <p className="truncate font-mono text-xs text-[var(--muted)]">
                    {user.email || `UID: ${user.uid.slice(0, 12)}...`}
                  </p>
                </div>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
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
                <span>Sign Out of Firebase</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Segmented Sign In / Create Account Tabs */}
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthError(null);
                  }}
                  className={`min-h-[40px] cursor-pointer rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                    authMode === 'signin'
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError(null);
                  }}
                  className={`min-h-[40px] cursor-pointer rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                    authMode === 'signup'
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {authMode === 'signup' && (
                  <div>
                    <label
                      htmlFor="fb-name"
                      className="sr-only"
                    >
                      Handle or Name
                    </label>
                    <input
                      id="fb-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display name or @handle (optional)"
                      className="min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 text-base text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    aria-label="Email address"
                    className="min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] pl-10 pr-3.5 text-base text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>

                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    aria-label="Password"
                    className="min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] pl-10 pr-3.5 text-base text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>

                {authMode === 'signin' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handlePasswordReset()}
                      className="cursor-pointer text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-text)]"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 text-sm font-bold text-white shadow-[0_0_24px_var(--accent-glow)] transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? 'Connecting to Firebase...'
                      : authMode === 'signin'
                      ? 'Sign In with Firebase'
                      : 'Create Firebase Account'}
                  </span>
                </button>
              </form>

              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <span className="h-px flex-1 bg-[var(--border)]" />
                <span>OR</span>
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>

              <button
                type="button"
                onClick={() => void handleGuestFirebaseSession()}
                disabled={isGuestLoading}
                className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[var(--accent)]/50 bg-[var(--surface-2)] px-4 text-xs font-bold text-[var(--accent-text)] transition-colors hover:bg-[var(--accent)] hover:text-white disabled:opacity-50"
              >
                <Flame className="h-4 w-4" />
                <span>
                  {isGuestLoading
                    ? 'Starting Cloud Session...'
                    : 'Instant Firebase Guest Session'}
                </span>
              </button>

              <button
                type="button"
                onClick={onEnterArchive}
                className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)]"
              >
                <span>Browse Archive Locally</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
