// js/dashboard.js

const API_BASE_URL = 'http://localhost:3000/api';

// Protect dashboard - redirect to login if not authenticated
document.addEventListener('DOMContentLoaded', async function() {
    const currentUser = localStorage.getItem('queuesmartUser');
    
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    // Parse user data
    const user = JSON.parse(currentUser);
    
    // Update welcome message with user name
    const welcomeText = document.querySelector('.welcome-text');
    if (welcomeText) {
        welcomeText.textContent = `Welcome back, ${user.name}`;
    }
    
    // Fetch fresh user profile from backend
    await loadUserProfile(user.email);
    
    // Initialize dashboard
    initializeDashboard(user);
    
    // Initialize notification count
    updateNotificationCount();
});

/**
 * Load user profile from backend
 */
async function loadUserProfile(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/profile/${email}`);
        const data = await response.json();
        
        if (data.success) {
            // Update stored user data with fresh profile
            const currentUser = JSON.parse(localStorage.getItem('queuesmartUser'));
            const updatedUser = {
                ...currentUser,
                ...data.user
            };
            localStorage.setItem('queuesmartUser', JSON.stringify(updatedUser));
            
            console.log('Profile loaded:', data.user);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

/**
 * Initialize dashboard with user-specific data
 */
function initializeDashboard(user) {
    // Load current queue status
    loadQueueStatus();
    
    // Simulate real-time queue updates every 30 seconds
    setInterval(updateQueuePosition, 30000);
}

/**
 * Load and display current queue status
 */
function loadQueueStatus() {
    // Check if user is in a queue (mock data for now)
    // Member 2 will replace this with actual API call
    const userQueue = localStorage.getItem('userCurrentQueue');
    
    if (userQueue) {
        const queueData = JSON.parse(userQueue);
        displayQueueStatus(queueData);
    } else {
        displayNoQueue();
    }
}

/**
 * Display queue status in dashboard
 */
function displayQueueStatus(queueData) {
    const queueCard = document.querySelector('.card:first-child');
    if (queueCard) {
        queueCard.innerHTML = `
            <h3>Current Queue</h3>
            <p><strong>Service:</strong> ${queueData.service}</p>
            <p><strong>Position:</strong> #${queueData.position}</p>
            <p><strong>Estimated Wait:</strong> ${queueData.estimatedWait} minutes</p>
            <span class="status waiting">Waiting</span>
            <button class="leave-queue-btn" onclick="leaveQueue()" style="margin-top: 16px; width: 100%; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Leave Queue</button>
        `;
    }
}

/**
 * Display no active queue message
 */
function displayNoQueue() {
    const queueCard = document.querySelector('.card:first-child');
    if (queueCard) {
        queueCard.innerHTML = `
            <h3>Current Queue</h3>
            <p style="color: #6b7280; margin: 20px 0;">You are not currently in any queue.</p>
            <span class="status" style="background: #e5e7eb; color: #6b7280;">Not in Queue</span>
        `;
    }
}

/**
 * Update queue position (simulates real-time updates)
 * Member 2 will replace this with actual API calls
 */
function updateQueuePosition() {
    const userQueue = localStorage.getItem('userCurrentQueue');
    
    if (userQueue) {
        const queueData = JSON.parse(userQueue);
        
        // Simulate position moving up
        if (queueData.position > 1) {
            queueData.position--;
            queueData.estimatedWait = Math.max(5, queueData.estimatedWait - 5);
            
            localStorage.setItem('userCurrentQueue', JSON.stringify(queueData));
            displayQueueStatus(queueData);
            
            // Show notification
            showNotification(`Your position updated: Now #${queueData.position}`);
        }
    }
}

/**
 * Leave queue function
 * Member 2 will implement the actual API call
 */
function leaveQueue() {
    if (confirm('Are you sure you want to leave the queue?')) {
        localStorage.removeItem('userCurrentQueue');
        displayNoQueue();
        showNotification('You have left the queue');
    }
}

/**
 * Update notification count
 * Member 4 will implement the actual API call
 */
function updateNotificationCount() {
    const notifications = JSON.parse(localStorage.getItem('userNotifications') || '[]');
    const unreadCount = notifications.filter(n => !n.read).length;
    
    const notifBtn = document.querySelector('.icon-btn');
    if (notifBtn && unreadCount > 0) {
        notifBtn.innerHTML = `📧 <span style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; display: flex; align-items: center; justify-content: center;">${unreadCount}</span>`;
        notifBtn.style.position = 'relative';
    }
}

/**
 * Show notification (helper function)
 */
function showNotification(message) {
    // Add to notifications array
    const notifications = JSON.parse(localStorage.getItem('userNotifications') || '[]');
    notifications.unshift({
        id: Date.now(),
        message: message,
        timestamp: new Date().toISOString(),
        read: false
    });
    
    // Keep only last 10 notifications
    if (notifications.length > 10) {
        notifications.pop();
    }
    
    localStorage.setItem('userNotifications', JSON.stringify(notifications));
    updateNotificationCount();
    
    // Show toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1f2937;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Logout function
 */
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        const user = JSON.parse(localStorage.getItem('queuesmartUser') || '{}');
        const token = user.token;
        
        try {
            // Call backend logout
            await fetch(`${API_BASE_URL}/auth/logout?token=${token}`);
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        localStorage.removeItem('queuesmartUser');
        window.location.href = 'index.html';
    }
}

// Add CSS animations for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .leave-queue-btn:hover {
        background: #dc2626 !important;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
`;
document.head.appendChild(style);
