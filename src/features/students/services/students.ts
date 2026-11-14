import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/shared/firebase/client';
import type { Student, StudentWithBorrowInfo } from '@/shared/types';

export async function getStudents(
  search?: string,
  classNameFilter?: string
): Promise<StudentWithBorrowInfo[]> {
  const studentsRef = collection(db, 'students');
  const snapshot = await getDocs(studentsRef);

  let students: Student[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Student, 'id'>),
  }));

  if (search) {
    const s = search.toLowerCase();
    students = students.filter(
      (student) =>
        student.full_name?.toLowerCase().includes(s) ||
        student.admission_number?.toLowerCase().includes(s)
    );
  }

  if (classNameFilter) {
    students = students.filter((student) => student.class_name === classNameFilter);
  }

  const issuesRef = collection(db, 'issue_records');
  const allIssuesSnapshot = await getDocs(issuesRef);
  const activeMap: Record<string, number> = {};
  const totalMap: Record<string, number> = {};

  allIssuesSnapshot.forEach((issue) => {
    const data = issue.data();
    if (data.student_id) {
      totalMap[data.student_id] = (totalMap[data.student_id] || 0) + 1;
      if (!data.return_date) {
        activeMap[data.student_id] = (activeMap[data.student_id] || 0) + 1;
      }
    }
  });

  return students.map((student) => ({
    ...student,
    active_borrows: activeMap[student.id] || 0,
    total_borrows: totalMap[student.id] || 0,
  }));
}

export async function getStudentById(id: string): Promise<StudentWithBorrowInfo | null> {
  const studentRef = doc(db, 'students', id);
  const snap = await getDoc(studentRef);
  if (!snap.exists()) return null;

  const student = { id: snap.id, ...(snap.data() as Omit<Student, 'id'>) };
  const issuesRef = collection(db, 'issue_records');
  const issues = await getDocs(query(issuesRef, where('student_id', '==', id)));

  let active = 0;
  issues.forEach((issue) => {
    if (!issue.data().return_date) active++;
  });

  return {
    ...student,
    active_borrows: active,
    total_borrows: issues.size,
  };
}

export async function addStudent(
  studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
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
