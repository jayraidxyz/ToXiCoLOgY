import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { ChatMessage, GroundingSource } from '../components/ResearchChatPanel';
import type { ArchiveDocument } from '../data/archive';

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

// CRITICAL: Must pass databaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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

/**
 * Sign in using Google Auth popup (works reliably inside AI Studio iframe)
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = cred.user;

    // Save or update user profile document
    const userDocPath = `users/${user.uid}`;
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          userId: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Toxicology User',
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, userDocPath);
    }

    return user;
  } catch (err: unknown) {
    console.error('Google Sign-In failed:', err);
    throw err;
  }
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
  const path = `users/${userId}/chatHistory/${msg.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'chatHistory', msg.id), {
      id: msg.id,
      userId,
      role: msg.role,
      text: msg.text,
      sources: msg.sources || [],
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/**
 * Load persistent chat history from Firestore for the logged-in user
 */
export async function getUserChatHistory(
  userId: string
): Promise<ChatMessage[]> {
  const path = `users/${userId}/chatHistory`;
  try {
    const q = query(
      collection(db, 'users', userId, 'chatHistory'),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    const messages: ChatMessage[] = [];
    snapshot.forEach((snap) => {
      const d = snap.data();
      messages.push({
        id: d.id || snap.id,
        role: d.role,
        text: d.text,
        sources: Array.isArray(d.sources) ? (d.sources as GroundingSource[]) : [],
      });
    });
    return messages;
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
  const path = `users/${userId}/savedDocs/${docItem.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'savedDocs', docItem.id), {
      id: docItem.id,
      userId,
      code: docItem.code,
      title: docItem.title,
      category: docItem.category,
      summary: docItem.summary,
      content: docItem.content,
      tweetDraft: docItem.tweetDraft || '',
      fileName: docItem.fileName,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserDocs(userId: string): Promise<ArchiveDocument[]> {
  const path = `users/${userId}/savedDocs`;
  try {
    const snapshot = await getDocs(
      collection(db, 'users', userId, 'savedDocs')
    );
    const docs: ArchiveDocument[] = [];
    snapshot.forEach((snap) => {
      const d = snap.data();
      docs.push({
        id: d.id || snap.id,
        code: d.code,
        title: d.title,
        category: d.category,
        summary: d.summary,
        content: d.content,
        tweetDraft: d.tweetDraft,
        fileName: d.fileName,
        publishedAt: 'Cloud Synced',
        readTime: `${Math.max(1, Math.ceil(d.content.split(/\s+/).length / 180))} min read`,
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
  const path = `users/${userId}/savedDocs/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'savedDocs', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export { onAuthStateChanged };
