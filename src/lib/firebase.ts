import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { ChatMessage, GroundingSource } from '../components/ResearchChatPanel';
import type { ArchiveDocument } from '../data/archive';

export interface CloudThreatReport {
  id: string;
  date: string;
  title: string;
  threatCategory: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | string;
  symptom: string;
  diagnosis: string;
  antidote: string[];
  sourceUrl: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentAuth = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.uid,
      email: currentAuth?.email,
      emailVerified: currentAuth?.emailVerified,
      isAnonymous: currentAuth?.isAnonymous,
      tenantId: currentAuth?.tenantId,
      providerInfo:
        currentAuth?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initialize Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Must pass firestoreDatabaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

/**
 * Startup connectivity test required by firebase-integration-rpc
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.warn('Firestore offline check: Please verify connection.');
    }
    return false;
  }
}
void testConnection();

function sanitizeId(rawId: string, fallbackPrefix = 'item'): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

async function upsertUserProfile(
  user: User,
  authProvider: 'password' | 'anonymous',
  explicitDisplayName?: string
): Promise<void> {
  const userDocPath = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const now = new Date().toISOString();
  const displayName = (
    explicitDisplayName ||
    user.displayName ||
    (user.isAnonymous ? 'Anonymous Researcher' : user.email?.split('@')[0] || 'Archive Member')
  ).slice(0, 128);
  const email = (user.email || '').slice(0, 256);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        email,
        displayName,
        authProvider,
        updatedAt: now,
      });
    } else {
      await setDoc(ref, {
        userId: user.uid,
        email,
        displayName,
        authProvider,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userDocPath);
  }
}

/**
 * Sign in with Firebase Email & Password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await upsertUserProfile(cred.user, 'password');
  return cred.user;
}

/**
 * Create a new Firebase account with Email & Password
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const cleanName = displayName?.trim();
  if (cleanName) {
    await updateProfile(cred.user, { displayName: cleanName.slice(0, 128) });
  }
  await upsertUserProfile(cred.user, 'password', cleanName);
  return cred.user;
}

/**
 * Start a zero-friction Firebase Anonymous Cloud Session
 */
export async function signInGuestFirebase(): Promise<User> {
  const cred = await signInAnonymously(auth);
  await upsertUserProfile(cred.user, 'anonymous', 'Guest Cloud Session');
  return cred.user;
}

/**
 * Send password reset email via Firebase Auth
 */
export async function sendFirebasePasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Save a chat message to Firestore under users/{userId}/chatHistory/{messageId}
 */
export async function saveChatMessage(
  userId: string,
  msg: ChatMessage
): Promise<void> {
  const safeId = sanitizeId(msg.id, 'msg').slice(0, 64);
  const path = `users/${userId}/chatHistory/${safeId}`;
  const ref = doc(db, 'users', userId, 'chatHistory', safeId);
  const sources = Array.isArray(msg.sources) ? msg.sources.slice(0, 25) : [];
  const text = (msg.text || '').slice(0, 12000);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, { text, sources });
    } else {
      await setDoc(ref, {
        id: safeId,
        userId,
        role: msg.role,
        text,
        sources,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Load persistent chat history from Firestore for the logged-in Firebase user
 */
export async function getUserChatHistory(
  userId: string
): Promise<ChatMessage[]> {
  const path = `users/${userId}/chatHistory`;
  try {
    const q = query(
      collection(db, 'users', userId, 'chatHistory'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const records: Array<ChatMessage & { _createdAt: string }> = [];
    snapshot.forEach((snap) => {
      const d = snap.data();
      records.push({
        id: d.id || snap.id,
        role: d.role,
        text: d.text,
        sources: Array.isArray(d.sources) ? (d.sources as GroundingSource[]) : [],
        _createdAt: typeof d.createdAt === 'string' ? d.createdAt : '',
      });
    });
    records.sort((a, b) => a._createdAt.localeCompare(b._createdAt));
    return records.map(({ _createdAt: _unused, ...rest }) => rest);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

/**
 * Sync custom saved documents to Firestore
 */
export async function saveUserDoc(
  userId: string,
  docItem: ArchiveDocument
): Promise<void> {
  const safeId = sanitizeId(docItem.id, 'doc');
  const path = `users/${userId}/savedDocs/${safeId}`;
  const ref = doc(db, 'users', userId, 'savedDocs', safeId);

  const payloadFields = {
    code: (docItem.code || 'DOC-00').slice(0, 32),
    title: (docItem.title || 'Untitled Brief').slice(0, 256),
    category: (docItem.category || 'Saved Files').slice(0, 64),
    summary: (docItem.summary || '').slice(0, 1024),
    content: (docItem.content || '').slice(0, 30000),
    tweetDraft: (docItem.tweetDraft || '').slice(0, 1024),
    fileName: (docItem.fileName || 'archive-brief.md').slice(0, 128),
  };

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, payloadFields);
    } else {
      await setDoc(ref, {
        id: safeId,
        userId,
        ...payloadFields,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserDocs(userId: string): Promise<ArchiveDocument[]> {
  const path = `users/${userId}/savedDocs`;
  try {
    const q = query(
      collection(db, 'users', userId, 'savedDocs'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const docs: ArchiveDocument[] = [];
    snapshot.forEach((snap) => {
      const d = snap.data();
      const content = typeof d.content === 'string' ? d.content : '';
      docs.push({
        id: d.id || snap.id,
        code: d.code,
        title: d.title,
        category: d.category,
        summary: d.summary,
        content,
        tweetDraft: d.tweetDraft,
        fileName: d.fileName,
        publishedAt: 'Firebase Synced',
        readTime: `${Math.max(1, Math.ceil(content.split(/\s+/).length / 180))} min read`,
        isCustom: true,
      });
    });
    return docs;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function deleteUserDoc(
  userId: string,
  docId: string
): Promise<void> {
  const safeId = sanitizeId(docId, 'doc');
  const path = `users/${userId}/savedDocs/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'savedDocs', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Sync live threat reports to user's Firestore subcollection
 */
export async function saveUserThreatReport(
  userId: string,
  report: CloudThreatReport
): Promise<void> {
  const safeId = sanitizeId(report.id, 'threat');
  const path = `users/${userId}/threatReports/${safeId}`;
  const ref = doc(db, 'users', userId, 'threatReports', safeId);

  const rawSev = (report.severity || 'HIGH').toUpperCase();
  const severity: 'CRITICAL' | 'HIGH' | 'MODERATE' =
    rawSev === 'CRITICAL' || rawSev === 'HIGH' || rawSev === 'MODERATE'
      ? rawSev
      : 'HIGH';

  const antidote = Array.isArray(report.antidote) && report.antidote.length > 0
    ? report.antidote.slice(0, 10).map((s) => String(s).slice(0, 512))
    : ['Verify typed data and contract allowances before signing.'];

  const mutableFields = {
    date: (report.date || new Date().toISOString().slice(0, 10)).slice(0, 32),
    title: (report.title || 'Web3 Threat Report').slice(0, 256),
    threatCategory: (report.threatCategory || 'Security Incident').slice(0, 64),
    severity,
    symptom: (report.symptom || '').slice(0, 1024),
    diagnosis: (report.diagnosis || '').slice(0, 2048),
    antidote,
    sourceUrl: (report.sourceUrl || 'https://rekt.news').slice(0, 512),
  };

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, mutableFields);
    } else {
      await setDoc(ref, {
        id: safeId,
        userId,
        ...mutableFields,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserThreatReports(
  userId: string
): Promise<CloudThreatReport[]> {
  const path = `users/${userId}/threatReports`;
  try {
    const q = query(
      collection(db, 'users', userId, 'threatReports'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const reports: CloudThreatReport[] = [];
    snapshot.forEach((snap) => {
      const d = snap.data();
      reports.push({
        id: d.id || snap.id,
        date: d.date,
        title: d.title,
        threatCategory: d.threatCategory,
        severity: d.severity,
        symptom: d.symptom,
        diagnosis: d.diagnosis,
        antidote: Array.isArray(d.antidote) ? d.antidote : [],
        sourceUrl: d.sourceUrl,
      });
    });
    reports.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return reports;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export { onAuthStateChanged };
