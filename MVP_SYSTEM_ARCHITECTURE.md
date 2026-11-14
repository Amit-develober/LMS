# QR Library Management System — MVP Architecture

## 1. Product goal

Digitize the daily work of one school library and its librarian: maintain a book catalogue and student directory, issue and return loans, and see reliable inventory and borrowing history.

The defining rule is **one QR code per book title/edition, not per physical copy**. All copies of a catalogue entry share the same opaque QR token. Scanning identifies the title; it cannot identify which physical copy or borrower is returning it.

## 2. MVP scope

### Included

- One school library and librarian account.
- Librarian sign-in and protected management screens.
- Book catalogue: add, search, edit, archive, copy count, and printable shared QR.
- Student directory: add, search, and view borrowing history.
- Issue a selected book title to a selected student with a due date.
- Scan a QR code or enter its token manually to look up a title.
- Return by selecting the active loan (student + book), then confirming.
- Dashboard counts, active/overdue/returned history, and CSV export.

### Not included in the MVP

- Student or parent accounts, notifications, fines/payments, reservations, multiple branches, per-copy barcodes, or third-party integrations.

## 3. Target architecture

```text
Librarian browser
  ├─ Next.js App Router UI (TypeScript, React, Tailwind)
  │    ├─ Authenticated dashboard and catalogue workflows
  │    ├─ QR rendering and browser camera/manual-token scanning
  │    └─ Form validation (React Hook Form + Zod)
  ├─ Firebase Authentication session
  └─ Firebase client (public web config)
       └─ Cloud Firestore + UID-restricted Security Rules
            ├─ books
            ├─ students
            └─ issue_records
```

The MVP uses Firebase Auth and Firestore. Browser route checks are only a user-experience measure; deployed Firestore Security Rules authorize every database operation. The MVP's single librarian account is allowlisted by UID in the rules.

## 4. Data model and inventory

- **Firebase Auth**: one provisioned librarian account for the single-library MVP.
- **`books` collection**: one document per title/edition; metadata, `total_copies`, archive state, and one unique random `qr_token`.
- **`students` collection**: admission number, name, class, and section.
- **`issue_records` collection**: one loan per student and book, with issue date, due date, and nullable return date.

Do not store an independently editable available-copy count:

```text
issued_copies   = count(issue_records where return_date is null for the book)
available_copies = max(0, total_copies - issued_copies)
overdue          = return_date is null and due_date < today
```

Issuing uses a Firestore transaction that updates an `inventory_revision` on the book document as a contention lock, fetches the active loans from the server, rejects archived or unavailable titles, then creates the loan. Concurrent issue/edit transactions contend on that book document and retry against the latest loans. The revision is only a concurrency token; availability remains derived from active loan records. Returning transactionally updates one active issue record and rejects missing/already-returned records.

## 5. Main workflows

1. **Register a title** → validate metadata and copy count → create one book row and random QR token → print that same QR for every copy.
2. **Issue** → find/scan title → select student and due date → atomic issue operation → availability is recomputed from active loans.
3. **Return** → scan/lookup title → list active loans for that title → librarian selects the actual borrower → return that loan.
4. **Review** → dashboard/history queries aggregate loans; overdue status is derived from due date and nullable return date.

## 6. Security and credentials

- QR payloads contain only an opaque book token; never student names, IDs, or loan details.
- Enforce least privilege with Firestore Security Rules. Allow only the provisioned librarian UID to read and modify library data; all other access is denied.
- Firebase web app configuration (`NEXT_PUBLIC_FIREBASE_*`) is public client configuration, not a secret and not authorization. **Never expose a service-account private key** in client code, `NEXT_PUBLIC_*`, or committed files.
- Keep local credentials in `.env.local`; keep it ignored by Git. Commit only an empty `.env.example` with variable names and placeholders.
- The app has no public sign-up flow. Firestore rules explicitly allow only the configured librarian UID; creating other Firebase Auth accounts does not grant data access.
- No service-account key is needed by the browser app; do not download or commit one.
- If any real secret was committed or copied into a public artifact, remove it from the artifact and rotate/revoke it at its provider; deleting the text alone does not invalidate the credential.

## 7. Implementation status

The MVP keeps Next.js, Firebase Auth, and Firestore. Firebase is declared as an application dependency. Tailwind CSS is compiled locally by PostCSS instead of loading from a remote CDN. The project uses Webpack for now because the installed Windows SWC native binary fails to load, and Turbopack cannot run on WASM bindings. Non-MVP scope removed: the unused Supabase SQL prototype, school/library preference screen, public self-registration, default public demo assets, and a legacy root redirect middleware.

The app is sign-in only. Create the librarian in Firebase Console, replace the UID placeholder in `firestore.rules`, and deploy the rules before using real student data. Firestore rules and the database transaction—not the UI—are the data access and inventory safeguards.

## 8. Suggested verification before release

- Register a title with several copies; verify one QR is reused and remains stable when total copies change.
- Issue until no copies remain; verify a further issue is rejected, including concurrent attempts.
- Return the selected active loan; verify duplicate returns are rejected and history remains intact.
- Verify overdue status changes with the due date and returned loans are no longer active.
- Confirm an unlisted authenticated UID and unauthenticated users cannot read or change library records through direct database requests.
- Confirm no student information is encoded in the QR and no service-account private key is shipped to the browser.
