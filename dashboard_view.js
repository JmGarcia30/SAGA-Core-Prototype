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
        'ess-documents': 'My 201 Folders',
        'ess-exit': 'Contracts & Offboarding Management'
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
        case 'ess-exit':
            renderESSExit();
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

    // Refresh pending requests queue in side menu & bell alerts
    renderRequestsSidebar();
    checkCredentialMonitoringAlerts();
}

function renderRequestsSidebar() {
    const data = SAGA.getData();
    const container = document.getElementById('dashboard-requests-sidebar');
    const countBadge = document.getElementById('sideRequestsCount');
    if (!container) return;

    let html = '';
    let count = 0;

    // 1. Leave Requests
    const leaves = data.leaveRequests || [];
    const pendingLeaves = leaves.filter(l => l.status === 'pending');
    pendingLeaves.forEach(req => {
        count++;
        const emp = data.employees[req.employeeId] || { name: 'Staff Member' };
        html += `
            <div class="p-2.5 bg-yellow-50/50 border border-yellow-100 rounded-xl flex items-start gap-2.5 hover:bg-yellow-50 transition cursor-pointer" onclick="switchNavTab('leave')">
                <div class="w-7 h-7 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs shrink-0"><i class="fas fa-plane-departure"></i></div>
                <div class="min-w-0 flex-1">
                    <p class="font-bold text-slate-800 truncate">${emp.name}</p>
                    <p class="text-[10px] text-slate-500 mt-0.5 font-medium leading-none">Filed Leave: ${req.leaveType.toUpperCase()}</p>
                </div>
            </div>
        `;
    });

    // 2. Pending Exit Clearances
    const pendingExits = Object.values(data.employees).filter(e => e.status === 'pending_exit');
    pendingExits.forEach(emp => {
        count++;
        html += `
            <div class="p-2.5 bg-red-50/50 border border-red-100 rounded-xl flex items-start gap-2.5 hover:bg-red-50 transition cursor-pointer" onclick="switchNavTab('exit')">
                <div class="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs shrink-0"><i class="fas fa-door-open"></i></div>
                <div class="min-w-0 flex-1">
                    <p class="font-bold text-slate-800 truncate">${emp.name}</p>
                    <p class="text-[10px] text-slate-500 mt-0.5 font-medium leading-none">Clearance Check-off Required</p>
                </div>
            </div>
        `;
    });

    // 3. New Job Applicants
    const newApps = (data.applicants || []).filter(a => a.isNew);
    newApps.forEach(app => {
        count++;
        const job = SAGA.getJobById(app.jobId) || { title: 'Faculty Strand' };
        html += `
            <div class="p-2.5 bg-indigo-50/50 border border-indigo-150 rounded-xl flex items-start gap-2.5 hover:bg-indigo-50 transition cursor-pointer" onclick="switchNavTab('applicants')">
                <div class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs shrink-0"><i class="fas fa-user-tie"></i></div>
                <div class="min-w-0 flex-1">
                    <p class="font-bold text-slate-800 truncate">${app.name}</p>
                    <p class="text-[10px] text-slate-500 mt-0.5 font-medium leading-none">Candidate Applied: ${job.title}</p>
                </div>
            </div>
        `;
    });

    if (count === 0) {
        html = `<p class="text-slate-400 italic text-center py-4 leading-relaxed text-[11px]">No pending staff actions today.</p>`;
    }

    countBadge.textContent = count;
    container.innerHTML = html;
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
let selectedATSJobFilter = 'all';

function renderApplicantsDropdowns() {
    const jobs = SAGA.getJobs();
    const container = document.getElementById('jobFilterPillsContainer');
    if (!container) return;

    let html = `
        <button onclick="selectATSJobFilter('all')" id="btnJobFilter-all" class="px-3.5 py-1.5 rounded-xl transition text-[10px] font-bold select-none cursor-pointer ${selectedATSJobFilter === 'all' ? 'bg-indigo-650 text-white shadow-sm border-none' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}">
            All Listings
        </button>
    `;

    html += jobs.map(j => `
        <button onclick="selectATSJobFilter('${j.id}')" id="btnJobFilter-${j.id}" class="px-3.5 py-1.5 rounded-xl transition text-[10px] font-bold select-none cursor-pointer ${selectedATSJobFilter == j.id ? 'bg-indigo-650 text-white shadow-sm border-none' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}">
            ${j.title}
        </button>
    `).join('');

    container.innerHTML = html;
}

function selectATSJobFilter(jobId) {
    selectedATSJobFilter = jobId;
    renderApplicantsDropdowns();
    renderApplicantsList();
}

function renderApplicantsList() {
    const data = SAGA.getData();
    const selectedJobId = selectedATSJobFilter;
    const selectedStatus = document.getElementById('filterAppStatus').value;

    let filtered = data.applicants || [];

    if (selectedJobId && selectedJobId !== 'all') {
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
        const score = app.compatibility_score;
        const scoreDisplay = score !== null && score !== undefined ? `${score}%` : '<span class="italic text-slate-400">Pending</span>';

        let scoreClass = 'bg-slate-100 text-slate-700';
        if (score >= 85) scoreClass = 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold';
        else if (score >= 70) scoreClass = 'bg-amber-100 text-amber-900 border border-amber-300';
        else if (score) scoreClass = 'bg-rose-100 text-rose-900 border border-rose-300';

        let statusClass = 'badge-applied';
        if (app.status === 'scored') statusClass = 'badge-scored';
        else if (app.status === 'under_review') statusClass = 'badge-under-review';
        else if (app.status === 'hired' || app.status === 'onboarding') statusClass = 'badge-hired';

        // Add visual dot indicator for unread applicants
        const unreadDot = app.isNew ? `<span class="w-1.5 h-1.5 rounded-full bg-indigo-650 animate-ping inline-block mr-1"></span>` : '';

        return `
            <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="selectApplicantForAI('${app.id}')">
                <td class="text-center font-bold text-slate-800">${rank}</td>
                <td>
                    <p class="font-bold text-slate-900 flex items-center gap-1">${unreadDot}${app.name}</p>
                    <p class="text-[10px] text-slate-400">${app.email}</p>
                </td>
                <td class="font-medium text-slate-700">${job ? job.title : 'Faculty Listing'}</td>
                <td class="text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] ${scoreClass}">${scoreDisplay}</span>
                </td>
                <td class="text-center">
                    <span class="badge ${statusClass} text-[9px] uppercase font-bold tracking-wider">${app.status.replace('_', ' ')}</span>
                </td>
                <td class="text-right" onclick="event.stopPropagation()">
                    <div class="flex justify-end gap-1.5">
                        <button onclick="selectApplicantForAI('${app.id}')" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 text-[10px] rounded font-bold" title="Open AI evaluation"><i class="fas fa-brain"></i> View Details</button>
                        ${(app.status === 'scored' || app.status === 'under_review' || app.status === 'applied') ? `<button onclick="initiateHiringProcess('${app.id}')" class="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] rounded font-bold shadow-sm" title="Recruit & Onboard"><i class="fas fa-user-plus"></i> Recruit</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Pre-select first applicant AI panel
    if (filtered.length > 0 && !selectedApplicantId) {
        selectApplicantForAI(filtered[0].id);
    }
} function selectApplicantForAI(id) {
    selectedApplicantId = id;
    const app = SAGA.getApplicantById(id);

    // Clear "isNew" unread flag once HR selects them to review
    if (app && app.isNew) {
        const db = SAGA.getData();
        const targetApp = db.applicants.find(a => a.id === id);
        if (targetApp) {
            targetApp.isNew = false;
            SAGA.saveData(db);
        }
        // Refresh request indicators on overview
        renderRequestsSidebar();
        checkCredentialMonitoringAlerts();
    }

    const job = SAGA.getJobById(app.jobId);
    const panel = document.getElementById('aiEvaluationCard');

    if (!app) return;

    // If AI evaluation is pending (score is null), show appraisal scan block
    if (app.compatibility_score === null || app.compatibility_score === undefined) {
        panel.innerHTML = `
            <div class="space-y-4 text-center py-8 font-sans">
                <div class="w-16 h-16 bg-indigo-50 border border-indigo-150 text-indigo-650 rounded-full flex items-center justify-center text-xl mx-auto shadow-sm animate-pulse">
                    <i class="fas fa-brain animate-bounce"></i>
                </div>
                <div class="space-y-1">
                    <h3 class="font-extrabold text-sm text-slate-900">${app.name}</h3>
                    <p class="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">AI Evaluation Pending</p>
                    <p class="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed mt-1">This application resume transcript has not been processed. Click the scan button below to parse competencies and compute matching metrics.</p>
                </div>

                <div class="space-y-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left">
                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider"><i class="fas fa-file-alt text-slate-450 mr-1"></i> Submitted CV Transcript</p>
                    <div class="text-[10px] text-slate-600 line-clamp-3 font-mono leading-relaxed bg-white border p-2.5 rounded-lg max-h-16 overflow-y-auto">
                        ${app.resume}
                    </div>
                </div>

                <button onclick="runAIScoringOnDemand('${app.id}')" id="btnRunAIScoring" class="w-full py-3 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 border-none shadow-md cursor-pointer transition-all"><i class="fas fa-microchip"></i> Run SAGA AI CV Appraisal</button>
            </div>
        `;
        return;
    }

    // Initialize Milestones tracking for School Policy compliance if missing
    if (!app.milestones) {
        app.milestones = {
            documentsSubmitted: true,
            writtenExam: false,
            teachingDemo: false,
            deptHeadInterview: false,
            presidentInterview: false,
            contractSigned: false,
            policyOrientation: false
        };
    }

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

    // Calculate completed milestones percentage
    const milestoneCount = Object.values(app.milestones).filter(Boolean).length;
    const milestonesPct = Math.round((milestoneCount / 7) * 100);

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

            <!-- Job Requirements Match (Check compatibility) -->
            <div class="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div class="flex justify-between items-center pb-1.5 border-b border-slate-200">
                    <span class="text-[10px] text-slate-400 font-bold uppercase">Target Job Requirements</span>
                    <span class="text-[9px] bg-indigo-100 text-indigo-850 font-extrabold px-1.5 py-0.5 rounded-md">DepEd Standard</span>
                </div>
                <p class="text-[10px] text-slate-700 font-semibold leading-relaxed mt-1.5">${job ? job.requirements : 'LPT Board Certified, BSEd/BSE/MA degree holder.'}</p>
            </div>

            <!-- Compatibility breakdown -->
            <div class="space-y-2">
                <p class="text-[10px] text-slate-400 font-bold uppercase">Compatibility Analysis Breakdown</p>
                <div class="grid grid-cols-2 gap-2 text-[9px] font-semibold">
                    <div class="p-2 bg-slate-50 border rounded-xl flex items-center justify-between">
                        <span class="text-slate-500">Pedagogical Match:</span>
                        <span class="text-indigo-700 font-extrabold">${score >= 85 ? '92%' : '84%'}</span>
                    </div>
                    <div class="p-2 bg-slate-50 border rounded-xl flex items-center justify-between">
                        <span class="text-slate-500">Licensure (LPT):</span>
                        <span class="text-indigo-700 font-extrabold">${app.resume.toLowerCase().includes('lpt') || app.resume.toLowerCase().includes('board') ? '100%' : '50%'}</span>
                    </div>
                    <div class="p-2 bg-slate-50 border rounded-xl flex items-center justify-between">
                        <span class="text-slate-500">Subject Competency:</span>
                        <span class="text-indigo-700 font-extrabold">${score >= 90 ? '95%' : '86%'}</span>
                    </div>
                    <div class="p-2 bg-slate-50 border rounded-xl flex items-center justify-between">
                        <span class="text-slate-500">Classroom Command:</span>
                        <span class="text-indigo-700 font-extrabold">${score >= 80 ? '90%' : '80%'}</span>
                    </div>
                </div>
            </div>

            <!-- Resume preview box -->
            <div class="space-y-1.5">
                <div class="flex justify-between items-center">
                    <p class="text-[10px] text-slate-400 font-bold uppercase">Extracted CV Transcript</p>
                    <button onclick="openResumePreviewModal('${app.id}')" class="text-[9px] text-indigo-600 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer flex items-center gap-1"><i class="fas fa-expand-alt"></i> View Full Resume</button>
                </div>
                <div class="bg-slate-50 border p-3 rounded-xl max-h-32 overflow-y-auto text-[10px] text-slate-600 leading-relaxed font-mono">
                    <p class="font-bold text-slate-800 mb-1 flex items-center gap-1"><i class="fas fa-file-pdf text-rose-500"></i> ${app.resumeFileName}</p>
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

            <!-- Document Received Checklist (HR checks off as applicant submits physically) -->
            <div class="space-y-2 p-4 bg-blue-50/40 border border-blue-200/50 rounded-2xl text-left font-sans">
                <div class="flex justify-between items-center pb-2 border-b border-blue-150">
                    <h4 class="text-[10px] text-blue-900 font-bold uppercase tracking-wider flex items-center gap-1.5"><i class="fas fa-folder-open text-blue-600"></i> Documents Received (Art. V)</h4>
                    <span class="text-[9px] bg-blue-100 text-blue-900 font-extrabold px-1.5 py-0.5 rounded-full">${(() => {
            const docs = app.documentsSubmitted || {};
            const keys = ['resume', 'tor', 'diploma', 'prcLicense', 'recommendations', 'nbiClearance'];
            const done = keys.filter(k => docs[k]).length;
            return Math.round((done / keys.length) * 100);
        })()}%</span>
                </div>
                <p class="text-[9px] text-slate-400 italic">Check off as the applicant physically submits each document to HR:</p>
                <div class="space-y-1.5 pt-1 text-[10px] font-semibold text-slate-700">
                    <label class="flex items-center gap-2.5 cursor-default">
                        <input type="checkbox" checked disabled class="w-3.5 h-3.5 text-blue-500 border-slate-300 rounded pointer-events-none">
                        <span class="line-through text-slate-450"><i class="fas fa-file-alt text-slate-400 mr-1"></i> Resume & Application Letter</span>
                    </label>
                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" ${app.documentsSubmitted?.tor ? 'checked' : ''} onchange="toggleDocReceived('${app.id}', 'tor')" class="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500">
                        <span class="${app.documentsSubmitted?.tor ? 'line-through text-slate-450 font-normal' : ''}"><i class="fas fa-graduation-cap text-indigo-500 mr-1"></i> Transcript of Records (TOR)</span>
                    </label>
                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" ${app.documentsSubmitted?.diploma ? 'checked' : ''} onchange="toggleDocReceived('${app.id}', 'diploma')" class="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500">
                        <span class="${app.documentsSubmitted?.diploma ? 'line-through text-slate-450 font-normal' : ''}"><i class="fas fa-award text-amber-500 mr-1"></i> Photocopy of Diploma</span>
                    </label>
                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" ${app.documentsSubmitted?.prcLicense ? 'checked' : ''} onchange="toggleDocReceived('${app.id}', 'prcLicense')" class="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500">
                        <span class="${app.documentsSubmitted?.prcLicense ? 'line-through text-slate-450 font-normal' : ''}"><i class="fas fa-id-card text-emerald-500 mr-1"></i> PRC LET License</span>
                    </label>
                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" ${app.documentsSubmitted?.serviceRecord ? 'checked' : ''} onchange="toggleDocReceived('${app.id}', 'serviceRecord')" class="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500">
                        <span class="${app.documentsSubmitted?.serviceRecord ? 'line-through text-slate-450 font-normal' : ''}"><i class="fas fa-briefcase text-slate-500 mr-1"></i> Previous Employment Cert</span>
                    </label>
                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" ${app.documentsSubmitted?.recommendations ? 'checked' : ''} onchange="toggleDocReceived('${app.id}', 'recommendations')" class="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500">
                        <span class="${app.documentsSubmitted?.recommendations ? 'line-through text-slate-450 font-normal' : ''}"><i class="fas fa-users text-blue-500 mr-1"></i> 3 Recommendation Letters</span>
                    </label>
                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" ${app.documentsSubmitted?.nbiClearance ? 'checked' : ''} onchange="toggleDocReceived('${app.id}', 'nbiClearance')" class="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500">
                        <span class="${app.documentsSubmitted?.nbiClearance ? 'line-through text-slate-450 font-normal' : ''}"><i class="fas fa-shield-alt text-rose-500 mr-1"></i> NBI Clearance</span>
                    </label>
                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" ${app.documentsSubmitted?.marriageContract ? 'checked' : ''} onchange="toggleDocReceived('${app.id}', 'marriageContract')" class="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500">
                        <span class="${app.documentsSubmitted?.marriageContract ? 'line-through text-slate-450 font-normal' : ''}"><i class="fas fa-ring text-pink-500 mr-1"></i> Marriage Contract (if applicable)</span>
                    </label>
                </div>
            </div>

            <!-- Official School Hiring Process Milestones Compliance -->
            <div class="space-y-2 p-4 bg-amber-50/40 border border-amber-250/50 rounded-2xl text-left font-sans">
                <div class="flex justify-between items-center pb-2 border-b border-amber-105">
                    <h4 class="text-[10px] text-amber-955 font-bold uppercase tracking-wider flex items-center gap-1.5"><i class="fas fa-clipboard-list text-amber-600"></i> Hiring Process Tracker</h4>
                    <span class="text-[9px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.5 rounded-full">${milestonesPct}%</span>
                </div>
                <div class="space-y-1.5 pt-1.5 text-[10px] font-semibold text-slate-700">
                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" ${app.milestones.writtenExam ? 'checked' : ''} onchange="toggleHiringMilestone('${app.id}', 'writtenExam')" class="w-3.5 h-3.5 text-indigo-650 border-slate-300 rounded focus:ring-indigo-550">
                        <span class="${app.milestones.writtenExam ? 'line-through text-slate-450 font-normal' : ''}">1. Undergo written examinations</span>
                    </label>
                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" ${app.milestones.teachingDemo ? 'checked' : ''} onchange="toggleHiringMilestone('${app.id}', 'teachingDemo')" class="w-3.5 h-3.5 text-indigo-650 border-slate-300 rounded focus:ring-indigo-550">
                        <span class="${app.milestones.teachingDemo ? 'line-through text-slate-450 font-normal' : ''}">2. Perform teaching demonstration</span>
                    </label>
                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" ${app.milestones.deptHeadInterview ? 'checked' : ''} onchange="toggleHiringMilestone('${app.id}', 'deptHeadInterview')" class="w-3.5 h-3.5 text-indigo-650 border-slate-300 rounded focus:ring-indigo-550">
                        <span class="${app.milestones.deptHeadInterview ? 'line-through text-slate-450 font-normal' : ''}">3. Department Head Interview</span>
                    </label>
                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" ${app.milestones.presidentInterview ? 'checked' : ''} onchange="toggleHiringMilestone('${app.id}', 'presidentInterview')" class="w-3.5 h-3.5 text-indigo-650 border-slate-300 rounded focus:ring-indigo-550">
                        <span class="${app.milestones.presidentInterview ? 'line-through text-slate-450 font-normal' : ''}">4. Endorsement & President Interview</span>
                    </label>
                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" ${app.milestones.contractSigned ? 'checked' : ''} onchange="toggleHiringMilestone('${app.id}', 'contractSigned')" class="w-3.5 h-3.5 text-indigo-650 border-slate-300 rounded focus:ring-indigo-550">
                        <span class="${app.milestones.contractSigned ? 'line-through text-slate-450 font-normal' : ''}">5. Sign the Employment Contract</span>
                    </label>
                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" ${app.milestones.policyOrientation ? 'checked' : ''} onchange="toggleHiringMilestone('${app.id}', 'policyOrientation')" class="w-3.5 h-3.5 text-indigo-650 border-slate-300 rounded focus:ring-indigo-550">
                        <span class="${app.milestones.policyOrientation ? 'line-through text-slate-450 font-normal' : ''}">6. School Policy Orientation</span>
                    </label>
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

            <!-- Email Status / Notify Button -->
            <div class="pt-2">
                ${app.emailSent ? `
                    <div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center flex items-center justify-center gap-1.5 font-bold text-[10px] shadow-xs">
                        <i class="fas fa-check-circle text-emerald-600"></i> Receipt Email Sent (Under Review)
                    </div>
                ` : `
                    <button onclick="sendReceiptEmail('${app.id}')" class="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all text-[10px] flex justify-center items-center gap-1.5 border-none shadow-sm cursor-pointer"><i class="fas fa-envelope"></i> Send Receipt & Under Review Email</button>
                `}
            </div>

            <!-- Recruit Action bottom -->
            ${(app.status === 'scored' || app.status === 'under_review' || app.status === 'applied') ? `
                <button onclick="initiateHiringProcessValidated('${app.id}')" class="w-full py-3 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all text-xs flex justify-center items-center gap-1.5 border-none cursor-pointer"><i class="fas fa-user-plus"></i> Recruit & Initiate Onboarding</button>
            ` : ''}
        </div>
    `;
}

function toggleDocReceived(appId, docKey) {
    const db = SAGA.getData();
    const app = db.applicants.find(a => a.id === appId);
    if (!app) return;

    if (!app.documentsSubmitted) {
        app.documentsSubmitted = {
            resume: true, tor: false, diploma: false, prcLicense: false,
            serviceRecord: false, recommendations: false, nbiClearance: false, marriageContract: false
        };
    }

    app.documentsSubmitted[docKey] = !app.documentsSubmitted[docKey];
    SAGA.saveData(db);
    logSystemAuditTrail(`HR ${app.documentsSubmitted[docKey] ? 'verified receipt of' : 'unchecked'} document [${docKey}] for applicant: ${app.name}`);
    selectApplicantForAI(appId);
    renderApplicantsList();
}

function toggleHiringMilestone(appId, milestoneKey) {
    const db = SAGA.getData();
    const app = db.applicants.find(a => a.id === appId);
    if (!app) return;

    if (!app.milestones) {
        app.milestones = {
            documentsSubmitted: true,
            writtenExam: false,
            teachingDemo: false,
            deptHeadInterview: false,
            presidentInterview: false,
            contractSigned: false,
            policyOrientation: false
        };
    }

    app.milestones[milestoneKey] = !app.milestones[milestoneKey];

    // Auto-update orientationCompleted helper if step 7 checked
    if (milestoneKey === 'policyOrientation') {
        const emp = Object.values(db.employees).find(e => e.applicantId === appId);
        if (emp) {
            emp.orientationCompleted = app.milestones.policyOrientation;
        }
    }

    SAGA.saveData(db);
    selectApplicantForAI(appId);
    renderApplicantsList();
}

function initiateHiringProcessValidated(appId) {
    const app = SAGA.getApplicantById(appId);
    if (!app) return;

    const milestones = app.milestones || { documentsSubmitted: true };
    const required = ['documentsSubmitted', 'writtenExam', 'teachingDemo', 'deptHeadInterview', 'presidentInterview', 'contractSigned'];
    const missing = required.filter(k => !milestones[k]);

    if (missing.length > 0) {
        const labels = {
            writtenExam: "Undergo written examinations (Step 2)",
            teachingDemo: "Perform teaching demonstration (Step 3)",
            deptHeadInterview: "Undergo interview with the Head of the Department (Step 4)",
            presidentInterview: "Endorsed to the President for final interview (Step 5)",
            contractSigned: "Sign the Employment Contract (Step 6)"
        };
        const missingLabels = missing.map(m => `• ${labels[m] || m}`).join('\n');
        SAGA.showCustomAlert(
            `School Hiring Policy Compliance Alert:\n\nThis applicant cannot be finalized for hire yet. Under Article V rules, they must first complete the following process steps:\n\n${missingLabels}\n\nPlease check off these completed milestones in their profile checklist card first.`,
            "Hiring Milestones Incomplete"
        );
        return;
    }

    // Call actual hiring
    initiateHiringProcess(appId);
}

function runAIScoringOnDemand(appId) {
    const app = SAGA.getApplicantById(appId);
    if (!app) return;

    // Show loading state on button
    const btn = document.getElementById('btnRunAIScoring');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing Resume...';
        btn.classList.add('opacity-75');
    }

    // Simulate AI processing delay
    setTimeout(() => {
        SAGA.parseAndScoreApplicant(appId);
        logSystemAuditTrail(`HR manually triggered AI CV Appraisal for candidate: ${app.name}. Score: ${SAGA.getApplicantById(appId).compatibility_score}%`);
        renderApplicantsList();
        selectApplicantForAI(appId);
    }, 1200);
}

function sendReceiptEmail(appId) {
    const app = SAGA.getApplicantById(appId);
    if (!app) return;
    const job = SAGA.getJobById(app.jobId);
    const jobTitle = job ? job.title : "Faculty Position";

    const emailBody = `
Dear ${app.name},

Thank you for submitting your application and resume for the position of ${jobTitle} at St. Aloysius Gonzaga Academy.

We have received your credentials (${app.resumeFileName}) and your application is currently under review by our Search and Screening Committee. We will contact you if your qualifications match our current institutional requirements.

Best regards,
Human Resources Department
St. Aloysius Gonzaga Academy
    `;

    SAGA.showCustomConfirm(
        `Simulating formal notification email delivery to ${app.email}:\n\n--------------------------------------------\nSubject: Application Received - ${jobTitle}\n--------------------------------------------\n${emailBody}\n--------------------------------------------\n\nClick Confirm to send this receipt notification.`,
        "Simulate Email Notification"
    ).then(confirm => {
        if (confirm) {
            const db = SAGA.getData();
            const targetApp = db.applicants.find(a => a.id === appId);
            if (targetApp) {
                targetApp.emailSent = true;
                targetApp.status = "under_review";
                SAGA.saveData(db);
            }
            logSystemAuditTrail(`Sent application receipt notification email to candidate: ${app.name} (${app.email}).`);
            selectApplicantForAI(appId);
            renderApplicantsList();
            SAGA.showCustomAlert(`Notification email sent successfully to ${app.email}! Candidate status is now flagged as Under Review.`, "Email Dispatched");
        }
    });
}

function openResumePreviewModal(appId) {
    const app = SAGA.getApplicantById(appId);
    if (!app) return;

    const job = SAGA.getJobById(app.jobId);
    const jobTitle = job ? job.title : "Faculty Position";

    const modalHtml = `
        <div id="resumePreviewModal" class="modal-overlay active">
            <div class="modal max-w-2xl bg-white p-8 rounded-3xl shadow-2xl relative overflow-hidden" style="font-family: 'Poppins', sans-serif;">
                <button onclick="closeResumePreviewModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 border-none bg-transparent text-xl cursor-pointer font-bold">&times;</button>
                
                <div class="flex items-center gap-3 pb-4 border-b">
                    <div class="w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-extrabold flex items-center justify-center text-sm shadow-sm">${app.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                    <div>
                        <h4 class="font-extrabold text-sm text-slate-900 leading-tight">${app.name}</h4>
                        <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Application Document (Targeting: ${jobTitle})</p>
                    </div>
                </div>

                <div class="mt-6 space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    <div class="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex justify-between items-center text-xs">
                        <div class="space-y-0.5">
                            <p class="font-bold text-slate-800"><i class="fas fa-file-pdf text-red-500 mr-1.5"></i> ${app.resumeFileName || 'Resume.pdf'}</p>
                            <p class="text-[10px] text-slate-500">File Type: PDF Document • Securely Stored in SAGA-Core</p>
                        </div>
                        <a href="#" onclick="event.preventDefault(); window.print();" class="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold no-underline flex items-center gap-1.5 text-[10px]"><i class="fas fa-print"></i> Print / Download</a>
                    </div>

                    <div class="space-y-3 p-5 bg-slate-50 border rounded-2xl text-left">
                        <h5 class="font-bold text-xs text-slate-900 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5"><i class="fas fa-align-left text-slate-500"></i> Full Extracted Resume Content</h5>
                        <pre class="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap font-sans mt-2" style="font-family: 'Poppins', sans-serif;">${app.resume}</pre>
                    </div>
                </div>

                <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <button onclick="closeResumePreviewModal()" class="px-4 py-2 border rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer">Close Viewer</button>
                    ${!app.emailSent ? `
                        <button onclick="closeResumePreviewModal(); sendReceiptEmail('${app.id}')" class="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border-none shadow-sm"><i class="fas fa-envelope"></i> Send Receipt Email</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    let modalContainer = document.getElementById('resumePreviewModalContainer');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'resumePreviewModalContainer';
        document.body.appendChild(modalContainer);
    }
    modalContainer.innerHTML = modalHtml;
}

function closeResumePreviewModal() {
    const modal = document.getElementById('resumePreviewModal');
    if (modal) modal.classList.remove('active');
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
        `Are you sure you want to hire ${app.name} as an active Academy Faculty?\n\nThis will convert their application, generate credentials, and trigger the mandatory 201 Onboarding checklist.`,
        "Approve Candidate Hiring"
    ).then(confirm => {
        if (confirm) {
            const enteredScore = prompt("Enter final Board Panel Interview Score (70-100):", "90") || "90";
            const enteredComments = prompt("Enter Board Panel Evaluator Comments:", "Excellent teaching demonstration, strong pedagogical foundations and class control.") || "Excellent teaching demonstration, strong pedagogical foundations and class control.";

            // Lock in interview scores on applicant record
            SAGA.hireApplicant(appId, {
                score: parseInt(enteredScore),
                status: "Passed Board Panel",
                comments: enteredComments,
                interviewer: "Academy Search & Screening Board"
            });

            // Run conversion
            const username = app.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) + Math.floor(Math.random() * 100);
            const employee = SAGA.createEmployee(app.id, username, "TempPass123!");

            if (!employee) return;

            // Trigger audit log
            logSystemAuditTrail(`Approved hiring request for [${app.name}]. Panel Score: ${enteredScore}%. Provisioned ESS Account.`);

            // Trigger success animation modal
            showConversionModal(employee);
        }
    });
}

function showConversionModal(employee) {
    document.getElementById('convEmpId').textContent = employee.id;
    document.getElementById('convEmpNum').textContent = `2026-000${Math.floor(Math.random() * 90 + 10)}`;
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
                        ${emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
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

                <!-- Disciplinary & Conduct Incident Log (Article VII Compliance) -->
                <div class="card p-5 bg-white space-y-4">
                    <h3 class="font-bold text-sm text-slate-800 flex items-center justify-between">
                        <span><i class="fas fa-gavel text-rose-500"></i> Disciplinary & Conduct Incident Log (Article VII)</span>
                        <span class="text-[9px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">Policy Compliance</span>
                    </h3>
                    
                    <!-- Incident table/list -->
                    <div class="table-responsive max-h-40 overflow-y-auto border rounded-xl">
                        <table class="text-[10px] w-full border-collapse">
                            <thead>
                                <tr class="bg-slate-50 border-b">
                                    <th class="p-2 text-left font-extrabold text-slate-600">Date</th>
                                    <th class="p-2 text-left font-extrabold text-slate-600">Offense Category</th>
                                    <th class="p-2 text-left font-extrabold text-slate-600">Sanction Issued</th>
                                    <th class="p-2 text-left font-extrabold text-slate-600">Notes / Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(!emp.conductLogs || emp.conductLogs.length === 0) ? `
                                    <tr><td colspan="4" class="text-center py-4 text-slate-400 italic">No disciplinary incidents logged for this employee.</td></tr>
                                ` : emp.conductLogs.map(log => `
                                    <tr class="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td class="p-2 font-semibold text-slate-600 whitespace-nowrap">${log.date}</td>
                                        <td class="p-2 font-extrabold text-slate-900">${log.offense}</td>
                                        <td class="p-2"><span class="px-2 py-0.5 text-[8px] font-extrabold rounded-lg border tracking-wider uppercase ${log.sanction.includes('Suspension') || log.sanction.includes('Dismissal') ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-amber-50 text-amber-800 border-amber-200'}">${log.sanction}</span></td>
                                        <td class="p-2 text-slate-500 leading-normal font-medium">${log.details}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- Log Incident Form -->
                    <div class="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3">
                        <h4 class="font-bold text-[10px] text-slate-800 uppercase tracking-wider flex items-center gap-1"><i class="fas fa-plus-circle text-indigo-500"></i> Record New Disciplinary Action</h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="space-y-1">
                                <label class="text-[9px] text-slate-400 font-bold block">Offense Category *</label>
                                <select id="conductOffense" class="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold text-slate-700">
                                    <option value="Negligence of Duty (Minor Infraction)">Negligence / Minor Infraction</option>
                                    <option value="Unexcused Tardiness / Attendance Issues">Unexcused Tardiness / Attendance Issues</option>
                                    <option value="Insubordination / Disobedience">Insubordination / Disobedience</option>
                                    <option value="AWOL (Absence Without Official Leave)">AWOL (Absence Without Official Leave)</option>
                                    <option value="Breach of Ethics / School Code">Breach of Ethics / School Code</option>
                                </select>
                            </div>
                            <div class="space-y-1">
                                <label class="text-[9px] text-slate-400 font-bold block">Sanction / Disciplinary Action *</label>
                                <select id="conductSanction" class="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold text-slate-700">
                                    <option value="Oral Warning">Oral Warning</option>
                                    <option value="Written Warning">Written Warning</option>
                                    <option value="1-3 Day Suspension">1-3 Day Suspension</option>
                                    <option value="4-10 Day Suspension">4-10 Day Suspension</option>
                                    <option value="Dismissal / Separation">Dismissal / Separation</option>
                                </select>
                            </div>
                        </div>
                        <div class="space-y-1">
                            <label class="text-[9px] text-slate-400 font-bold block">Supporting Details / Notes *</label>
                            <input type="text" id="conductDetails" placeholder="Explain the incident and reference school code..." class="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium">
                        </div>
                        <button onclick="logConductIncident('${emp.id}')" class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[10px] w-full transition-all border-none shadow-sm cursor-pointer">Record Incident Log</button>
                    </div>
                </div>

                <!-- Exit Process Trigger -->
                ${emp.status !== 'pending_exit' && emp.status !== 'separated' ? `
                    <div class="p-4 bg-rose-50 border border-rose-250/50 rounded-xl flex justify-between items-center">
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

function logConductIncident(empId) {
    const offense = document.getElementById('conductOffense').value;
    const sanction = document.getElementById('conductSanction').value;
    const details = document.getElementById('conductDetails').value.trim();

    if (!details) {
        SAGA.showCustomAlert('Please enter supporting details and notes for the incident.', 'Validation Error');
        return;
    }

    const data = SAGA.getData();
    const emp = data.employees[empId];
    if (!emp) return;

    if (!emp.conductLogs) {
        emp.conductLogs = [];
    }

    const newLog = {
        id: "COND_" + Date.now(),
        date: new Date().toISOString().split('T')[0],
        offense,
        sanction,
        details,
        loggedBy: "HR Office Admin"
    };

    emp.conductLogs.push(newLog);
    SAGA.saveData(data);
    logSystemAuditTrail(`HR recorded disciplinary action for ${emp.name}: [${offense}] -> [${sanction}].`);

    // Refresh views
    openProfileDetailModal(empId);
    renderEmployeeDirectory();
    SAGA.showCustomAlert(`Successfully recorded conduct incident for ${emp.name} in compliance with Article VII.`, 'Incident Logged');
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

    document.getElementById('onboardingProgressHeader').textContent = `${onboardList.length} staff currently in onboarding pipeline`;

    if (onboardList.length === 0) {
        container.innerHTML = `
            <div class="p-12 text-center text-slate-400 italic text-xs bg-slate-50 rounded-2xl border border-dashed">
                <i class="fas fa-check-circle text-2xl text-emerald-500 mb-2 block"></i>
                No active staff in orientation pipeline. All hired profiles are finalized.
            </div>`;
        return;
    }

    container.innerHTML = onboardList.map(emp => {
        const docs = emp.documents || {
            resume: true,
            tor: false,
            prcLicense: false,
            diploma: false,
            serviceRecord: false,
            recommendations: false,
            nbiClearance: false,
            marriageContract: false
        };

        const steps = [
            { key: 'resume', name: 'Letter & Resume Verified', done: !!docs.resume },
            { key: 'tor', name: 'Transcript of Records (TOR)', done: !!docs.tor },
            { key: 'diploma', name: 'Photocopy of Diploma', done: !!docs.diploma },
            { key: 'prcLicense', name: 'PRC LET Exam License', done: !!docs.prcLicense },
            { key: 'serviceRecord', name: 'Employment Service Cert', done: !!docs.serviceRecord },
            { key: 'recommendations', name: '3 Recommendation Letters', done: !!docs.recommendations },
            { key: 'nbiClearance', name: 'NBI Clearance Certificate', done: !!docs.nbiClearance },
            { key: 'marriageContract', name: 'Marriage Contract (if applicable)', done: !!docs.marriageContract },
            { key: 'rfid', name: 'NFC/RFID Gate Card Bind', done: !!emp.rfidCardId },
            { key: 'orientation', name: 'Campus Policy Orientation', done: !!emp.orientationCompleted }
        ];

        const completedCount = steps.filter(s => s.done).length;
        const progressPct = Math.round((completedCount / steps.length) * 100);

        const job = SAGA.getJobById(emp.jobId);
        const positionTitle = job ? job.title : "Faculty Member";

        const interview = emp.interview || {
            status: "Passed Panel Interview",
            score: 85,
            date: new Date().toLocaleDateString('en-PH'),
            comments: "Passed initial screening and recruitment checks.",
            interviewer: "Search Panel"
        };

        return `
            <div class="card p-6 border border-slate-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all space-y-4 mb-4">
                <!-- Top Row: Profile Details -->
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <h4 class="font-extrabold text-sm text-slate-900">${emp.name}</h4>
                            <span class="px-2.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 rounded-full uppercase tracking-wider animate-pulse">Onboarding</span>
                        </div>
                        <p class="text-xs text-slate-500 font-semibold"><i class="fas fa-briefcase mr-1.5 text-slate-400"></i>${positionTitle} • <span class="text-slate-400 font-normal">Username:</span> ${emp.username}</p>
                        <p class="text-[10px] text-slate-400">Employee ID: <strong class="text-slate-700">${emp.id}</strong> • Applied: ${SAGA.formatDate(emp.onboardedDate || new Date().toISOString())}</p>
                    </div>
                    
                    <div class="flex flex-col sm:flex-row items-center gap-3">
                        <div class="text-right sm:border-r pr-3 space-y-0.5 w-full sm:w-auto">
                            <div class="text-xs text-slate-400 font-semibold">Checklist Progress</div>
                            <div class="font-extrabold text-sm text-indigo-600">${progressPct}% (${completedCount}/${steps.length} completed)</div>
                            <div class="w-full sm:w-28 bg-slate-200 h-1.5 rounded-full overflow-hidden inline-block">
                                <div class="bg-indigo-600 h-full" style="width: ${progressPct}%"></div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                            ${!emp.rfidCardId ? `
                                <button onclick="bindRFIDScanTarget('${emp.id}', '${emp.name}')" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all border-none"><i class="fas fa-id-card"></i> Link RFID</button>
                            ` : `
                                <div class="text-center shrink-0">
                                    <span class="px-2.5 py-1 text-[10px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 rounded-lg flex items-center gap-1"><i class="fas fa-check-circle"></i> Card: ${emp.rfidCardId}</span>
                                    <button onclick="bindRFIDScanTarget('${emp.id}', '${emp.name}')" class="text-[9px] text-indigo-500 font-bold hover:underline mt-1 block w-full text-center border-none bg-transparent p-0">Change Card</button>
                                </div>
                            `}
                            <button onclick="finalizeOnboarding('${emp.id}')" class="px-3.5 py-2 ${completedCount >= steps.length - 1 ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-none' : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'} text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"><i class="fas fa-check-circle"></i> Complete Onboarding</button>
                        </div>
                    </div>
                </div>

                <!-- Mid Grid: Interview Score & Document Checks -->
                <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <!-- Left Column: Interview Details -->
                    <div class="md:col-span-5 bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-3">
                        <h5 class="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><i class="fas fa-comments text-amber-500"></i> Recruitment Interview Details</h5>
                        <div class="flex items-center gap-2.5 bg-white p-2.5 border border-slate-200/60 rounded-xl shadow-xs">
                            <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center text-base border border-amber-300 shrink-0">${interview.score}%</div>
                            <div>
                                <p class="text-xs font-bold text-slate-800">${interview.status}</p>
                                <p class="text-[9px] text-slate-400">Date: ${interview.date} • Board Panel</p>
                            </div>
                        </div>
                        <div class="space-y-1">
                            <p class="text-[10px] text-slate-400 font-bold uppercase">Evaluator Comments</p>
                            <p class="text-xs text-slate-600 font-medium italic leading-relaxed">"${interview.comments}"</p>
                            <p class="text-[9px] text-slate-400 font-semibold mt-1">Interviewer: ${interview.interviewer}</p>
                        </div>
                    </div>

                    <!-- Right Column: Documents Audit Verification Checklist -->
                    <div class="md:col-span-7 space-y-2">
                        <h5 class="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><i class="fas fa-folder-open text-blue-500"></i> HR Digital Document Audit & Verification</h5>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <!-- Resume toggle -->
                            <div class="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between font-semibold select-none">
                                <span class="flex items-center gap-2"><i class="fas fa-file-pdf text-red-500"></i> 1. Letter & Resume CV</span>
                                <input type="checkbox" checked disabled class="rounded border-slate-300 text-blue-600">
                            </div>

                            <!-- TOR -->
                            <label class="p-2.5 ${docs.tor ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'} border rounded-xl flex items-center justify-between cursor-pointer font-semibold select-none transition-all">
                                <span class="flex items-center gap-2"><i class="fas fa-graduation-cap ${docs.tor ? 'text-emerald-600' : 'text-slate-400'}"></i> 2. Academic TOR</span>
                                <input type="checkbox" ${docs.tor ? 'checked' : ''} onchange="toggleEmployeeDocumentStatus('${emp.id}', 'tor', this.checked)" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                            </label>

                            <!-- Diploma -->
                            <label class="p-2.5 ${docs.diploma ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'} border rounded-xl flex items-center justify-between cursor-pointer font-semibold select-none transition-all">
                                <span class="flex items-center gap-2"><i class="fas fa-certificate ${docs.diploma ? 'text-emerald-600' : 'text-slate-400'}"></i> 3. Photocopy of Diploma</span>
                                <input type="checkbox" ${docs.diploma ? 'checked' : ''} onchange="toggleEmployeeDocumentStatus('${emp.id}', 'diploma', this.checked)" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                            </label>

                            <!-- PRC License -->
                            <label class="p-2.5 ${docs.prcLicense ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'} border rounded-xl flex items-center justify-between cursor-pointer font-semibold select-none transition-all">
                                <span class="flex items-center gap-2"><i class="fas fa-id-badge ${docs.prcLicense ? 'text-emerald-600' : 'text-slate-400'}"></i> 4. PRC LET License</span>
                                <input type="checkbox" ${docs.prcLicense ? 'checked' : ''} onchange="toggleEmployeeDocumentStatus('${emp.id}', 'prcLicense', this.checked)" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                            </label>

                            <!-- Previous Employment Cert -->
                            <label class="p-2.5 ${docs.serviceRecord ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'} border rounded-xl flex items-center justify-between cursor-pointer font-semibold select-none transition-all">
                                <span class="flex items-center gap-2"><i class="fas fa-briefcase ${docs.serviceRecord ? 'text-emerald-600' : 'text-slate-400'}"></i> 5. Previous Employment Cert</span>
                                <input type="checkbox" ${docs.serviceRecord ? 'checked' : ''} onchange="toggleEmployeeDocumentStatus('${emp.id}', 'serviceRecord', this.checked)" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                            </label>

                            <!-- 3 Recommendation Letters -->
                            <label class="p-2.5 ${docs.recommendations ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'} border rounded-xl flex items-center justify-between cursor-pointer font-semibold select-none transition-all">
                                <span class="flex items-center gap-2"><i class="fas fa-envelope-open-text ${docs.recommendations ? 'text-emerald-600' : 'text-slate-400'}"></i> 6. 3 Recommendation Letters</span>
                                <input type="checkbox" ${docs.recommendations ? 'checked' : ''} onchange="toggleEmployeeDocumentStatus('${emp.id}', 'recommendations', this.checked)" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                            </label>

                            <!-- NBI Clearance -->
                            <label class="p-2.5 ${docs.nbiClearance ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'} border rounded-xl flex items-center justify-between cursor-pointer font-semibold select-none transition-all">
                                <span class="flex items-center gap-2"><i class="fas fa-gavel ${docs.nbiClearance ? 'text-emerald-600' : 'text-slate-400'}"></i> 7. NBI Clearance</span>
                                <input type="checkbox" ${docs.nbiClearance ? 'checked' : ''} onchange="toggleEmployeeDocumentStatus('${emp.id}', 'nbiClearance', this.checked)" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                            </label>

                            <!-- Marriage Contract -->
                            <label class="p-2.5 ${docs.marriageContract ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'} border rounded-xl flex items-center justify-between cursor-pointer font-semibold select-none transition-all">
                                <span class="flex items-center gap-2"><i class="fas fa-ring ${docs.marriageContract ? 'text-emerald-600' : 'text-slate-400'}"></i> 8. Marriage Contract</span>
                                <input type="checkbox" ${docs.marriageContract ? 'checked' : ''} onchange="toggleEmployeeDocumentStatus('${emp.id}', 'marriageContract', this.checked)" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleEmployeeDocumentStatus(empId, docKey, checked) {
    const toggles = { [docKey]: checked };
    SAGA.updateEmployeeDocuments(empId, toggles);
    logSystemAuditTrail(`HR toggled document verification [${docKey}] to [${checked ? 'VERIFIED' : 'PENDING'}] for employee ID [${empId}].`);
    renderOnboardingTab();
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

    const mockHEX = 'RFID-' + Math.floor(Math.random() * 90000 + 10000) + 'X';

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
        `Do you confirm the institutional completion checklist for ${emp.name}?\n\nThis will activate their status to Active in the Academy directory, set their onboarded date, and grant ESS access.`,
        "Complete Onboarding orientation"
    ).then(confirm => {
        if (confirm) {
            const data = SAGA.getData();
            if (data.employees[id]) {
                data.employees[id].status = 'active';
                data.employees[id].orientationCompleted = true;
                data.employees[id].onboardedDate = new Date().toISOString();
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
let activeExitTab = 'renewals';

function switchExitTab(tab) {
    activeExitTab = tab;

    const btnQ = document.getElementById('btnExitQueue');
    const btnS = document.getElementById('btnExitSeparated');
    const btnR = document.getElementById('btnExitRenewals');

    if (btnQ) btnQ.className = tab === 'queue' ? 'px-3.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all' : 'px-3.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-xl transition-all';
    if (btnS) btnS.className = tab === 'separated' ? 'px-3.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all' : 'px-3.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-xl transition-all';
    if (btnR) btnR.className = tab === 'renewals' ? 'px-3.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all' : 'px-3.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-xl transition-all';

    const vQ = document.getElementById('exitQueueView');
    const vS = document.getElementById('exitSeparatedView');
    const vR = document.getElementById('exitRenewalsView');

    if (vQ) vQ.style.display = tab === 'queue' ? 'block' : 'none';
    if (vS) vS.style.display = tab === 'separated' ? 'block' : 'none';
    if (vR) vR.style.display = tab === 'renewals' ? 'block' : 'none';

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
    } else if (activeExitTab === 'renewals') {
        renderExitRenewals();
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
                    Their service coverage spanned from the initial hiring onboarding date of <strong class="text-slate-900">${new Date(start).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</strong> until their separation clearance sign-off date on <strong class="text-slate-900">${new Date(end).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
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
    const mockFile = 'SAGA_Faculty_TOR_Upload_' + Math.floor(Math.random() * 900 + 100) + '.pdf';
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
    if (!countBadge || !notifPanelList) return;

    const data = SAGA.getData();
    const newApplicants = (data.applicants || []).filter(a => a.isNew);

    const alerts = [
        { title: 'PRC License Renewal Needed', desc: 'Teacher Juan Dela Cruz: license expires Aug 15, 2026.', type: 'danger', icon: 'fa-exclamation-triangle' },
        { title: 'Leave Filing Sign-off Required', desc: '1 New vacation request pending review.', type: 'warning', icon: 'fa-user-clock' },
        { title: 'Institutional Birthday', desc: 'Teacher Ana Rodriguez celebrates birthday today! 🎂', type: 'info', icon: 'fa-birthday-cake' }
    ];

    if (newApplicants.length > 0) {
        alerts.unshift({
            title: 'New Job Candidate Applied',
            desc: `${newApplicants.length} candidate(s) waiting for AI scoring in ATS.`,
            type: 'info',
            icon: 'fa-user-plus'
        });
    }

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

    dateText.textContent = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

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
    if (!container) return;

    const data = SAGA.getData();
    const employee = data.employees[currentEmpId];
    if (!employee) {
        container.innerHTML = `<p class="text-slate-400 italic text-xs">No employee record loaded.</p>`;
        return;
    }

    const docs = employee.documents || {
        resume: true,
        tor: false,
        diploma: false,
        prcLicense: false,
        serviceRecord: false,
        recommendations: false,
        nbiClearance: false,
        marriageContract: false,
        otherDocs: []
    };

    const docDefinitions = [
        { key: 'resume', name: 'Curriculum Vitae / Resume', desc: 'Letter of Application & CV', icon: 'fa-file-alt' },
        { key: 'tor', name: 'Transcript of Records (TOR)', desc: 'Official copy certified by registrar', icon: 'fa-graduation-cap' },
        { key: 'diploma', name: 'Photocopy of Diploma', desc: 'Degree completion diploma copy', icon: 'fa-certificate' },
        { key: 'prcLicense', name: 'PRC License / LET Board Certificate', desc: 'LPT Licensure registration', icon: 'fa-id-badge' },
        { key: 'serviceRecord', name: 'Certification of Previous Employment', desc: 'Service record from past employers', icon: 'fa-briefcase' },
        { key: 'recommendations', name: '3 Letters of Recommendation', desc: 'Attesting to moral character', icon: 'fa-envelope-open-text' },
        { key: 'nbiClearance', name: 'NBI Clearance Certificate', desc: 'Valid criminal history record check', icon: 'fa-balance-scale' },
        { key: 'marriageContract', name: 'Marriage Contract (if applicable)', desc: 'For married employees registry', icon: 'fa-ring' }
    ];

    let html = docDefinitions.map(def => {
        const isUploaded = !!docs[def.key];

        return `
            <div class="card p-4 bg-white border border-slate-200/80 flex items-center justify-between gap-3 text-xs shadow-xs hover:border-amber-450 hover:shadow-sm transition-all">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-full ${isUploaded ? 'bg-emerald-50 text-emerald-600 border border-emerald-250' : 'bg-slate-50 text-slate-400 border border-slate-200'} flex items-center justify-center text-sm shrink-0">
                        <i class="fas ${def.icon}"></i>
                    </div>
                    <div class="min-w-0 truncate font-semibold">
                        <p class="font-extrabold text-slate-800 truncate">${def.name}</p>
                        <p class="text-[9px] text-slate-400 mt-0.5 truncate">${def.desc}</p>
                    </div>
                </div>
                <div class="shrink-0 flex items-center gap-2">
                    ${isUploaded ? `
                        <span class="px-2.5 py-1 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-250 rounded-full flex items-center gap-0.5"><i class="fas fa-check"></i> Verified</span>
                    ` : `
                        <span class="px-2.5 py-1 text-[9px] font-extrabold bg-rose-100 text-rose-800 border border-rose-250 rounded-full flex items-center gap-0.5"><i class="fas fa-times"></i> Missing</span>
                    `}
                </div>
            </div>
        `;
    }).join('');

    const otherDocs = docs.otherDocs || [];
    if (otherDocs.length > 0) {
        html += `
            <div class="col-span-full border-t pt-4 mt-2">
                <h4 class="font-extrabold text-xs text-slate-800 uppercase tracking-wider mb-3">Other Submitted Credentials</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    ${otherDocs.map(o => `
                        <div class="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs font-semibold">
                            <div class="flex gap-2.5 items-center truncate">
                                <i class="fas fa-certificate text-indigo-500 text-sm"></i>
                                <div class="truncate">
                                    <p class="font-bold text-slate-800 truncate">${o.fileName}</p>
                                    <p class="text-[9px] text-slate-400 uppercase font-bold">${o.docType.toUpperCase()}</p>
                                </div>
                            </div>
                            <span class="text-[9px] font-bold text-slate-400 shrink-0">${new Date(o.uploadedAt).toLocaleDateString()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
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



// ============================================================================
// 20. ESS EXIT & CLEARANCE
// ============================================================================
function getActiveESSEmployee() {
    const currentEmpId = activeUser.employeeId || 'EMP_1624896000000';
    return SAGA.getEmployeeById(currentEmpId);
}

function renderESSExit() {
    switchExitSubTab('intent');
    renderContractIntentSubTab();
    renderClearanceSubTab();
}

function initiateExit(event) {
    let currentEmployee = getActiveESSEmployee();
    event.preventDefault();

    const reason = document.getElementById('exitReason').value;
    const exitDate = document.getElementById('exitDate').value;
    const comments = document.getElementById('exitComments').value;

    if (!reason || !exitDate) {
        alert('Please fill in all required fields');
        return;
    }

    if (!confirm('Are you sure you want to initiate the exit process? This action is permanent and cannot be undone.')) {
        return;
    }

    const employee = SAGA.initiateExit(currentEmployee.id, reason, exitDate, comments);

    alert(`✅ Exit Request Submitted!\n\nYour clearance request has been sent to HR for processing.\n\nExpected last date: ${exitDate}\n\nYou will receive updates on your clearance status.`);


    renderClearanceSubTab();
}

function switchExitSubTab(tabName) {
    document.getElementById('exitSubTab-intent').classList.add('hidden');
    document.getElementById('exitSubTab-clearance').classList.add('hidden');

    document.getElementById('btnExitSubTab-intent').classList.remove('text-blue-600', 'border-blue-600');
    document.getElementById('btnExitSubTab-intent').classList.add('text-gray-500', 'border-transparent', 'hover:text-gray-700');

    document.getElementById('btnExitSubTab-clearance').classList.remove('text-blue-600', 'border-blue-600');
    document.getElementById('btnExitSubTab-clearance').classList.add('text-gray-500', 'border-transparent', 'hover:text-gray-700');

    document.getElementById(`exitSubTab-${tabName}`).classList.remove('hidden');
    const activeBtn = document.getElementById(`btnExitSubTab-${tabName}`);
    activeBtn.classList.remove('text-gray-500', 'border-transparent', 'hover:text-gray-700');
    activeBtn.classList.add('text-blue-600', 'border-blue-600');

    // Icon coloring updates
    const intentIcon = document.querySelector('#btnExitSubTab-intent i');
    const clearanceIcon = document.querySelector('#btnExitSubTab-clearance i');
    if (tabName === 'intent') {
        intentIcon.className = 'fas fa-file-signature text-base text-blue-500';
        clearanceIcon.className = 'fas fa-user-slash text-base text-gray-400';
    } else {
        intentIcon.className = 'fas fa-file-signature text-base text-gray-400';
        clearanceIcon.className = 'fas fa-user-slash text-base text-blue-500';
    }
}

function submitContractIntentForm(event) {
    let currentEmployee = getActiveESSEmployee();
    if (event) event.preventDefault();
    const academicYear = document.getElementById('intentAY').value;
    const intent = document.getElementById('intentChoice').value;
    const preferences = document.getElementById('intentDept').value;
    const subjects = document.getElementById('intentSubjects').value;
    const remarks = document.getElementById('intentRemarks').value;

    if (!academicYear || !intent) {
        alert('Please fill out all required fields.');
        return;
    }

    const intentDetails = {
        academicYear,
        intent,
        preferences,
        subjects,
        remarks
    };

    const emp = SAGA.submitContractIntent(currentEmployee.id, intentDetails);
    if (emp) {
        alert('✅ Contract Extension Intent submitted successfully!\nYour preference has been registered for administrative review.');

        renderContractIntentSubTab();

    }
}

function renderContractIntentSubTab() {
    let currentEmployee = getActiveESSEmployee();
    const container = document.getElementById('intentFormContainer');
    if (!container) return;

    if (currentEmployee.contractIntent) {
        const intent = currentEmployee.contractIntent;
        let intentText = '';
        let intentClass = '';

        if (intent.intent === 'extend') {
            intentText = 'Extend Contract & Continue Next Academic Year';
            intentClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
        } else {
            intentText = 'Undecided (Request loading conference/meeting)';
            intentClass = 'text-amber-700 bg-amber-50 border-amber-200';
        }

        container.innerHTML = `
                    <div class="flex items-center gap-3 p-4 rounded-xl border mb-6 ${intentClass}">
                        <i class="fas fa-check-circle text-2xl"></i>
                        <div>
                            <h4 class="font-extrabold text-sm">Contract Renewal Intent Submitted</h4>
                            <p class="text-xs opacity-90">Your renewal preferences have been saved and routed to administration.</p>
                        </div>
                    </div>

                    <div class="space-y-4 text-xs font-semibold text-slate-700">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="p-3 bg-white border border-slate-200 rounded-xl">
                                <span class="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Proposed Academic Year</span>
                                <span class="text-slate-800 font-extrabold">${intent.academicYear}</span>
                            </div>
                            <div class="p-3 bg-white border border-slate-200 rounded-xl">
                                <span class="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Intent Status</span>
                                <span class="text-slate-800 font-extrabold">${intentText}</span>
                            </div>
                        </div>

                        <div class="p-3 bg-white border border-slate-200 rounded-xl">
                            <span class="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Preferred Department / Assignment</span>
                            <span class="text-slate-800 font-extrabold">${intent.preferences || 'None specified'}</span>
                        </div>

                        <div class="p-3 bg-white border border-slate-200 rounded-xl">
                            <span class="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Proposed Subjects & Load Preferences</span>
                            <p class="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap mt-1">${intent.subjects || 'None specified'}</p>
                        </div>

                        <div class="p-3 bg-white border border-slate-200 rounded-xl">
                            <span class="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Justification & Additional Comments</span>
                            <p class="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap mt-1">${intent.remarks || 'None specified'}</p>
                        </div>

                        <div class="pt-4 border-t flex items-center justify-between">
                            <span class="text-[10px] text-slate-400">Submitted on ${SAGA.formatDate(intent.submittedDate)}</span>
                            <span class="px-2.5 py-1 text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300 rounded-full">Status: ${intent.status}</span>
                        </div>
                    </div>
                `;
    } else {
        container.innerHTML = `
                    <form id="contractIntentForm" onsubmit="submitContractIntentForm(event)" class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="form-group mb-0">
                                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Proposed Academic Year *</label>
                                <select id="intentAY" required class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500">
                                    <option value="AY 2026-2027">AY 2026-2027 (Next Year)</option>
                                    <option value="AY 2027-2028">AY 2027-2028</option>
                                </select>
                            </div>
                            <div class="form-group mb-0">
                                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Contract Intent *</label>
                                <select id="intentChoice" required class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500">
                                    <option value="">-- Select Option --</option>
                                    <option value="extend">Extend contract and continue next Academic Year</option>
                                    <option value="undecided">Undecided (Request loading conference / admin meeting)</option>
                                    
                                </select>
                            </div>
                        </div>

                        <div class="form-group mb-0">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Preferred Department / Assignment Area</label>
                            <input type="text" id="intentDept" placeholder="e.g. Science Department, Grade School Advising" class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500">
                        </div>

                        <div class="form-group mb-0">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Proposed Subject Loads & Class Preferences</label>
                            <textarea id="intentSubjects" rows="3" placeholder="List down courses/subjects or tasks you prefer to teach/handle..." class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"></textarea>
                        </div>

                        <div class="form-group mb-0">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Justification & Performance Comments</label>
                            <textarea id="intentRemarks" rows="3" placeholder="Provide any comments or justification for contract extension..." class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"></textarea>
                        </div>

                        <div class="flex gap-3">
                            <button type="button" onclick="document.getElementById('contractIntentForm').reset()" class="w-1/3 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary flex-1 py-3 text-xs justify-center font-bold">
                                <i class="fas fa-paper-plane mr-1.5"></i> Submit Contract Renewal Intent
                            </button>
                        </div>
                    </form>
                `;
    }
}

function renderClearanceSubTab() {
    let currentEmployee = getActiveESSEmployee();
    const container = document.getElementById('clearanceSubTabContainer');
    if (!container) return;

    if (currentEmployee.status === 'active' || currentEmployee.status === 'onboarding') {
        container.innerHTML = `
                    <div class="alert alert-warning mb-6">
                        <i class="fas fa-exclamation-triangle text-amber-600"></i>
                        <div>
                            <p class="font-semibold mb-1 text-slate-800 text-xs">Initiate Exit Clearance / Resignation</p>
                            <p class="text-[11px] text-slate-600">Once initiated, your portal access status will update to "Pending Exit" and your offboarding checklists will be generated automatically. This cannot be undone.</p>
                        </div>
                    </div>

                    <form id="exitForm" onsubmit="initiateExit(event)" class="space-y-4">
                        <div class="form-group">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Reason for Separation *</label>
                            <select id="exitReason" required class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500">
                                <option value="">-- Select --</option>
                                <option value="voluntary_resignation">Voluntary Resignation</option>
                                <option value="end_contract">End of Contract</option>
                                <option value="retirement">Retirement</option>
                                <option value="relocation">Relocation</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Last Available Date (Tentative) *</label>
                            <input type="date" id="exitDate" required class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500">
                        </div>

                        <div class="form-group">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Additional Separation Comments</label>
                            <textarea id="exitComments" rows="3" placeholder="Please share any additional information or feedback regarding your offboarding..." class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"></textarea>
                        </div>

                        <div class="flex gap-4 pt-2">
                            <button type="button" onclick="switchTab('overview')" class="btn btn-outline flex-1 py-3 text-xs justify-center font-bold">
                                <i class="fas fa-arrow-left"></i> Cancel
                            </button>
                            <button type="submit" class="btn btn-danger flex-1 py-3 text-xs justify-center font-bold bg-rose-600 hover:bg-rose-700 text-white border-none">
                                <i class="fas fa-door-open"></i> Initiate Exit Process
                            </button>
                        </div>
                    </form>
                `;
    } else if (currentEmployee.status === 'pending_exit') {
        const checklist = currentEmployee.clearanceChecklist || { academic: false, library: false, property: false, finance: false, hr: false };
        const exitInterview = currentEmployee.exitInterview;

        let clearedCount = 0;
        if (checklist.academic) clearedCount++;
        if (checklist.library) clearedCount++;
        if (checklist.property) clearedCount++;
        if (checklist.finance) clearedCount++;
        if (checklist.hr) clearedCount++;
        const percentage = Math.round((clearedCount / 5) * 100);

        const desks = [
            { key: 'academic', name: 'Academic Turnover', desc: 'Syllabus, grades, and student marks submitted to Chair', icon: 'fa-graduation-cap' },
            { key: 'library', name: 'Library Desk Clearance', desc: 'Borrowed books, instructional kits, and audio-visual assets returned', icon: 'fa-book-reader' },
            { key: 'property', name: 'Property & Asset turnover', desc: 'School laptop, hardware devices, workspace keys, and active physical files', icon: 'fa-laptop' },
            { key: 'finance', name: 'Accounting settlements', desc: 'Settlement of salaries, salary loans, cash advances, and finance liabilities', icon: 'fa-coins' },
            { key: 'hr', name: 'HR Audit & Exit Interview', desc: 'Completion of digital exit survey and clearance compliance audit', icon: 'fa-file-signature' }
        ];

        const checklistHTML = desks.map(desk => {
            const isCleared = !!checklist[desk.key];
            return `
                        <div class="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between text-xs hover:shadow-xs transition">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full ${isCleared ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'} flex items-center justify-center text-sm border shrink-0">
                                    <i class="fas ${desk.icon}"></i>
                                </div>
                                <div>
                                    <h4 class="font-bold text-slate-800">${desk.name}</h4>
                                    <p class="text-[10px] text-slate-400 font-medium">${desk.desc}</p>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${isCleared ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}">
                                ${isCleared ? '<i class="fas fa-check-circle mr-1"></i> Cleared' : '<i class="fas fa-hourglass-half mr-1"></i> Pending'}
                            </span>
                        </div>
                    `;
        }).join('');

        let exitInterviewHTML = '';
        if (exitInterview) {
            exitInterviewHTML = `
                        <div class="bg-emerald-50/50 border border-emerald-200/60 p-5 rounded-2xl space-y-3">
                            <div class="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                                <i class="fas fa-check-circle text-base"></i>
                                <span>DIGITAL EXIT INTERVIEW COMPLETED</span>
                            </div>
                            <p class="text-[11px] text-slate-500">Thank you for sharing your experience. Your answers have been locked and submitted directly to the HR director.</p>
                            <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-semibold pt-2">
                                <div class="sm:col-span-1 p-3 bg-white border border-slate-200 rounded-xl">
                                    <span class="block text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Experience Rating</span>
                                    <div class="flex gap-0.5 text-yellow-400 mt-1">
                                        ${Array(exitInterview.rating).fill('<i class="fas fa-star text-xs"></i>').join('')}
                                        ${Array(5 - exitInterview.rating).fill('<i class="far fa-star text-xs text-slate-300"></i>').join('')}
                                    </div>
                                </div>
                                <div class="sm:col-span-3 p-3 bg-white border border-slate-200 rounded-xl">
                                    <span class="block text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Feedback & Suggestions</span>
                                    <p class="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap mt-0.5">${exitInterview.notes}</p>
                                </div>
                            </div>
                        </div>
                    `;
        } else {
            exitInterviewHTML = `
                        <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                            <div class="border-b pb-2 flex items-center justify-between">
                                <div>
                                    <h3 class="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <i class="fas fa-comments text-amber-500"></i> Digital Exit Interview Survey
                                    </h3>
                                    <p class="text-[10px] text-slate-400 mt-0.5 font-medium">Please share your experience to complete the clearance requirement.</p>
                                </div>
                                <span class="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Required</span>
                            </div>

                            <form id="exitSurveyForm" onsubmit="submitExitSurvey(event)" class="space-y-4 text-xs font-semibold text-slate-700">
                                <div>
                                    <label class="block mb-1">1. Overall Tenure & School Experience Rating *</label>
                                    <select id="surveyRating" required class="w-full px-3 py-2 border rounded-xl bg-white text-xs">
                                        <option value="5">5 - Highly Satisfied</option>
                                        <option value="4">4 - Satisfied</option>
                                        <option value="3">3 - Neutral / Satisfactory</option>
                                        <option value="2">2 - Dissatisfied</option>
                                        <option value="1">1 - Highly Dissatisfied</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block mb-1">2. What is your primary reason for leaving? *</label>
                                    <textarea id="surveyReason" rows="2" required placeholder="Please outline the main factors leading to your separation..." class="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500 text-xs font-medium"></textarea>
                                </div>
                                <div>
                                    <label class="block mb-1">3. Do you have any recommendations or feedback for school management? *</label>
                                    <textarea id="surveyFeedback" rows="2" required placeholder="Suggestions regarding loading, research support, salary structures, administration, etc..." class="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500 text-xs font-medium"></textarea>
                                </div>
                                <button type="submit" class="btn btn-primary w-full py-2.5 justify-center font-bold">
                                    <i class="fas fa-paper-plane mr-1.5"></i> Submit Exit Survey Feedback
                                </button>
                            </form>
                        </div>
                    `;
        }

        const docsHTML = `
                    <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                        <div>
                            <h3 class="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <i class="fas fa-file-pdf text-blue-500"></i> Automated Exit Documents
                            </h3>
                            <p class="text-[10px] text-slate-400 mt-0.5 font-medium">Instantly generate and download verified draft documentation compiled from your active profile record.</p>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button onclick="previewExitDoc('coe')" class="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-xs transition text-center flex flex-col items-center justify-center gap-2">
                                <i class="fas fa-certificate text-2xl text-blue-600"></i>
                                <span class="font-extrabold text-xs text-slate-800">Certificate of Employment</span>
                                <span class="text-[9px] text-slate-400 font-medium">Standardized COE</span>
                            </button>
                            <button onclick="previewExitDoc('coc')" class="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-400 hover:shadow-xs transition text-center flex flex-col items-center justify-center gap-2">
                                <i class="fas fa-file-invoice text-2xl text-emerald-600"></i>
                                <span class="font-extrabold text-xs text-slate-800">Clearance Certificate</span>
                                <span class="text-[9px] text-slate-400 font-medium">Official clearance state</span>
                            </button>
                            <button onclick="previewExitDoc('financial')" class="p-3 bg-white border border-slate-200 rounded-xl hover:border-amber-400 hover:shadow-xs transition text-center flex flex-col items-center justify-center gap-2">
                                <i class="fas fa-money-bill-wave text-2xl text-amber-600"></i>
                                <span class="font-extrabold text-xs text-slate-800">Financial Certificate</span>
                                <span class="text-[9px] text-slate-400 font-medium">Final payout estimate</span>
                            </button>
                        </div>
                    </div>
                `;

        container.innerHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="md:col-span-2 space-y-4">
                            <div class="p-5 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl flex items-center justify-between shadow-xs">
                                <div>
                                    <h3 class="font-extrabold text-sm text-indigo-950">Clearance Completion Status</h3>
                                    <p class="text-[11px] text-indigo-800 mt-0.5">Your separation forms are actively routing for signatures.</p>
                                </div>
                                <div class="text-right">
                                    <span class="text-2xl font-black text-indigo-900">${percentage}%</span>
                                    <span class="block text-[9px] font-extrabold bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full uppercase mt-1 tracking-wider">${clearedCount} / 5 desks</span>
                                </div>
                            </div>

                            <div class="space-y-2">
                                <h4 class="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Required Clearance Desks</h4>
                                ${checklistHTML}
                            </div>
                        </div>

                        <div class="space-y-4">
                            <div class="p-4 bg-white border border-slate-200 rounded-2xl text-xs space-y-3 shadow-xs">
                                <h4 class="font-extrabold text-slate-800 border-b pb-1.5 uppercase text-[10px] tracking-wider"><i class="fas fa-info-circle text-slate-400"></i> Offboarding Details</h4>
                                <div class="space-y-2 font-semibold">
                                    <div>
                                        <span class="block text-[9px] text-slate-400 uppercase">Reason for Exit</span>
                                        <span class="text-slate-850 capitalize">${(currentEmployee.exitReason || 'Resignation').replace(/_/g, ' ')}</span>
                                    </div>
                                    <div>
                                        <span class="block text-[9px] text-slate-400 uppercase">Initiated Date</span>
                                        <span class="text-slate-850">${SAGA.formatDate(currentEmployee.exitInitiatedDate)}</span>
                                    </div>
                                    <div>
                                        <span class="block text-[9px] text-slate-400 uppercase">Target Separation Date</span>
                                        <span class="text-slate-850">${currentEmployee.exitDate ? new Date(currentEmployee.exitDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Exit Interview Section -->
                    ${exitInterviewHTML}

                    <!-- Automated Document Section -->
                    ${docsHTML}
                `;
    }
}

function submitExitSurvey(event) {
    let currentEmployee = getActiveESSEmployee();
    if (event) event.preventDefault();
    const rating = document.getElementById('surveyRating').value;
    const reason = document.getElementById('surveyReason').value.trim();
    const feedback = document.getElementById('surveyFeedback').value.trim();

    if (!reason || !feedback) {
        alert('Please fill out all required fields.');
        return;
    }

    const data = SAGA.getData();
    const employee = data.employees[currentEmployee.id];
    if (employee) {
        employee.exitInterview = {
            rating: parseInt(rating),
            notes: `Reason: ${reason}\nFeedback: ${feedback}`,
            completedDate: new Date().toISOString()
        };
        if (!employee.clearanceChecklist) {
            employee.clearanceChecklist = { academic: false, library: false, property: false, finance: false, hr: false };
        }
        employee.clearanceChecklist.hr = true;

        SAGA.saveData(data);

        alert('✅ Digital Exit Interview submitted successfully!\nThank you for your valuable feedback.');
        renderClearanceSubTab();
    }
}

function getCOETemplate(employee) {
    const job = SAGA.getJobById(employee.jobId);
    const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const startDate = employee.onboardedDate ? new Date(employee.onboardedDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

    return `
                <div class="watermark-container relative" style="font-family: 'Times New Roman', Times, serif; padding: 20px; position: relative;">
                    <div style="position: absolute; top: 35%; left: 10%; right: 10%; transform: rotate(-30deg); font-size: 60px; color: rgba(220,20,60,0.08); font-weight: bold; text-align: center; pointer-events: none; select: none; z-index: 10;">DRAFT PREVIEW</div>
                    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px;">
                        <h2 style="font-size: 20px; font-weight: bold; margin: 0;">ST. ALOYSIUS GONZAGA ACADEMY INC.</h2>
                        <p style="font-size: 11px; color: #555; margin: 5px 0;">St. Aloysius Gonzaga St., Greenhills, San Juan City, Metro Manila</p>
                        <p style="font-size: 12px; font-weight: bold; margin: 5px 0; letter-spacing: 1px;">HUMAN RESOURCES DEPARTMENT</p>
                    </div>
                    
                    <h3 style="text-align: center; font-size: 16px; font-weight: bold; margin: 40px 0; text-decoration: underline;">CERTIFICATE OF EMPLOYMENT</h3>
                    
                    <p style="margin: 30px 0;">TO WHOM IT MAY CONCERN:</p>
                    
                    <p style="text-align: justify; text-indent: 50px; line-height: 2; margin-bottom: 20px;">
                        This is to certify that <strong>${employee.name}</strong> was employed with St. Aloysius Gonzaga Academy Inc. as a <strong>${job ? job.title : 'Faculty Member'}</strong> in the <strong>${job ? job.department : 'Academic Division'}</strong> from <strong>${startDate}</strong> to <strong>${today}</strong>.
                    </p>
                    
                    <p style="text-align: justify; text-indent: 50px; line-height: 2; margin-bottom: 40px;">
                        This certificate is being issued upon the request of the above-named employee for reference, clearance, and other legal purposes it may serve.
                    </p>
                    
                    <div style="margin-top: 60px; display: flex; justify-content: space-between;">
                        <div>
                            <p style="margin: 0; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; display: inline-block;">HR Director & Audit Lead</p>
                            <p style="margin: 5px 0; font-size: 12px; color: #555;">Human Resources Department</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; font-size: 11px; color: #888;">Document ID: COE-DRAFT-${employee.id}</p>
                            <p style="margin: 5px 0; font-size: 11px; color: #888;">Date Generated: ${today}</p>
                        </div>
                    </div>
                </div>
            `;
}

function getCOCTemplate(employee) {
    const job = SAGA.getJobById(employee.jobId);
    const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const checklist = employee.clearanceChecklist || { academic: false, library: false, property: false, finance: false, hr: false };

    return `
                <div class="watermark-container relative" style="font-family: 'Times New Roman', Times, serif; padding: 20px; position: relative;">
                    <div style="position: absolute; top: 35%; left: 10%; right: 10%; transform: rotate(-30deg); font-size: 60px; color: rgba(220,20,60,0.08); font-weight: bold; text-align: center; pointer-events: none; select: none; z-index: 10;">DRAFT PREVIEW</div>
                    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px;">
                        <h2 style="font-size: 20px; font-weight: bold; margin: 0;">ST. ALOYSIUS GONZAGA ACADEMY INC.</h2>
                        <p style="font-size: 11px; color: #555; margin: 5px 0;">St. Aloysius Gonzaga St., Greenhills, San Juan City, Metro Manila</p>
                        <p style="font-size: 12px; font-weight: bold; margin: 5px 0; letter-spacing: 1px;">INSTITUTIONAL CLEARANCE SYSTEM</p>
                    </div>
                    
                    <h3 style="text-align: center; font-size: 16px; font-weight: bold; margin: 30px 0; text-decoration: underline;">CERTIFICATE OF CLEARANCE</h3>
                    
                    <p style="margin: 20px 0;">This is to certify that <strong>${employee.name}</strong>, holding the position of <strong>${job ? job.title : 'Faculty Member'}</strong>, is currently undergoing institutional offboarding. The clearance progress from various departments is recorded as follows:</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 30px 0; font-size: 13px;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; border-bottom: 2px solid #aaa;">Clearing Department</th>
                                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; border-bottom: 2px solid #aaa;">Clearance Requirement</th>
                                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 120px; border-bottom: 2px solid #aaa;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold;">Academic turnover</td>
                                <td style="border: 1px solid #ddd; padding: 10px;">Submission of student grades, modules, syllabi, & teacher manuals</td>
                                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: ${checklist.academic ? 'green' : 'orange'};">${checklist.academic ? 'CLEARED' : 'PENDING'}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold;">Library Desk</td>
                                <td style="border: 1px solid #ddd; padding: 10px;">Return of textbooks, resource guides, digital kits, & media library tools</td>
                                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: ${checklist.library ? 'green' : 'orange'};">${checklist.library ? 'CLEARED' : 'PENDING'}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold;">Property & Asset turnover</td>
                                <td style="border: 1px solid #ddd; padding: 10px;">Return of school laptops, peripherals, workspace keys, and cabinets</td>
                                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: ${checklist.property ? 'green' : 'orange'};">${checklist.property ? 'CLEARED' : 'PENDING'}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold;">Accounting settlements</td>
                                <td style="border: 1px solid #ddd; padding: 10px;">Audit of salaries, loan balances, advances, and liability settlements</td>
                                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: ${checklist.finance ? 'green' : 'orange'};">${checklist.finance ? 'CLEARED' : 'PENDING'}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold;">HR Audit & Exit Survey</td>
                                <td style="border: 1px solid #ddd; padding: 10px;">Exit Interview submission and final clearance certificate auditing</td>
                                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: ${checklist.hr ? 'green' : 'orange'};">${checklist.hr ? 'CLEARED' : 'PENDING'}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <p style="text-align: justify; line-height: 1.8; margin-top: 30px;">
                        This clearance verification represents the live database status at the school registry. A finalized, hard-copy Clearance Certificate with institutional dry seals will be issued by the Principal's Office upon successful completion of all desks.
                    </p>
                    
                    <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                        <div>
                            <p style="margin: 0; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; display: inline-block;">Registrar & Clearance Officer</p>
                            <p style="margin: 5px 0; font-size: 12px; color: #555;">St. Aloysius Gonzaga Academy Inc.</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; font-size: 11px; color: #888;">Document ID: CLR-DRAFT-${employee.id}</p>
                            <p style="margin: 5px 0; font-size: 11px; color: #888;">Date Updated: ${today}</p>
                        </div>
                    </div>
                </div>
            `;
}

function getFinancialTemplate(employee) {
    const job = SAGA.getJobById(employee.jobId);
    const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

    const baseSalary = employee.salaryInfo?.baseSalary || 30000;
    const dailyRate = Math.round(baseSalary / 22);
    const unusedLeaveDays = employee.leaveBalance?.vacation || 0;
    const leaveEncashment = unusedLeaveDays * dailyRate;

    const sss = Math.round(baseSalary * 0.045);
    const philhealth = Math.round(baseSalary * 0.025);
    const pagibig = Math.round(baseSalary * 0.02);
    const tax = Math.round(baseSalary * 0.10);
    const totalStatutory = sss + philhealth + pagibig + tax;

    const finalPayoutEstimate = baseSalary + leaveEncashment - totalStatutory;

    return `
                <div class="watermark-container relative" style="font-family: 'Times New Roman', Times, serif; padding: 20px; position: relative;">
                    <div style="position: absolute; top: 35%; left: 10%; right: 10%; transform: rotate(-30deg); font-size: 60px; color: rgba(220,20,60,0.08); font-weight: bold; text-align: center; pointer-events: none; select: none; z-index: 10;">DRAFT PREVIEW</div>
                    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px;">
                        <h2 style="font-size: 20px; font-weight: bold; margin: 0;">ST. ALOYSIUS GONZAGA ACADEMY INC.</h2>
                        <p style="font-size: 11px; color: #555; margin: 5px 0;">St. Aloysius Gonzaga St., Greenhills, San Juan City, Metro Manila</p>
                        <p style="font-size: 12px; font-weight: bold; margin: 5px 0; letter-spacing: 1px;">ACCOUNTING & FINANCE DIVISION</p>
                    </div>
                    
                    <h3 style="text-align: center; font-size: 16px; font-weight: bold; margin: 30px 0; text-decoration: underline;">ESTIMATED FINAL PAYROLL & SEPARATION SHEET</h3>
                    
                    <div style="margin: 20px 0; font-size: 13px;">
                        <p><strong>Employee Name:</strong> ${employee.name}</p>
                        <p><strong>Position Title:</strong> ${job ? job.title : 'Faculty Member'}</p>
                        <p><strong>Department:</strong> ${job ? job.department : 'Academic Division'}</p>
                        <p><strong>Pay Grade Structure:</strong> ${employee.rateStructure || 'Full-Time Monthly Salary'}</p>
                    </div>
                    
                    <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
                        <thead>
                            <tr style="background-color: #f9f9f9; border-bottom: 2px solid #ddd;">
                                <th style="padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #aaa;">Compensation / Earnings Description</th>
                                <th style="padding: 10px; text-align: right; font-weight: bold; width: 150px; border-bottom: 2px solid #aaa;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">Monthly Base Basic Salary</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₱${baseSalary.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">Unused Vacation Leave Credit Encashment (${unusedLeaveDays} days @ ₱${dailyRate}/day)</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: green;">+ ₱${leaveEncashment.toLocaleString()}</td>
                            </tr>
                            <tr style="background-color: #fdfdfd; font-weight: bold;">
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;">Total Gross Earnings</td>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₱${(baseSalary + leaveEncashment).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
                        <thead>
                            <tr style="background-color: #f9f9f9; border-bottom: 2px solid #ddd;">
                                <th style="padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #aaa;">Statutory & Internal Deductions</th>
                                <th style="padding: 10px; text-align: right; font-weight: bold; width: 150px; border-bottom: 2px solid #aaa;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">SSS Contribution (Statutory)</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: red;">- ₱${sss.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">PhilHealth Contribution (Statutory)</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: red;">- ₱${philhealth.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">Pag-IBIG Fund Contribution (Statutory)</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: red;">- ₱${pagibig.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">Withholding Income Tax Estimate</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: red;">- ₱${tax.toLocaleString()}</td>
                            </tr>
                            <tr style="background-color: #fdfdfd; font-weight: bold;">
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;">Total Deductions</td>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; color: red;">- ₱${totalStatutory.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    <hr style="border: 0; border-top: 2px solid #333; margin: 20px 0;">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 15px; font-weight: bold; background-color: #f5f5f5; padding: 15px; border-radius: 8px;">
                        <span>PROJECTED NET SEPARATION PAYOUT ESTIMATE:</span>
                        <span style="font-size: 20px; color: #1e3a8a;">₱${finalPayoutEstimate.toLocaleString()}</span>
                    </div>
                    
                    <p style="font-size: 11px; color: #666; text-align: justify; line-height: 1.5; margin-top: 25px;">
                        <strong>Notice:</strong> This document is a preliminary financial audit run automatically for offboarding planning. The final check disbursement is contingent on complete clearing from all academic, library, property, and HR departments.
                    </p>
                    
                    <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                        <div>
                            <p style="margin: 0; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; display: inline-block;">Chief Cashier & Finance Head</p>
                            <p style="margin: 5px 0; font-size: 12px; color: #555;">Accounting Department</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; font-size: 11px; color: #888;">Document ID: FIN-DRAFT-${employee.id}</p>
                            <p style="margin: 5px 0; font-size: 11px; color: #888;">Calculated on: ${today}</p>
                        </div>
                    </div>
                </div>
            `;
}

function previewExitDoc(type) {
    let currentEmployee = getActiveESSEmployee();
    const modal = document.getElementById('exitDocModal');
    const titleEl = document.getElementById('exitDocModalTitle');
    const textArea = document.getElementById('exitDocTextArea');
    if (!modal || !textArea) return;

    let htmlContent = '';
    let title = '';

    if (type === 'coe') {
        title = 'Draft Certificate of Employment (COE)';
        htmlContent = getCOETemplate(currentEmployee);
    } else if (type === 'coc') {
        title = 'Draft Clearance Certificate (COC)';
        htmlContent = getCOCTemplate(currentEmployee);
    } else if (type === 'financial') {
        title = 'Draft Institutional Financial Certificate';
        htmlContent = getFinancialTemplate(currentEmployee);
    }

    titleEl.innerHTML = `<i class="fas fa-file-pdf text-amber-500 mr-2"></i> ${title}`;
    textArea.innerHTML = htmlContent;
    modal.classList.add('active');
}

function closeExitDocModal() {
    document.getElementById('exitDocModal')?.classList.remove('active');
}

function printExitDoc() {
    const content = document.getElementById('exitDocTextArea').innerHTML;
    const myWindow = window.open('', 'PRINT', 'height=600,width=800');
    myWindow.document.write('<html><head><title>Print Document</title>');
    myWindow.document.write('</head><body style="margin:40px; font-family:serif;">');
    myWindow.document.write(content);
    myWindow.document.write('</body></html>');
    myWindow.document.close();
    let currentEmployee = getActiveESSEmployee();
    const modal = document.getElementById('exitDocModal');
    const titleEl = document.getElementById('exitDocModalTitle');
    const textArea = document.getElementById('exitDocTextArea');
    if (!modal || !textArea) return;

    let htmlContent = '';
    let title = '';

    if (type === 'coe') {
        title = 'Draft Certificate of Employment (COE)';
        htmlContent = getCOETemplate(currentEmployee);
    } else if (type === 'coc') {
        title = 'Draft Clearance Certificate (COC)';
        htmlContent = getCOCTemplate(currentEmployee);
    } else if (type === 'financial') {
        title = 'Draft Institutional Financial Certificate';
        htmlContent = getFinancialTemplate(currentEmployee);
    }

    titleEl.innerHTML = `<i class="fas fa-file-pdf text-amber-500 mr-2"></i> ${title}`;
    textArea.innerHTML = htmlContent;
    modal.classList.add('active');
}

function closeExitDocModal() {
    document.getElementById('exitDocModal')?.classList.remove('active');
}

function printExitDoc() {
    const content = document.getElementById('exitDocTextArea').innerHTML;
    const myWindow = window.open('', 'PRINT', 'height=600,width=800');
    myWindow.document.write('<html><head><title>Print Document</title>');
    myWindow.document.write('</head><body style="margin:40px; font-family:serif;">');
    myWindow.document.write(content);
    myWindow.document.write('</body></html>');
    myWindow.document.close();
    myWindow.focus();
    setTimeout(() => {
        myWindow.print();
        myWindow.close();
    }, 250);
}

function renderExitRenewals() {
    const data = SAGA.getData();
    const tbody = document.getElementById('exitRenewalTableBody');
    if (!tbody) return;

    let employeesWithIntents = [];
    Object.values(data.employees).forEach(emp => {
        if (emp.contractIntent) {
            employeesWithIntents.push(emp);
        }
    });

    // Sort by most recent
    employeesWithIntents.sort((a, b) => new Date(b.contractIntent.submittedDate) - new Date(a.contractIntent.submittedDate));

    if (employeesWithIntents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400 italic">No contract renewal intents submitted yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = employeesWithIntents.map(emp => {
        const intent = emp.contractIntent;
        let badgeClass = '';
        let intentLabel = '';

        if (intent.intent === 'extend') {
            badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
            intentLabel = 'Extend Contract';
        } else {
            badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
            intentLabel = 'Undecided';
        }

        const job = SAGA.getJobById(emp.jobId);
        const dept = job ? job.department : 'Faculty';

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3 font-bold text-slate-900">${emp.name}</td>
                <td class="px-4 py-3 font-semibold text-slate-700">${intent.academicYear}</td>
                <td class="px-4 py-3">
                    <span class="px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${badgeClass}">${intentLabel}</span>
                </td>
                <td class="px-4 py-3 font-semibold text-slate-700">${SAGA.formatDate(intent.submittedDate)}</td>
                <td class="px-4 py-3 text-right">
                    <div class="flex justify-end gap-2">
                        <button onclick="viewContractIntentDetails('${emp.id}')" class="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[10px] rounded-xl font-bold shadow-sm transition"><i class="fas fa-eye mr-1"></i> Details</button>
                        ${intent.status !== 'Approved' ? `<button onclick="approveContractRenewal('${emp.id}')" class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] rounded-xl font-bold shadow-sm transition"><i class="fas fa-check mr-1"></i> Approve</button>` : `<span class="px-2.5 py-1.5 text-slate-400 text-[10px] font-bold"><i class="fas fa-check-double mr-1"></i> Approved</span>`}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function viewContractIntentDetails(empId) {
    const data = SAGA.getData();
    const emp = data.employees[empId];
    if (!emp || !emp.contractIntent) return;

    const intent = emp.contractIntent;
    
    // Create custom modal for viewing details
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4";
    modal.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all">
            <div class="p-6">
                <div class="flex justify-between items-start mb-5">
                    <div>
                        <h3 class="font-black text-xl text-slate-900">Contract Renewal Intent</h3>
                        <p class="text-sm font-semibold text-slate-500">${emp.name}</p>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4 text-sm">
                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Intent</p>
                        <p class="font-semibold text-slate-800">${intent.intent === 'extend' ? 'Extend Contract' : 'Undecided'}</p>
                    </div>
                    
                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Proposed Academic Year</p>
                        <p class="font-semibold text-slate-800">${intent.academicYear}</p>
                    </div>

                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Preferred Subjects / Loads</p>
                        <p class="font-semibold text-slate-800 whitespace-pre-wrap">${intent.subjects || 'None specified'}</p>
                    </div>

                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Additional Remarks</p>
                        <p class="font-semibold text-slate-800 whitespace-pre-wrap">${intent.remarks || 'None specified'}</p>
                    </div>
                </div>

                <div class="mt-6 flex gap-3">
                    <button onclick="this.closest('.fixed').remove()" class="flex-1 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition">Close</button>
                    ${intent.status !== 'Approved' ? `<button onclick="this.closest('.fixed').remove(); approveContractRenewal('${emp.id}');" class="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition shadow-sm shadow-indigo-200">Approve Renewal</button>` : ''}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function approveContractRenewal(empId) {
    const data = SAGA.getData();
    if (data.employees[empId] && data.employees[empId].contractIntent) {
        data.employees[empId].contractIntent.status = 'Approved';
        SAGA.saveData(data);
        SAGA.showCustomAlert(`Contract renewal for ${data.employees[empId].name} has been approved.`, "Renewal Approved");
        renderExitRenewals();
    }
}
