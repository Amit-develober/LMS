import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { db } from '@/shared/firebase/client';
import type { Book, BookWithAvailability } from '@/shared/types';

export async function getBooks(
  search?: string,
  subjectFilter?: string,
  showArchived = false
): Promise<BookWithAvailability[]> {
  const booksRef = collection(db, 'books');
  const q = query(booksRef, where('is_archived', '==', showArchived));
  const snapshot = await getDocs(q);

  let books: Book[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Book, 'id'>),
  }));

  if (search) {
    const s = search.toLowerCase();
    books = books.filter(
      (book) =>
        book.title?.toLowerCase().includes(s) ||
        book.author?.toLowerCase().includes(s) ||
        book.isbn?.toLowerCase().includes(s)
    );
  }

  if (subjectFilter) {
    books = books.filter((book) => book.subject === subjectFilter);
  }

  const issuesRef = collection(db, 'issue_records');
  const activeIssuesSnapshot = await getDocs(query(issuesRef, where('return_date', '==', null)));
  const issuedCountMap: Record<string, number> = {};

  activeIssuesSnapshot.forEach((issue) => {
    const data = issue.data();
    if (data.book_id) {
      issuedCountMap[data.book_id] = (issuedCountMap[data.book_id] || 0) + 1;
    }
  });

  return books.map((book) => {
    const issued = issuedCountMap[book.id] || 0;
    return {
      ...book,
      issued_copies: issued,
      available_copies: Math.max(0, (book.total_copies || 0) - issued),
    };
  });
}

export async function getBookById(id: string): Promise<BookWithAvailability | null> {
  const bookRef = doc(db, 'books', id);
  const snap = await getDoc(bookRef);
  if (!snap.exists()) return null;

  const book = { id: snap.id, ...(snap.data() as Omit<Book, 'id'>) };
  const issuesRef = collection(db, 'issue_records');
  const activeIssues = await getDocsFromServer(
    query(issuesRef, where('book_id', '==', id), where('return_date', '==', null))
  );
  const issued = activeIssues.size;

  return {
    ...book,
    issued_copies: issued,
    available_copies: Math.max(0, (book.total_copies || 0) - issued),
  };
}

export async function getBookByQrToken(qrToken: string): Promise<BookWithAvailability | null> {
  const booksRef = collection(db, 'books');
  const q = query(booksRef, where('qr_token', '==', qrToken));
  const snap = await getDocs(q);

  if (snap.empty) return null;
  return getBookById(snap.docs[0].id);
}

export async function addBook(
  bookData: Omit<Book, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  const booksRef = collection(db, 'books');
  const docRef = await addDoc(booksRef, {
    ...bookData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return docRef.id;
}

export async function updateBook(
  id: string,
  updates: Partial<Omit<Book, 'id' | 'created_at' | 'qr_token'>>
): Promise<void> {
  const bookRef = doc(db, 'books', id);
  await runTransaction(db, async (transaction) => {
    const bookSnap = await transaction.get(bookRef);
    if (!bookSnap.exists()) {
      throw new Error('Book not found');
    }

    const book = bookSnap.data() as Book;
    const proposedTotal = updates.total_copies ?? book.total_copies;
    const activeIssues = await getDocsFromServer(
      query(
        collection(db, 'issue_records'),
        where('book_id', '==', id),
        where('return_date', '==', null)
      )
    );

    if (proposedTotal < activeIssues.size) {
      throw new Error(`Total copies cannot be less than the ${activeIssues.size} active loans`);
    }

    transaction.update(bookRef, {
      ...updates,
      inventory_revision: (book.inventory_revision ?? 0) + 1,
      updated_at: new Date().toISOString(),
    });
  });
}
