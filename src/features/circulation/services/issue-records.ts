import {
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { db } from '@/shared/firebase/client';
import type {
  Book,
  IssueRecord,
  IssueRecordWithDetails,
  Student,
} from '@/shared/types';

export async function issueBook(bookId: string, studentId: string, dueDate: string): Promise<string> {
  return runTransaction(db, async (transaction) => {
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await transaction.get(bookRef);

    if (!bookSnap.exists()) {
      throw new Error('Book not found');
    }

    const bookData = bookSnap.data() as Book;
    if (bookData.is_archived) {
      throw new Error('This book is archived and cannot be issued');
    }

    const issuesRef = collection(db, 'issue_records');
    const activeIssuesSnap = await getDocsFromServer(
      query(issuesRef, where('book_id', '==', bookId), where('return_date', '==', null))
    );

    if (activeIssuesSnap.size >= bookData.total_copies) {
      throw new Error(`No available copies left. (Total: ${bookData.total_copies}, Issued: ${activeIssuesSnap.size})`);
    }

    const newIssueRef = doc(collection(db, 'issue_records'));
    const issueDate = new Date().toISOString().split('T')[0];

    transaction.update(bookRef, {
      inventory_revision: (bookData.inventory_revision ?? 0) + 1,
      updated_at: new Date().toISOString(),
    });
    transaction.set(newIssueRef, {
      book_id: bookId,
      student_id: studentId,
      issue_date: issueDate,
      due_date: dueDate,
      return_date: null,
      created_at: new Date().toISOString(),
    });

    return newIssueRef.id;
  });
}

export async function returnBook(issueRecordId: string): Promise<boolean> {
  const recordRef = doc(db, 'issue_records', issueRecordId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(recordRef);
    if (!snap.exists()) {
      throw new Error('Issue record not found');
    }

    const record = snap.data() as IssueRecord;
    if (record.return_date) {
      throw new Error('This book has already been returned');
    }

    transaction.update(recordRef, {
      return_date: new Date().toISOString().split('T')[0],
    });
  });

  return true;
}

export async function getIssueRecords(filters?: {
  bookId?: string;
  studentId?: string;
  activeOnly?: boolean;
}): Promise<IssueRecordWithDetails[]> {
  const issuesRef = collection(db, 'issue_records');
  const snapshot = await getDocs(issuesRef);

  const records: IssueRecord[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<IssueRecord, 'id'>),
  }));

  const [booksSnap, studentsSnap] = await Promise.all([
    getDocs(collection(db, 'books')),
    getDocs(collection(db, 'students')),
  ]);

  const booksMap: Record<string, Book> = {};
  booksSnap.forEach((d) => {
    booksMap[d.id] = { id: d.id, ...(d.data() as Omit<Book, 'id'>) };
  });

  const studentsMap: Record<string, Student> = {};
  studentsSnap.forEach((d) => {
    studentsMap[d.id] = { id: d.id, ...(d.data() as Omit<Student, 'id'>) };
  });

  let joined: IssueRecordWithDetails[] = records.map((record) => {
    const book = booksMap[record.book_id] || {
      id: record.book_id,
      title: 'Unknown Title',
      author: 'Unknown Author',
      subject: 'General',
    };
    const student = studentsMap[record.student_id] || {
      id: record.student_id,
      full_name: 'Unknown Student',
      admission_number: 'N/A',
      class_name: 'N/A',
      section: 'N/A',
    };

    return {
      ...record,
      book,
      student,
    };
  });

  if (filters?.bookId) {
    joined = joined.filter((record) => record.book_id === filters.bookId);
  }
  if (filters?.studentId) {
    joined = joined.filter((record) => record.student_id === filters.studentId);
  }
  if (filters?.activeOnly) {
    joined = joined.filter((record) => !record.return_date);
  }

  joined.sort(
    (a, b) => new Date(b.created_at || b.issue_date).getTime() - new Date(a.created_at || a.issue_date).getTime()
  );

  return joined;
}
