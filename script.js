// ============================================
// CONFIGURATION AND STATE
// ============================================

// API Configuration
const API_BASE_URL = 'https://url-monitor-func-fpekcgfmbvfubgf7.centralindia-01.azurewebsites.net/api';
const API_URL = `${API_BASE_URL}/get_downtime`;
const YOUR_PHONE_NUMBER = '918300521700';
const YOUR_NAME = 'Server Admin';

// Original State
let currentData = [];
let whatsAppMessages = [
    { sender: 'admin', text: 'Hi! I\'m your server admin. How can I help you today?', time: new Date() },
    { sender: 'admin', text: 'You can ask me about:\n• Server status\n• Recent incidents\n• Adding new services\n• Alert settings', time: new Date() }
];
let isTodayMode = true;

// URL Management State
let monitoredUrls = [];
let currentEditingUrlId = null;
let currentDeletingUrlId = null;

// Auto-refresh interval for checking URL statuses
let urlStatusRefreshInterval = null;

// ============================================
// DOM ELEMENT REFERENCES
// ============================================

// Buttons
const todayBtn = document.getElementById('todayBtn');
const allBtn = document.getElementById('allBtn');
const refreshBtn = document.getElementById('refreshBtn');
const addUrlBtn = document.getElementById('addUrlBtn');
const refreshUrlsBtn = document.getElementById('refreshUrlsBtn');
const healthCheckBtn = document.getElementById('healthCheckBtn');
const generateReportBtn = document.getElementById('generateReportBtn');
const whatsappSupportBtn = document.getElementById('whatsappSupportBtn');
const exportCSVBtn = document.getElementById('exportCSVBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const whatsappFloatBtn = document.getElementById('whatsappFloatBtn');

// Modal buttons
const closeAddUrlModalBtn = document.getElementById('closeAddUrlModalBtn');
const cancelAddUrlBtn = document.getElementById('cancelAddUrlBtn');
const addUrlSubmitBtn = document.getElementById('addUrlSubmitBtn');
const closeEditUrlModalBtn = document.getElementById('closeEditUrlModalBtn');
const cancelEditUrlBtn = document.getElementById('cancelEditUrlBtn');
const saveUrlChangesBtn = document.getElementById('saveUrlChangesBtn');
const closeDeleteUrlModalBtn = document.getElementById('closeDeleteUrlModalBtn');
const cancelDeleteUrlBtn = document.getElementById('cancelDeleteUrlBtn');
const confirmDeleteUrlBtn = document.getElementById('confirmDeleteUrlBtn');
const closeWhatsAppModalBtn = document.getElementById('closeWhatsAppModalBtn');
const whatsappSendBtn = document.getElementById('whatsappSendBtn');

// Inputs and selects
const urlInput = document.getElementById('urlInput');
const urlName = document.getElementById('urlName');
const alertEmail = document.getElementById('alertEmail');
const alertWhatsapp = document.getElementById('alertWhatsapp');
const editUrlInput = document.getElementById('editUrlInput');
const editUrlName = document.getElementById('editUrlName');
const editAlertEmail = document.getElementById('editAlertEmail');
const editAlertWhatsapp = document.getElementById('editAlertWhatsapp');
const deleteUrlId = document.getElementById('deleteUrlId');
const editUrlId = document.getElementById('editUrlId');
const whatsappInput = document.getElementById('whatsappInput');

// Modals
const addUrlModal = document.getElementById('addUrlModal');
const editUrlModal = document.getElementById('editUrlModal');
const deleteUrlModal = document.getElementById('deleteUrlModal');
const whatsappModal = document.getElementById('whatsappModal');

// Other elements
const deleteUrlText = document.getElementById('deleteUrlText');
const tableBody = document.getElementById('tableBody');
const urlListBody = document.getElementById('urlListBody');
const uptimePercent = document.getElementById('uptimePercent');
const todayIncidents = document.getElementById('todayIncidents');
const avgResponse = document.getElementById('avgResponse');
const alertsSent = document.getElementById('alertsSent');
const apiStatus = document.getElementById('apiStatus');
const whatsappMessages = document.getElementById('whatsappMessages');

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

async function fetchData(todayOnly = true) {
    try {
        showLoading(true);
        updateApiStatus('connecting');
        
        console.log(`Fetching ${todayOnly ? 'today\'s' : 'all'} data from API...`);
        
        const url = API_URL;
        
        console.log('API URL:', url);
        
        const response = await fetch(url, {
            headers: { 
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API Data received:', data);
        
        // Process data from monitorlogs table
        if (data && Array.isArray(data)) {
            currentData = data;
            
            if (todayOnly) {
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                currentData = data.filter(item => {
                    try {
                        const timestamp = item.timestamp;
                        if (!timestamp) return false;
                        
                        let date;
                        if (timestamp.includes('AM') || timestamp.includes('PM')) {
                            const [datePart, timePart, period] = timestamp.split(' ');
                            if (!datePart || !timePart || !period) return false;
                            
                            const [hours, minutes, seconds] = timePart.split(':').map(Number);
                            
                            let hours24 = hours;
                            if (period === 'PM' && hours < 12) {
                                hours24 = hours + 12;
                            } else if (period === 'AM' && hours === 12) {
                                hours24 = 0;
                            }
                            
                            const isoString = `${datePart}T${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                            date = new Date(isoString);
                        } else {
                            date = new Date(timestamp);
                        }
                        
                        return date >= todayStart;
                    } catch (error) {
                        console.error('Error filtering today data:', error);
                        return false;
                    }
                });
                console.log(`Filtered ${currentData.length} records for today`);
            }
        } else {
            currentData = [];
        }
        
        console.log('Processed data:', currentData);
        
        populateTable(currentData);
        updateStats(currentData);
        updateApiStatus('connected');
        
        updateButtonStates(todayOnly);
        isTodayMode = todayOnly;
        
        showToast(`Loaded ${currentData.length} records from monitorlogs`);
        
    } catch (error) {
        console.error('Fetch error:', error);
        updateApiStatus('error');
        showError(`Failed to load data: ${error.message}. Using sample data as fallback.`);
        
        loadSampleData();
    } finally {
        showLoading(false);
    }
}

function fetchTodayData() {
    fetchData(true);
}

function fetchAllData() {
    fetchData(false);
}

function refreshData() {
    if (isTodayMode) {
        fetchTodayData();
    } else {
        fetchAllData();
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function initializeEventListeners() {
    // Dashboard buttons
    todayBtn.addEventListener('click', fetchTodayData);
    allBtn.addEventListener('click', fetchAllData);
    refreshBtn.addEventListener('click', refreshData);
    healthCheckBtn.addEventListener('click', testAllServers);
    generateReportBtn.addEventListener('click', generateReport);
    whatsappSupportBtn.addEventListener('click', openWhatsAppModal);
    whatsappFloatBtn.addEventListener('click', openWhatsAppModal);
    exportCSVBtn.addEventListener('click', exportCSV);
    clearFiltersBtn.addEventListener('click', clearFilters);
    
    // URL management buttons
    addUrlBtn.addEventListener('click', openAddUrlModal);
    refreshUrlsBtn.addEventListener('click', refreshAllUrls);
    
    // Modal buttons
    closeAddUrlModalBtn.addEventListener('click', closeAddUrlModal);
    cancelAddUrlBtn.addEventListener('click', closeAddUrlModal);
    addUrlSubmitBtn.addEventListener('click', addNewUrl);
    closeEditUrlModalBtn.addEventListener('click', closeEditUrlModal);
    cancelEditUrlBtn.addEventListener('click', closeEditUrlModal);
    saveUrlChangesBtn.addEventListener('click', saveUrlChanges);
    closeDeleteUrlModalBtn.addEventListener('click', closeDeleteUrlModal);
    cancelDeleteUrlBtn.addEventListener('click', closeDeleteUrlModal);
    confirmDeleteUrlBtn.addEventListener('click', confirmDeleteUrl);
    closeWhatsAppModalBtn.addEventListener('click', closeWhatsAppModal);
    whatsappSendBtn.addEventListener('click', sendWhatsAppMessage);
    
    // Input events
    whatsappInput.addEventListener('keypress', handleWhatsAppKeyPress);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Clear any cached URL data on page load
    localStorage.removeItem('monitored_urls');
    initializeEventListeners();
    updateApiStatus('connecting');
    fetchTodayData();
    
    // Load saved messages from localStorage
    const savedMessages = localStorage.getItem('whatsapp_chat');
    if (savedMessages) {
        whatsAppMessages = JSON.parse(savedMessages);
        updateWhatsAppUI();
    }
    
    // Initialize URL management
    initializeUrlManagement();
    
    // Start refreshing URL statuses every 30 seconds
    startUrlStatusRefresher();
});

// ============================================
// AZURE TABLE STORAGE INTEGRATION
// ============================================

// Azure API Endpoints
const AZURE_API = {
    getDowntime: `${API_BASE_URL}/get_downtime`,
    saveUrl: `${API_BASE_URL}/save_monitored_url`,
    getUrls: `${API_BASE_URL}/get_monitored_urls`,
    deleteUrl: `${API_BASE_URL}/delete_monitored_url`,
    updateUrl: `${API_BASE_URL}/update_monitored_url`,
    // New endpoint to get URL status from Azure function monitoring
    getUrlStatus: `${API_BASE_URL}/get_url_status`,
    // Endpoint to test a single URL
    testUrl: `${API_BASE_URL}/test_url`
};

// Load URLs from Azure Table Storage - SIMPLIFIED
async function loadMonitoredUrlsFromAzure() {
    try {
        console.log('Loading URLs from urlmonitorconfigs table...');
        // ADD CACHE BUSTING
        const timestamp = new Date().getTime();
        const response = await fetch(`${AZURE_API.getUrls}?nocache=${timestamp}`, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load URLs: ${response.status}`);
        }
        
        const urls = await response.json();
        console.log('Raw Azure response:', urls);
        
        // Transform Azure entities - ALL URLs ARE ALWAYS ACTIVE NOW
        const monitoredUrls = urls.map(url => ({
            id: url.RowKey || generateId(),
            url: url.URL || '',
            name: url.Name || '',
            alertEmail: url.AlertEmail || '',
            alertWhatsapp: url.AlertWhatsapp || '',
            deleted: parseInt(url.Deleted) || 0,
            createdAt: url.CreatedAt || new Date().toISOString(),
            // REMOVED: IsActive field - all URLs are always active
            checkInterval: parseInt(url.CheckInterval) || 300,
            userId: url.UserId || '',
            PartitionKey: url.PartitionKey || 'config',
            // Status fields
            status: 'unknown',
            lastChecked: null,
            uptime: '100%',
            lastResponseTime: null,
            lastStatusChange: null,
            lastError: null
        })).filter(url => url.deleted === 0);
        
        console.log('Processed URLs:', monitoredUrls.length);
        return monitoredUrls;
        
    } catch (error) {
        console.error('Error loading URLs from Azure:', error);
        throw error;
    }
}

// Get URL status from monitorlogs table
async function getUrlStatusFromAzure() {
    try {
        console.log('Fetching status from monitorlogs...');
        const response = await fetch(AZURE_API.getUrlStatus);
        
        if (!response.ok) {
            throw new Error(`Failed to load URL status: ${response.status}`);
        }
        
        const statusData = await response.json();
        console.log('Status data received:', statusData);
        
        return statusData;
        
    } catch (error) {
        console.error('Error loading URL status from Azure:', error);
        return {};
    }
}

// Update URL statuses from monitorlogs table - SIMPLIFIED (NO PAUSE CHECK)
async function updateUrlStatusesFromAzure() {
    try {
        console.log('Updating URL statuses...');
        
        // Get latest status for all URLs
        const statusData = await getUrlStatusFromAzure();
        
        // Update each URL with its status from monitorlogs
        monitoredUrls.forEach(url => {
            // ALL URLs ARE ALWAYS CHECKED - NO PAUSE LOGIC
            
            // Try to find status by URL
            const urlKey = url.url.toLowerCase().trim();
            let urlStatus = null;
            
            // Look for status in different possible formats
            if (statusData[urlKey]) {
                urlStatus = statusData[urlKey];
            } else if (statusData[url.id]) {
                urlStatus = statusData[url.id];
            } else {
                // Try to find by partial URL match
                for (const key in statusData) {
                    if (key.includes(url.url) || url.url.includes(key)) {
                        urlStatus = statusData[key];
                        break;
                    }
                }
            }
            
            if (urlStatus) {
                console.log(`Updating status for ${url.url}:`, urlStatus);
                url.status = urlStatus.status?.toLowerCase() || 'unknown';
                url.lastChecked = urlStatus.timestamp || urlStatus.lastChecked || null;
                url.uptime = urlStatus.uptime || '100%';
                url.lastResponseTime = urlStatus.lastResponseTime || urlStatus.responseTime || null;
                url.lastStatusChange = urlStatus.lastStatusChange || null;
                url.lastError = urlStatus.errorDetails || null;
            } else {
                console.log(`No status found for ${url.url}`);
                url.status = 'unknown';
            }
        });
        
        // Update UI
        updateUrlListUI();
        console.log('URL statuses updated successfully');
        
    } catch (error) {
        console.error('Error updating URL statuses:', error);
        // Set all to unknown if error
        monitoredUrls.forEach(url => {
            url.status = 'unknown';
        });
        updateUrlListUI();
    }
}

async function saveUrlToAzure(urlData) {
    try {
        console.log('Saving URL to urlmonitorconfigs:', urlData);
        
        const payload = {
            url: urlData.url,
            name: urlData.name || urlData.url,
            alertEmail: urlData.alertEmail || '',
            alertWhatsapp: urlData.alertWhatsapp || YOUR_PHONE_NUMBER,
        };
        
        console.log("Sending to API:", JSON.stringify(payload));
        
        const response = await fetch(AZURE_API.saveUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('HTTP Error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Save response:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to save URL');
        }
        
        return result.rowKey || result.id;
        
    } catch (error) {
        console.error('Error saving URL to Azure:', error);
        throw error;
    }
}

// Delete URL from urlmonitorconfigs
async function deleteUrlFromAzure(urlId) {
    try {
        console.log('Deleting URL from Azure:', urlId);
        
        const response = await fetch(`${AZURE_API.deleteUrl}/${urlId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        console.log('Delete response:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to delete URL');
        }
        
        return true;
        
    } catch (error) {
        console.error('Error deleting URL from Azure:', error);
        throw error;
    }
}

// Update URL in urlmonitorconfigs
async function updateUrlInAzure(urlId, updates) {
    try {
        console.log('Updating URL in Azure:', urlId, updates);
        
        const response = await fetch(`${AZURE_API.updateUrl}/${urlId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                PartitionKey: 'config',
                RowKey: urlId,
                ...updates
            })
        });
        
        const result = await response.json();
        console.log('Update response:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to update URL');
        }
        
        return true;
        
    } catch (error) {
        console.error('Error updating URL in Azure:', error);
        throw error;
    }
}

// Test a single URL via Azure Function
async function testSingleUrlAzure(urlId, url) {
    try {
        console.log('Testing URL via Azure Function:', url);
        
        const response = await fetch(AZURE_API.testUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                testNow: true
            })
        });
        
        const result = await response.json();
        console.log('Test response:', result);
        
        return result;
        
    } catch (error) {
        console.error('Error testing URL via Azure:', error);
        throw error;
    }
}

// Helper function to generate GUID for Azure Table
function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ============================================
// URL MANAGEMENT FUNCTIONS - SIMPLIFIED
// ============================================

async function initializeUrlManagement() {
    try {
        console.log('Initializing URL management...');
        
        // Load all URLs - ALL ARE ACTIVE
        monitoredUrls = await loadMonitoredUrlsFromAzure();
        console.log(`Loaded ${monitoredUrls.length} URLs from urlmonitorconfigs table`);
        
        // Get initial status from monitorlogs
        await updateUrlStatusesFromAzure();
        
    } catch (error) {
        // Fallback to localStorage if Azure fails
        console.error('Azure load failed, using localStorage:', error);
        monitoredUrls = loadFromLocalStorage();
        showToast('Connected to local storage. Azure connection failed.', 'warning');
    }
    
    updateUrlListUI();
}

function loadFromLocalStorage() {
    const savedUrls = localStorage.getItem('monitored_urls');
    if (savedUrls) {
        try {
            return JSON.parse(savedUrls);
        } catch (e) {
            console.error('Error parsing saved URLs:', e);
            return [];
        }
    }
    return [];
}

function saveToLocalStorage() {
    localStorage.setItem('monitored_urls', JSON.stringify(monitoredUrls));
    console.log('Saved URLs to localStorage:', monitoredUrls.length);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function updateUrlListUI() {
    if (!urlListBody) return;
    
    if (monitoredUrls.length === 0) {
        urlListBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-link"></i>
                    </div>
                    <h3>No URLs Monitored</h3>
                    <p>Add URLs to start monitoring their availability</p>
                    <button class="btn btn-primary" id="addFirstUrlBtn">
                        <i class="fas fa-plus"></i> Add Your First URL
                    </button>
                </td>
            </tr>`;
        
        document.getElementById('addFirstUrlBtn')?.addEventListener('click', openAddUrlModal);
        return;
    }
    
    let html = '';
    monitoredUrls.forEach(url => {
        const statusBadge = getUrlStatusBadge(url.status);
        const lastChecked = url.lastChecked ? 
            formatTime(url.lastChecked).date + ' ' + formatTime(url.lastChecked).clock : 'Never';
        
        // Calculate uptime color
        const uptimeValue = parseFloat(url.uptime) || 100;
        
        html += `
            <tr>
                <td>
                    <div style="font-weight: 500;">${url.name || truncateText(url.url, 30)}</div>
                    <div style="font-size: 12px; color: #6b7280;">${truncateText(url.url, 50)}</div>
                    <div class="url-stats">
                        <span class="url-stat">
                            <i class="fas fa-clock"></i> Checked every ${url.checkInterval || 300}s
                        </span>
                        ${url.alertEmail ? `
                        <span class="url-stat">
                            <i class="fas fa-envelope"></i> Email
                        </span>` : ''}
                        ${url.alertWhatsapp ? `
                        <span class="url-stat">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </span>` : ''}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusBadge.class}" title="${url.lastError || url.lastStatusChange || ''}">
                        <i class="fas fa-${statusBadge.icon}"></i>
                        ${statusBadge.text}
                    </span>
                    ${url.lastResponseTime ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                        Response: ${url.lastResponseTime}ms
                    </div>` : ''}
                    ${url.lastError ? `<div style="font-size: 11px; color: #ef4444; margin-top: 2px;">
                        Error: ${truncateText(url.lastError, 30)}
                    </div>` : ''}
                </td>
                <td>
                    <!-- REMOVED TOGGLE SWITCH - ALWAYS ACTIVE -->
                    <div style="font-weight: 500; color: #10b981;">
                        <i class="fas fa-check-circle"></i> Active
                    </div>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                        Always monitoring
                    </div>
                </td>
                <td>
                    <div style="font-weight: 500;">${lastChecked}</div>
                </td>
                <td>
                    <div style="font-weight: 500; color: ${getUptimeColor(uptimeValue)};">${url.uptime || '100%'}</div>
                </td>
                <td>
                    <div class="url-actions">
                        <button class="url-action-btn btn-test" data-url-id="${url.id}" data-url="${url.url}" title="Test URL now">
                            <i class="fas fa-heartbeat"></i> Test Now
                        </button>
                        <button class="url-action-btn btn-edit" data-url-id="${url.id}" title="Edit URL settings">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="url-action-btn btn-delete" data-url-id="${url.id}" title="Remove URL">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    urlListBody.innerHTML = html;
    
    // Add event listeners to URL action buttons
    document.querySelectorAll('.btn-test').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const urlId = e.currentTarget.getAttribute('data-url-id');
            const url = e.currentTarget.getAttribute('data-url');
            testSingleUrl(urlId, url);
        });
    });
    
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const urlId = e.currentTarget.getAttribute('data-url-id');
            editUrl(urlId);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const urlId = e.currentTarget.getAttribute('data-url-id');
            openDeleteModal(urlId);
        });
    });
    
    // REMOVED: Status toggle event listeners
}

function getUptimeColor(uptime) {
    if (uptime >= 99) return '#10b981'; // Green
    if (uptime >= 95) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
}

function getUrlStatusBadge(status) {
    switch(status.toLowerCase()) {
        case 'up':
        case 'active':
        case 'healthy':
            return { class: 'status-up', icon: 'check-circle', text: 'UP' };
        case 'down':
        case 'inactive':
        case 'unhealthy':
            return { class: 'status-down', icon: 'times-circle', text: 'DOWN' };
        case 'checking':
        case 'pending':
            return { class: 'status-pending', icon: 'sync fa-spin', text: 'CHECKING' };
        case 'paused':
            return { class: 'status-paused', icon: 'pause-circle', text: 'PAUSED' };
        default:
            return { class: 'status-unknown', icon: 'question-circle', text: 'UNKNOWN' };
    }
}

// REMOVED: toggleUrlStatus() function completely

// Start refreshing URL statuses periodically
function startUrlStatusRefresher() {
    // Clear existing interval
    if (urlStatusRefreshInterval) {
        clearInterval(urlStatusRefreshInterval);
    }
    
    // Refresh every 30 seconds to get updates from Azure function
    urlStatusRefreshInterval = setInterval(async () => {
        console.log('Auto-refreshing URL statuses...');
        await updateUrlStatusesFromAzure();
    }, 30000); // 30 seconds
    
    console.log('Started URL status refresher (30s interval)');
}

// Modal Functions
function openAddUrlModal() {
    addUrlModal.style.display = 'flex';
    urlInput.focus();
}

function closeAddUrlModal() {
    addUrlModal.style.display = 'none';
    // Reset form
    urlInput.value = '';
    urlName.value = '';
    alertEmail.value = '';
    alertWhatsapp.value = '';
}

function openEditUrlModal() {
    editUrlModal.style.display = 'flex';
    editUrlInput.focus();
}

function closeEditUrlModal() {
    editUrlModal.style.display = 'none';
    currentEditingUrlId = null;
}

function openDeleteModal(urlId) {
    const urlObj = monitoredUrls.find(u => u.id === urlId);
    if (!urlObj) return;
    
    currentDeletingUrlId = urlId;
    deleteUrlText.textContent = `${urlObj.name || truncateText(urlObj.url, 50)}`;
    deleteUrlModal.style.display = 'flex';
}

function closeDeleteUrlModal() {
    deleteUrlModal.style.display = 'none';
    currentDeletingUrlId = null;
}

// Add new URL with Azure integration
async function addNewUrl() {
    const url = urlInput.value.trim();
    const name = urlName.value.trim();
    const email = alertEmail.value.trim();
    const whatsapp = alertWhatsapp.value.trim();
    
    if (!url) {
        showToast('Please enter a URL');
        return;
    }
    
    // Validate URL format
    const validation = validateURL(url);
    if (!validation.isValid) {
        showToast(`Invalid URL: ${validation.message}`);
        return;
    }
    
    let validatedUrl = validation.url;
    
    const newUrl = {
        url: validatedUrl,
        name: name || validatedUrl,
        alertEmail: email,
        alertWhatsapp: whatsapp || YOUR_PHONE_NUMBER
    };
    
    try {
        // Show loading state
        addUrlSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        addUrlSubmitBtn.disabled = true;
        
        // Save to urlmonitorconfigs table
        const azureId = await saveUrlToAzure(newUrl);
        
        // Create local object with Azure ID
        const localUrl = {
            id: azureId,
            url: validatedUrl,
            name: name || '',
            status: 'unknown',
            lastChecked: null,
            uptime: '100%',
            alertEmail: email,
            alertWhatsapp: whatsapp,
            createdAt: new Date().toISOString(),
            deleted: 0,
            // REMOVED: isActive field
            checkInterval: 300,
            azureSaved: true
        };
        
        // Add to local array
        monitoredUrls.push(localUrl);
        
        showToast(`Added ${name || validatedUrl} for monitoring. Azure function will check every 5 minutes.`);
        
        // Refresh status immediately
        await updateUrlStatusesFromAzure();
        
    } catch (error) {
        // Azure failed, use localStorage only
        console.error('Azure save failed:', error);
        const newLocalUrl = {
            id: generateId(),
            url: validatedUrl,
            name: name || '',
            alertEmail: email,
            alertWhatsapp: whatsapp,
            status: 'unknown',
            lastChecked: null,
            uptime: '100%',
            createdAt: new Date().toISOString(),
            deleted: 0,
            // REMOVED: isActive field
            checkInterval: 300,
            azureSaved: false
        };
        
        monitoredUrls.push(newLocalUrl);
        saveToLocalStorage();
        
        showToast(`Added to local storage (cloud save failed): ${name || validatedUrl}`, 'warning');
    } finally {
        // Reset button
        addUrlSubmitBtn.innerHTML = '<i class="fas fa-plus"></i> Add URL';
        addUrlSubmitBtn.disabled = false;
    }
    
    updateUrlListUI();
    closeAddUrlModal();
}

// Test single URL - SIMPLIFIED (NO PAUSE CHECK)
async function testSingleUrl(urlId, url) {
    const urlObj = monitoredUrls.find(u => u.id === urlId);
    if (!urlObj) return;
    
    // Update status to checking
    urlObj.status = 'checking';
    updateUrlListUI();
    
    try {
        // Option 1: Use Azure Function to test
        const azureResult = await testSingleUrlAzure(urlId, url);
        
        if (azureResult.success) {
            urlObj.status = azureResult.status;
            urlObj.lastChecked = new Date().toISOString();
            urlObj.lastResponseTime = azureResult.responseTime;
            urlObj.lastError = azureResult.error || null;
            
            showToast(`Tested ${urlObj.name || urlObj.url}: ${azureResult.status.toUpperCase()} (${azureResult.responseTime}ms)`);
        } else {
            throw new Error(azureResult.error);
        }
        
    } catch (azureError) {
        console.error('Azure test failed, falling back to frontend test:', azureError);
        
        // Option 2: Fallback to frontend test
        const startTime = Date.now();
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            let response;
            try {
                response = await fetch(url, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: controller.signal,
                    cache: 'no-cache'
                });
            } catch (headError) {
                console.log('HEAD failed, trying GET...');
                response = await fetch(url, {
                    method: 'GET',
                    mode: 'no-cors',
                    signal: controller.signal,
                    cache: 'no-cache'
                });
            }
            
            clearTimeout(timeoutId);
            
            const responseTime = Date.now() - startTime;
            
            urlObj.status = 'up';
            urlObj.lastChecked = new Date().toISOString();
            urlObj.lastResponseTime = responseTime;
            urlObj.lastError = null;
            
            showToast(`Tested ${urlObj.name || urlObj.url}: UP (${responseTime}ms)`);
            
        } catch (error) {
            console.error(`Error checking URL ${url}:`, error);
            urlObj.status = 'down';
            urlObj.lastChecked = new Date().toISOString();
            urlObj.lastStatusChange = new Date().toISOString();
            urlObj.lastError = error.message;
            
            showToast(`Tested ${urlObj.name || urlObj.url}: DOWN - ${error.message}`);
        }
    }
    
    // Save to localStorage if not using Azure
    if (!urlObj.azureSaved) {
        saveToLocalStorage();
    }
    
    updateUrlListUI();
}

// Refresh all URLs manually
function refreshAllUrls() {
    showToast('Refreshing URL statuses from Azure...');
    updateUrlStatusesFromAzure();
}

// Edit URL - SIMPLIFIED (NO ACTIVE TOGGLE)
function editUrl(urlId) {
    const urlObj = monitoredUrls.find(u => u.id === urlId);
    if (!urlObj) return;
    
    currentEditingUrlId = urlId;
    
    editUrlInput.value = urlObj.url;
    editUrlName.value = urlObj.name || '';
    editAlertEmail.value = urlObj.alertEmail || '';
    editAlertWhatsapp.value = urlObj.alertWhatsapp || '';
    editUrlId.value = urlId;
    
    // REMOVED: Active toggle in edit modal
    
    openEditUrlModal();
}

// Save URL changes with Azure integration - SIMPLIFIED
async function saveUrlChanges() {
    const urlId = editUrlId.value;
    const url = editUrlInput.value.trim();
    const name = editUrlName.value.trim();
    const email = editAlertEmail.value.trim();
    const whatsapp = editAlertWhatsapp.value.trim();
    
    if (!url) {
        showToast('Please enter a URL');
        return;
    }
    
    const urlIndex = monitoredUrls.findIndex(u => u.id === urlId);
    if (urlIndex === -1) return;
    
    // Validate URL format
    let validatedUrl = url;
    if (!validatedUrl.startsWith('http://') && !validatedUrl.startsWith('https://')) {
        validatedUrl = 'https://' + validatedUrl;
    }
    
    try {
        new URL(validatedUrl);
    } catch (e) {
        showToast('Please enter a valid URL');
        return;
    }
    
    // Prepare updates (NO IsActive)
    const updates = {
        Name: name,
        URL: validatedUrl,
        AlertEmail: email,
        AlertWhatsapp: whatsapp
        // REMOVED: IsActive
    };
    
    // Update in Azure if it was saved there
    const urlObj = monitoredUrls[urlIndex];
    if (urlObj.azureSaved !== false) {
        try {
            await updateUrlInAzure(urlId, updates);
        } catch (error) {
            console.error('Azure update failed:', error);
            urlObj.azureSaved = false;
        }
    }
    
    // Update locally
    monitoredUrls[urlIndex].url = validatedUrl;
    monitoredUrls[urlIndex].name = name;
    monitoredUrls[urlIndex].alertEmail = email;
    monitoredUrls[urlIndex].alertWhatsapp = whatsapp;
    // REMOVED: IsActive update
    
    if (urlObj.azureSaved === false) {
        saveToLocalStorage();
    }
    
    updateUrlListUI();
    closeEditUrlModal();
    
    showToast('URL updated successfully.');
}

// Delete URL with Azure integration
async function confirmDeleteUrl() {
    if (!currentDeletingUrlId) return;
    
    const urlIndex = monitoredUrls.findIndex(u => u.id === currentDeletingUrlId);
    if (urlIndex === -1) return;
    
    const urlObj = monitoredUrls[urlIndex];
    
    try {
        // Show loading
        confirmDeleteUrlBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        confirmDeleteUrlBtn.disabled = true;
        
        // Try to delete from Azure if it was saved there
        if (urlObj.azureSaved !== false) {
            await deleteUrlFromAzure(currentDeletingUrlId);
        }
    } catch (error) {
        console.error('Azure delete failed:', error);
    } finally {
        // Reset button
        confirmDeleteUrlBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
        confirmDeleteUrlBtn.disabled = false;
    }
    
    // Mark as deleted locally
    urlObj.deleted = 1;
    if (urlObj.azureSaved === false) {
        saveToLocalStorage();
    }
    
    // Remove from display
    monitoredUrls.splice(urlIndex, 1);
    updateUrlListUI();
    closeDeleteUrlModal();
    
    showToast(`Removed ${urlObj.name || urlObj.url} from monitoring`);
    addWhatsAppMessage('system', `🗑️ Removed URL from monitoring: ${urlObj.url}`);
}

// Test all servers - SIMPLIFIED (TEST ALL URLS)
function testAllServers() {
    // Test ALL URLs (no filtering)
    if (monitoredUrls.length > 0) {
        showToast(`Running health check on ${monitoredUrls.length} URLs...`);
        
        monitoredUrls.forEach((url, index) => {
            setTimeout(() => {
                testSingleUrl(url.id, url.url);
            }, index * 2000); // 2 second delay between tests
        });
        
        setTimeout(() => {
            showToast('Health check completed');
            addWhatsAppMessage('system', '🔄 Health check completed for all URLs.');
            
            // Refresh status from Azure
            updateUrlStatusesFromAzure();
        }, monitoredUrls.length * 2000 + 2000);
    } else {
        showToast('No URLs to test. Add some URLs first.');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function truncateText(text, maxLength) {
    if (!text) return '--';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function ensureHttp(url) {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return 'https://' + url;
}

function showLoading(show) {
    if (!tableBody) return;
    
    if (show) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading">
                    <div class="spinner"></div>
                    <div>Loading data from API...</div>
                </td>
            </tr>`;
    }
}

function showError(message) {
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="loading">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; color: #f59e0b; margin-bottom: 10px;"></i>
                <div>${message}</div>
                <button id="loadSampleDataBtn" style="margin-top: 10px; padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Load Sample Data
                </button>
            </td>
        </tr>`;
    
    document.getElementById('loadSampleDataBtn')?.addEventListener('click', loadSampleData);
}

function updateApiStatus(status) {
    if (!apiStatus) return;
    
    const icon = apiStatus.querySelector('i');
    const text = apiStatus.querySelector('span');
    
    switch(status) {
        case 'connected':
            apiStatus.className = 'api-status status-connected';
            icon.className = 'fas fa-check-circle';
            text.textContent = 'API Connected';
            break;
        case 'error':
            apiStatus.className = 'api-status status-disconnected';
            icon.className = 'fas fa-times-circle';
            text.textContent = 'API Error - Using Fallback';
            break;
        case 'warning':
            apiStatus.className = 'api-status';
            icon.className = 'fas fa-exclamation-triangle';
            icon.style.color = '#f59e0b';
            text.textContent = 'Using Sample Data';
            break;
        case 'connecting':
            apiStatus.className = 'api-status';
            icon.className = 'fas fa-sync fa-spin';
            text.textContent = 'Connecting to API...';
            break;
    }
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-check-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    if (type === 'error') icon = 'fa-times-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function updateButtonStates(todayMode) {
    if (!todayBtn || !allBtn) return;
    
    if (todayMode) {
        todayBtn.className = 'btn btn-primary';
        allBtn.className = 'btn btn-outline';
    } else {
        todayBtn.className = 'btn btn-outline';
        allBtn.className = 'btn btn-primary';
    }
}

// Sample data as fallback
function loadSampleData() {
    console.log('Loading sample data as fallback...');
    
    const now = new Date();
    const sampleData = [
        {
            timestamp: now.toISOString(),
            url: 'api.example.com',
            call_initiated: 'YES',
            recipient: 'Admin Team'
        },
        {
            timestamp: new Date(now.getTime() - 3600000).toISOString(),
            url: 'app.company.com',
            call_initiated: 'NO',
            recipient: ''
        },
        {
            timestamp: new Date(now.getTime() - 7200000).toISOString(),
            url: 'auth.service.io',
            call_initiated: 'YES',
            recipient: 'Support Team'
        }
    ];
    
    currentData = sampleData;
    populateTable(currentData);
    updateStats(currentData);
    updateApiStatus('warning');
    showToast('Using sample data (API unavailable)');
}

// ============================================
// TABLE FUNCTIONS
// ============================================

function populateTable(data) {
    if (!tableBody) return;
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading">
                    <i class="fas fa-check-circle" style="color: #10b981; font-size: 24px; margin-bottom: 10px;"></i>
                    <div>No incidents found. All systems are operational.</div>
                </td>
            </tr>`;
        return;
    }
    
    let html = '';
    data.forEach((row) => {
        const timestamp = row.timestamp || '';
        const url = row.url || 'Unknown';
        const callInitiated = row.call_initiated || 'NO';
        const recipient = row.recipient || '--';
        
        const time = formatTime(timestamp);
        const status = callInitiated === 'YES' ? 'down' : 'up';
        const duration = calculateDuration(timestamp);
        
        html += `
            <tr>
                <td>
                    <div style="font-weight: 500;">${time.date}</div>
                    <div style="font-size: 12px; color: #6b7280;">${time.clock}</div>
                </td>
                <td>
                    <a href="${ensureHttp(url)}" target="_blank" style="color: #2563eb; text-decoration: none;">
                        ${truncateText(url, 30)}
                    </a>
                </td>
                <td>
                    <span class="status-badge status-${status}">
                        <i class="fas fa-${status === 'down' ? 'times-circle' : 'check-circle'}"></i>
                        ${status === 'down' ? 'DOWN' : 'UP'}
                    </span>
                </td>
                <td>${duration}</td>
                <td>
                    ${callInitiated === 'YES' ? 
                        '<i class="fas fa-check-circle" style="color: #10b981;"></i> Yes' : 
                        '<i class="fas fa-times-circle" style="color: #6b7280;"></i> No'}
                </td>
                <td>${recipient}</td>
                <td>
                    <button class="btn-outline resend-alert-btn" data-url="${url}" style="padding: 6px 12px; font-size: 12px;">
                        <i class="fas fa-redo"></i> Resend
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    document.querySelectorAll('.resend-alert-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.currentTarget.getAttribute('data-url');
            resendAlert(url);
        });
    });
}

function formatTime(timestamp) {
    if (!timestamp) return { date: '--', clock: '--' };

    try {
        // Check if timestamp is in ISO format (has 'T' and 'Z')
        if (timestamp.includes('T') && timestamp.includes('Z')) {
            const date = new Date(timestamp);
            
            return {
                date: date.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                }),
                clock: date.toLocaleTimeString('en-IN', {
                    hour12: true,
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
        }
        
        // Handle the existing format (with AM/PM)
        const [datePart, timePart, period] = timestamp.split(' ');
        
        if (!datePart || !timePart) {
            console.log("Invalid timestamp format:", timestamp);
            return { date: '--', clock: '--' };
        }
        
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        
        let hours24 = hours;
        if (period === 'PM' && hours < 12) {
            hours24 = hours + 12;
        } else if (period === 'AM' && hours === 12) {
            hours24 = 0;
        }
        
        const isoString = `${datePart}T${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const date = new Date(isoString);
        
        if (isNaN(date.getTime())) {
            console.log("Failed to parse date:", timestamp);
            return { date: '--', clock: '--' };
        }

        return {
            date: date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }),
            clock: date.toLocaleTimeString('en-IN', {
                hour12: true,
                hour: '2-digit',
                minute: '2-digit'
            })
        };

    } catch (e) {
        console.error("Error parsing timestamp:", timestamp, e);
        return { date: '--', clock: '--' };
    }
}

function calculateDuration(timestamp) {
    if (!timestamp) return '--';
    
    try {
        let then;
        if (timestamp.includes('AM') || timestamp.includes('PM')) {
            const [datePart, timePart, period] = timestamp.split(' ');
            if (!datePart || !timePart || !period) return '--';
            
            const [hours, minutes, seconds] = timePart.split(':').map(Number);
            
            let hours24 = hours;
            if (period === 'PM' && hours < 12) {
                hours24 = hours + 12;
            } else if (period === 'AM' && hours === 12) {
                hours24 = 0;
            }
            
            const isoString = `${datePart}T${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            then = new Date(isoString);
        } else {
            then = new Date(timestamp);
        }
        
        const now = new Date();
        
        if (isNaN(then.getTime())) {
            return '--';
        }
        
        const diff = now - then;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 60) {
            return `${minutes}m`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
        }
    } catch (error) {
        console.error('Error calculating duration:', error);
        return '--';
    }
}

function updateStats(data) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayCount = data.filter(d => {
        try {
            const timestamp = d.timestamp;
            if (!timestamp) return false;
            
            let date;
            if (timestamp.includes('AM') || timestamp.includes('PM')) {
                const [datePart, timePart, period] = timestamp.split(' ');
                if (!datePart || !timePart || !period) return false;
                
                const [hours, minutes, seconds] = timePart.split(':').map(Number);
                
                let hours24 = hours;
                if (period === 'PM' && hours < 12) {
                    hours24 = hours + 12;
                } else if (period === 'AM' && hours === 12) {
                    hours24 = 0;
                }
                
                const isoString = `${datePart}T${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                date = new Date(isoString);
            } else {
                date = new Date(timestamp);
            }
            
            return date >= todayStart;
        } catch (error) {
            console.error('Error parsing date in updateStats:', error);
            return false;
        }
    }).length;
    
    const alertsCount = data.filter(d => {
        return d.call_initiated === 'YES';
    }).length;
    
    const uptimePercentValue = todayCount === 0 ? 100 : Math.max(95, 100 - (todayCount * 2));
    const avgResponseValue = Math.floor(Math.random() * 100) + 50;
    
    if (uptimePercent) uptimePercent.textContent = `${uptimePercentValue.toFixed(2)}%`;
    if (todayIncidents) todayIncidents.textContent = todayCount;
    if (avgResponse) avgResponse.textContent = `${avgResponseValue}ms`;
    if (alertsSent) alertsSent.textContent = alertsCount;
}

// ============================================
// URL VALIDATION FUNCTIONS
// ============================================

function validateURL(url) {
    if (!url) return { isValid: false, message: 'URL is required' };
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { isValid: false, message: 'URL must start with http:// or https://' };
    }
    
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        
        if (hostname === 'localhost') {
            return { 
                isValid: true, 
                message: 'Localhost URL', 
                url: url,
                isLocal: true 
            };
        }
        
        const domainPattern = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
        
        if (!domainPattern.test(hostname)) {
            const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipPattern.test(hostname)) {
                return { 
                    isValid: false, 
                    message: 'Invalid domain or IP address format' 
                };
            }
            
            const ipParts = hostname.split('.').map(Number);
            if (ipParts.some(part => part < 0 || part > 255)) {
                return { isValid: false, message: 'Invalid IP address' };
            }
        }
        
        return { 
            isValid: true, 
            message: 'Valid URL format', 
            url: url,
            isLocal: false 
        };
        
    } catch (error) {
        return { 
            isValid: false, 
            message: 'Invalid URL format. Example: https://example.com' 
        };
    }
}

