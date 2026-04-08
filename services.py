import os
import json
import hashlib
from datetime import datetime, timedelta
import sys

# For data, we want it to persist next to the executable, NOT in the temp folder
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(__file__)

DATA_DIR = os.path.join(BASE_DIR, 'data')
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
BOOKS_FILE = os.path.join(DATA_DIR, 'books.json')
ISSUES_FILE = os.path.join(DATA_DIR, 'issues.json')

def ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    
    if not os.path.exists(USERS_FILE):
        salt = os.urandom(16).hex()
        pwd_hash = hash_password('admin', salt)
        init_data(USERS_FILE, [{"username": "admin", "password_hash": pwd_hash, "salt": salt, "role": "admin"}])
    
    if not os.path.exists(BOOKS_FILE):
        init_data(BOOKS_FILE, [])
        
    if not os.path.exists(ISSUES_FILE):
        init_data(ISSUES_FILE, [])

def hash_password(password, salt):
    return hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()

def verify_password(stored_password, provided_password, salt):
    return stored_password == hash_password(provided_password, salt)

def read_json_atomic(filepath):
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def write_json_atomic(filepath, data):
    tmp_filepath = filepath + '.tmp'
    try:
        with open(tmp_filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        os.replace(tmp_filepath, filepath)
    except Exception as e:
        if os.path.exists(tmp_filepath):
            os.remove(tmp_filepath)
        raise e

def init_data(filepath, default_data):
    write_json_atomic(filepath, default_data)

def generate_issue_id():
    return datetime.now().strftime("%Y%m%d%H%M%S%f")

def calculate_overdue_days(due_date_str):
    try:
        due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
        now = datetime.now()
        delta = now - due_date
        return max(0, delta.days)
    except ValueError:
        return 0

# --- User Management ---

def authenticate(username, password):
    users = read_json_atomic(USERS_FILE)
    for u in users:
        if u['username'] == username:
            if verify_password(u['password_hash'], password, u['salt']):
                return {"username": u['username'], "role": u['role']}
    return None

def change_password(username, old_password, new_password):
    users = read_json_atomic(USERS_FILE)
    for u in users:
        if u['username'] == username:
            if verify_password(u['password_hash'], old_password, u['salt']):
                salt = os.urandom(16).hex()
                u['salt'] = salt
                u['password_hash'] = hash_password(new_password, salt)
                write_json_atomic(USERS_FILE, users)
                return True
            else:
                raise Exception("Incorrect current password")
    raise Exception("User not found")

def list_users():
    users = read_json_atomic(USERS_FILE)
    return [{"username": u['username'], "role": u['role']} for u in users]

# --- Book Management ---

def get_books():
    return read_json_atomic(BOOKS_FILE)

def add_book(book):
    books = get_books()
    for b in books:
        if str(b.get('id')) == str(book.get('id')):
            raise Exception("Book with this ID already exists")
            
    clean_book = {
        "id": str(book.get('id')),
        "title": str(book.get('title', ''))[:150],
        "author": str(book.get('author', ''))[:100],
        "date": str(book.get('date', ''))[:20],
        "copies": int(book.get('copies', 1))
    }
    books.append(clean_book)
    write_json_atomic(BOOKS_FILE, books)
    return clean_book

def delete_book(book_id):
    issues = get_issues()
    if any(str(i['book_id']) == str(book_id) and i['status'] == 'issued' for i in issues):
        raise Exception("Cannot delete a book that is currently issued")

    books = get_books()
    initial_len = len(books)
    books = [b for b in books if str(b.get('id')) != str(book_id)]
    if len(books) < initial_len:
        write_json_atomic(BOOKS_FILE, books)
        return True
    return False

def update_book(book_id, update_data):
    books = get_books()
    for b in books:
        if str(b.get('id')) == str(book_id):
            b['title'] = str(update_data.get('title', b.get('title')))[:150]
            b['author'] = str(update_data.get('author', b.get('author')))[:100]
            b['date'] = str(update_data.get('date', b.get('date')))[:20]
            if 'copies' in update_data:
                b['copies'] = int(update_data.get('copies', 1))
            write_json_atomic(BOOKS_FILE, books)
            return b
    raise Exception("Book not found")

# --- Issue Management ---

def get_issues():
    return read_json_atomic(ISSUES_FILE)

def issue_book(book_id, student_name, student_class, section, student_id):
    books = get_books()
    book = next((b for b in books if str(b['id']) == str(book_id)), None)
    if not book:
        raise Exception("Book does not exist")
    
    issues = get_issues()
    active_issues = sum(1 for i in issues if str(i['book_id']) == str(book_id) and i['status'] == 'issued')
    if active_issues >= int(book.get('copies', 1)):
        raise Exception("No more copies of this book are available")

    issue_id = generate_issue_id()
    issue_date = datetime.now()
    due_date = issue_date + timedelta(days=14)
    
    issue = {
        "id": str(issue_id),
        "book_id": str(book_id)[:50],
        "student_name": str(student_name)[:100],
        "student_class": str(student_class)[:20],
        "section": str(section)[:10],
        "student_id": str(student_id)[:50],
        "issue_date": issue_date.strftime("%Y-%m-%d"),
        "due_date": due_date.strftime("%Y-%m-%d"),
        "status": "issued"
    }
    issues.append(issue)
    write_json_atomic(ISSUES_FILE, issues)
    return issue

def return_book(issue_id):
    issues = get_issues()
    for issue in issues:
        if str(issue['id']) == str(issue_id) and issue['status'] == 'issued':
            issue['status'] = 'returned'
            issue['return_date'] = datetime.now().strftime("%Y-%m-%d")
            write_json_atomic(ISSUES_FILE, issues)
            return issue
    return None

# Global call removed

