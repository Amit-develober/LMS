const API_BASE = '/api';
let sessionToken = null;
let currentUser = null;

// Application State
let catalogData = [];
let issuesData = [];
let catalogPage = 1;
const ITEMS_PER_PAGE = 50;

// DOM Elements
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const navBtns = document.querySelectorAll('.sidebar-nav .nav-btn');
const sections = document.querySelectorAll('.section');
const pageTitle = document.getElementById('page-title');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if re-establishing session is possible (e.g. from localStorage)
    const savedToken = localStorage.getItem('lms_token');
    const savedUser = localStorage.getItem('lms_user');
    if (savedToken && savedUser) {
        sessionToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showApp();
    }
});

// --- API Helper ---
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionToken) headers['X-Session-Token'] = sessionToken;
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json().catch(() => ({}));
    
    if (res.status === 401 && endpoint !== '/login') {
        logout();
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        throw new Error(data.error || 'API Error');
    }
    return data;
}

// --- Auth ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    
    const username = e.target.username.value;
    const password = e.target.password.value;
    
    try {
        const data = await apiCall('/login', 'POST', { username, password });
        sessionToken = data.token;
        currentUser = data.user;
        localStorage.setItem('lms_token', sessionToken);
        localStorage.setItem('lms_user', JSON.stringify(currentUser));
        
        e.target.reset();
        showApp();
    } catch (err) {
        loginError.textContent = err.message;
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    apiCall('/logout', 'POST').catch(() => {});
    logout();
});

function logout() {
    sessionToken = null;
    currentUser = null;
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_user');
    loginView.classList.add('active');
    appView.classList.remove('active');
}

function showApp() {
    loginView.classList.remove('active');
    appView.classList.add('active');
    document.getElementById('current-user').textContent = currentUser.username;
    loadDashboard();
}

// --- Navigation ---
navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const clickedBtn = e.currentTarget;
        navBtns.forEach(b => b.classList.remove('active'));
        clickedBtn.classList.add('active');
        
        const targetId = clickedBtn.getAttribute('data-target');
        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
        
        const labelSpan = clickedBtn.querySelector('span');
        pageTitle.textContent = labelSpan ? labelSpan.textContent.trim() : clickedBtn.textContent.trim();
        
        if (targetId === 'dashboard') loadDashboard();
        if (targetId === 'catalog') loadCatalog();
        if (targetId === 'issues') loadIssues();
    });
});

// --- Dashboard ---
async function loadDashboard() {
    try {
        const [books, issues] = await Promise.all([
            apiCall('/books'),
            apiCall('/issues')
        ]);
        
        const totalCopies = books.reduce((sum, b) => sum + (parseInt(b.copies) || 1), 0);
        document.getElementById('stat-total-books').textContent = totalCopies;
        
        const activeIssues = issues.filter(i => i.status === 'issued');
        document.getElementById('stat-active-issues').textContent = activeIssues.length;
        
        document.getElementById('stat-avail-books').textContent = totalCopies - activeIssues.length;
        document.getElementById('stat-total-issued').textContent = issues.length;
        
        const overdue = activeIssues.filter(i => i.overdue_days > 0).length;
        document.getElementById('stat-overdue').textContent = overdue;
    } catch (err) {
        console.error(err);
    }
}

