// queuesmart/js/service-management.js
// JS for Service Management page (edit/create services)

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('queuesmartUser');
        window.location.href = 'index.html';
    }
}

// Helper: Clear error messages
function clearErrors() {
    document.getElementById('serviceNameError').textContent = '';
    document.getElementById('descriptionError').textContent = '';
    document.getElementById('durationError').textContent = '';
    document.getElementById('priorityError').textContent = '';
}

// Helper: Show backend error on the correct field
function showBackendError(errorMsg) {
    if (!errorMsg) return;
    if (errorMsg.toLowerCase().includes('name')) {
        document.getElementById('serviceNameError').textContent = errorMsg;
    } else if (errorMsg.toLowerCase().includes('description')) {
        document.getElementById('descriptionError').textContent = errorMsg;
    } else if (errorMsg.toLowerCase().includes('duration')) {
        document.getElementById('durationError').textContent = errorMsg;
    } else if (errorMsg.toLowerCase().includes('priority')) {
        document.getElementById('priorityError').textContent = errorMsg;
    } else {
        alert(errorMsg);
    }
}

let editingServiceId = null;

function startEditService(data) {
    editingServiceId = data.id;
    document.getElementById('serviceName').value = decodeURIComponent(data.name);
    document.getElementById('description').value = decodeURIComponent(data.description);
    document.getElementById('duration').value = data.duration;
    document.getElementById('priority').value = data.priority;
    document.querySelector('.primary-btn').textContent = 'Update Service';
}

// Fetch and display all services
async function fetchServices() {
    const listDiv = document.getElementById('serviceList');
    if (!listDiv) return;
    listDiv.innerHTML = '<em>Loading...</em>';
    try {
        const res = await fetch('http://localhost:3000/api/services');
        if (!res.ok) throw new Error('Failed to fetch services');
        const services = await res.json();
        if (services.length === 0) {
            listDiv.innerHTML = '<em>No services found.</em>';
            return;
        }
        let html = '<table class="service-table"><thead><tr><th>Name</th><th>Description</th><th>Duration</th><th>Priority</th><th></th></tr></thead><tbody>';
        for (const s of services) {
            html += `<tr>
                <td>${s.serviceName}</td>
                <td>${s.description}</td>
                <td>${s.duration} min</td>
                <td>${s.priority}</td>
                <td><button class="edit-btn" data-id="${s.id}" data-name="${encodeURIComponent(s.serviceName)}" data-description="${encodeURIComponent(s.description)}" data-duration="${s.duration}" data-priority="${s.priority}">Edit</button></td>
            </tr>`;
        }
        html += '</tbody></table>';
        listDiv.innerHTML = html;
        // Add event listeners for edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                startEditService(this.dataset);
            });
        });
    } catch (err) {
        listDiv.innerHTML = '<span style="color:red">Error loading services.</span>';
    }
}

window.addEventListener('DOMContentLoaded', fetchServices);

document.getElementById('serviceForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();
    // Gather form data
    const serviceName = document.getElementById('serviceName').value.trim();
    const description = document.getElementById('description').value.trim();
    const duration = Number(document.getElementById('duration').value);
    const priority = document.getElementById('priority').value;

    // Send to backend
    try {
        let res, data;
        if (editingServiceId) {
            // Edit mode: PUT
            res = await fetch(`http://localhost:3000/api/services/${editingServiceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceName, description, duration, priority })
            });
            data = await res.json();
            if (!res.ok) {
                showBackendError(data.error || 'Unknown error');
                return;
            }
            alert('Service updated successfully!');
        } else {
            // Create mode: POST
            res = await fetch('http://localhost:3000/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceName, description, duration, priority })
            });
            data = await res.json();
            if (!res.ok) {
                showBackendError(data.error || 'Unknown error');
                return;
            }
            alert('Service created successfully!');
        }
        // Success
        this.reset();
        editingServiceId = null;
        document.querySelector('.primary-btn').textContent = 'Create / Edit Service';
        fetchServices();
    } catch (err) {
        alert('Network or server error.');
    }
});

document.getElementById('serviceForm').addEventListener('reset', function() {
    editingServiceId = null;
    document.querySelector('.primary-btn').textContent = 'Create / Edit Service';
});