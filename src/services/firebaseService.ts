import { collection, doc, getDocs, updateDoc, increment, query, orderBy, addDoc, onSnapshot, where, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Game } from '../types';

export const getGames = async () => {
  const q = query(collection(db, 'games'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
};

export const updateGame = async (gameId: string, data: Partial<Game>) => {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, data);
};

export const addGame = async (data: Omit<Game, 'id'>) => {
  return await addDoc(collection(db, 'games'), data);
};

export const deleteGame = async (gameId: string) => {
  await deleteDoc(doc(db, 'games', gameId));
};

export const incrementDownloads = async (gameId: string) => {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, { downloads: increment(1) });
};

export const incrementViews = async (gameId: string) => {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, { views: increment(1) });
};
