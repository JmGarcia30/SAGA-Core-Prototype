/**
 * SAGA-Core Dashboard View Controller
 * Manages UI switching, bindings, and Chart.js analytics
 */

// Global state trackers
let currentTab = 'overview';
let activeTheme = 'light';
let activeUser = null;
let chartInstances = {};
let selectedApplicantId = null;
let currentRFIDTargetId = null;
let simRFIDDirection = 'in';

// ============================================================================
// DOM INITIALIZATION
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Load active session
    loadSession();

    // 2. Initialize tabs and deep links
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        switchNavTab(hash);
    } else {
        switchNavTab('overview');
    }

    // 3. Setup global listeners
    document.addEventListener('click', handleDropdownOutclicks);

    // 4. Load background data trackers
    checkCredentialMonitoringAlerts();

    // 5. Audit Log Initializer
    logSystemAuditTrail('Initialized SAGA-Core HRIS terminal console.');
});

// ============================================================================
// SECURITY & SESSION CONTROLS
// ============================================================================
function loadSession() {
    const sessionRaw = localStorage.getItem('saga_session');
    if (!sessionRaw) {
        // Redir to login if no session (fallback to default admin for capstone demo)
        activeUser = {
            username: 'admin@school.edu.ph',
            role: 'HR Administrator',
            fullName: 'Dr. Albert Tan',
            employeeId: null
        };
        localStorage.setItem('saga_session', JSON.stringify(activeUser));
    } else {
        activeUser = JSON.parse(sessionRaw);
    }

    // Bind profile details
    document.getElementById('userProfileName').textContent = activeUser.fullName;
    document.getElementById('userProfileRole').textContent = activeUser.role;
    document.getElementById('dropdownFullName').textContent = activeUser.fullName;
    document.getElementById('dropdownRoleLabel').textContent = activeUser.role;
    document.getElementById('sidebarRoleText').textContent = activeUser.role;
    document.getElementById('userSessionSwitcher').value = activeUser.role === 'HR Administrator' ? 'HR Administrator' : 
                                                           activeUser.role === 'HR Staff' ? 'HR Staff' :
                                                           activeUser.role === 'Dean' ? 'Dean' :
                                                           activeUser.role === 'Department Chair' ? 'Department Chair' : 
                                                           (activeUser.employeeId === 'EMP_1624896000001' ? 'Faculty-Ana' : 'Faculty');

    // Set Avatar text initials
    const initials = activeUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('userAvatarText').textContent = initials;

    // Adapt layout views based on active role permissions
    adaptSidebarNavigationByRole();
}

function adaptSidebarNavigationByRole() {
    const adminNav = document.getElementById('adminSidebarNav');
    const essNav = document.getElementById('essSidebarNav');

    if (activeUser.role === 'Faculty' || activeUser.role === 'Employee') {
        adminNav.classList.add('hidden');
        essNav.classList.remove('hidden');
        if (currentTab === 'overview' || currentTab === 'recruitment' || currentTab === 'applicants' || currentTab === 'employees' || currentTab === 'payroll' || currentTab === 'leave') {
            switchNavTab('ess-dashboard');
        }
    } else {
        adminNav.classList.remove('hidden');
        essNav.classList.add('hidden');
    }
}

function switchSessionRole() {
    const selectVal = document.getElementById('userSessionSwitcher').value;
    let sessionRole = 'HR Administrator';
    let sessionUser = 'HR Director';
    let empId = null;

    if (selectVal === 'HR Administrator') {
        sessionRole = 'HR Administrator';
        sessionUser = 'Dr. Albert Tan';
    } else if (selectVal === 'HR Staff') {
        sessionRole = 'HR Staff';
        sessionUser = 'Staff Assistant';
    } else if (selectVal === 'Dean') {
        sessionRole = 'Dean';
        sessionUser = 'Dean Albert Principal';
    } else if (selectVal === 'Department Chair') {
        sessionRole = 'Department Chair';
        sessionUser = 'Prof. Cynthia Cruz';
    } else if (selectVal === 'Faculty') {
        sessionRole = 'Faculty';
        sessionUser = 'Teacher Juan Dela Cruz';
        empId = 'EMP_1624896000000';
    } else if (selectVal === 'Faculty-Ana') {
        sessionRole = 'Faculty';
        sessionUser = 'Teacher Ana Rodriguez';
        empId = 'EMP_1624896000001';
    }

    const session = {
        username: sessionUser.toLowerCase().replace(' ', '.'),
        role: sessionRole,
        fullName: sessionUser,
        employeeId: empId,
        loginTime: new Date().toISOString()
    };
    localStorage.setItem('saga_session', JSON.stringify(session));
    
    logSystemAuditTrail(`Switched institutional session focus context to [${sessionRole}].`);
    
    // Refresh page
    window.location.reload();
}

function handleLogout() {
    localStorage.removeItem('saga_session');
    window.location.href = 'login.html';
}

// ============================================================================
// CORE NAVIGATION & THEMING
// ============================================================================
function switchNavTab(tabName) {
    currentTab = tabName;
    window.location.hash = tabName;

    // Toggle active classes on sidebar links
    document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.remove('active');
    });

    const activeEl = document.getElementById(`nav-${tabName}`);
    if (activeEl) activeEl.classList.add('active');

    // Toggle target tab views visibility
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.add('hidden');
    });

    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) targetView.classList.remove('hidden');

    // Update breadcrumb
    const breadcrumbMap = {
        'overview': 'Workforce Overview',
        'recruitment': 'Recruitment & Job Openings',
        'applicants': 'Job Applicants (ATS)',
        'employees': 'Employee Directory',
        'onboarding': 'Onboarding Pipeline',
        'attendance': 'RFID Attendance logs',
        'payroll': 'Payroll Hub',
        'leave': 'Leaves approvals queue',
        'exit': 'Exits & Separation',
        'documents': 'Digital 201 Files',
        'analytics': 'Advanced Analytics',
        'reports': 'Report Generator',
        'settings': 'System Settings',
        'archive': 'Historical Archive',
        'ess-dashboard': 'Employee Self Service',
        'ess-attendance': 'My Time Logs',
        'ess-payroll': 'My Payslips',
        'ess-leave': 'Request Leave credit',
        'ess-documents': 'My 201 Folders'
    };
    document.getElementById('breadcrumbSection').textContent = breadcrumbMap[tabName] || 'Overview';

    // Rerender specific view data
    renderViewData(tabName);

    // Hide mobile sidebar
    document.getElementById('sidebar').classList.add('-translate-x-full');
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const icon = document.getElementById('mobileMenuIcon');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        icon.className = 'fas fa-times text-xl';
    } else {
        sidebar.classList.add('-translate-x-full');
        icon.className = 'fas fa-bars text-xl';
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    activeTheme = isDark ? 'dark' : 'light';
    localStorage.setItem('saga_theme', activeTheme);
    document.getElementById('themeToggleIcon').className = isDark ? 'fas fa-sun text-yellow-400' : 'fas fa-moon';
    
    // Redraw active charts
    if (currentTab === 'overview' || currentTab === 'analytics') {
        initializeCharts();
    }
}

// Ensure theme is set on load
if (localStorage.getItem('saga_theme') === 'dark') {
    document.documentElement.classList.add('dark');
    activeTheme = 'dark';
    setTimeout(() => {
        document.getElementById('themeToggleIcon').className = 'fas fa-sun text-yellow-400';
    }, 100);
}

// Dropdowns outclick controller
function handleDropdownOutclicks(e) {
    const notifBtn = document.querySelector('button[title="Notifications"]');
    const notifPanel = document.getElementById('notifMenuPanel');
    if (notifPanel && !notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
        notifPanel.classList.add('hidden');
    }

    const profileBtn = document.querySelector('button[onclick="toggleProfileDropdown()"]');
    const profilePanel = document.getElementById('profileDropdownPanel');
    if (profilePanel && !profilePanel.contains(e.target) && !profileBtn.contains(e.target)) {
        profilePanel.classList.add('hidden');
    }

    const searchInput = document.getElementById('globalSearchInput');
    const searchPanel = document.getElementById('searchFloatingResults');
    if (searchPanel && !searchPanel.contains(e.target) && !searchInput.contains(e.target)) {
        searchPanel.classList.add('hidden');
    }
}

function toggleNotificationPanel() {
    document.getElementById('notifMenuPanel').classList.toggle('hidden');
}

function toggleProfileDropdown() {
    document.getElementById('profileDropdownPanel').classList.toggle('hidden');
}

// ============================================================================
// VIEW RENDERING SWITCH CONTROLLER
// ============================================================================
function renderViewData(tabName) {
    switch (tabName) {
        case 'overview':
            renderOverviewMetrics();
            initializeCharts();
            break;
        case 'recruitment':
            renderRecruitmentJobs();
            break;
        case 'applicants':
            renderApplicantsDropdowns();
            renderApplicantsList();
            break;
        case 'employees':
            renderEmployeesFilters();
            renderEmployeeDirectory();
            break;
        case 'onboarding':
            renderOnboardingTab();
            break;
        case 'attendance':
            renderAttendanceTab();
            break;
        case 'payroll':
            renderPayrollTab();
            break;
        case 'leave':
            renderLeavesQueue();
            break;
        case 'exit':
            renderExitTab();
            break;
        case 'documents':
            renderDocumentsTab();
            break;
        case 'analytics':
            initializeAnalyticsCharts();
            break;
        case 'reports':
            generateMockReportData();
            break;
        case 'archive':
            renderArchivedRegistry();
            break;
        case 'ess-dashboard':
            renderESSDashboard();
            break;
        case 'ess-attendance':
            renderESSAttendanceLogs();
            break;
        case 'ess-payroll':
            renderESSPayslips();
            break;
        case 'ess-leave':
            renderESSLeaveForm();
            break;
        case 'ess-documents':
            renderESSDocuments();
            break;
    }
}

// ============================================================================
// 1. WORKFORCE OVERVIEW (DASHBOARD)
// ============================================================================
function renderOverviewMetrics() {
    const metrics = SAGA.getHRISMetrics();
    const data = SAGA.getData();

    document.getElementById('card-active-staff').textContent = metrics.activeWorkforce;
    document.getElementById('card-attendance-rate').textContent = `${metrics.attendanceRate}%`;
    document.getElementById('card-pending-leaves').textContent = metrics.pendingLeaves;
    document.getElementById('card-total-applicants').textContent = metrics.totalApplicants;

    // Calc scored count
    const scoredCount = data.applicants.filter(a => a.status === 'scored').length;
    document.getElementById('card-scored-count').textContent = `${scoredCount} Scored`;

    // Calc active clock-in count today
    const todayStr = new Date().toLocaleDateString();
    let presentCount = 0;
    Object.values(data.attendanceLogs).forEach(logs => {
        if (logs.some(l => l.date === todayStr && l.type === 'in')) presentCount++;
    });
    document.getElementById('card-present-count').textContent = `${presentCount} Staff Clocked`;

    // Render activity trail
    const auditLogs = data.activities || [];
    const trailContainer = document.getElementById('dashboard-activity-trail');
    if (auditLogs.length === 0) {
        trailContainer.innerHTML = `<p class="text-slate-400 italic text-center">No logs logged.</p>`;
    } else {
        trailContainer.innerHTML = auditLogs.slice(0, 5).map(log => `
            <div class="flex gap-2.5 items-start">
                <div class="w-1.5 h-1.5 rounded-full mt-1.5 ${log.type === 'action' ? 'bg-amber-400' : 'bg-slate-400'}"></div>
                <div class="flex-1">
                    <p class="font-bold text-slate-800 leading-snug">${log.action}</p>
                    <p class="text-[9px] text-slate-400 mt-0.5">${log.user} • ${SAGA.formatDate(log.time)}</p>
                </div>
            </div>
        `).join('');
    }
}

