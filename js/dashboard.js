// js/dashboard.js

const API_BASE_URL = 'http://localhost:3000/api';

let selectedService = null;

// Protect dashboard - redirect to login if not authenticated
document.addEventListener('DOMContentLoaded', async function() {
    const currentUser = localStorage.getItem('queuesmartUser');
    
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    const user = JSON.parse(currentUser);
    
    // Update welcome message with user name
    const welcomeText = document.querySelector('.welcome-text');
    if (welcomeText) {
        welcomeText.textContent = `Welcome back, ${user.name}`;
    }
    
    // Initialize dashboard
    loadQueueStatus();
});

/**
 * Toggle service selection
 */
function toggleService(el) {
    if (el.classList.contains('selected')) {
        el.classList.remove('selected');
        selectedService = null;
        return;
    }
    document.querySelectorAll('.card ul li').forEach(li => li.classList.remove('selected'));
    el.classList.add('selected');
    selectedService = el.dataset.name;
}

/**
 * Join selected queue
 */
function joinSelectedQueue() {
    if (!selectedService) {
        alert('Please select a service first.');
        return;
    }

    const user = JSON.parse(localStorage.getItem('queuesmartUser') || '{}');
    const historyKey = `queueHistory_${user.id}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    history.unshift({
        serviceName: selectedService,
        joinedAt: new Date().toISOString(),
        status: 'waiting'
    });
    localStorage.setItem(historyKey, JSON.stringify(history));

    createNotification(
        `You have joined the queue for ${selectedService}.`,
        'queue_joined'
    );

    document.querySelectorAll('.card ul li').forEach(li => li.classList.remove('selected'));
    selectedService = null;
}

/**
 * Load and display current queue status
 */
function loadQueueStatus() {
    const userQueue = localStorage.getItem('userCurrentQueue');
    
    if (userQueue) {
        const queueData = JSON.parse(userQueue);
        displayQueueStatus(queueData);
    } else {
        displayNoQueue();
    }
}

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

function leaveQueue() {
    if (confirm('Are you sure you want to leave the queue?')) {
        localStorage.removeItem('userCurrentQueue');
        displayNoQueue();
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('queuesmartUser');
        window.location.href = 'index.html';
    }
}