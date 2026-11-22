import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/shared/firebase/client';
import { withFirestoreTimeout } from '@/shared/firebase/firestore-timeout';
import type { Student, StudentWithBorrowInfo } from '@/shared/types';

export async function getStudents(
  search?: string,
  classNameFilter?: string
): Promise<StudentWithBorrowInfo[]> {
  const studentsRef = collection(db, 'students');
  const snapshot = await withFirestoreTimeout(getDocs(studentsRef), 'Loading students');

  let students: Student[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Student, 'id'>),
  }));

  if (search) {
    const s = search.trim().toLowerCase();
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
  const allIssuesSnapshot = await withFirestoreTimeout(
    getDocs(issuesRef),
    'Loading student loan records'
  );
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

export async function searchStudents(search: string): Promise<Student[]> {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return [];

  const snapshot = await withFirestoreTimeout(
    getDocs(collection(db, 'students')),
    'Searching students'
  );

  return snapshot.docs
    .map((studentDoc) => ({
      id: studentDoc.id,
      ...(studentDoc.data() as Omit<Student, 'id'>),
    }))
    .filter(
      (student) =>
        student.full_name?.toLowerCase().includes(normalizedSearch) ||
        student.admission_number?.toLowerCase().includes(normalizedSearch)
    );
}

export async function getStudentById(id: string): Promise<StudentWithBorrowInfo | null> {
  const studentRef = doc(db, 'students', id);
  const snap = await withFirestoreTimeout(getDoc(studentRef), 'Loading student details');
  if (!snap.exists()) return null;

  const student = { id: snap.id, ...(snap.data() as Omit<Student, 'id'>) };
  const issuesRef = collection(db, 'issue_records');
  const issues = await withFirestoreTimeout(
    getDocs(query(issuesRef, where('student_id', '==', id))),
    'Loading student loan history'
  );

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
  studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>,
  studentId = doc(collection(db, 'students')).id
): Promise<string> {
  const studentRef = doc(db, 'students', studentId);
  const now = new Date().toISOString();
  await withFirestoreTimeout(setDoc(studentRef, {
    ...studentData,
    created_at: now,
    updated_at: now,
  }), 'Registering student');
  return studentRef.id;
}

export async function updateStudent(
  id: string,
  updates: Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const studentRef = doc(db, 'students', id);
  await withFirestoreTimeout(updateDoc(studentRef, {
    ...updates,
    updated_at: new Date().toISOString(),
  }), 'Updating student');
}
