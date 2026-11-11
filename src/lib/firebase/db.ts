import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db } from './client';
import type {
  Book,
  BookWithAvailability,
  Student,
  StudentWithBorrowInfo,
  IssueRecord,
  IssueRecordWithDetails,
  DashboardStats,
} from '@/types';

// ============================================================
// Firebase Firestore Database Layer
// ============================================================

// --- BOOKS ---

export async function getBooks(search?: string, subjectFilter?: string, showArchived = false): Promise<BookWithAvailability[]> {
  const booksRef = collection(db, 'books');
  const q = query(booksRef, where('is_archived', '==', showArchived));
  const snapshot = await getDocs(q);

  let books: Book[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Book, 'id'>),
  }));

  // Client-side text filter
  if (search) {
    const s = search.toLowerCase();
    books = books.filter(
      (b) =>
        b.title?.toLowerCase().includes(s) ||
        b.author?.toLowerCase().includes(s) ||
        b.isbn?.toLowerCase().includes(s)
    );
  }

  if (subjectFilter) {
    books = books.filter((b) => b.subject === subjectFilter);
  }

  // Get active issues for availability calculation
  const issuesRef = collection(db, 'issue_records');
  const activeIssuesSnapshot = await getDocs(query(issuesRef, where('return_date', '==', null)));
  const issuedCountMap: Record<string, number> = {};

  activeIssuesSnapshot.forEach((doc) => {
    const data = doc.data();
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
  const activeIssues = await getDocs(
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
  const firstDoc = snap.docs[0];
  return await getBookById(firstDoc.id);
}

export async function addBook(bookData: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const booksRef = collection(db, 'books');
  const docRef = await addDoc(booksRef, {
    ...bookData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return docRef.id;
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<void> {
  const bookRef = doc(db, 'books', id);
  await updateDoc(bookRef, {
    ...updates,
    updated_at: new Date().toISOString(),
  });
}

// --- STUDENTS ---

export async function getStudents(search?: string, classNameFilter?: string): Promise<StudentWithBorrowInfo[]> {
  const studentsRef = collection(db, 'students');
  const snapshot = await getDocs(studentsRef);

  let students: Student[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Student, 'id'>),
  }));

  if (search) {
    const s = search.toLowerCase();
    students = students.filter(
      (st) =>
        st.full_name?.toLowerCase().includes(s) ||
        st.admission_number?.toLowerCase().includes(s)
    );
  }

  if (classNameFilter) {
    students = students.filter((st) => st.class_name === classNameFilter);
  }

  // Get active borrows per student
  const issuesRef = collection(db, 'issue_records');
  const allIssuesSnapshot = await getDocs(issuesRef);
  const activeMap: Record<string, number> = {};
  const totalMap: Record<string, number> = {};

  allIssuesSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.student_id) {
      totalMap[data.student_id] = (totalMap[data.student_id] || 0) + 1;
      if (!data.return_date) {
        activeMap[data.student_id] = (activeMap[data.student_id] || 0) + 1;
      }
    }
  });

  return students.map((st) => ({
    ...st,
    active_borrows: activeMap[st.id] || 0,
    total_borrows: totalMap[st.id] || 0,
  }));
}

export async function getStudentById(id: string): Promise<StudentWithBorrowInfo | null> {
  const studentRef = doc(db, 'students', id);
  const snap = await getDoc(studentRef);
  if (!snap.exists()) return null;

  const st = { id: snap.id, ...(snap.data() as Omit<Student, 'id'>) };

  const issuesRef = collection(db, 'issue_records');
  const snapIssues = await getDocs(query(issuesRef, where('student_id', '==', id)));

  let active = 0;
  snapIssues.forEach((d) => {
    if (!d.data().return_date) active++;
  });

  return {
    ...st,
    active_borrows: active,
    total_borrows: snapIssues.size,
  };
}

