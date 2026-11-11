import { z } from 'zod';

// ============================================================
// Zod Validation Schemas
// ============================================================

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const bookSchema = z.object({
  title: z.string().min(1, 'Book title is required').max(255),
  author: z.string().min(1, 'Author is required').max(255),
  subject: z.string().min(1, 'Subject/Category is required').max(100),
  class_grade: z.string().max(50).optional().or(z.literal('')),
  publisher: z.string().max(255).optional().or(z.literal('')),
  isbn: z.string().max(20).optional().or(z.literal('')),
  total_copies: z
    .number({ invalid_type_error: 'Must be a number' })
    .int('Must be a whole number')
    .min(1, 'Must have at least 1 copy'),
});

export const studentSchema = z.object({
  full_name: z.string().min(1, 'Student name is required').max(255),
  admission_number: z.string().min(1, 'Admission number is required').max(50),
  class_name: z.string().min(1, 'Class is required').max(50),
  section: z.string().min(1, 'Section is required').max(10),
});

export const issueBookSchema = z.object({
  book_id: z.string().uuid('Invalid book selection'),
  student_id: z.string().uuid('Invalid student selection'),
  due_date: z.string().min(1, 'Due date is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type BookFormInput = z.infer<typeof bookSchema>;
export type StudentFormInput = z.infer<typeof studentSchema>;
export type IssueBookFormInput = z.infer<typeof issueBookSchema>;