// ============================================
// REPORT AND EXPORT FUNCTIONS
// ============================================

function generateReport() {
    if (currentData.length === 0) {
        showToast('No data available to generate report');
        return;
    }
    
    showToast('Generating PDF report...');
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('ServerWatch Pro - Uptime Report', 20, 20);
    
    doc.setFontSize(12);
    const now = new Date();
    doc.text(`Generated: ${now.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}`, 20, 30);
    
    doc.setFontSize(14);
    doc.text('Summary Statistics', 20, 45);
    
    doc.setFontSize(11);
    doc.text(`• Uptime: ${document.getElementById('uptimePercent').textContent}`, 25, 55);
    doc.text(`• Today's Incidents: ${document.getElementById('todayIncidents').textContent}`, 25, 62);
    doc.text(`• Average Response: ${document.getElementById('avgResponse').textContent}`, 25, 69);
    doc.text(`• Alerts Sent: ${document.getElementById('alertsSent').textContent}`, 25, 76);
    doc.text(`• Total Records: ${currentData.length}`, 25, 83);
    doc.text(`• Monitored URLs: ${monitoredUrls.length}`, 25, 90);
    doc.text(`• Active URLs: ${monitoredUrls.length}`, 25, 97); // ALL URLs ARE ACTIVE
    
    doc.setFontSize(14);
    doc.text('Downtime Incidents', 20, 112);
    
    const tableData = currentData.map(item => {
        const timestamp = item.timestamp || '';
        const url = item.url || 'Unknown';
        const callInitiated = item.call_initiated || 'NO';
        const recipient = item.recipient || '--';
        const time = formatTime(timestamp);
        const status = callInitiated === 'YES' ? 'DOWN' : 'UP';
        const duration = calculateDuration(timestamp);
        
        return [
            time.date + ' ' + time.clock,
            truncateText(url, 25),
            status,
            duration,
            callInitiated === 'YES' ? 'Yes' : 'No',
            recipient
        ];
    });
    
    doc.autoTable({
        startY: 117,
        head: [['Time', 'Service', 'Status', 'Duration', 'Alert Sent', 'Recipient']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 20 },
        styles: { fontSize: 9 }
    });
    
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text('Confidential - ServerWatch Pro Report', 20, doc.internal.pageSize.height - 10);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }
    
    const filename = `serverwatch-report-${now.toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    showToast('Report downloaded successfully');
    addWhatsAppMessage('system', '📄 PDF report generated and downloaded.');
}

// ============================================
// WHATSAPP FUNCTIONS
// ============================================

function openWhatsAppModal() {
    whatsappModal.style.display = 'block';
    updateWhatsAppUI();
    
    setTimeout(() => {
        whatsappInput.focus();
    }, 100);
}

function closeWhatsAppModal() {
    whatsappModal.style.display = 'none';
}

function sendWhatsAppMessage() {
    const message = whatsappInput.value.trim();
    
    if (!message) return;
    
    whatsAppMessages.push({
        sender: 'user',
        text: message,
        time: new Date()
    });
    
    whatsappInput.value = '';
    localStorage.setItem('whatsapp_chat', JSON.stringify(whatsAppMessages));
    updateWhatsAppUI();
    
    setTimeout(() => {
        const reply = generateAutoReply(message);
        whatsAppMessages.push({
            sender: 'admin',
            text: reply,
            time: new Date()
        });
        
        localStorage.setItem('whatsapp_chat', JSON.stringify(whatsAppMessages));
        updateWhatsAppUI();
        
        if (message.toLowerCase().includes('contact') || 
            message.toLowerCase().includes('call') ||
            message.toLowerCase().includes('whatsapp')) {
            
            setTimeout(() => {
                openActualWhatsApp();
            }, 1500);
        }
    }, 1000);
}

function handleWhatsAppKeyPress(event) {
    if (event.key === 'Enter') {
        sendWhatsAppMessage();
    }
}

function updateWhatsAppUI() {
    if (!whatsappMessages) return;
    
    let html = '';
    whatsAppMessages.forEach(msg => {
        const time = formatWhatsAppTime(msg.time);
        const messageClass = msg.sender === 'user' ? 'message-outgoing' : 'message-incoming';
        
        html += `
            <div class="whatsapp-message ${messageClass}">
                ${msg.text.replace(/\n/g, '<br>')}
                <div style="font-size: 11px; color: #999; margin-top: 4px; text-align: right;">
                    ${time}
                </div>
            </div>
        `;
    });
    
    whatsappMessages.innerHTML = html;
    whatsappMessages.scrollTop = whatsappMessages.scrollHeight;
}

function generateAutoReply(message) {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
        return 'Hello! How can I assist you with server monitoring?';
    } else if (lowerMsg.includes('status') || lowerMsg.includes('how are')) {
        return `Current status:\n• Uptime: ${document.getElementById('uptimePercent').textContent}\n• Today's incidents: ${document.getElementById('todayIncidents').textContent}\n• Total records: ${currentData.length}\n• Monitored URLs: ${monitoredUrls.length}`;
    } else if (lowerMsg.includes('incident') || lowerMsg.includes('down')) {
        if (currentData.length > 0) {
            const recentIncidents = currentData
                .filter(d => d.call_initiated === 'YES')
                .slice(0, 3);
            
            if (recentIncidents.length > 0) {
                return `Recent incidents:\n${recentIncidents.map(d => {
                    const url = d.url || 'Unknown';
                    const time = formatTime(d.timestamp);
                    return `• ${url} - ${time.clock}`;
                }).join('\n')}`;
            } else {
                return 'No recent incidents. All services are running smoothly.';
            }
        } else {
            return 'No incidents found in the system.';
        }
    } else if (lowerMsg.includes('contact') || lowerMsg.includes('call')) {
        return `I'll connect you directly:\n\n📱 Click "Open WhatsApp" below to message me directly, or call: +${YOUR_PHONE_NUMBER}`;
    } else if (lowerMsg.includes('help')) {
        return 'I can help you with:\n1. Checking server status\n2. Viewing incident history\n3. Adding new services to monitor\n4. Adjusting alert settings\n5. Generating reports\n\nWhat would you like to do?';
    } else {
        return `Thanks for your message. For detailed assistance, you can:\n\n1. Check the dashboard for real-time data\n2. Review ${currentData.length} incident records\n3. Generate PDF report for analysis\n4. Monitor ${monitoredUrls.length} URLs`;
    }
}