export async function addStudent(studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const studentsRef = collection(db, 'students');
  const docRef = await addDoc(studentsRef, {
    ...studentData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return docRef.id;
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<void> {
  const studentRef = doc(db, 'students', id);
  await updateDoc(studentRef, {
    ...updates,
    updated_at: new Date().toISOString(),
  });
}

// --- BOOK ISSUING & RETURNS (TRANSACTIONS) ---

export async function issueBook(bookId: string, studentId: string, dueDate: string): Promise<string> {
  return await runTransaction(db, async (transaction) => {
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await transaction.get(bookRef);

    if (!bookSnap.exists()) {
      throw new Error('Book not found');
    }

    const bookData = bookSnap.data() as Book;
    if (bookData.is_archived) {
      throw new Error('This book is archived and cannot be issued');
    }

    // Check active issues
    const issuesRef = collection(db, 'issue_records');
    const activeIssuesSnap = await getDocs(
      query(issuesRef, where('book_id', '==', bookId), where('return_date', '==', null))
    );

    if (activeIssuesSnap.size >= bookData.total_copies) {
      throw new Error(`No available copies left. (Total: ${bookData.total_copies}, Issued: ${activeIssuesSnap.size})`);
    }

    const newIssueRef = doc(collection(db, 'issue_records'));
    const issueDate = new Date().toISOString().split('T')[0];

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
  const snap = await getDoc(recordRef);

  if (!snap.exists()) {
    throw new Error('Issue record not found');
  }

  const record = snap.data() as IssueRecord;
  if (record.return_date) {
    throw new Error('This book has already been returned');
  }

  const returnDate = new Date().toISOString().split('T')[0];
  await updateDoc(recordRef, {
    return_date: returnDate,
  });

  return true;
}

// --- ISSUE RECORDS WITH DETAILS ---

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

  // Fetch all books & students to join
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

  let joined: IssueRecordWithDetails[] = records.map((r) => {
    const book = booksMap[r.book_id] || {
      id: r.book_id,
      title: 'Unknown Title',
      author: 'Unknown Author',
      subject: 'General',
    };
    const student = studentsMap[r.student_id] || {
      id: r.student_id,
      full_name: 'Unknown Student',
      admission_number: 'N/A',
      class_name: 'N/A',
      section: 'N/A',
    };

    return {
      ...r,
      book,
      student,
    };
  });

  if (filters?.bookId) {
    joined = joined.filter((r) => r.book_id === filters.bookId);
  }
  if (filters?.studentId) {
    joined = joined.filter((r) => r.student_id === filters.studentId);
  }
  if (filters?.activeOnly) {
    joined = joined.filter((r) => !r.return_date);
  }

  // Sort descending by created_at / issue_date
  joined.sort((a, b) => new Date(b.created_at || b.issue_date).getTime() - new Date(a.created_at || a.issue_date).getTime());

  return joined;
}

// --- DASHBOARD STATS ---

export async function getDashboardStats(): Promise<DashboardStats> {
  const [booksSnap, studentsSnap, issuesSnap] = await Promise.all([
    getDocs(collection(db, 'books')),
    getDocs(collection(db, 'students')),
    getDocs(collection(db, 'issue_records')),
  ]);

  let totalPhysicalCopies = 0;
  let totalBookTitles = 0;

  booksSnap.forEach((doc) => {
    const data = doc.data() as Book;
    if (!data.is_archived) {
      totalBookTitles++;
      totalPhysicalCopies += Number(data.total_copies) || 0;
    }
  });

  let issuedCopies = 0;
  issuesSnap.forEach((doc) => {
    const data = doc.data() as IssueRecord;
    if (!data.return_date) {
      issuedCopies++;
    }
  });

  return {
    total_book_titles: totalBookTitles,
    total_physical_copies: totalPhysicalCopies,
    issued_copies: issuedCopies,
    available_copies: Math.max(0, totalPhysicalCopies - issuedCopies),
    total_students: studentsSnap.size,
  };
}
