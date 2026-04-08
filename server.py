import http.server
import socketserver
import json
import os
import urllib.parse
from http import HTTPStatus
from datetime import datetime

import services

import sys

def get_resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(__file__)
    return os.path.join(base_path, relative_path)

PORT = 8000
PUBLIC_DIR = get_resource_path('public')

# In-memory session store (primitive)
SESSIONS = {}

class LMSRequestHandler(http.server.BaseHTTPRequestHandler):

    def send_json_response(self, status, data, headers=None):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        if headers:
            for k, v in headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token')
        self.end_headers()

    def get_session(self):
        token = self.headers.get('X-Session-Token')
        if token and token in SESSIONS:
            return SESSIONS[token]
        return None

    def handle_static(self, path):
        if path == '/':
            path = '/index.html'
        
        file_path = os.path.join(PUBLIC_DIR, path.lstrip('/'))
        
        if os.path.exists(file_path) and os.path.isfile(file_path):
            with open(file_path, 'rb') as f:
                content = f.read()
            self.send_response(HTTPStatus.OK)
            if path.endswith('.html'):
                self.send_header('Content-Type', 'text/html')
            elif path.endswith('.css'):
                self.send_header('Content-Type', 'text/css')
            elif path.endswith('.js'):
                self.send_header('Content-Type', 'application/javascript')
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path.startswith('/api/'):
            session = self.get_session()
            
            if not session:
                return self.send_json_response(HTTPStatus.UNAUTHORIZED, {"error": "Unauthorized"})

            if path == '/api/books':
                books = services.get_books()
                self.send_json_response(HTTPStatus.OK, books)
            elif path == '/api/issues':
                issues = services.get_issues()
                for issue in issues:
                    if issue['status'] == 'issued':
                        issue['overdue_days'] = services.calculate_overdue_days(issue['due_date'])
                self.send_json_response(HTTPStatus.OK, issues)
            elif path == '/api/users':
                users = services.list_users()
                self.send_json_response(HTTPStatus.OK, users)
            else:
                self.send_error(HTTPStatus.NOT_FOUND, "API Endpoint not found")
        else:
            self.handle_static(path)

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 1024 * 1024:
            return self.send_json_response(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "Payload too large"})
            
        post_data = self.rfile.read(content_length)
        
        try:
            payload = json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError:
            payload = {}

        if path == '/api/login':
            username = payload.get('username')
            password = payload.get('password')
            user = services.authenticate(username, password)
            if user:
                token = os.urandom(24).hex()
                SESSIONS[token] = user
                self.send_json_response(HTTPStatus.OK, {"token": token, "user": user})
            else:
                self.send_json_response(HTTPStatus.UNAUTHORIZED, {"error": "Invalid credentials"})
            return

        session = self.get_session()
        if not session:
            return self.send_json_response(HTTPStatus.UNAUTHORIZED, {"error": "Unauthorized"})

        if path == '/api/books':
            if not payload.get('id'):
                return self.send_json_response(HTTPStatus.BAD_REQUEST, {"error": "Book ID is required"})
            try:
                book = services.add_book(payload)
                self.send_json_response(HTTPStatus.CREATED, book)
            except Exception as e:
                self.send_json_response(HTTPStatus.BAD_REQUEST, {"error": str(e)})
        elif path == '/api/issue':
            book_id = payload.get('book_id')
            student_name = payload.get('student_name')
            student_class = payload.get('student_class')
            section = payload.get('section')
            student_id = payload.get('student_id')
            if book_id and student_id and student_name and section and student_class:
                try:
                    issue = services.issue_book(book_id, student_name, student_class, section, student_id)
                    self.send_json_response(HTTPStatus.CREATED, issue)
                except Exception as e:
                    self.send_json_response(HTTPStatus.BAD_REQUEST, {"error": str(e)})
            else:
                self.send_json_response(HTTPStatus.BAD_REQUEST, {"error": "Missing required fields"})
        elif path == '/api/return':
            issue_id = payload.get('issue_id')
            if issue_id:
                issue = services.return_book(issue_id)
                if issue:
                    self.send_json_response(HTTPStatus.OK, issue)
                else:
                    self.send_json_response(HTTPStatus.NOT_FOUND, {"error": "Issue not found or already returned"})
            else:
                self.send_json_response(HTTPStatus.BAD_REQUEST, {"error": "Missing issue_id"})
        elif path == '/api/change-password':
            old_password = payload.get('old_password')
            new_password = payload.get('new_password')
            if not old_password or not new_password:
                return self.send_json_response(HTTPStatus.BAD_REQUEST, {"error": "Missing passwords"})
            try:
                username = session['username']
                if services.change_password(username, old_password, new_password):
                    self.send_json_response(HTTPStatus.OK, {"message": "Password updated"})
            except Exception as e:
                self.send_json_response(HTTPStatus.BAD_REQUEST, {"error": str(e)})
        elif path == '/api/logout':
            token = self.headers.get('X-Session-Token')
            if token in SESSIONS:
                del SESSIONS[token]
            self.send_json_response(HTTPStatus.OK, {"message": "Logged out"})
        else:
            self.send_error(HTTPStatus.NOT_FOUND, "API Endpoint not found")

    def do_PUT(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        session = self.get_session()
        if not session:
            return self.send_json_response(HTTPStatus.UNAUTHORIZED, {"error": "Unauthorized"})

        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 1024 * 1024:
            return self.send_json_response(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "Payload too large"})
            
        post_data = self.rfile.read(content_length)
        
        try:
            payload = json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError:
            payload = {}

        if path.startswith('/api/books/'):
            book_id = path.split('/')[-1]
            try:
                book = services.update_book(book_id, payload)
                self.send_json_response(HTTPStatus.OK, book)
            except Exception as e:
                self.send_json_response(HTTPStatus.BAD_REQUEST, {"error": str(e)})
        else:
            self.send_error(HTTPStatus.NOT_FOUND, "API Endpoint not found")

    def do_DELETE(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        session = self.get_session()
        if not session:
            return self.send_json_response(HTTPStatus.UNAUTHORIZED, {"error": "Unauthorized"})

        if path.startswith('/api/books/'):
            book_id = path.split('/')[-1]
            try:
                if services.delete_book(book_id):
                    self.send_json_response(HTTPStatus.OK, {"message": "Book deleted"})
                else:
                    self.send_json_response(HTTPStatus.NOT_FOUND, {"error": "Book not found"})
            except Exception as e:
                self.send_json_response(HTTPStatus.BAD_REQUEST, {"error": str(e)})
        else:
            self.send_error(HTTPStatus.NOT_FOUND, "API Endpoint not found")

if __name__ == '__main__':
    try:
        # Initialize data files
        services.ensure_data_dir()
        
        if not os.path.exists(PUBLIC_DIR):
            os.makedirs(PUBLIC_DIR)
            
        handler = LMSRequestHandler
        socketserver.ThreadingTCPServer.allow_reuse_address = True
        
        # Bind to all interfaces on the port
        with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), handler) as httpd:
            print(f"Serving LMS locally on http://localhost:{PORT}")
            
            # Open browser after a short delay
            import threading, webbrowser
            def open_browser():
                import time
                time.sleep(1.5)
                webbrowser.open(f"http://localhost:{PORT}")
            
            threading.Thread(target=open_browser, daemon=True).start()
            
            httpd.serve_forever()
    except Exception as e:
        # Log error to file for debugging PyInstaller bundle
        with open("lms_error.log", "a") as f:
            import traceback
            f.write(f"\n[{datetime.now()}] ERROR: {str(e)}\n")
            f.write(traceback.format_exc())
        raise e
