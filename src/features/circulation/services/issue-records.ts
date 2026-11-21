import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  query,
  runTransaction,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/shared/firebase/client';
import { withFirestoreTimeout } from '@/shared/firebase/firestore-timeout';
import type {
  Book,
  IssueRecord,
  IssueRecordWithDetails,
  Student,
} from '@/shared/types';

export async function issueBook(bookId: string, studentId: string, dueDate: string): Promise<string> {
  return runTransaction(db, async (transaction) => {
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await withFirestoreTimeout(
      transaction.get(bookRef),
      'Loading book before issuing'
    );

    if (!bookSnap.exists()) {
      throw new Error('Book not found');
    }

    const bookData = bookSnap.data() as Book;
    if (bookData.is_archived) {
      throw new Error('This book is archived and cannot be issued');
    }

    const issuesRef = collection(db, 'issue_records');
    const activeIssuesSnap = await withFirestoreTimeout(
      getDocsFromServer(
        query(issuesRef, where('book_id', '==', bookId), where('return_date', '==', null))
      ),
      'Checking available copies'
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
    const snap = await withFirestoreTimeout(
      transaction.get(recordRef),
      'Loading issue record before return'
    );
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
  const constraints: QueryConstraint[] = [];

  if (filters?.bookId) {
    constraints.push(where('book_id', '==', filters.bookId));
  }
  if (filters?.studentId) {
    constraints.push(where('student_id', '==', filters.studentId));
  }
  if (filters?.activeOnly && !filters.bookId && !filters.studentId) {
    constraints.push(where('return_date', '==', null));
  }
  const issueQuery = constraints.length > 0 ? query(issuesRef, ...constraints) : query(issuesRef);

  const snapshot = await withFirestoreTimeout(getDocs(issueQuery), 'Loading issue history');

  const records: IssueRecord[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<IssueRecord, 'id'>),
  }));

  const booksMap: Record<string, Book> = {};
  const studentsMap: Record<string, Student> = {};
  const bookIds = Array.from(new Set(records.map((record) => record.book_id).filter(Boolean)));
  const studentIds = Array.from(new Set(records.map((record) => record.student_id).filter(Boolean)));

  await Promise.all([
    Promise.all(bookIds.map(async (id) => {
      const snap = await withFirestoreTimeout(
        getDoc(doc(db, 'books', id)),
        'Loading book details'
      );
      if (snap.exists()) {
        booksMap[id] = { id: snap.id, ...(snap.data() as Omit<Book, 'id'>) };
      }
    })),
    Promise.all(studentIds.map(async (id) => {
      const snap = await withFirestoreTimeout(
        getDoc(doc(db, 'students', id)),
        'Loading student details'
      );
      if (snap.exists()) {
        studentsMap[id] = { id: snap.id, ...(snap.data() as Omit<Student, 'id'>) };
      }
    })),
  ]);

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
