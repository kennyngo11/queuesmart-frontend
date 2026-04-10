// js/notifications.js - shared notification dropdown for all pages
// Include this script on any page that has a notification bell button.
//
// Required HTML in your page's top-right header:
//
//   <div class="notif-wrapper" id="notifWrapper">
//     <button class="icon-btn" id="notifBtn" title="Notifications" onclick="toggleNotifPanel()">🔔</button>
//     <span class="notif-badge" id="notifBadge"></span>
//     <div class="notif-panel" id="notifPanel">
//       <div class="notif-header">
//         <h3>Notifications</h3>
//         <button class="mark-all-btn" onclick="markAllAsRead()">Mark all as read</button>
//       </div>
//       <div class="notif-list" id="notifList"></div>
//       <div class="notif-footer">
//         <button onclick="clearAllNotifications()">Clear all</button>
//       </div>
//     </div>
//   </div>
//   <div class="toast-container" id="toastContainer"></div>

const API = 'http://localhost:3000/api';

function getCurrentUserId() {
    try {
        return JSON.parse(localStorage.getItem('queuesmartUser') || '{}').id || null;
    } catch { return null; }
}

const userId = getCurrentUserId();

// ── Fetch & render ────────────────────────────────────────────────────────────

async function fetchNotifications() {
    try {
        const res  = await fetch(`${API}/notifications/${userId}`);
        const data = await res.json();
        if (data.success) renderNotifications(data.notifications, data.unreadCount);
    } catch {
        const list = document.getElementById('notifList');
        if (list) list.innerHTML =
            '<div class="notif-empty"><span>⚠️</span>Could not load notifications.<br>Is the backend running?</div>';
    }
}

function renderNotifications(notifications, unreadCount) {
    const list  = document.getElementById('notifList');
    const badge = document.getElementById('notifBadge');
    if (!list || !badge) return;

    // Badge
    if (unreadCount > 0) {
        badge.style.display = 'flex';
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    } else {
        badge.style.display = 'none';
    }

    if (notifications.length === 0) {
        list.innerHTML = '<div class="notif-empty"><span>✅</span>You\'re all caught up!</div>';
        return;
    }

    list.innerHTML = notifications.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markAsRead(${n.id}, this)">
            <div class="notif-content">
                <div class="notif-message">${n.message}</div>
                <div class="notif-time">${formatTime(n.createdAt)}</div>
            </div>
            ${!n.read ? '<div class="unread-dot"></div>' : ''}
        </div>
    `).join('');
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function markAsRead(id, element) {
    try {
        await fetch(`${API}/notifications/${id}/read`, { method: 'PATCH' });
        element.classList.remove('unread');
        const dot = element.querySelector('.unread-dot');
        if (dot) dot.remove();
        fetchNotifications();
    } catch (err) { console.error('markAsRead:', err); }
}

async function markAllAsRead() {
    try {
        await fetch(`${API}/notifications/read-all/${userId}`, { method: 'PATCH' });
        fetchNotifications();
    } catch (err) { console.error('markAllAsRead:', err); }
}

async function clearAllNotifications() {
    const items = document.getElementById('notifList').querySelectorAll('.notif-item');
    const ids = Array.from(items).map(el => {
        const m = el.getAttribute('onclick').match(/\d+/);
        return m ? parseInt(m[0]) : null;
    }).filter(Boolean);
    await Promise.all(ids.map(id =>
        fetch(`${API}/notifications/${id}`, { method: 'DELETE' }).catch(() => {})
    ));
    fetchNotifications();
}

// ── Panel toggle ──────────────────────────────────────────────────────────────

function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) fetchNotifications();
}

document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('notifWrapper');
    const panel   = document.getElementById('notifPanel');
    if (wrapper && panel && !wrapper.contains(e.target)) {
        panel.classList.remove('open');
    }
});

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(message, type = 'general') {
    const icons  = { queue_joined:'📋', queue_close:'⏰', queue_served:'✅', queue_left:'👋', general:'🔔' };
    const titles = { queue_joined:'Queue Update', queue_close:'Almost Your Turn!', queue_served:"You're Up!", queue_left:'Queue Update', general:'Notification' };
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || '🔔'}</div>
        <div class="toast-body">
            <div class="toast-title">${titles[type] || 'Notification'}</div>
            <div class="toast-msg">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 15000);
}

// ── Create a notification (call this when queue events happen) ────────────────

async function createNotification(message, type) {
    try {
        const res  = await fetch(`${API}/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, message, type })
        });
        const data = await res.json();
        if (data.success) { showToast(message, type); fetchNotifications(); }
    } catch (err) { console.error('createNotification:', err); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return new Date(isoString).toLocaleDateString();
}

// ── Auto-start: fetch badge count on load, refresh every 30s ─────────────────

fetchNotifications();
setInterval(fetchNotifications, 30000);

// Refresh when user switches back to this tab/page
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') fetchNotifications();
});