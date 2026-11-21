import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/shared/firebase/client';
import { withFirestoreTimeout } from '@/shared/firebase/firestore-timeout';
import type { Book, DashboardStats, IssueRecord } from '@/shared/types';

export async function getDashboardStats(): Promise<DashboardStats> {
  const [booksSnap, studentsSnap, issuesSnap] = await Promise.all([
    withFirestoreTimeout(getDocs(collection(db, 'books')), 'Loading dashboard books'),
    withFirestoreTimeout(getDocs(collection(db, 'students')), 'Loading dashboard students'),
    withFirestoreTimeout(getDocs(collection(db, 'issue_records')), 'Loading dashboard loans'),
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