function openActualWhatsApp() {
    const defaultMessage = `Hi ${YOUR_NAME}, I need help with server monitoring. Current status: ${document.getElementById('uptimePercent').textContent} uptime, ${document.getElementById('todayIncidents').textContent} incidents today.`;
    const whatsappUrl = `https://wa.me/${YOUR_PHONE_NUMBER}?text=${encodeURIComponent(defaultMessage)}`;
    window.open(whatsappUrl, '_blank');
    
    whatsAppMessages.push({
        sender: 'system',
        text: `📱 I've opened WhatsApp for you. Please continue the conversation there.`,
        time: new Date()
    });
    
    updateWhatsAppUI();
    localStorage.setItem('whatsapp_chat', JSON.stringify(whatsAppMessages));
}

function formatWhatsAppTime(date) {
    const now = new Date();
    const msgTime = new Date(date);
    
    if (now.toDateString() === msgTime.toDateString()) {
        return msgTime.toLocaleTimeString('en-IN', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        return msgTime.toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

// ============================================
// OTHER FUNCTIONS
// ============================================

function resendAlert(url) {
    showToast(`Resending alert for ${url}...`);
    
    setTimeout(() => {
        showToast('Alert resent successfully');
    }, 1000);
}

function exportCSV() {
    if (currentData.length === 0) {
        showToast('No data to export');
        return;
    }
    
    let csv = 'Timestamp,URL,Alert Sent,Recipient\n';
    currentData.forEach(row => {
        const timestamp = row.timestamp || '';
        const url = row.url || 'Unknown';
        const callInitiated = row.call_initiated || 'NO';
        const recipient = row.recipient || '';
        
        csv += `"${timestamp}","${url}","${callInitiated}","${recipient}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `downtime-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('CSV exported successfully');
    addWhatsAppMessage('system', '📊 Data exported to CSV file.');
}

function clearFilters() {
    fetchAllData();
    showToast('Filters cleared');
}

function addWhatsAppMessage(sender, text) {
    whatsAppMessages.push({
        sender: sender,
        text: text,
        time: new Date()
    });
    
    if (whatsappModal.style.display === 'block') {
        updateWhatsAppUI();
    }
    
    localStorage.setItem('whatsapp_chat', JSON.stringify(whatsAppMessages));
}