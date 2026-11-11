// ============================================================
// Core Types for QR Library System
// ============================================================

// --- Database Row Types ---

export interface Book {
  id: string;
  title: string;
  author: string;
  subject: string;
  class_grade: string | null;
  publisher: string | null;
  isbn: string | null;
  total_copies: number;
  qr_token: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  admission_number: string;
  full_name: string;
  class_name: string;
  section: string;
  created_at: string;
  updated_at: string;
}

export interface IssueRecord {
  id: string;
  book_id: string;
  student_id: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  created_at: string;
}

// --- Joined / Computed Types ---

export interface IssueRecordWithDetails extends IssueRecord {
  book: Pick<Book, 'id' | 'title' | 'author' | 'subject'>;
  student: Pick<Student, 'id' | 'full_name' | 'admission_number' | 'class_name' | 'section'>;
}

export interface BookWithAvailability extends Book {
  issued_copies: number;
  available_copies: number;
}

export interface StudentWithBorrowInfo extends Student {
  active_borrows: number;
  total_borrows: number;
}

// --- Dashboard Stats ---

export interface DashboardStats {
  total_book_titles: number;
  total_physical_copies: number;
  available_copies: number;
  issued_copies: number;
  total_students: number;
}

// --- Form Input Types ---

export interface BookFormData {
  title: string;
  author: string;
  subject: string;
  class_grade?: string;
  publisher?: string;
  isbn?: string;
  total_copies: number;
}

export interface StudentFormData {
  full_name: string;
  admission_number: string;
  class_name: string;
  section: string;
}

export interface IssueBookFormData {
  book_id: string;
  student_id: string;
  due_date: string;
}
