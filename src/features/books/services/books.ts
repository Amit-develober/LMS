import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  query,
  runTransaction,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/shared/firebase/client';
import { withFirestoreTimeout } from '@/shared/firebase/firestore-timeout';
import type { Book, BookWithAvailability } from '@/shared/types';

export async function getBooks(
  search?: string,
  subjectFilter?: string,
  showArchived = false
): Promise<BookWithAvailability[]> {
  const booksRef = collection(db, 'books');
  const q = query(booksRef, where('is_archived', '==', showArchived));
  const issuesRef = collection(db, 'issue_records');
  const [snapshot, activeIssuesSnapshot] = await Promise.all([
    withFirestoreTimeout(getDocs(q), 'Loading books'),
    withFirestoreTimeout(
      getDocs(query(issuesRef, where('return_date', '==', null))),
      'Loading active loans'
    ),
  ]);

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
  const snap = await withFirestoreTimeout(getDoc(bookRef), 'Loading book details');
  if (!snap.exists()) return null;

  const book = { id: snap.id, ...(snap.data() as Omit<Book, 'id'>) };
  const issuesRef = collection(db, 'issue_records');
  const activeIssues = await withFirestoreTimeout(
    getDocsFromServer(
      query(issuesRef, where('book_id', '==', id), where('return_date', '==', null))
    ),
    'Loading active loans'
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
  const snap = await withFirestoreTimeout(getDocs(q), 'Looking up book QR code');

  if (snap.empty) return null;
  return getBookById(snap.docs[0].id);
}

export async function addBook(
  bookData: Omit<Book, 'id' | 'created_at' | 'updated_at'>,
  bookId = doc(collection(db, 'books')).id
): Promise<string> {
  const bookRef = doc(db, 'books', bookId);
  await withFirestoreTimeout(setDoc(bookRef, {
    ...bookData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }), 'Registering book');
  return bookRef.id;
}

export async function updateBook(
  id: string,
  updates: Partial<Omit<Book, 'id' | 'created_at' | 'qr_token'>>
): Promise<void> {
  const bookRef = doc(db, 'books', id);
  await runTransaction(db, async (transaction) => {
    const bookSnap = await withFirestoreTimeout(
      transaction.get(bookRef),
      'Loading book before updating'
    );
    if (!bookSnap.exists()) {
      throw new Error('Book not found');
    }

    const book = bookSnap.data() as Book;
    const proposedTotal = updates.total_copies ?? book.total_copies;
    const activeIssues = await withFirestoreTimeout(
      getDocsFromServer(
        query(
          collection(db, 'issue_records'),
          where('book_id', '==', id),
          where('return_date', '==', null)
        )
      ),
      'Checking active loans'
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
