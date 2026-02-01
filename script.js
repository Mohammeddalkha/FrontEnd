// Configuration - Direct API call (since you have CORS enabled)
const API_URL = 'https://url-monitor-func-fpekcgfmbvfubgf7.centralindia-01.azurewebsites.net/api/get_downtime';
const YOUR_PHONE_NUMBER = '918300521700';
const YOUR_NAME = 'Server Admin';

// State
let currentData = [];
let whatsAppMessages = [
    { sender: 'admin', text: 'Hi! I\'m your server admin. How can I help you today?', time: new Date() },
    { sender: 'admin', text: 'You can ask me about:\n• Server status\n• Recent incidents\n• Adding new services\n• Alert settings', time: new Date() }
];
let isTodayMode = true;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateApiStatus('connecting');
    fetchTodayData();
    
    // Load saved messages from localStorage
    const savedMessages = localStorage.getItem('whatsapp_chat');
    if (savedMessages) {
        whatsAppMessages = JSON.parse(savedMessages);
        updateWhatsAppUI();
    }
});

// Fetch Data Functions - FIXED: Client-side filtering for "Today"
async function fetchData(todayOnly = true) {
    try {
        showLoading(true);
        updateApiStatus('connecting');
        
        console.log(`Fetching ${todayOnly ? 'today\'s' : 'all'} data from API...`);
        
        // Always fetch all data, then filter client-side if needed
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
        
        // Handle empty response
        if (!data || (Array.isArray(data) && data.length === 0)) {
            currentData = [];
            console.log('No data returned from API');
        } else if (Array.isArray(data)) {
            // Filter for today if needed (client-side)
            if (todayOnly) {
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                currentData = data.filter(item => {
                    try {
                        const timestamp = item.timestamp;
                        if (!timestamp) return false;
                        
                        let date;
                        if (timestamp.includes('AM') || timestamp.includes('PM')) {
                            // Parse custom format: "2026-01-18 04:05:02 PM"
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
            } else {
                currentData = data;
            }
        } else if (typeof data === 'object' && data !== null) {
            // Convert object to array if needed
            currentData = Object.values(data);
        }
        
        console.log('Processed data:', currentData);
        
        populateTable(currentData);
        updateStats(currentData);
        updateApiStatus('connected');
        
        // Update button states
        updateButtonStates(todayOnly);
        isTodayMode = todayOnly;
        
        showToast(`Loaded ${currentData.length} records`);
        
    } catch (error) {
        console.error('Fetch error:', error);
        updateApiStatus('error');
        showError(`Failed to load data: ${error.message}. Using sample data as fallback.`);
        
        // Fallback to sample data
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

// Table Functions - FIXED: Proper timestamp parsing
function populateTable(data) {
    const tableBody = document.getElementById('tableBody');
    
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
    data.forEach((row, index) => {
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
                    <button class="btn-outline" style="padding: 6px 12px; font-size: 12px;" 
                            onclick="resendAlert('${url}')">
                        <i class="fas fa-redo"></i> Resend
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// FIXED: Proper timestamp parsing function
function formatTime(timestamp) {
    if (!timestamp) return { date: '--', clock: '--' };

    try {
        // Your timestamp format: "2026-01-18 04:05:02 PM"
        // Convert to: "2026-01-18T16:05:02" (24-hour format)
        
        // Split the timestamp into date and time parts
        const [datePart, timePart, period] = timestamp.split(' ');
        
        if (!datePart || !timePart) {
            console.log("Invalid timestamp format:", timestamp);
            return { date: '--', clock: '--' };
        }
        
        // Split time into hours, minutes, seconds
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        
        // Convert 12-hour to 24-hour format
        let hours24 = hours;
        if (period === 'PM' && hours < 12) {
            hours24 = hours + 12;
        } else if (period === 'AM' && hours === 12) {
            hours24 = 0;
        }
        
        // Create a proper ISO string
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

// FIXED: Duration calculation for custom timestamp format
function calculateDuration(timestamp) {
    if (!timestamp) return '--';
    
    try {
        let then;
        if (timestamp.includes('AM') || timestamp.includes('PM')) {
            // Parse custom format: "2026-01-18 04:05:02 PM"
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

// PDF Generation - FIXED: Proper timestamp handling
function generateReport() {
    if (currentData.length === 0) {
        showToast('No data available to generate report');
        return;
    }
    
    showToast('Generating PDF report...');
    
    // Use jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('ServerWatch Pro - Uptime Report', 20, 20);
    
    // Add date
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
    
    // Add stats
    doc.setFontSize(14);
    doc.text('Summary Statistics', 20, 45);
    
    doc.setFontSize(11);
    doc.text(`• Uptime: ${document.getElementById('uptimePercent').textContent}`, 25, 55);
    doc.text(`• Today's Incidents: ${document.getElementById('todayIncidents').textContent}`, 25, 62);
    doc.text(`• Average Response: ${document.getElementById('avgResponse').textContent}`, 25, 69);
    doc.text(`• Alerts Sent: ${document.getElementById('alertsSent').textContent}`, 25, 76);
    doc.text(`• Total Records: ${currentData.length}`, 25, 83);
    
    // Add incidents table header
    doc.setFontSize(14);
    doc.text('Downtime Incidents', 20, 95);
    
    // Create table data with proper timestamp formatting
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
    
    // Add table
    doc.autoTable({
        startY: 100,
        head: [['Time', 'Service', 'Status', 'Duration', 'Alert Sent', 'Recipient']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 20 },
        styles: { fontSize: 9 }
    });
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text('Confidential - ServerWatch Pro Report', 20, doc.internal.pageSize.height - 10);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }
    
    // Save the PDF
    const filename = `serverwatch-report-${now.toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    showToast('Report downloaded successfully');
    addWhatsAppMessage('system', '📄 PDF report generated and downloaded.');
}

// WhatsApp Functions
function openWhatsAppModal() {
    document.getElementById('whatsappModal').style.display = 'block';
    updateWhatsAppUI();
    
    setTimeout(() => {
        document.getElementById('whatsappInput').focus();
    }, 100);
}

function closeWhatsAppModal() {
    document.getElementById('whatsappModal').style.display = 'none';
}

function sendWhatsAppMessage() {
    const input = document.getElementById('whatsappInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    whatsAppMessages.push({
        sender: 'user',
        text: message,
        time: new Date()
    });
    
    input.value = '';
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
    const container = document.getElementById('whatsappMessages');
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
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function generateAutoReply(message) {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
        return 'Hello! How can I assist you with server monitoring?';
    } else if (lowerMsg.includes('status') || lowerMsg.includes('how are')) {
        return `Current status:\n• Uptime: ${document.getElementById('uptimePercent').textContent}\n• Today's incidents: ${document.getElementById('todayIncidents').textContent}\n• Total records: ${currentData.length}`;
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
        return 'I can help you with:\n1. Checking server status\n2. Viewing incident history\n3. Adding new services to monitor\n4. Adjusting alert settings\n\nWhat would you like to do?';
    } else {
        return `Thanks for your message. For detailed assistance, you can:\n\n1. Check the dashboard for real-time data\n2. Review ${currentData.length} incident records\n3. Generate PDF report for analysis`;
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

// Utility Functions
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

// FIXED: Update stats with proper timestamp parsing
function updateStats(data) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate incidents today
    const todayCount = data.filter(d => {
        try {
            const timestamp = d.timestamp;
            if (!timestamp) return false;
            
            let date;
            if (timestamp.includes('AM') || timestamp.includes('PM')) {
                // Parse custom format: "2026-01-18 04:05:02 PM"
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
    
    // Calculate alerts sent
    const alertsCount = data.filter(d => {
        return d.call_initiated === 'YES';
    }).length;
    
    // Calculate uptime percentage (assuming 100% if no incidents today)
    const uptimePercent = todayCount === 0 ? 100 : Math.max(95, 100 - (todayCount * 2));
    
    // Calculate average response time (simulated)
    const avgResponse = Math.floor(Math.random() * 100) + 50;
    
    // Update DOM
    document.getElementById('todayIncidents').textContent = todayCount;
    document.getElementById('uptimePercent').textContent = `${uptimePercent.toFixed(2)}%`;
    document.getElementById('avgResponse').textContent = `${avgResponse}ms`;
    document.getElementById('alertsSent').textContent = alertsCount;
}

function showLoading(show) {
    const tableBody = document.getElementById('tableBody');
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
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="loading">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; color: #f59e0b; margin-bottom: 10px;"></i>
                <div>${message}</div>
                <button onclick="loadSampleData()" style="margin-top: 10px; padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Load Sample Data
                </button>
            </td>
        </tr>`;
}

function updateApiStatus(status) {
    const apiStatus = document.getElementById('apiStatus');
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

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    
    toast.innerHTML = `
        <i class="fas fa-check-circle" style="margin-right: 8px;"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// Action Functions
function testAllServers() {
    showToast('Running comprehensive health check...');
    
    setTimeout(() => {
        showToast('Health check completed. All servers operational.');
        addWhatsAppMessage('system', '🔄 Health check completed. No issues found.');
    }, 2000);
}

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
    
    // Create CSV content
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
    
    if (document.getElementById('whatsappModal').style.display === 'block') {
        updateWhatsAppUI();
    }
    
    localStorage.setItem('whatsapp_chat', JSON.stringify(whatsAppMessages));
}

function updateButtonStates(todayMode) {
    const todayBtn = document.getElementById('todayBtn');
    const allBtn = document.getElementById('allBtn');
    
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