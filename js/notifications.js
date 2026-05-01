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

function showToast(message, type = 'general', duration = 10000) {
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
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, duration);
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
setInterval(fetchNotifications, 5000);

// Refresh when user switches back to this tab/page
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') fetchNotifications();
});
// ── Queue position tracker ────────────────────────────────────────────────────
// Polls every 5 seconds. Shows toast on every page for visual feedback.
// Only saves to DB (dropdown) when position actually changes.

let lastKnownPosition = null;
let lastKnownStatus = null;

async function checkQueuePosition() {
    if (!userId) return;

    try {
        const res = await fetch(`${API}/queue/current/${userId}`);
        const data = await res.json();

        if (!data.success || !data.queue) {
            if (lastKnownPosition !== null) {
                try {
                    const histRes = await fetch(`${API}/history/${userId}`);
                    const histData = await histRes.json();
                    if (histData.success && histData.history.length > 0) {
                        const lastEntry = histData.history[0];
                        if (lastEntry.status === 'served') {
                            createNotification('Your service is now in progress!', 'queue_served');
                            localStorage.removeItem(`queuePosition_${userId}`);
                        } else if (lastEntry.status === 'canceled') {
                            createNotification('You have been removed from the queue.', 'queue_left');
                            localStorage.removeItem(`queuePosition_${userId}`);
                        }
                    }
                } catch (err) {
                    console.error('checkQueuePosition history fetch:', err);
                }
                lastKnownPosition = null;
                lastKnownStatus = null;
            }
            return;
        }

        const newPosition = data.queue.position;
        const newStatus = data.queue.status;
        const savedPosition = parseInt(localStorage.getItem(`queuePosition_${userId}`) || '0');

        if (lastKnownPosition === null) {
            // Always show toast on page load
            showToast(`You are currently #${newPosition} in the queue for ${data.queue.serviceName}.`, 'queue_joined');
            // Only save to dropdown if this is a new position
            if (newPosition !== savedPosition) {
                await saveNotificationOnly(`You are currently #${newPosition} in the queue for ${data.queue.serviceName}.`, 'queue_joined');
                localStorage.setItem(`queuePosition_${userId}`, newPosition);
            }
        } else if (newPosition < lastKnownPosition) {
            // Position moved up — show toast and save to dropdown
            showToast(`Your position moved up! You are now #${newPosition} in the queue for ${data.queue.serviceName}.`, 'queue_joined');
            await saveNotificationOnly(`Your position moved up! You are now #${newPosition} in the queue for ${data.queue.serviceName}.`, 'queue_joined');
            localStorage.setItem(`queuePosition_${userId}`, newPosition);
        }

        lastKnownPosition = newPosition;
        lastKnownStatus = newStatus;

    } catch (err) {
        console.error('checkQueuePosition:', err);
    }
}

// Saves notification to DB and refreshes dropdown WITHOUT showing a toast
async function saveNotificationOnly(message, type) {
    try {
        const res = await fetch(`${API}/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, message, type })
        });
        const data = await res.json();
        if (data.success) fetchNotifications();
    } catch (err) {
        console.error('saveNotificationOnly:', err);
    }
}

// Start polling queue position every 5 seconds
checkQueuePosition();
setInterval(checkQueuePosition, 5000);