function initializeCharts() {
    const data = SAGA.getData();
    const metrics = SAGA.getHRISMetrics();

    // Destroy existing charts to prevent hover glitch overlays
    ['chartAttendanceFlow', 'chartDeptDistribution', 'chartPayrollSummary'].forEach(id => {
        if (chartInstances[id]) chartInstances[id].destroy();
    });

    const isDark = activeTheme === 'dark';
    const gridColor = isDark ? '#334155' : '#f1f5f9';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // Chart 1: Attendance Flow (Line + Bar combined)
    const ctxFlow = document.getElementById('chartAttendanceFlow').getContext('2d');
    chartInstances['chartAttendanceFlow'] = new Chart(ctxFlow, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            datasets: [{
                label: 'Present Rate (%)',
                data: [92, 94, 96, 91, 95, 88],
                borderColor: '#EAB308',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                tension: 0.35,
                fill: true,
                yAxisID: 'y'
            }, {
                label: 'New Candidates Registered',
                data: [2, 5, 3, 4, 1, 0],
                type: 'bar',
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: textColor } },
                y: { grid: { color: gridColor }, ticks: { color: textColor }, min: 80, max: 100 },
                y1: { grid: { display: false }, ticks: { color: textColor }, position: 'right', min: 0, max: 10 }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Chart 2: Departments Polar Area
    const depts = SAGA.getEmployeesByDepartment();
    const ctxDept = document.getElementById('chartDeptDistribution').getContext('2d');
    chartInstances['chartDeptDistribution'] = new Chart(ctxDept, {
        type: 'polarArea',
        data: {
            labels: depts.map(d => d.department),
            datasets: [{
                data: depts.map(d => d.count),
                backgroundColor: ['rgba(59, 130, 246, 0.75)', 'rgba(234, 179, 8, 0.75)', 'rgba(168, 85, 247, 0.75)', 'rgba(244, 63, 94, 0.75)']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { grid: { color: gridColor }, ticks: { display: false } } },
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, color: textColor, font: { size: 9 } } } }
        }
    });

    // Chart 3: Payroll summary Pie Chart
    const sssTotal = Math.round(metrics.totalPayroll * 0.045);
    const phTotal = Math.round(metrics.totalPayroll * 0.025);
    const pagIbigTotal = Object.keys(data.employees).length * 200;
    const taxTotal = Math.round(metrics.totalPayroll * 0.10);
    const netPayoutTotal = metrics.totalPayroll - (sssTotal + phTotal + pagIbigTotal + taxTotal);

    const ctxPayroll = document.getElementById('chartPayrollSummary').getContext('2d');
    chartInstances['chartPayrollSummary'] = new Chart(ctxPayroll, {
        type: 'doughnut',
        data: {
            labels: ['Net Payout', 'SSS Share', 'PhilHealth', 'Pag-IBIG', 'Gov Tax'],
            datasets: [{
                data: [netPayoutTotal, sssTotal, phTotal, pagIbigTotal, taxTotal],
                backgroundColor: ['#10B981', '#ef4444', '#f59e0b', '#3b82f6', '#6366f1']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, color: textColor, font: { size: 9 } } } }
        }
    });
}