// --- Catalog ---
async function loadCatalog() {
    try {
        const [books, issues] = await Promise.all([
            apiCall('/books'),
            apiCall('/issues')
        ]);
        catalogData = books;
        issuesData = issues;
        catalogPage = 1;
        renderCatalog();
    } catch(err) { console.error(err); }
}

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderCatalog(filterText = '') {
    const tbody = document.getElementById('catalog-tbody');
    tbody.innerHTML = '';
    
    let filtered = catalogData;
    if (filterText) {
        const lowerFilter = filterText.toLowerCase();
        filtered = catalogData.filter(b => 
            (b.id && String(b.id).toLowerCase().includes(lowerFilter)) ||
            (b.title && b.title.toLowerCase().includes(lowerFilter)) || 
            (b.author && b.author.toLowerCase().includes(lowerFilter))
        );
    }
    
    const start = (catalogPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginated = filtered.slice(start, end);
    
    paginated.forEach(book => {
        const tr = document.createElement('tr');
        
        const isIssued = issuesData.some(i => String(i.book_id) === String(book.id) && i.status === 'issued');
        const deleteAttr = isIssued ? 'disabled title="Cannot delete an issued book" style="color: grey; cursor: not-allowed;"' : 'style="color: var(--danger); border-color: var(--danger);"';

        tr.innerHTML = `
            <td>${escapeHTML(book.id) || '-'}</td>
            <td>${escapeHTML(book.title) || 'Untitled'}</td>
            <td>${escapeHTML(book.author) || 'Unknown'}</td>
            <td>${escapeHTML(book.date) || '-'}</td>
            <td>${escapeHTML(book.copies) || '1'}</td>
            <td>
                <button class="btn-action edit-book-btn" data-id="${escapeHTML(book.id)}" style="color: var(--primary); border-color: var(--primary); margin-right: 5px;">Edit</button>
                <button class="btn-action delete-book-btn" data-id="${escapeHTML(book.id)}" ${deleteAttr}>Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    document.querySelectorAll('.delete-book-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if(confirm('Are you sure you want to delete this book?')) {
                try {
                    await apiCall('/books/' + id, 'DELETE');
                    loadCatalog();
                    loadDashboard();
                } catch(err) { alert(err.message); }
            }
        });
    });

    // Add edit handlers
    document.querySelectorAll('.edit-book-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const book = catalogData.find(b => String(b.id) === String(id));
            if(book) {
                document.getElementById('edit-book-id').value = book.id;
                document.getElementById('edit-book-title').value = book.title || '';
                document.getElementById('edit-book-author').value = book.author || '';
                document.getElementById('edit-book-date').value = book.date || '';
                document.getElementById('edit-book-copies').value = book.copies || 1;
                document.getElementById('edit-book-modal').classList.add('active');
            }
        });
    });
    
    document.getElementById('page-info-catalog').textContent = `Page ${catalogPage} of ${Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1}`;
    document.getElementById('prev-page-catalog').disabled = catalogPage === 1;
    document.getElementById('next-page-catalog').disabled = end >= filtered.length;
}

document.getElementById('search-catalog').addEventListener('input', (e) => {
    catalogPage = 1;
    renderCatalog(e.target.value);
});

document.getElementById('prev-page-catalog').addEventListener('click', () => {
    if (catalogPage > 1) { catalogPage--; renderCatalog(document.getElementById('search-catalog').value); }
});

document.getElementById('next-page-catalog').addEventListener('click', () => {
    catalogPage++; renderCatalog(document.getElementById('search-catalog').value);
});

// Modals
const bookModal = document.getElementById('add-book-modal');
document.getElementById('btn-add-book').addEventListener('click', () => { bookModal.classList.add('active'); });
document.querySelectorAll('.close-modal').forEach(b => {
    b.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('active');
    })
});

document.getElementById('add-book-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newBook = {
        id: document.getElementById('new-book-id').value,
        title: document.getElementById('new-book-title').value,
        author: document.getElementById('new-book-author').value,
        date: document.getElementById('new-book-date').value,
        copies: document.getElementById('new-book-copies').value
    };
    try {
        await apiCall('/books', 'POST', newBook);
        e.target.reset();
        bookModal.classList.remove('active');
        loadCatalog();
        loadDashboard(); // Refresh stats in background
    } catch (err) { alert(err.message); }
});

document.getElementById('edit-book-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-book-id').value;
    const updateData = {
        title: document.getElementById('edit-book-title').value,
        author: document.getElementById('edit-book-author').value,
        date: document.getElementById('edit-book-date').value,
        copies: document.getElementById('edit-book-copies').value
    };
    try {
        await apiCall('/books/' + id, 'PUT', updateData);
        e.target.reset();
        document.getElementById('edit-book-modal').classList.remove('active');
        loadCatalog();
        loadDashboard(); 
    } catch (err) { alert(err.message); }
});

// --- Issues ---
async function loadIssues() {
    try {
        issuesData = await apiCall('/issues');
        renderIssues();
    } catch(err) { console.error(err); }
}

function renderIssues(filterText = '') {
    const tbody = document.getElementById('issues-tbody');
    tbody.innerHTML = '';
    
    let filtered = issuesData;
    if (filterText) {
        filtered = issuesData.filter(i => i.student_id.includes(filterText) || i.id.includes(filterText));
    }
    
    // Sort so latest are first, and issued are before returned
    filtered.sort((a,b) => {
        if(a.status !== b.status) return a.status === 'issued' ? -1 : 1;
        return b.id.localeCompare(a.id);
    });

    filtered.forEach(issue => {
        const tr = document.createElement('tr');
        const isIssued = issue.status === 'issued';
        const statusClass = isIssued ? 'status-issued' : 'status-returned';

        tr.innerHTML = `
            <td>${escapeHTML(issue.id)}</td>
            <td>${escapeHTML(issue.book_id)}</td>
            <td>${escapeHTML(issue.student_name) || '-'}</td>
            <td>${escapeHTML(issue.student_class) || '-'} - ${escapeHTML(issue.section) || '-'}</td>
            <td>${escapeHTML(issue.student_id)}</td>
            <td></td>
            <td><span class="status-badge ${escapeHTML(statusClass)}">${escapeHTML(issue.status)}</span></td>
            <td>
                ${isIssued ? `<button class="btn-action return-btn" data-id="${escapeHTML(issue.id)}">Mark Returned</button>` : '-'}
            </td>
        `;

        // Build due date cell with DOM methods so the overdue span renders properly
        const dueTd = tr.querySelectorAll('td')[5];
        dueTd.textContent = issue.due_date || '';
        if (isIssued && issue.overdue_days > 0) {
            const overdueSpan = document.createElement('span');
            overdueSpan.style.color = 'var(--danger)';
            overdueSpan.style.fontSize = '12px';
            overdueSpan.textContent = ` (${issue.overdue_days}d overdue)`;
            dueTd.appendChild(overdueSpan);
        }

        tbody.appendChild(tr);
    });

    // Add return handlers
    document.querySelectorAll('.return-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if(confirm('Mark this book as returned?')) {
                try {
                    await apiCall('/return', 'POST', { issue_id: id });
                    loadIssues();
                    loadDashboard();
                } catch(err) { alert(err.message); }
            }
        });
    });


}

document.getElementById('search-issues').addEventListener('input', (e) => renderIssues(e.target.value));

const issueModal = document.getElementById('issue-book-modal');
document.getElementById('btn-issue-book').addEventListener('click', () => { issueModal.classList.add('active'); });

document.getElementById('issue-book-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        book_id: document.getElementById('issue-book-id').value,
        student_name: document.getElementById('issue-student-name').value,
        student_class: document.getElementById('issue-student-class').value,
        section: document.getElementById('issue-student-section').value,
        student_id: document.getElementById('issue-student-id').value
    };
    try {
        await apiCall('/issue', 'POST', payload);
        e.target.reset();
        issueModal.classList.remove('active');
        loadIssues();
        loadDashboard();
    } catch (err) { alert(err.message); }
});

// --- Change Password ---
const pwdModal = document.getElementById('change-pwd-modal');
const pwdForm = document.getElementById('change-pwd-form');
const pwdError = document.getElementById('pwd-error');
const pwdSuccess = document.getElementById('pwd-success');

document.getElementById('change-pwd-btn').addEventListener('click', () => {
    pwdForm.reset();
    pwdError.textContent = '';
    pwdSuccess.textContent = '';
    pwdModal.classList.add('active');
});

pwdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    pwdError.textContent = '';
    pwdSuccess.textContent = '';
    
    const old_pwd = document.getElementById('pwd-current').value;
    const new_pwd = document.getElementById('pwd-new').value;
    const confirm_pwd = document.getElementById('pwd-confirm').value;
    
    if (new_pwd !== confirm_pwd) {
        pwdError.textContent = "New passwords don't match!";
        return;
    }
    
    try {
        await apiCall('/change-password', 'POST', { old_password: old_pwd, new_password: new_pwd });
        pwdSuccess.textContent = 'Password updated successfully!';
        setTimeout(() => pwdModal.classList.remove('active'), 1500);
    } catch(err) {
        pwdError.textContent = err.message;
    }
});