// ============================================================================
// 2. RECRUITMENT & ATS
// ============================================================================
function renderRecruitmentJobs() {
    const jobs = SAGA.getJobs();
    const data = SAGA.getData();
    const container = document.getElementById('recruitmentJobsContainer');

    document.getElementById('rec-active-campaigns').textContent = jobs.length;
    document.getElementById('rec-total-apps').textContent = data.applicants.length;

    container.innerHTML = jobs.map(job => {
        // Count applicants for this job
        const jobApps = data.applicants.filter(a => a.jobId === job.id);
        const hiredCount = jobApps.filter(a => a.status === 'hired' || a.status === 'onboarding').length;

        return `
            <div class="card p-5 bg-white border-l-4 border-amber-500 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="space-y-1.5 flex-1">
                    <div class="flex items-center gap-2">
                        <h4 class="font-bold text-slate-900 text-sm">${job.title}</h4>
                        <span class="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold rounded text-[9px] uppercase tracking-wider">${job.department}</span>
                    </div>
                    <p class="text-xs text-slate-500 leading-relaxed max-w-2xl">${job.description}</p>
                    <p class="text-[10px] text-slate-400">Salary Package: <span class="font-bold text-slate-600">${job.salary}</span> • Reqs: <span class="font-medium text-slate-600">${job.requirements}</span></p>
                </div>
                <div class="flex items-center gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                    <div class="text-center">
                        <p class="text-lg font-extrabold text-slate-900">${jobApps.length}</p>
                        <p class="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Applicants</p>
                    </div>
                    <div class="text-center">
                        <p class="text-lg font-extrabold text-emerald-600">${hiredCount}</p>
                        <p class="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Hired</p>
                    </div>
                    <button onclick="deleteJobPostingCampaign(${job.id})" class="text-rose-500 hover:text-rose-700 p-2 text-xs" title="Remove Campaign"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function openCreateJobModal() {
    document.getElementById('createJobModal').classList.add('active');
}

function closeCreateJobModal() {
    document.getElementById('createJobModal').classList.remove('active');
}

function handleCreateJob(e) {
    e.preventDefault();
    const title = document.getElementById('newJobTitle').value;
    const dept = document.getElementById('newJobDept').value;
    const sal = document.getElementById('newJobSalary').value;
    const reqs = document.getElementById('newJobRequirements').value;
    const desc = document.getElementById('newJobDesc').value;

    const data = SAGA.getData();
    const newId = data.applicants.length > 0 ? Math.max(...SAGA.jobs.map(j => j.id)) + 1 : 1;
    
    const newJob = {
        id: newId,
        title,
        department: dept,
        requirements: reqs,
        description: desc,
        salary: sal
    };

    SAGA.jobs.push(newJob);
    logSystemAuditTrail(`Created new faculty recruitment campaign: [${title}].`);
    
    SAGA.showCustomAlert(`Job posting for "${title}" successfully compiled and published.`, "Campaign Published");
    
    closeCreateJobModal();
    renderRecruitmentJobs();
}

function deleteJobPostingCampaign(id) {
    SAGA.showCustomConfirm("Are you sure you want to retire this recruitment campaign? All associated history will be locked.", "Confirm Campaign Closure").then(confirm => {
        if (confirm) {
            SAGA.jobs = SAGA.jobs.filter(j => j.id !== id);
            logSystemAuditTrail(`Retired recruitment campaign ID [${id}].`);
            renderRecruitmentJobs();
        }
    });
}

// ============================================================================
// 3. JOB APPLICANTS (ATS Leaderboard & AI Parsing)
// ============================================================================
function renderApplicantsDropdowns() {
    const jobs = SAGA.getJobs();
    const jobFilter = document.getElementById('filterAppJob');
    
    // Save current selection value
    const curVal = jobFilter.value;

    jobFilter.innerHTML = '<option value="">All Job Listings</option>' + 
        jobs.map(j => `<option value="${j.id}">${j.title.slice(0, 30)}...</option>`).join('');

    jobFilter.value = curVal;
}

function renderApplicantsList() {
    const data = SAGA.getData();
    const selectedJobId = document.getElementById('filterAppJob').value;
    const selectedStatus = document.getElementById('filterAppStatus').value;

    let filtered = data.applicants || [];

    if (selectedJobId) {
        filtered = filtered.filter(a => a.jobId === parseInt(selectedJobId));
    }
    if (selectedStatus) {
        filtered = filtered.filter(a => a.status === selectedStatus);
    }

    // Sort by AI score descending (Ranking Leaderboard)
    filtered.sort((a, b) => (b.compatibility_score || 0) - (a.compatibility_score || 0));

    const body = document.getElementById('applicantsLeaderboardBody');
    if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 italic">No candidates matching filters.</td></tr>`;
        return;
    }

    body.innerHTML = filtered.map((app, index) => {
        const job = SAGA.getJobById(app.jobId);
        const rank = index + 1;
        const score = app.compatibility_score || 'N/A';
        
        let scoreClass = 'bg-slate-100 text-slate-700';
        if (app.compatibility_score >= 85) scoreClass = 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold';
        else if (app.compatibility_score >= 70) scoreClass = 'bg-amber-100 text-amber-900 border border-amber-300';
        else if (app.compatibility_score) scoreClass = 'bg-rose-100 text-rose-900 border border-rose-300';

        let statusClass = 'badge-applied';
        if (app.status === 'scored') statusClass = 'badge-scored';
        else if (app.status === 'hired' || app.status === 'onboarding') statusClass = 'badge-hired';

        return `
            <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="selectApplicantForAI('${app.id}')">
                <td class="text-center font-bold text-slate-800">${rank}</td>
                <td>
                    <p class="font-bold text-slate-900">${app.name}</p>
                    <p class="text-[10px] text-slate-400">${app.email}</p>
                </td>
                <td class="font-medium text-slate-700">${job ? job.title : 'Faculty Listing'}</td>
                <td class="text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] ${scoreClass}">${score}%</span>
                </td>
                <td class="text-center">
                    <span class="badge ${statusClass} text-[9px] uppercase font-bold tracking-wider">${app.status}</span>
                </td>
                <td class="text-right" onclick="event.stopPropagation()">
                    <div class="flex justify-end gap-1.5">
                        <button onclick="selectApplicantForAI('${app.id}')" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] rounded font-bold" title="Open AI evaluation"><i class="fas fa-brain"></i> Score</button>
                        ${app.status === 'scored' ? `<button onclick="initiateHiringProcess('${app.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] rounded font-bold shadow-sm" title="Hire Candidate"><i class="fas fa-check"></i> Hire</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Pre-select first applicant AI panel
    if (filtered.length > 0 && !selectedApplicantId) {
        selectApplicantForAI(filtered[0].id);
    }
}

function selectApplicantForAI(id) {
    selectedApplicantId = id;
    const app = SAGA.getApplicantById(id);
    const job = SAGA.getJobById(app.jobId);
    const panel = document.getElementById('aiEvaluationCard');

    if (!app) return;

    const score = app.compatibility_score || 85;
    
    // Strengths / Weaknesses logic based on score
    let strengths = ['DepEd K-12 Curriculum Familiarity', 'Excellent Classroom Presence', 'Values Formation Alignment'];
    let weaknesses = ['Limited experience in LMS tools', 'Research mentoring background'];
    let rec = 'Highly Recommended';

    if (score >= 90) {
        rec = 'Exceptional Match / Highly Recommended';
    } else if (score >= 75) {
        rec = 'Recommended / Procedural Interview';
        weaknesses.push('Minimal lesson planning portfolios');
    } else {
        rec = 'Secondary Pool';
        strengths = ['Basic pedagogical certifications'];
        weaknesses.push('Lacks LPT professional Board License');
    }

    panel.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-extrabold text-sm text-slate-900">${app.name}</h3>
                    <p class="text-[10px] text-slate-400">Applied for: <span class="font-bold text-slate-600">${job ? job.title : 'Faculty Position'}</span></p>
                </div>
                <span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold">${app.phone}</span>
            </div>

            <!-- circular progress bar -->
            <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border">
                <div class="relative w-16 h-16 flex items-center justify-center">
                    <svg class="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="#e2e8f0" stroke-width="5" fill="transparent"/>
                        <circle cx="32" cy="32" r="28" stroke="#4f46e5" stroke-width="5" fill="transparent"
                                stroke-dasharray="175.9" stroke-dashoffset="${175.9 - (175.9 * score / 100)}"/>
                    </svg>
                    <span class="absolute text-sm font-extrabold text-slate-900">${score}%</span>
                </div>
                <div>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Compatibility Match</p>
                    <p class="text-xs font-bold text-indigo-700 mt-0.5">${rec}</p>
                </div>
            </div>

            <!-- Resume preview box -->
            <div class="space-y-1.5">
                <p class="text-[10px] text-slate-400 font-bold uppercase">Extracted CV Transcript</p>
                <div class="bg-slate-50 border p-3 rounded-xl max-h-36 overflow-y-auto text-[10px] text-slate-600 leading-relaxed font-mono">
                    <p class="font-bold text-slate-800 mb-1"><i class="fas fa-file-pdf text-rose-500 mr-1.5"></i> ${app.resumeFileName}</p>
                    ${app.resume}
                </div>
            </div>

            <!-- Extracted skills tags -->
            <div class="space-y-1.5">
                <p class="text-[10px] text-slate-400 font-bold uppercase">Extracted Competencies</p>
                <div class="flex flex-wrap gap-1">
                    ${app.extracted_skills && app.extracted_skills.length > 0 
                        ? app.extracted_skills.map(s => `<span class="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-lg uppercase tracking-wider">${s.skill}</span>`).join('')
                        : `<span class="text-[10px] text-slate-400 italic">No competencies parsed yet</span>`
                    }
                </div>
            </div>

            <!-- Strengths and Weaknesses -->
            <div class="grid grid-cols-2 gap-3 text-[10px] pt-2 border-t">
                <div class="space-y-1">
                    <p class="font-bold text-emerald-700"><i class="fas fa-plus-circle mr-1"></i> Core Strengths</p>
                    <ul class="space-y-1 text-slate-600 font-medium list-inside list-disc">
                        ${strengths.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
                <div class="space-y-1">
                    <p class="font-bold text-amber-700"><i class="fas fa-exclamation-circle mr-1"></i> Development Areas</p>
                    <ul class="space-y-1 text-slate-600 font-medium list-inside list-disc">
                        ${weaknesses.map(w => `<li>${w}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <!-- Hire Action bottom -->
            ${app.status === 'scored' ? `
                <button onclick="initiateHiringProcess('${app.id}')" class="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-xs flex justify-center items-center gap-1.5"><i class="fas fa-check-double"></i> Approve & Issue Contract</button>
            ` : ''}
        </div>
    `;
}

function bulkScoreApplicants() {
    const data = SAGA.getData();
    let unscored = data.applicants.filter(a => a.status === 'applied');
    
    if (unscored.length === 0) {
        SAGA.showCustomAlert("All candidate resumes are already parsed and scored.", "AI Engine Status");
        return;
    }

    unscored.forEach(a => {
        SAGA.parseAndScoreApplicant(a.id);
    });

    logSystemAuditTrail(`Triggered AI Resume Parsing batch. Scored [${unscored.length}] candidates.`);
    renderApplicantsList();
    SAGA.showCustomAlert(`Successfully completed AI parsing. ${unscored.length} new candidates have been scored and ranked.`, "AI Parsing Complete");
}

// ============================================================================
// HIRE CONVERSION & CONFETTI ANIMATION
// ============================================================================
function initiateHiringProcess(appId) {
    const app = SAGA.getApplicantById(appId);
    if (!app) return;

    SAGA.showCustomConfirm(
        `Are you sure you want to hire ${app.name} as an active Academy Faculty?\n\nThis will trigger employee code generation, ESS account provisioning, and RFID card registration.`,
        "Approve Candidate Hiring"
    ).then(confirm => {
        if (confirm) {
            // Run conversion
            const username = app.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) + Math.floor(Math.random() * 100);
            const employee = SAGA.createEmployee(app.id, username, "TempPass123!");

            if (!employee) return;

            // Trigger audit log
            logSystemAuditTrail(`Approved hiring request for [${app.name}]. Provisioned ESS Account.`);

            // Trigger success animation modal
            showConversionModal(employee);
        }
    });
}

function showConversionModal(employee) {
    document.getElementById('convEmpId').textContent = employee.id;
    document.getElementById('convEmpNum').textContent = `2026-000${Math.floor(Math.random()*90 + 10)}`;
    document.getElementById('convRfid').textContent = employee.rfidCardId || 'ASSIGN SCAN';
    document.getElementById('convPortalAcc').textContent = employee.username;
    
    // RFID Scan target tracker
    currentRFIDTargetId = employee.id;

    // Show conversion modal
    const modal = document.getElementById('conversionModal');
    modal.classList.add('active');

    // Confetti animation
    const container = document.getElementById('confettiContainer');
    container.innerHTML = '';
    const colors = ['#eab308', '#3b82f6', '#10b981', '#a855f7', '#f43f5e'];
    for (let i = 0; i < 40; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + '%';
        conf.style.animationDelay = Math.random() * 2 + 's';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.transform = `scale(${Math.random() * 0.8 + 0.4})`;
        container.appendChild(conf);
    }
}

function closeConversionModal() {
    document.getElementById('conversionModal').classList.remove('active');
    
    // Redirect direct to onboarding list to complete RFID scans
    switchNavTab('onboarding');
}

// ============================================================================
// 4. EMPLOYEE DIRECTORY & PROFILE DETAIL MODAL
// ============================================================================
let directoryLayout = 'grid';

function renderEmployeesFilters() {
    const data = SAGA.getData();
    const filter = document.getElementById('directoryDeptFilter');
    const curVal = filter.value;

    const depts = new Set();
    Object.values(data.employees).forEach(emp => {
        const job = SAGA.getJobById(emp.jobId);
        if (job) depts.add(job.department);
    });

    filter.innerHTML = '<option value="">All Departments</option>' + 
        Array.from(depts).map(d => `<option value="${d}">${d}</option>`).join('');

    filter.value = curVal;
}

function toggleDirLayout(layout) {
    directoryLayout = layout;
    document.getElementById('btnDirGrid').className = layout === 'grid' ? 'px-2 py-1 bg-amber-100 text-amber-900 rounded font-bold transition-all' : 'px-2 py-1 text-slate-400 rounded transition-all';
    document.getElementById('btnDirTable').className = layout === 'table' ? 'px-2 py-1 bg-amber-100 text-amber-900 rounded font-bold transition-all' : 'px-2 py-1 text-slate-400 rounded transition-all';
    
    renderEmployeeDirectory();
}

function renderEmployeeDirectory() {
    const data = SAGA.getData();
    const searchQuery = document.getElementById('directorySearch').value.trim().toLowerCase();
    const deptFilter = document.getElementById('directoryDeptFilter').value;

    let filtered = Object.values(data.employees || {});

    if (searchQuery) {
        filtered = filtered.filter(e => e.name.toLowerCase().includes(searchQuery));
    }
    if (deptFilter) {
        filtered = filtered.filter(e => {
            const job = SAGA.getJobById(e.jobId);
            return job && job.department === deptFilter;
        });
    }

    const gridContainer = document.getElementById('directoryGridContainer');
    const tableContainer = document.getElementById('directoryTableContainer');
    const tableBody = document.getElementById('directoryTableBody');

    if (directoryLayout === 'grid') {
        gridContainer.classList.remove('hidden');
        tableContainer.classList.add('hidden');

        if (filtered.length === 0) {
            gridContainer.innerHTML = `<div class="col-span-full card p-12 text-center text-slate-400 italic">No employees found.</div>`;
            return;
        }

        gridContainer.innerHTML = filtered.map(emp => {
            const job = SAGA.getJobById(emp.jobId);
            const initials = emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            
            let statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
            if (emp.status === 'onboarding') statusBadge = 'bg-blue-100 text-blue-800 border-blue-300';
            else if (emp.status === 'pending_exit') statusBadge = 'bg-orange-100 text-orange-800 border-orange-300';

            return `
                <div class="card p-5 bg-white space-y-4 border-t-4 border-amber-500 hover:scale-[1.02] transform transition-all cursor-pointer" onclick="openProfileDetailModal('${emp.id}')">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-full bg-slate-900 border-2 border-amber-400 text-amber-400 font-extrabold flex items-center justify-center text-sm shadow-sm">${initials}</div>
                        <div>
                            <h4 class="font-extrabold text-sm text-slate-900 leading-tight">${emp.name}</h4>
                            <p class="text-[10px] text-slate-400 font-semibold mt-0.5">${job ? job.title : 'Faculty Staff'}</p>
                        </div>
                    </div>

                    <div class="space-y-1.5 text-[10px] border-t pt-3 font-semibold text-slate-600">
                        <div class="flex justify-between">
                            <span>Department:</span>
                            <span class="text-slate-900">${job ? job.department : 'General'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>RFID Card:</span>
                            <span class="font-mono text-indigo-600 font-bold">${emp.rfidCardId || 'NOT REGISTERED'}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>Status:</span>
                            <span class="px-2 py-0.5 rounded font-extrabold border text-[8px] uppercase tracking-wider ${statusBadge}">${emp.status}</span>
                        </div>
                    </div>

                    <button onclick="event.stopPropagation(); openProfileDetailModal('${emp.id}')" class="w-full py-2 bg-slate-50 hover:bg-slate-100 border text-[10px] font-bold text-slate-700 rounded-xl transition-all">Manage Institutional Profile</button>
                </div>
            `;
        }).join('');
    } else {
        gridContainer.classList.add('hidden');
        tableContainer.classList.remove('hidden');

        if (filtered.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400 italic">No employees found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = filtered.map(emp => {
            const job = SAGA.getJobById(emp.jobId);
            let statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
            if (emp.status === 'onboarding') statusBadge = 'bg-blue-100 text-blue-800 border-blue-300';
            else if (emp.status === 'pending_exit') statusBadge = 'bg-orange-100 text-orange-800 border-orange-300';

            return `
                <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="openProfileDetailModal('${emp.id}')">
                    <td class="font-bold text-slate-800">${emp.id}</td>
                    <td class="font-bold text-slate-900">${emp.name}</td>
                    <td>
                        <p>${emp.email}</p>
                        <p class="text-[10px] text-slate-400">${emp.phone}</p>
                    </td>
                    <td>
                        <p class="font-bold">${job ? job.title : 'Staff'}</p>
                        <p class="text-[10px] text-slate-400">${job ? job.department : 'General'}</p>
                    </td>
                    <td class="font-medium text-slate-700">${emp.rateStructure || 'Daily Rate'}</td>
                    <td class="text-center font-mono font-bold text-indigo-600">${emp.rfidCardId || 'N/A'}</td>
                    <td class="text-center">
                        <span class="px-2 py-0.5 rounded font-extrabold border text-[8px] uppercase tracking-wider ${statusBadge}">${emp.status}</span>
                    </td>
                    <td class="text-right" onclick="event.stopPropagation()">
                        <button onclick="openProfileDetailModal('${emp.id}')" class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-[10px]">Open</button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function openProfileDetailModal(id) {
    const emp = SAGA.getEmployeeById(id);
    const job = SAGA.getJobById(emp.jobId);
    const body = document.getElementById('profileDetailModalBody');

    if (!emp) return;

    // Faculty schedule array simulator
    const loadingSchedule = [
        { code: 'ENG-101', desc: 'Grade 10 English Literacy', time: 'MWF 08:30 - 09:30 AM', room: 'JHS Rm 302', sec: 'St. Claire', units: 3 },
        { code: 'LIT-201', desc: 'Introduction to Creative Literature', time: 'MWF 10:00 - 11:30 AM', room: 'SHS Rm 104', sec: 'St. Aloysius JHS', units: 4.5 },
        { code: 'MATH-50', desc: 'Algebra & Statistics Fundamentals', time: 'TTH 01:00 - 02:30 PM', room: 'JHS Lab B', sec: 'JHS Grade 9', units: 3 }
    ];

    body.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Left: Info summary -->
            <div class="space-y-4 text-xs font-semibold">
                <div class="p-4 bg-slate-50 border rounded-2xl text-center space-y-2 relative">
                    <div class="w-16 h-16 rounded-full bg-slate-900 text-amber-400 font-extrabold text-base flex items-center justify-center border-2 border-amber-400 mx-auto shadow-sm">
                        ${emp.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div>
                        <h4 class="font-extrabold text-sm text-slate-900">${emp.name}</h4>
                        <p class="text-[10px] text-slate-400">${job ? job.title : 'Staff'}</p>
                    </div>
                    <span class="absolute top-2 right-2 text-[9px] bg-slate-900 text-amber-400 px-2 py-0.5 rounded font-bold uppercase">${emp.status}</span>
                </div>

                <div class="p-4 bg-slate-50 border rounded-2xl space-y-3.5">
                    <h4 class="font-bold text-slate-800 pb-2 border-b">Employment Details</h4>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Employee ID:</span>
                        <span class="text-slate-900">${emp.id}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Department:</span>
                        <span class="text-slate-900">${job ? job.department : 'General'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Active Salary:</span>
                        <span class="text-slate-900">₱${emp.salaryInfo?.baseSalary.toLocaleString()}/mo</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Rate Structure:</span>
                        <span class="text-slate-900">${emp.rateStructure || 'Full-Time Daily Rate'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">RFID Card:</span>
                        <span class="font-mono text-indigo-600 font-bold">${emp.rfidCardId || 'N/A'}</span>
                    </div>
                </div>

                <!-- Emergency Contact Widget -->
                <div class="p-4 bg-slate-50 border rounded-2xl space-y-3">
                    <h4 class="font-bold text-slate-800 pb-2 border-b"><i class="fas fa-phone-alt text-emerald-500"></i> Emergency Contacts</h4>
                    <div class="space-y-1 font-medium">
                        <p class="text-slate-800 font-bold">Maria Teresa Cruz (Spouse)</p>
                        <p class="text-slate-500 font-semibold">+63 917 888 1234</p>
                    </div>
                </div>
            </div>

            <!-- Right: Tabs layout -->
            <div class="md:col-span-2 space-y-6">
                <!-- Faculty loading weekly calendar visualization -->
                <div class="card p-5 bg-white space-y-4">
                    <h3 class="font-bold text-sm text-slate-800 flex justify-between items-center">
                        <span><i class="fas fa-calendar-week text-amber-500"></i> Faculty Loading & Teaching Schedule</span>
                        <div class="flex gap-2">
                            <button id="btnModalScheduleList" onclick="toggleModalScheduleView('list')" class="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded">List View</button>
                            <button id="btnModalScheduleCalendar" onclick="toggleModalScheduleView('calendar')" class="px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-700">Calendar Grid</button>
                        </div>
                    </h3>
                    
                    <!-- List View -->
                    <div id="modalScheduleListView" class="table-responsive">
                        <table class="text-[10px]">
                            <thead>
                                <tr>
                                    <th>Subject Code</th>
                                    <th>Subject Description</th>
                                    <th>Schedule Time</th>
                                    <th>Room</th>
                                    <th>Section</th>
                                    <th class="text-center">Units</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${loadingSchedule.map(s => `
                                    <tr>
                                        <td class="font-bold text-slate-900">${s.code}</td>
                                        <td>${s.desc}</td>
                                        <td class="font-semibold text-slate-700">${s.time}</td>
                                        <td>${s.room}</td>
                                        <td>${s.sec}</td>
                                        <td class="text-center font-bold">${s.units}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- Calendar Grid View -->
                    <div id="modalScheduleCalendarView" class="hidden space-y-2 pt-2">
                        <div class="grid grid-cols-6 gap-1 text-center font-bold text-[9px] bg-slate-100 dark:bg-slate-800 p-1.5 rounded text-slate-600">
                            <div>Time</div>
                            <div>Mon</div>
                            <div>Tue</div>
                            <div>Wed</div>
                            <div>Thu</div>
                            <div>Fri</div>
                        </div>
                        <div id="modalScheduleGridBody" class="space-y-1">
                            <!-- Populated dynamically by JS -->
                        </div>
                    </div>
                </div>

                <!-- Statutory Government IDs list -->
                <div class="card p-5 bg-white space-y-4">
                    <h3 class="font-bold text-sm text-slate-800"><i class="fas fa-file-invoice text-blue-500"></i> Statutory Government ID Register</h3>
                    <div class="grid grid-cols-2 gap-4 text-xs font-semibold">
                        <div class="p-3 bg-slate-50 rounded-xl border">
                            <p class="text-[9px] text-slate-400 uppercase tracking-wider">Social Security System (SSS)</p>
                            <p class="text-slate-800 font-bold mt-1">SSS-3490129302-A</p>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-xl border">
                            <p class="text-[9px] text-slate-400 uppercase tracking-wider">PhilHealth Identification</p>
                            <p class="text-slate-800 font-bold mt-1">PHIC-490212903120</p>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-xl border">
                            <p class="text-[9px] text-slate-400 uppercase tracking-wider">HDMF Pag-IBIG Number</p>
                            <p class="text-slate-800 font-bold mt-1">PAGIBIG-903129301293</p>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-xl border">
                            <p class="text-[9px] text-slate-400 uppercase tracking-wider">Withholding Tax (TIN)</p>
                            <p class="text-slate-800 font-bold mt-1">TIN-903-129-301-000</p>
                        </div>
                    </div>
                </div>

                <!-- Exit Process Trigger -->
                ${emp.status !== 'pending_exit' && emp.status !== 'separated' ? `
                    <div class="p-4 bg-rose-50 border border-rose-200/50 rounded-xl flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-xs text-rose-950">Initiate Separation Process</h4>
                            <p class="text-[10px] text-rose-800 mt-0.5">Route clearance filing to initiate retirement, resignation, or exit process.</p>
                        </div>
                        <button onclick="triggerSeparationExit('${emp.id}')" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px]">Separation Exit</button>
                    </div>
                ` : ''}

            </div>
        </div>
    `;

    document.getElementById('profileDetailModal').classList.add('active');
}

function closeProfileDetailModal() {
    document.getElementById('profileDetailModal').classList.remove('active');
}

function triggerSeparationExit(id) {
    const emp = SAGA.getEmployeeById(id);
    if (!emp) return;

    SAGA.showCustomConfirm(
        `Are you sure you want to initiate separation exit procedures for ${emp.name}?\n\nThis will suspend general system accounts and flag this employee file in the Exit & Clearances panel.`,
        "Confirm Offboarding Initiation"
    ).then(confirm => {
        if (confirm) {
            SAGA.initiateExit(id, "Resignation / Academic Relocation");
            logSystemAuditTrail(`Initiated Separation clearance filing for employee ID [${id}].`);
            closeProfileDetailModal();
            renderEmployeeDirectory();
            SAGA.showCustomAlert(`Exit Clearance file successfully opened for "${emp.name}". Access privileges frozen.`, "Separation Process Started");
        }
    });
}

// ============================================================================
// 5. EMPLOYEE ONBOARDING PIPELINE
// ============================================================================
function renderOnboardingTab() {
    const data = SAGA.getData();
    const onboardList = Object.values(data.employees).filter(e => e.status === 'onboarding');
    const container = document.getElementById('onboardingListContainer');

    document.getElementById('onboardingProgressHeader').textContent = `${onboardList.length} staff currently in onboarding`;

    if (onboardList.length === 0) {
        container.innerHTML = `<div class="p-12 text-center text-slate-400 italic text-xs">No active staff in orientation pipeline. All hires completed.</div>`;
        return;
    }

    container.innerHTML = onboardList.map(emp => {
        // Mock onboarding checklist steps completion status:
        // We'll calculate progress based on whether RFID card exists
        const steps = [
            { name: 'Welcome & System Enrollment', done: true },
            { name: 'Personal Profile Completed', done: true },
            { name: 'Statutory Government IDs Lodged', done: true },
            { name: 'DepEd Academic Credentials Verified', done: true },
            { name: 'Upload PSA / Let Certificates', done: true },
            { name: 'Accept Faculty Conduct Handbook', done: true },
            { name: 'Sign Employment Contract Acknowledgement', done: true },
            { name: 'IoT-RFID Security Card Registration', done: !!emp.rfidCardId },
            { name: 'Activate ESS portal login credentials', done: true },
            { name: 'Completed Orientation Briefing', done: !!emp.rfidCardId }
        ];

        const completedCount = steps.filter(s => s.done).length;
        const progressPct = Math.round((completedCount / steps.length) * 100);

        return `
            <div class="p-4 bg-slate-50 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div class="space-y-1.5 flex-1 font-semibold">
                    <h4 class="font-extrabold text-sm text-slate-900">${emp.name}</h4>
                    <div class="flex justify-between items-center max-w-sm">
                        <span class="text-slate-400">Checklist progress:</span>
                        <span class="text-indigo-600 font-extrabold">${progressPct}% (${completedCount}/${steps.length} Steps)</span>
                    </div>
                    <div class="w-full bg-slate-200 rounded-full h-2 max-w-sm overflow-hidden">
                        <div class="bg-indigo-600 h-2" style="width: ${progressPct}%"></div>
                    </div>
                </div>

                <div class="flex items-center gap-3">
                    ${!emp.rfidCardId ? `
                        <button onclick="bindRFIDScanTarget('${emp.id}', '${emp.name}')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm"><i class="fas fa-id-card"></i> Enroll RFID Card</button>
                    ` : `
                        <button onclick="finalizeOnboarding('${emp.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm"><i class="fas fa-check-circle"></i> Complete Orientation</button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function bindRFIDScanTarget(empId, empName) {
    // Show forms and load states
    document.getElementById('rfidScanForm').style.display = 'block';
    document.getElementById('rfidStaffName').value = empName;
    document.getElementById('rfidStaffId').value = empId;
    
    currentRFIDTargetId = empId;

    // Pulse animation
    const stateEl = document.getElementById('rfidScanState');
    stateEl.textContent = 'Hardware Awaiting Scan';
    stateEl.className = 'text-xs font-bold uppercase tracking-wider text-amber-500 animate-pulse';
    
    document.getElementById('rfidScanTarget').textContent = `Target profile: ${empName}`;
    document.getElementById('scannerLaserEffect').classList.remove('hidden');
    
    document.getElementById('rfidEnrollmentPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function simulateRFIDCardTap() {
    if (!currentRFIDTargetId) return;
    
    const emp = SAGA.getEmployeeById(currentRFIDTargetId);
    if (!emp) return;

    const mockHEX = 'RFID-' + Math.floor(Math.random()*90000 + 10000) + 'X';

    // Link RFID Card in SAGA database
    const data = SAGA.getData();
    if (data.employees[currentRFIDTargetId]) {
        data.employees[currentRFIDTargetId].rfidCardId = mockHEX;
        
        // Log event
        const log = {
            type: 'in',
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString()
        };
        if (!data.attendanceLogs[currentRFIDTargetId]) data.attendanceLogs[currentRFIDTargetId] = [];
        data.attendanceLogs[currentRFIDTargetId].push(log);
        
        SAGA.saveData(data);
    }

    // Success scanner GUI feedback
    const stateEl = document.getElementById('rfidScanState');
    stateEl.textContent = 'PRINTER CONNECTED / SIGNED';
    stateEl.className = 'text-xs font-bold uppercase tracking-wider text-emerald-500';
    document.getElementById('rfidScanTarget').textContent = `Linked UID: ${mockHEX}`;
    document.getElementById('scannerLaserEffect').classList.add('hidden');

    logSystemAuditTrail(`Enrolled RFID hardware card credential [${mockHEX}] to employee ID [${currentRFIDTargetId}].`);

    SAGA.showCustomAlert(`Security Card successfully linked!\n\nLinked UID: ${mockHEX}\nEmployee Name: ${emp.name}`, "RFID Scanning Successful").then(() => {
        // Reset form
        document.getElementById('rfidScanForm').style.display = 'none';
        document.getElementById('rfidScanState').textContent = 'Terminal Ready';
        document.getElementById('rfidScanState').className = 'text-xs font-bold uppercase tracking-wider text-amber-500';
        document.getElementById('rfidScanTarget').textContent = 'Awaiting employee linking...';
        currentRFIDTargetId = null;

        renderOnboardingTab();
    });
}

function finalizeOnboarding(id) {
    const emp = SAGA.getEmployeeById(id);
    if (!emp) return;

    SAGA.showCustomConfirm(
        `Do you confirm the institutional completion checklist for ${emp.name}?\n\nThis will activate their status to Active in the Academy directory and grant ESS access.`,
        "Complete Onboarding orientation"
    ).then(confirm => {
        if (confirm) {
            const data = SAGA.getData();
            if (data.employees[id]) {
                data.employees[id].status = 'active';
                SAGA.saveData(data);
            }
            logSystemAuditTrail(`Completed onboarding orientation checklist for [${emp.name}]. Activated faculty account.`);
            renderOnboardingTab();
            SAGA.showCustomAlert(`Orientation completed successfully. "${emp.name}" is now marked as an active employee.`, "Onboarding Completed");
        }
    });
}

// ============================================================================
// 6. RFID ATTENDANCE LOG FEED
// ============================================================================
function renderAttendanceTab() {
    const data = SAGA.getData();
    const deptFilter = document.getElementById('attendanceDeptFilter').value;
    const tbody = document.getElementById('attendanceLogsTableBody');

    // Populate filter dropdown once
    const filter = document.getElementById('attendanceDeptFilter');
    if (filter.options.length <= 1) {
        const depts = new Set();
        Object.values(data.employees).forEach(emp => {
            const job = SAGA.getJobById(emp.jobId);
            if (job) depts.add(job.department);
        });
        filter.innerHTML = '<option value="">All Departments</option>' + 
            Array.from(depts).map(d => `<option value="${d}">${d}</option>`).join('');
    }

    let logs = SAGA.getAllAttendanceLogs();

    if (deptFilter) {
        logs = logs.filter(log => {
            const emp = SAGA.getEmployeeById(log.employeeId);
            const job = emp ? SAGA.getJobById(emp.jobId) : null;
            return job && job.department === deptFilter;
        });
    }

    document.getElementById('attendanceFeedCount').textContent = `${logs.length} logs recorded`;

    // Recalc attendance stats metrics
    const metrics = SAGA.getHRISMetrics();
    document.getElementById('att-present-rate').textContent = `${metrics.attendanceRate}%`;
    document.getElementById('att-lates-count').textContent = '2'; // hardcoded mock for demonstration
    document.getElementById('att-undertimes-count').textContent = '1';
    document.getElementById('att-absences-count').textContent = '0';

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 italic">No attendance swipes logged today.</td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map(log => {
        const emp = SAGA.getEmployeeById(log.employeeId);
        
        let badgeClass = 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold';
        if (log.type === 'out') badgeClass = 'bg-slate-100 text-slate-900 border-slate-300 font-extrabold';

        // Detect if late (simulated e.g., if clock-in is after 7:30 AM)
        const timeStr = SAGA.formatTime(log.timestamp);
        let statusText = 'On-Time clock compliance';
        let statusColor = 'text-emerald-600';
        
        if (log.type === 'in') {
            const dateObj = new Date(log.timestamp);
            if (dateObj.getHours() > 7 || (dateObj.getHours() === 7 && dateObj.getMinutes() > 30)) {
                statusText = 'Late arrival recorded (DepEd flag)';
                statusColor = 'text-amber-500 font-bold';
            }
        }

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-bold text-slate-800">${SAGA.formatDate(log.timestamp)}</td>
                <td class="font-bold text-slate-700">${log.employeeId}</td>
                <td>
                    <p class="font-bold text-slate-900">${log.employeeName}</p>
                </td>
                <td class="text-center font-mono font-bold text-slate-600">${emp ? emp.rfidCardId : 'N/A'}</td>
                <td class="text-center">
                    <span class="px-2.5 py-0.5 rounded border text-[9px] uppercase tracking-wider ${badgeClass}">CLOCK ${log.type.toUpperCase()}</span>
                </td>
                <td class="${statusColor}">${statusText}</td>
            </tr>
        `;
    }).join('');
}

// RFID Hardware Swipe Simulator Functions
function openRFIDSimulatorModal() {
    const data = SAGA.getData();
    const activeStaff = Object.values(data.employees).filter(e => e.status === 'active' && e.rfidCardId);
    const select = document.getElementById('simEmployeeSelect');

    if (activeStaff.length === 0) {
        SAGA.showCustomAlert("No active employees with registered RFID cards found. Complete onboarding first.", "Simulation Error");
        return;
    }

    select.innerHTML = activeStaff.map(emp => `<option value="${emp.id}">${emp.name} (${emp.rfidCardId})</option>`).join('');

    // Default simulation state
    setSimDirection('in');

    document.getElementById('rfidSimulatorModal').classList.add('active');
}

function closeRFIDSimulatorModal() {
    document.getElementById('rfidSimulatorModal').classList.remove('active');
}

function setSimDirection(dir) {
    simRFIDDirection = dir;
    const btnIn = document.getElementById('btnSimDirectionIn');
    const btnOut = document.getElementById('btnSimDirectionOut');

    if (dir === 'in') {
        btnIn.className = 'py-2 bg-blue-100 border border-blue-400 text-blue-900 rounded-lg flex items-center justify-center gap-1.5 font-bold';
        btnOut.className = 'py-2 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center gap-1.5 font-bold';
    } else {
        btnIn.className = 'py-2 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center gap-1.5 font-bold';
        btnOut.className = 'py-2 bg-slate-200 border border-slate-400 text-slate-900 rounded-lg flex items-center justify-center gap-1.5 font-bold';
    }
}

function triggerRFIDSwipeAction() {
    const empId = document.getElementById('simEmployeeSelect').value;
    const emp = SAGA.getEmployeeById(empId);
    
    if (!emp) return;

    // Submit RFID swipe transaction log
    SAGA.recordTimeEntry(empId, simRFIDDirection);
    
    logSystemAuditTrail(`Received IoT-RFID scan event for [${emp.name}]: CLOCK ${simRFIDDirection.toUpperCase()}.`);

    closeRFIDSimulatorModal();

    SAGA.showCustomAlert(
        `Signal Received from Gate Transit Hardware!\n\nLocation: Main Gate Access Terminal\nRFID Card: ${emp.rfidCardId}\nEmployee: ${emp.name}\nLog Type: CLOCK ${simRFIDDirection.toUpperCase()}\nTimestamp: ${new Date().toLocaleTimeString()}`,
        "IoT Access Signal Transmitted"
    ).then(() => {
        renderAttendanceTab();
        if (currentTab === 'overview') renderOverviewMetrics();
    });
}

// ============================================================================
// 7. PAYROLL HUB & PAYSLIPS
// ============================================================================
function renderPayrollTab() {
    const data = SAGA.getData();
    const tbody = document.getElementById('payrollSummaryTableBody');
    const activeStaff = Object.values(data.employees).filter(e => e.status === 'active');

    tbody.innerHTML = activeStaff.map(emp => {
        // Calculate payslip parameters
        const pay = SAGA.generatePayslip(emp.id);
        if (!pay) return '';

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-bold text-slate-800">${emp.id}</td>
                <td>
                    <p class="font-bold text-slate-900">${emp.name}</p>
                    <p class="text-[9px] text-slate-400 font-semibold">${emp.rateStructure || 'Daily Rate'}</p>
                </td>
                <td class="text-right font-semibold">₱${pay.grossSalary.toLocaleString()}</td>
                <td class="text-right font-medium text-rose-600">- ₱${pay.totalDeductions.toLocaleString()}</td>
                <td class="text-right font-bold text-emerald-600">₱${pay.netPay.toLocaleString()}</td>
                <td class="text-center">
                    <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold rounded text-[8px] uppercase tracking-wider">Disbursement Ready</span>
                </td>
                <td class="text-right" onclick="event.stopPropagation()">
                    <button onclick="previewEmployeePayslip('${emp.id}')" class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-[10px] shadow-sm"><i class="fas fa-file-invoice"></i> Payslip</button>
                </td>
            </tr>
        `;
    }).join('');
}

function processPayrollCalculation() {
    const progBar = document.getElementById('payrollProcessingBar');
    const filled = document.getElementById('payrollProgressFilled');
    const pct = document.getElementById('payrollPercent');

    progBar.classList.remove('hidden');
    filled.style.width = '0%';
    pct.textContent = '0%';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 20;
        filled.style.width = `${progress}%`;
        pct.textContent = `${progress}%`;

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                progBar.classList.add('hidden');
                logSystemAuditTrail(`Executed institutional payroll batch processing cutoff calculations.`);
                renderPayrollTab();
                SAGA.showCustomAlert("Calculated batch ledger entries successfully. Deductions parsed and payslips compiled.", "Payroll Processed");
            }, 300);
        }
    }, 150);
}

function previewEmployeePayslip(id) {
    const emp = SAGA.getEmployeeById(id);
    const pay = SAGA.generatePayslip(id);

    if (!emp || !pay) return;

    const coeModal = document.getElementById('coeModal');
    const coeArea = document.getElementById('coePrintedArea');

    coeArea.innerHTML = `
        <div class="space-y-6 max-w-xl mx-auto p-4 border border-slate-300 rounded-2xl bg-white font-sans text-slate-800 text-xs">
            <div class="text-center border-b pb-4">
                <img src="assets/school_logo.png" alt="SAGA Emblem" class="w-12 h-12 object-contain mx-auto mb-2">
                <h3 class="font-extrabold text-sm text-slate-900">St. Aloysius Gonzaga Academy, Inc.</h3>
                <p class="text-[9px] text-slate-500 uppercase tracking-widest">Institutional Disbursement and Ledger Office</p>
                <p class="text-[10px] text-amber-600 font-bold mt-1">Official Electronic Pay Advice Advice</p>
            </div>

            <div class="grid grid-cols-2 gap-4 border-b pb-3.5">
                <div>
                    <p class="text-slate-400">Employee ID / Code:</p>
                    <p class="font-bold text-slate-900">${emp.id}</p>
                </div>
                <div>
                    <p class="text-slate-400">Employee Name:</p>
                    <p class="font-bold text-slate-900">${emp.name}</p>
                </div>
                <div>
                    <p class="text-slate-400">Payment Period:</p>
                    <p class="font-bold text-slate-900">July 1-15, 2026 (J1)</p>
                </div>
                <div>
                    <p class="text-slate-400">Bank Disbursement date:</p>
                    <p class="font-bold text-slate-900">${SAGA.formatDate(pay.paymentDate)}</p>
                </div>
            </div>

            <div class="space-y-3">
                <div class="flex justify-between font-bold text-slate-900 text-sm pb-1.5 border-b">
                    <span>Earning Elements</span>
                    <span>Amount (PHP)</span>
                </div>
                <div class="flex justify-between font-semibold">
                    <span class="text-slate-500">Base Salary Package</span>
                    <span class="text-slate-900">₱${pay.grossSalary.toLocaleString()}.00</span>
                </div>
                <div class="flex justify-between font-semibold">
                    <span class="text-slate-500">Teaching Unit Loading Allowance</span>
                    <span class="text-slate-900">₱0.00</span>
                </div>
                <div class="flex justify-between font-bold bg-slate-50 p-2 rounded">
                    <span>Gross Earnings Total</span>
                    <span>₱${pay.grossSalary.toLocaleString()}.00</span>
                </div>
            </div>

            <div class="space-y-2 pt-2">
                <div class="flex justify-between font-bold text-slate-900 text-sm pb-1.5 border-b">
                    <span>Deduction Elements</span>
                    <span>Amount (PHP)</span>
                </div>
                <div class="flex justify-between font-semibold">
                    <span class="text-slate-500">SSS Contribution (4.5%)</span>
                    <span class="text-slate-900">- ₱${pay.deductions.sss.toLocaleString()}.00</span>
                </div>
                <div class="flex justify-between font-semibold">
                    <span class="text-slate-500">PhilHealth Contribution (2.5%)</span>
                    <span class="text-slate-900">- ₱${pay.deductions.philhealth.toLocaleString()}.00</span>
                </div>
                <div class="flex justify-between font-semibold">
                    <span class="text-slate-500">HDMF Pag-IBIG Share</span>
                    <span class="text-slate-900">- ₱${pay.deductions.pagibig.toLocaleString()}.00</span>
                </div>
                <div class="flex justify-between font-semibold">
                    <span class="text-slate-500">Withholding Tax Allocation</span>
                    <span class="text-slate-900">- ₱${pay.deductions.tax.toLocaleString()}.00</span>
                </div>
                <div class="flex justify-between font-semibold">
                    <span class="text-slate-500">Attendance Late Penalties (${pay.deductions.lateMinutes} mins)</span>
                    <span class="text-rose-600 font-bold">- ₱${pay.deductions.lateDeduction.toLocaleString()}.00</span>
                </div>
                <div class="flex justify-between font-bold bg-slate-50 p-2 rounded">
                    <span>Deductions Allocation Total</span>
                    <span>₱${pay.totalDeductions.toLocaleString()}.00</span>
                </div>
            </div>

            <div class="p-3 bg-emerald-50 border border-emerald-200/50 rounded-xl flex justify-between items-center text-sm">
                <span class="font-extrabold text-slate-800">NET DISBURSEMENT PAYOUT</span>
                <span class="font-extrabold text-emerald-700 text-lg">₱${pay.netPay.toLocaleString()}.00</span>
            </div>

            <div class="text-[9px] text-slate-400 text-center leading-relaxed">
                System authenticated payslip receipt. Digital verification ID token: SEC-SAGA-8893-X12.
            </div>
        </div>
    `;

    coeModal.classList.add('active');
}

function printCOEDocument() {
    window.print();
}

function closeCOEModal() {
    document.getElementById('coeModal').classList.remove('active');
}

// ============================================================================
// 8. LEAVE REQUESTS QUEUE
// ============================================================================
function renderLeavesQueue() {
    const requests = SAGA.getAllLeaveRequests();
    const container = document.getElementById('leaveQueueContainer');
    
    // Count pending
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    document.getElementById('leavesQueueStatusText').textContent = `${pendingCount} Pending leave requests`;

    if (requests.length === 0) {
        container.innerHTML = `<div class="p-12 text-center text-slate-400 italic text-xs">No leave filings recorded.</div>`;
        return;
    }

    container.innerHTML = requests.map(req => {
        let statusBadge = 'badge-applied'; // pending
        if (req.status === 'approved') statusBadge = 'badge-hired';
        else if (req.status === 'rejected') statusBadge = 'badge-separated';

        // Check if current user has permission to approve at current level
        let showApprovalActions = false;
        let approverRoleKey = null;

        if (req.status === 'pending') {
            if (activeUser.role === 'HR Administrator') {
                showApprovalActions = true;
                approverRoleKey = 'hr';
            } else if (activeUser.role === 'Dean' && req.approvalHierarchy.dean.status === 'Pending') {
                showApprovalActions = true;
                approverRoleKey = 'dean';
            } else if (activeUser.role === 'Department Chair' && req.approvalHierarchy.chair.status === 'Pending') {
                showApprovalActions = true;
                approverRoleKey = 'chair';
            }
        }

        return `
            <div class="p-5 bg-slate-50 border rounded-2xl space-y-4 text-xs font-semibold">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-extrabold text-sm text-slate-900">${req.employeeName}</h4>
                        <p class="text-[10px] text-slate-400 mt-0.5">Filed: ${SAGA.formatDate(req.submittedDate)} • Type: <span class="font-bold text-slate-700 capitalize">${req.leaveType}</span></p>
                    </div>
                    <span class="badge ${statusBadge} text-[9px] uppercase font-extrabold tracking-wider">${req.status}</span>
                </div>

                <div class="p-3.5 bg-white border rounded-xl leading-relaxed text-slate-600 font-medium max-w-2xl">
                    <p class="font-bold text-slate-800 mb-1">Filing Reason:</p>
                    ${req.reason}
                    ${req.attachmentName ? `
                        <p class="text-[10px] text-slate-400 mt-2 font-bold flex items-center gap-1.5"><i class="fas fa-paperclip text-slate-400"></i> Supporting Attachment: <span class="text-blue-600 underline cursor-pointer">${req.attachmentName}</span></p>
                    ` : ''}
                </div>

                <!-- progressive workflow badges tracker -->
                <div class="space-y-2 max-w-lg pt-1">
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Multi-Level Approval Workflow progress</p>
                    <div class="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                        <div class="p-2 border rounded-xl ${getWorkflowBgClass(req.approvalHierarchy.chair.status)}">
                            <p class="text-slate-400 text-[9px]">1. Department Chair</p>
                            <p class="mt-0.5">${req.approvalHierarchy.chair.status}</p>
                        </div>
                        <div class="p-2 border rounded-xl ${getWorkflowBgClass(req.approvalHierarchy.dean.status)}">
                            <p class="text-slate-400 text-[9px]">2. Dean / Principal</p>
                            <p class="mt-0.5">${req.approvalHierarchy.dean.status}</p>
                        </div>
                        <div class="p-2 border rounded-xl ${getWorkflowBgClass(req.approvalHierarchy.hr.status)}">
                            <p class="text-slate-400 text-[9px]">3. HR Director</p>
                            <p class="mt-0.5">${req.approvalHierarchy.hr.status}</p>
                        </div>
                    </div>
                </div>

                <!-- action triggers -->
                ${showApprovalActions ? `
                    <div class="flex justify-end gap-2 pt-2 border-t">
                        <button onclick="processLeaveFilingApproval('${req.id}', '${approverRoleKey}', 'Rejected')" class="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200/50 rounded-xl text-[10px]">Reject Filing</button>
                        <button onclick="processLeaveFilingApproval('${req.id}', '${approverRoleKey}', 'Approved')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] shadow-sm">Sign & Approve</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function getWorkflowBgClass(status) {
    if (status === 'Approved') return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    if (status === 'Pending') return 'bg-yellow-50 text-yellow-800 border-yellow-300 animate-pulse';
    if (status === 'Rejected') return 'bg-rose-50 text-rose-800 border-rose-300';
    return 'bg-slate-100 text-slate-400 border-slate-200';
}

function processLeaveFilingApproval(reqId, role, decision) {
    SAGA.showCustomConfirm(
        `Are you sure you want to sign off on this leave filing as ${role.toUpperCase()}?`,
        "Filing Approval Sign-off"
    ).then(confirm => {
        if (confirm) {
            SAGA.advanceLeaveApproval(reqId, role, decision);
            logSystemAuditTrail(`Signed leave filing ID [${reqId}] as [${role}] -> [${decision}].`);
            renderLeavesQueue();
            SAGA.showCustomAlert(`Leave filing transaction successfully signed as "${decision}".`, "Filing Processed");
        }
    });
}

// ============================================================================
// 9. EXIT & OFFBOARDING
// ============================================================================
let activeExitTab = 'queue';

function switchExitTab(tab) {
    activeExitTab = tab;
    document.getElementById('btnExitQueue').className = tab === 'queue' ? 'px-3.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all' : 'px-3.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-xl transition-all';
    document.getElementById('btnExitSeparated').className = tab === 'separated' ? 'px-3.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all' : 'px-3.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-xl transition-all';

    document.getElementById('exitQueueView').style.display = tab === 'queue' ? 'block' : 'none';
    document.getElementById('exitSeparatedView').style.display = tab === 'separated' ? 'block' : 'none';

    renderExitTab();
}

function renderExitTab() {
    const data = SAGA.getData();
    
    if (activeExitTab === 'queue') {
        const queue = SAGA.getPendingExits();
        const container = document.getElementById('exitQueueContainer');

        if (queue.length === 0) {
            container.innerHTML = `<div class="p-12 text-center text-slate-400 italic text-xs">No pending separation clearance requests.</div>`;
            return;
        }

        container.innerHTML = queue.map(emp => `
            <div class="p-4 bg-slate-50 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div class="space-y-1 font-semibold">
                    <h4 class="font-extrabold text-sm text-slate-900">${emp.name}</h4>
                    <p class="text-[10px] text-slate-400">Initiated: ${SAGA.formatDate(emp.exitInitiatedDate)} • Reason: <span class="font-bold text-slate-700">${emp.exitReason}</span></p>
                </div>

                <div class="flex items-center gap-2">
                    <button onclick="approveExitClearanceFinal('${emp.id}')" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm text-[10px]"><i class="fas fa-door-open"></i> Sign Clearance & Archive</button>
                </div>
            </div>
        `).join('');
    } else {
        const archived = SAGA.getArchivedEmployees();
        const tbody = document.getElementById('exitSeparatedTableBody');

        if (archived.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400 italic">No separated archive registers located.</td></tr>`;
            return;
        }

        tbody.innerHTML = archived.map(emp => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-bold text-slate-800">${emp.id}</td>
                <td class="font-bold text-slate-900">${emp.name}</td>
                <td class="capitalize">${emp.exitReason || 'Resignation'}</td>
                <td class="font-semibold text-slate-700">${SAGA.formatDate(emp.clearanceApprovedDate)}</td>
                <td class="text-right">
                    <button onclick="generateCertificateOfEmployment('${emp.name}', '${emp.onboardedDate}', '${emp.clearanceApprovedDate}')" class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] rounded font-bold shadow-sm"><i class="fas fa-file-signature"></i> Compile COE</button>
                </td>
            </tr>
        `).join('');
    }
}

function approveExitClearanceFinal(id) {
    const emp = SAGA.getEmployeeById(id);
    if (!emp) return;

    SAGA.showCustomConfirm(
        `Do you confirm the final clearance approval sign-off for ${emp.name}?\n\nThis action will archive the employee file and purge active login permissions.`,
        "Final Exit Clearance Sign-off"
    ).then(confirm => {
        if (confirm) {
            SAGA.approveAndArchiveEmployee(id);
            logSystemAuditTrail(`Signed off exit clearance and archived profile for employee ID [${id}].`);
            renderExitTab();
            SAGA.showCustomAlert(`Exit clearance signed successfully. Profile deactivated and moved to archive folder.`, "Clearance Approved");
        }
    });
}

function generateCertificateOfEmployment(name, start, end) {
    const coeModal = document.getElementById('coeModal');
    const coeArea = document.getElementById('coePrintedArea');

    coeArea.innerHTML = `
        <div class="space-y-6 max-w-xl mx-auto p-8 border border-slate-300 rounded-2xl bg-white font-serif text-slate-800 text-xs shadow-lg leading-relaxed">
            <div class="text-center border-b pb-4">
                <img src="assets/school_logo.png" alt="SAGA Emblem" class="w-16 h-16 object-contain mx-auto mb-2">
                <h3 class="font-extrabold text-sm text-slate-900">St. Aloysius Gonzaga Academy, Inc.</h3>
                <p class="text-[9px] text-slate-500 uppercase tracking-widest">Office of the Director for Human Resource Operations</p>
                <p class="text-[10px] text-slate-400">Est. 2015 • Spiritual Formation • Academic Excellence</p>
            </div>

            <div class="space-y-4 pt-4">
                <h4 class="text-center font-extrabold text-sm uppercase tracking-wider text-slate-900">CERTIFICATE OF EMPLOYMENT & CLEARANCE</h4>
                
                <p class="indent-8 text-justify">
                    This certifies that <strong class="text-slate-900">${name}</strong> was employed with <strong class="text-slate-900">St. Aloysius Gonzaga Academy, Inc.</strong> as an academic faculty instructor and adviser.
                </p>

                <p class="indent-8 text-justify">
                    Their service coverage spanned from the initial hiring onboarding date of <strong class="text-slate-900">${new Date(start).toLocaleDateString('en-PH', {year:'numeric',month:'long',day:'numeric'})}</strong> until their separation clearance sign-off date on <strong class="text-slate-900">${new Date(end).toLocaleDateString('en-PH', {year:'numeric',month:'long',day:'numeric'})}</strong>.
                </p>

                <p class="indent-8 text-justify">
                    We further certify that they completed all separation exit interviews and have been declared fully cleared of all institutional material, financial, and class grade duties by their respective Department Chair, Dean, and the HR Director.
                </p>
            </div>

            <div class="pt-8 flex justify-between items-end">
                <div>
                    <p class="text-[10px] text-slate-400">Authorized Signatory Stamp:</p>
                    <p class="font-bold text-slate-900 border-t mt-8 pt-1 text-center w-48">Dr. Albert Tan, LPT</p>
                    <p class="text-[9px] text-slate-400 text-center">Institutional HR Director</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] text-slate-400">Registry Reference:</p>
                    <p class="font-mono text-[9px] text-indigo-600 font-bold">COE-SAGA-2026-X89B</p>
                </div>
            </div>
        </div>
    `;

    coeModal.classList.add('active');
}

// ============================================================================
// 10. DIGITAL 201 COMPLIANCE FILES MANAGER
// ============================================================================
function renderDocumentsTab() {
    const data = SAGA.getData();
    const container = document.getElementById('folderFilesContainer');

    const files = [
        { name: 'Teacher_Juan_Dela_Cruz_Contract.pdf', size: '2.1 MB', uploader: 'HR Admin', date: '07/01/2026', type: 'contract' },
        { name: 'Teacher_Ana_Rodriguez_PRC_License.pdf', size: '1.4 MB', uploader: 'Ana Rodriguez', date: '06/25/2026', type: 'prc' },
        { name: 'Prof_Carlo_Mendoza_TOR.pdf', size: '3.5 MB', uploader: 'Carlo Mendoza', date: '05/18/2026', type: 'tor' },
        { name: 'Dr_Elena_Ramos_LET_Certificate.pdf', size: '1.2 MB', uploader: 'Elena Ramos', date: '04/22/2026', type: 'let' }
    ];

    container.innerHTML = files.map(f => `
        <div class="p-3 bg-slate-50 border rounded-xl flex items-center justify-between gap-3 text-xs font-semibold">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm"><i class="fas fa-file-pdf"></i></div>
                <div>
                    <p class="font-bold text-slate-900 leading-tight">${f.name}</p>
                    <p class="text-[9px] text-slate-400 mt-0.5">Uploaded: ${f.date} • Size: ${f.size}</p>
                </div>
            </div>
            <button onclick="previewDocumentSimulation('${f.name}')" class="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[9px] font-bold shadow-sm">View</button>
        </div>
    `).join('');
}

function trigger201Upload() {
    const mockFile = 'SAGA_Faculty_TOR_Upload_' + Math.floor(Math.random()*900 + 100) + '.pdf';
    SAGA.showCustomAlert(`Mock File Uploaded Successfully: ${mockFile}\n\nDocument parsed and cached in Digital 201 Vault.`, "File Upload Complete").then(() => {
        logSystemAuditTrail(`Uploaded compliance document: [${mockFile}].`);
        renderDocumentsTab();
    });
}

function previewDocumentSimulation(name) {
    SAGA.showCustomAlert(
        `PDF Document Preview Simulated:\n\nFile Name: ${name}\nSecurity Clearance: Grade 1\nDigital Vault Encrypted: Yes\n\n[Displaying encrypted image buffer...]`,
        "201 PDF File Preview"
    );
}

// Credential Monitoring panel notification engine
function checkCredentialMonitoringAlerts() {
    const countBadge = document.getElementById('notifBadge');
    const notifPanelList = document.getElementById('notifPanelList');

    const alerts = [
        { title: 'PRC License Renewal Needed', desc: 'Teacher Juan Dela Cruz: license expires Aug 15, 2026.', type: 'danger', icon: 'fa-exclamation-triangle' },
        { title: 'Leave Filing Sign-off Required', desc: '1 New vacation request pending review.', type: 'warning', icon: 'fa-user-clock' },
        { title: 'Institutional Birthday', desc: 'Teacher Ana Rodriguez celebrates birthday today! 🎂', type: 'info', icon: 'fa-birthday-cake' }
    ];

    countBadge.textContent = alerts.length;
    
    notifPanelList.innerHTML = alerts.map(a => {
        let textClass = 'text-slate-800';
        let bgClass = 'bg-slate-50';
        let iconColor = 'text-slate-500';

        if (a.type === 'danger') {
            textClass = 'text-rose-900';
            bgClass = 'bg-rose-50 border border-rose-100';
            iconColor = 'text-rose-500';
        } else if (a.type === 'warning') {
            textClass = 'text-amber-900';
            bgClass = 'bg-amber-50 border border-amber-100';
            iconColor = 'text-amber-500';
        } else if (a.type === 'info') {
            textClass = 'text-blue-900';
            bgClass = 'bg-blue-50 border border-blue-100';
            iconColor = 'text-blue-500';
        }

        return `
            <div class="p-2.5 rounded-xl ${bgClass} flex gap-2.5 text-xs font-semibold leading-relaxed">
                <span class="${iconColor} text-sm mt-0.5"><i class="fas ${a.icon}"></i></span>
                <div>
                    <p class="font-bold ${textClass}">${a.title}</p>
                    <p class="text-[10px] text-slate-500 mt-0.5 leading-tight">${a.desc}</p>
                </div>
            </div>
        `;
    }).join('');
}

function clearAllNotifications() {
    document.getElementById('notifBadge').textContent = '0';
    document.getElementById('notifPanelList').innerHTML = `<p class="text-slate-400 italic text-center py-4 text-xs">All alerts cleared.</p>`;
}

// ============================================================================
// 11. ADVANCED ANALYTICS
// ============================================================================
function initializeAnalyticsCharts() {
    ['chartAnalyticsHiring', 'chartAnalyticsPerformance', 'chartAnalyticsPayroll', 'chartAnalyticsExit'].forEach(id => {
        if (chartInstances[id]) chartInstances[id].destroy();
    });

    const isDark = activeTheme === 'dark';
    const gridColor = isDark ? '#334155' : '#f1f5f9';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // Chart A: Hiring line
    const ctxHir = document.getElementById('chartAnalyticsHiring').getContext('2d');
    chartInstances['chartAnalyticsHiring'] = new Chart(ctxHir, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{
                label: 'Cumulative Hires',
                data: [12, 14, 18, 22, 25, 28, 32],
                borderColor: '#4F46E5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.35,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: textColor } },
                y: { grid: { color: gridColor }, ticks: { color: textColor } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Chart B: Performance average bar
    const ctxPerf = document.getElementById('chartAnalyticsPerformance').getContext('2d');
    chartInstances['chartAnalyticsPerformance'] = new Chart(ctxPerf, {
        type: 'bar',
        data: {
            labels: ['Elementary', 'JHS Science', 'SHS STEM', 'Admin'],
            datasets: [{
                data: [4.8, 4.6, 4.9, 4.7],
                backgroundColor: '#EAB308'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: textColor } },
                y: { grid: { color: gridColor }, ticks: { color: textColor }, min: 4.0, max: 5.0 }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Chart C: Payroll cost over time
    const ctxPay = document.getElementById('chartAnalyticsPayroll').getContext('2d');
    chartInstances['chartAnalyticsPayroll'] = new Chart(ctxPay, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Gross Cost (PHP)',
                data: [142000, 145000, 142000, 148000, 154000, 154000],
                backgroundColor: '#10B981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: textColor } },
                y: { grid: { color: gridColor }, ticks: { color: textColor } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Chart D: Exit Reason trends
    const ctxEx = document.getElementById('chartAnalyticsExit').getContext('2d');
    chartInstances['chartAnalyticsExit'] = new Chart(ctxEx, {
        type: 'doughnut',
        data: {
            labels: ['Retirement', 'Career Growth', 'Domestic Relocation', 'Health Filing'],
            datasets: [{
                data: [3, 5, 2, 1],
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, color: textColor, font: { size: 9 } } } }
        }
    });
}

// ============================================================================
// 12. REPORT GENERATOR
// ============================================================================
function generateMockReportData() {
    const cat = document.getElementById('reportCategorySelect').value;
    const data = SAGA.getData();
    
    const titleText = document.getElementById('reportTitleText');
    const tableHead = document.getElementById('reportTableHead');
    const tableBody = document.getElementById('reportTableBody');
    const dateText = document.getElementById('reportGeneratedTime');

    dateText.textContent = new Date().toLocaleDateString('en-PH', {year:'numeric',month:'long',day:'numeric'});

    if (cat === 'employee') {
        titleText.textContent = 'Staff Roster & Faculty Profile Register';
        tableHead.innerHTML = `
            <tr>
                <th>Employee ID</th>
                <th>Staff Name</th>
                <th>Active Role</th>
                <th>Onboard Date</th>
                <th>Status</th>
            </tr>
        `;
        tableBody.innerHTML = Object.values(data.employees).map(e => `
            <tr>
                <td class="font-bold">${e.id}</td>
                <td class="font-bold">${e.name}</td>
                <td>${e.departmentRole || 'Faculty'}</td>
                <td>${new Date(e.onboardedDate).toLocaleDateString()}</td>
                <td><span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">${e.status}</span></td>
            </tr>
        `).join('');
    } else if (cat === 'payroll') {
        titleText.textContent = 'cutoff Payroll Summary Ledger';
        tableHead.innerHTML = `
            <tr>
                <th>Staff ID</th>
                <th>Staff Name</th>
                <th class="text-right">Gross Salary</th>
                <th class="text-right">Statutory Deduct</th>
                <th class="text-right">Net Payout</th>
            </tr>
        `;
        tableBody.innerHTML = Object.values(data.employees).map(e => {
            const pay = SAGA.generatePayslip(e.id);
            if (!pay) return '';
            return `
                <tr>
                    <td class="font-bold">${e.id}</td>
                    <td class="font-bold">${e.name}</td>
                    <td class="text-right">₱${pay.grossSalary.toLocaleString()}.00</td>
                    <td class="text-right text-rose-600">- ₱${pay.totalDeductions.toLocaleString()}.00</td>
                    <td class="text-right text-emerald-700 font-bold">₱${pay.netPay.toLocaleString()}.00</td>
                </tr>
            `;
        }).join('');
    } else if (cat === 'attendance') {
        titleText.textContent = 'Academic Attendance log Feed';
        tableHead.innerHTML = `
            <tr>
                <th>Date / Time</th>
                <th>Staff Name</th>
                <th>RFID Card</th>
                <th>Action</th>
                <th>Verification</th>
            </tr>
        `;
        const logs = SAGA.getAllAttendanceLogs();
        tableBody.innerHTML = logs.slice(0, 10).map(l => `
            <tr>
                <td>${SAGA.formatDate(l.timestamp)}</td>
                <td class="font-bold">${l.employeeName}</td>
                <td class="font-mono">${l.employeeId}</td>
                <td><span class="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-bold">CLOCK ${l.type.toUpperCase()}</span></td>
                <td class="text-emerald-600">Hardware Swipe Clear</td>
            </tr>
        `).join('');
    } else if (cat === 'leave') {
        titleText.textContent = 'Leaves & Filings Ledger';
        tableHead.innerHTML = `
            <tr>
                <th>Filing Date</th>
                <th>Staff Name</th>
                <th>Type</th>
                <th>Coverage Dates</th>
                <th>Filing Status</th>
            </tr>
        `;
        const leaves = SAGA.getAllLeaveRequests();
        tableBody.innerHTML = leaves.map(l => `
            <tr>
                <td>${new Date(l.submittedDate).toLocaleDateString()}</td>
                <td class="font-bold">${l.employeeName}</td>
                <td class="capitalize">${l.leaveType}</td>
                <td class="font-medium">${l.fromDate} to ${l.toDate} (${l.days} days)</td>
                <td><span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded font-bold">${l.status}</span></td>
            </tr>
        `).join('');
    }
}

function exportPrintedReport() {
    window.print();
}

// ============================================================================
// 13. ARCHIVED FILES REGISTRY
// ============================================================================
function renderArchivedRegistry() {
    const list = SAGA.getArchivedEmployees();
    const tbody = document.getElementById('archivedRegistryTableBody');

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 italic">No historical records in archive folder.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(emp => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="font-bold text-slate-800">${emp.id}</td>
            <td class="font-bold text-slate-900">${emp.name}</td>
            <td>${emp.departmentRole || 'Faculty'}</td>
            <td>${SAGA.formatDate(emp.archivedDate)}</td>
            <td class="capitalize">${emp.exitReason || 'Retired'}</td>
            <td class="text-right">
                <button onclick="generateCertificateOfEmployment('${emp.name}', '${emp.onboardedDate}', '${emp.clearanceApprovedDate}')" class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold shadow-sm">COE File</button>
            </td>
        </tr>
    `).join('');
}

// ============================================================================
// 14. EMPLOYEE SELF-SERVICE OVERVIEW (ESS)
// ============================================================================
function renderESSDashboard() {
    const data = SAGA.getData();
    // Default ESS profile focus
    const currentEmpId = activeUser.employeeId || 'EMP_1624896000000';
    const emp = SAGA.getEmployeeById(currentEmpId);
    
    if (!emp) return;

    document.getElementById('essWelcomeText').textContent = `Welcome Back, ${emp.name}`;
    document.getElementById('essEmpIdText').textContent = `EMP ID: ${emp.id}`;

    // Fill credits
    document.getElementById('essLeaveCreditsText').textContent = `${emp.leaveBalance.vacation} days`;
    document.getElementById('essSalaryText').textContent = `₱${emp.salaryInfo.baseSalary.toLocaleString()}`;

    // Count presents logs this month
    const logs = SAGA.getAttendanceLogs(emp.id, 30);
    const presentDaysCount = new Set(logs.filter(l => l.type === 'in').map(l => l.date)).size;
    document.getElementById('essTimeClockText').textContent = `${presentDaysCount} Present`;

    // Fill loading weekly calendar
    const schedTable = document.getElementById('essScheduleTableBody');
    const loadingSchedule = [
        { code: 'ENG-101', desc: 'Grade 10 English Literacy', time: 'MWF 08:30 - 09:30 AM', room: 'JHS Rm 302', sec: 'St. Claire', units: 3 },
        { code: 'LIT-201', desc: 'Introduction to Creative Literature', time: 'MWF 10:00 - 11:30 AM', room: 'SHS Rm 104', sec: 'St. Aloysius JHS', units: 4.5 }
    ];

    schedTable.innerHTML = loadingSchedule.map(s => `
        <tr>
            <td class="font-bold text-slate-900">${s.code}</td>
            <td>${s.desc}</td>
            <td class="font-semibold text-slate-700">${s.time}</td>
            <td>${s.room}</td>
            <td>${s.sec}</td>
            <td class="text-center font-bold text-slate-800">${s.units}</td>
        </tr>
    `).join('');
}

function renderESSAttendanceLogs() {
    const currentEmpId = activeUser.employeeId || 'EMP_1624896000000';
    const logs = SAGA.getAttendanceLogs(currentEmpId, 30);
    const tbody = document.getElementById('essAttendanceTableBody');

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400 italic">No attendance logs logged this term.</td></tr>`;
        return;
    }

    // Group logs by date to compute worked hours
    const grouped = {};
    logs.forEach(l => {
        if (!grouped[l.date]) grouped[l.date] = { date: l.date, in: null, out: null };
        if (l.type === 'in') grouped[l.date].in = l.timestamp;
        else if (l.type === 'out') grouped[l.date].out = l.timestamp;
    });

    tbody.innerHTML = Object.values(grouped).reverse().map(g => {
        const inTime = g.in ? SAGA.formatTime(g.in) : '--:--';
        const outTime = g.out ? SAGA.formatTime(g.out) : '--:--';
        
        let hrs = 'N/A';
        if (g.in && g.out) {
            hrs = ((new Date(g.out) - new Date(g.in)) / (1000 * 60 * 60)).toFixed(1) + ' hrs';
        }

        return `
            <tr>
                <td class="font-bold text-slate-900">${g.date}</td>
                <td class="font-semibold text-slate-700">${inTime}</td>
                <td class="font-semibold text-slate-700">${outTime}</td>
                <td class="font-bold">${hrs}</td>
                <td class="text-emerald-600">Hardware Swipe Checked</td>
            </tr>
        `;
    }).join('');
}

function renderESSPayslips() {
    const currentEmpId = activeUser.employeeId || 'EMP_1624896000000';
    const emp = SAGA.getEmployeeById(currentEmpId);
    const pay = SAGA.generatePayslip(currentEmpId);
    const tbody = document.getElementById('essPayslipsTableBody');

    if (!emp || !pay) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400 italic">No disbursment ledger located.</td></tr>`;
        return;
    }

    tbody.innerHTML = `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="font-bold text-slate-800">${pay.payslipId.slice(0, 12)}...</td>
            <td>July 1-15, 2026 (J1)</td>
            <td class="font-semibold text-slate-700">${SAGA.formatDate(pay.paymentDate)}</td>
            <td class="text-right font-semibold">₱${pay.grossSalary.toLocaleString()}</td>
            <td class="text-right font-medium text-rose-600">- ₱${pay.totalDeductions.toLocaleString()}</td>
            <td class="text-right font-bold text-emerald-600">₱${pay.netPay.toLocaleString()}</td>
            <td class="text-right">
                <button onclick="previewEmployeePayslip('${emp.id}')" class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold shadow-sm">View Payslip</button>
            </td>
        </tr>
    `;
}

function renderESSLeaveForm() {
    const currentEmpId = activeUser.employeeId || 'EMP_1624896000000';
    const emp = SAGA.getEmployeeById(currentEmpId);

    if (!emp) return;

    document.getElementById('balVacation').textContent = `${emp.leaveBalance.vacation} days`;
    document.getElementById('balSick').textContent = `${emp.leaveBalance.sick} days`;
    document.getElementById('balEmergency').textContent = `${emp.leaveBalance.emergency} days`;
}

function handleESSLeaveSubmit(e) {
    e.preventDefault();
    const currentEmpId = activeUser.employeeId || 'EMP_1624896000000';
    const emp = SAGA.getEmployeeById(currentEmpId);

    const type = document.getElementById('leaveType').value;
    const from = document.getElementById('leaveFromDate').value;
    const to = document.getElementById('leaveToDate').value;
    const reason = document.getElementById('leaveReason').value;
    
    const file = document.getElementById('leaveAttachment').files[0];
    const fileName = file ? file.name : null;

    if (!emp) return;

    // Submit leave
    const leave = SAGA.submitLeaveRequest(currentEmpId, type, from, to, reason, fileName);

    if (leave.error) {
        SAGA.showCustomAlert(leave.error, "Leave Submission Error");
        return;
    }

    logSystemAuditTrail(`Submitted Leave request filing for employee [${emp.name}] categories [${type}].`);
    document.getElementById('leaveApplicationForm').reset();
    renderESSLeaveForm();

    SAGA.showCustomAlert(
        `Leave Request Filed successfully.\n\nType: ${type.toUpperCase()}\nCoverage: ${from} to ${to}\nDays: ${leave.days} Day(s)\nApproval workflow initiated: Department Chair -> Dean -> HR Director.`,
        "Filing Sent to Chair"
    );
}

function renderESSDocuments() {
    const currentEmpId = activeUser.employeeId || 'EMP_1624896000000';
    const container = document.getElementById('ess201Container');

    const folders = [
        { name: 'My Employment Contracts', count: 1, icon: 'fa-file-signature' },
        { name: 'My Board Licenses & LET', count: 1, icon: 'fa-id-card' },
        { name: 'Academic TOR & Diplomas', count: 2, icon: 'fa-graduation-cap' }
    ];

    container.innerHTML = folders.map(f => `
        <div class="card p-4 bg-white border flex items-center justify-between gap-3 text-xs font-semibold hover:border-amber-400 transition-colors">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-sm"><i class="fas ${f.icon}"></i></div>
                <div>
                    <p class="font-bold text-slate-900">${f.name}</p>
                    <p class="text-[9px] text-slate-400 mt-0.5">${f.count} File(s) encrypted</p>
                </div>
            </div>
            <button onclick="alert('Viewing personal 201 folder items')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[9px] font-bold">Open</button>
        </div>
    `).join('');
}

// ============================================================================
// GLOBAL SEARCH & ACTIONS
// ============================================================================
function handleGlobalSearch() {
    const query = document.getElementById('globalSearchInput').value.trim().toLowerCase();
    const floating = document.getElementById('searchFloatingResults');
    const data = SAGA.getData();

    if (!query) {
        floating.classList.add('hidden');
        return;
    }

    const matches = [];

    // Search active staff
    Object.values(data.employees).forEach(emp => {
        if (emp.name.toLowerCase().includes(query)) {
            matches.push({ type: 'Staff Member', name: emp.name, meta: emp.id, action: `openProfileDetailModal('${emp.id}')` });
        }
    });

    // Search applicants
    data.applicants.forEach(app => {
        if (app.name.toLowerCase().includes(query)) {
            matches.push({ type: 'ATS Candidate', name: app.name, meta: `AI score: ${app.compatibility_score}%`, action: `switchNavTab('applicants')` });
        }
    });

    if (matches.length === 0) {
        floating.innerHTML = `<p class="p-3 text-slate-400 italic text-center">No search matches located.</p>`;
    } else {
        floating.innerHTML = matches.map(m => `
            <div onclick="${m.action}; document.getElementById('searchFloatingResults').classList.add('hidden');" class="p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer flex justify-between items-center transition-colors">
                <div>
                    <p class="font-bold text-slate-900 text-xs">${m.name}</p>
                    <p class="text-[9px] text-slate-400 mt-0.5">${m.type}</p>
                </div>
                <span class="text-[9px] bg-slate-100 px-2 py-0.5 rounded font-bold">${m.meta}</span>
            </div>
        `).join('');
    }

    floating.classList.remove('hidden');
}

// ============================================================================
// ORG CHART VIEWER MODAL
// ============================================================================
function openOrgChartModal() {
    const container = document.getElementById('orgChartContainer');
    
    // Renders visual box layout
    container.innerHTML = `
        <div class="space-y-6">
            <!-- Level 1 -->
            <div class="flex justify-center">
                <div class="org-node bg-slate-950 text-white rounded-2xl p-3 w-48 inline-block">
                    <p class="font-extrabold text-xs">Dr. Albert Tan</p>
                    <p class="text-[9px] text-amber-400 font-bold uppercase mt-0.5">HRIS Institutional Director</p>
                </div>
            </div>
            
            <!-- Connection line -->
            <div class="w-0.5 h-6 bg-slate-300 mx-auto"></div>

            <!-- Level 2 -->
            <div class="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                <div class="org-node bg-slate-900 text-white rounded-2xl p-3">
                    <p class="font-bold">Dean Albert Principal</p>
                    <p class="text-[9px] text-amber-400 uppercase mt-0.5">Dean of Academic Affairs</p>
                </div>
                <div class="org-node bg-slate-900 text-white rounded-2xl p-3">
                    <p class="font-bold">Staff Assistant</p>
                    <p class="text-[9px] text-amber-400 uppercase mt-0.5">HR Operations Manager</p>
                </div>
            </div>

            <!-- Connection lines -->
            <div class="w-0.5 h-6 bg-slate-300 mx-auto"></div>

            <!-- Level 3 -->
            <div class="grid grid-cols-3 gap-2.5">
                <div class="org-node bg-white border border-slate-200 rounded-xl p-2.5">
                    <p class="font-bold text-slate-800">Prof. Cynthia Cruz</p>
                    <p class="text-[8px] text-slate-400 uppercase mt-0.5">Elementary Department Chair</p>
                </div>
                <div class="org-node bg-white border border-slate-200 rounded-xl p-2.5">
                    <p class="font-bold text-slate-800">JHS Board Chair</p>
                    <p class="text-[8px] text-slate-400 uppercase mt-0.5">JHS Academic Dean</p>
                </div>
                <div class="org-node bg-white border border-slate-200 rounded-xl p-2.5">
                    <p class="font-bold text-slate-800">SHS Board Chair</p>
                    <p class="text-[8px] text-slate-400 uppercase mt-0.5">SHS STEM Director</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('orgChartModal').classList.add('active');
}

function closeOrgChartModal() {
    document.getElementById('orgChartModal').classList.remove('active');
}

// ============================================================================
// CHAT SUPPORT WIDGET SIMULATOR
// ============================================================================
function toggleSupportChat() {
    document.getElementById('chatSupportCard').classList.toggle('hidden');
}

function handleSendSupportMsg(e) {
    e.preventDefault();
    const input = document.getElementById('chatInputMessage');
    const msg = input.value.trim();
    const list = document.getElementById('chatMessagesList');

    if (!msg) return;

    // Append user message
    list.innerHTML += `
        <div class="bg-indigo-600 text-white rounded-xl p-2.5 ml-auto max-w-[85%] text-[10px] text-right font-medium self-end">
            ${msg}
        </div>
    `;

    input.value = '';

    // Scroll chat bottom
    list.scrollTop = list.scrollHeight;

    // Simulate reply delay
    setTimeout(() => {
        let reply = "I've recorded your question. For immediate capstone evaluation, please refer to the Auto-Filler selector in the Portal login screen.";
        if (msg.toLowerCase().includes('rfid')) {
            reply = "To simulate RFID logs swiping, open the 'Live RFID Transit Simulator' button in the RFID Attendance tab.";
        } else if (msg.toLowerCase().includes('payroll')) {
            reply = "To run payroll calculation calculations, select a period and click 'Process Cutoff Pay' in the Payroll Hub tab.";
        }

        list.innerHTML += `
            <div class="bg-slate-100 rounded-xl p-2.5 text-slate-600 max-w-[85%] text-[10px] leading-relaxed">
                ${reply}
            </div>
        `;
        list.scrollTop = list.scrollHeight;
    }, 800);
}

// ============================================================================
// LOGS AND UTILITIES SYSTEM
// ============================================================================
function logSystemAuditTrail(action) {
    const data = SAGA.getData();
    if (data) {
        const log = {
            id: 'ACT_' + Date.now(),
            user: activeUser ? activeUser.fullName : 'System Console',
            action,
            time: new Date().toISOString(),
            type: 'action'
        };
        if (!data.activities) data.activities = [];
        data.activities.unshift(log);
        SAGA.saveData(data);
    }
}

// ============================================================================
// VISUAL CALENDAR CONTROLLERS (ESS & HR ADMIN)
// ============================================================================
let activeLeaveTab = 'list';

function switchLeaveTabView(tabName) {
    activeLeaveTab = tabName;
    const btnList = document.getElementById('btnLeaveQueueList');
    const btnCal = document.getElementById('btnLeaveQueueCalendar');
    const listView = document.getElementById('leaveQueueListView');
    const calView = document.getElementById('leaveQueueCalendarView');

    if (tabName === 'list') {
        btnList.className = 'px-3.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all';
        btnCal.className = 'px-3.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-xl transition-all';
        listView.classList.remove('hidden');
        calView.classList.add('hidden');
        renderLeavesQueue();
    } else {
        btnList.className = 'px-3.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-xl transition-all';
        btnCal.className = 'px-3.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all';
        listView.classList.add('hidden');
        calView.classList.remove('hidden');
        renderLeaveCalendarGrid();
    }
}

function renderLeaveCalendarGrid() {
    const grid = document.getElementById('leaveCalendarMonthGrid');
    
    // July 2026 Monthly Leaves and Events calendar
    // July 1 is a Wednesday. July 2026 has 31 days.
    // Days in July calendar: start with empty boxes for Sun, Mon, Tue (3 days of padding)
    let html = `
        <div class="font-bold text-slate-400 py-2">Sun</div>
        <div class="font-bold text-slate-400 py-2">Mon</div>
        <div class="font-bold text-slate-400 py-2">Tue</div>
        <div class="font-bold text-slate-400 py-2">Wed</div>
        <div class="font-bold text-slate-400 py-2">Thu</div>
        <div class="font-bold text-slate-400 py-2">Fri</div>
        <div class="font-bold text-slate-400 py-2">Sat</div>
    `;

    // Empty spaces for Sun, Mon, Tue
    for (let i = 0; i < 3; i++) {
        html += `<div class="bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-xl min-h-[90px] p-1.5"></div>`;
    }

    const events = {
        3: [{ name: 'Seminar: K-12 Orientation', type: 'seminar', color: 'bg-blue-100 text-blue-800 border-blue-300' }],
        10: [{ name: 'Juan Dela Cruz (Vacation)', type: 'leave', color: 'bg-amber-100 text-amber-800 border-amber-300' }],
        11: [{ name: 'Juan Dela Cruz (Vacation)', type: 'leave', color: 'bg-amber-100 text-amber-800 border-amber-300' }],
        12: [{ name: 'Juan Dela Cruz (Vacation)', type: 'leave', color: 'bg-amber-100 text-amber-800 border-amber-300' }],
        15: [{ name: 'Institutional Holiday', type: 'holiday', color: 'bg-slate-900 text-amber-400 border-slate-700' }],
        20: [{ name: 'PRC License Renewal Due', type: 'deadline', color: 'bg-rose-100 text-rose-800 border-rose-300' }],
        26: [{ name: 'Ana Rodriguez (Sick Leave)', type: 'leave', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' }]
    };

    // Add 1 to 31 days
    for (let day = 1; day <= 31; day++) {
        let dayEventsHtml = '';
        if (events[day]) {
            dayEventsHtml = events[day].map(e => `
                <div onclick="SAGA.showCustomAlert('Event Details:\\n\\n${e.name}\\nCategory: ${e.type.toUpperCase()}', 'Calendar Event')" class="mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold border truncate cursor-pointer hover:scale-[1.02] transform transition-all ${e.color}">
                    ${e.name}
                </div>
            `).join('');
        }
        
        // Highlight active day (e.g. July 5, 2026 based on timestamp)
        const isToday = day === 5;
        const todayClass = isToday ? 'border-2 border-amber-400 shadow-sm bg-amber-50/20' : 'border-slate-100 dark:border-slate-800';

        html += `
            <div class="bg-white dark:bg-slate-900 border ${todayClass} rounded-xl min-h-[90px] p-1.5 flex flex-col items-stretch text-left">
                <span class="text-[10px] font-bold ${isToday ? 'text-amber-500 font-extrabold' : 'text-slate-400'}">${day}</span>
                <div class="flex-1 mt-1 space-y-1">
                    ${dayEventsHtml}
                </div>
            </div>
        `;
    }

    // Pad out the rest of the week if necessary (July 31 is Friday, so Saturday is the 32nd box, need 1 empty space)
    html += `<div class="bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-xl min-h-[90px] p-1.5"></div>`;

    grid.innerHTML = html;
}

// Faculty loading schedule tabs (ESS Dashboard and Modal)
function toggleEssScheduleView(viewType) {
    const btnList = document.getElementById('btnEssScheduleList');
    const btnCal = document.getElementById('btnEssScheduleCalendar');
    const listView = document.getElementById('essScheduleListView');
    const calView = document.getElementById('essScheduleCalendarView');

    if (viewType === 'list') {
        btnList.className = 'px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded';
        btnCal.className = 'px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-700';
        listView.classList.remove('hidden');
        calView.classList.add('hidden');
    } else {
        btnList.className = 'px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-700';
        btnCal.className = 'px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded';
        listView.classList.add('hidden');
        calView.classList.remove('hidden');
        renderScheduleCalendar('ess');
    }
}

function toggleModalScheduleView(viewType) {
    const btnList = document.getElementById('btnModalScheduleList');
    const btnCal = document.getElementById('btnModalScheduleCalendar');
    const listView = document.getElementById('modalScheduleListView');
    const calView = document.getElementById('modalScheduleCalendarView');

    if (viewType === 'list') {
        btnList.className = 'px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded';
        btnCal.className = 'px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-700';
        listView.classList.remove('hidden');
        calView.classList.add('hidden');
    } else {
        btnList.className = 'px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-700';
        btnCal.className = 'px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded';
        listView.classList.add('hidden');
        calView.classList.remove('hidden');
        renderScheduleCalendar('modal');
    }
}

function renderScheduleCalendar(context) {
    const gridBody = document.getElementById(context === 'ess' ? 'essScheduleGridBody' : 'modalScheduleGridBody');
    if (!gridBody) return;

    // Faculty schedule layout blocks
    const scheduleItems = [
        { code: 'ENG-101', desc: 'Grade 10 English Literacy', days: ['Mon', 'Wed', 'Fri'], timeIndex: 0, timeStr: '08:30 - 09:30 AM', room: 'JHS Rm 302', sec: 'St. Claire', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
        { code: 'LIT-201', desc: 'Creative Literature', days: ['Mon', 'Wed', 'Fri'], timeIndex: 1, timeStr: '10:00 - 11:30 AM', room: 'SHS Rm 104', sec: 'St. Aloysius', color: 'bg-amber-50 border-amber-200 text-amber-800' },
        { code: 'MATH-50', desc: 'Algebra & Statistics', days: ['Tue', 'Thu'], timeIndex: 2, timeStr: '01:00 - 02:30 PM', room: 'JHS Lab B', sec: 'Grade 9', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' }
    ];

    const times = [
        '08:30 - 09:30 AM',
        '10:00 - 11:30 AM',
        '01:00 - 02:30 PM'
    ];

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    let html = '';

    times.forEach((timeRange, tIdx) => {
        html += `
            <div class="grid grid-cols-6 gap-1 text-[9px] items-center">
                <!-- Time slot header -->
                <div class="font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-lg border text-center leading-none">
                    ${timeRange}
                </div>
        `;

        weekDays.forEach(day => {
            // Find item falling on this day and time
            const item = scheduleItems.find(s => s.timeIndex === tIdx && s.days.includes(day));
            if (item) {
                html += `
                    <div class="p-1.5 rounded-lg border ${item.color} flex flex-col justify-center min-h-[42px] leading-tight shadow-sm hover:scale-[1.02] transform transition-all cursor-pointer" 
                         onclick="SAGA.showCustomAlert('Subject: ${item.code} - ${item.desc}\\nRoom: ${item.room}\\nSection: ${item.sec}\\nSchedule: ${item.timeStr}', '${item.code}')">
                        <span class="font-bold block">${item.code}</span>
                        <span class="text-[7px] text-slate-500 truncate block mt-0.5">${item.sec} | ${item.room}</span>
                    </div>
                `;
            } else {
                html += `
                    <div class="p-1.5 rounded-lg border border-dashed border-slate-100 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-900/10 min-h-[42px]"></div>
                `;
            }
        });

        html += `</div>`;
    });

    gridBody.innerHTML = html;
}
