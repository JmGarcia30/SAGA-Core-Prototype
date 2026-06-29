/**
 * SAGA-Core Frontend Prototype
 * Shared Application Logic & localStorage Management
 */

// ============================================================================
// INITIALIZATION & DATA STRUCTURE
// ============================================================================

const SAGA = {
  // Mock job postings
  jobs: [
    {
      id: 1,
      title: "Senior IT Instructor",
      department: "Information Technology",
      description: "Lead IT curriculum development and teach advanced programming courses.",
      requirements: "5+ years IT, teaching experience, Java/Python proficiency",
      salary: "₱45,000 - ₱60,000/month"
    },
    {
      id: 2,
      title: "HR Manager",
      department: "Human Resources",
      description: "Oversee recruitment, compensation, and employee relations.",
      requirements: "8+ years HR, HRBP experience, knowledge of RA 10911",
      salary: "₱40,000 - ₱55,000/month"
    },
    {
      id: 3,
      title: "Finance Analyst",
      department: "Finance",
      description: "Analyze financial data and prepare reports for management.",
      requirements: "3+ years accounting, Excel proficiency, CPA preferred",
      salary: "₱30,000 - ₱45,000/month"
    }
  ],

  // Simulated AI Skills extraction keywords
  skillsKeywords: {
    "java": 15,
    "python": 15,
    "javascript": 12,
    "sql": 12,
    "react": 14,
    "teaching": 18,
    "leadership": 16,
    "communication": 14,
    "agile": 10,
    "html": 8,
    "css": 8,
    "nodejs": 13,
    "project management": 14,
    "financial analysis": 15,
    "excel": 12,
    "accounting": 14,
    "hr": 16,
    "recruitment": 14,
    "payroll": 12,
    "compliance": 13
  },

  // Initialize localStorage with mock data
  init() {
    // Always reset with mock data for prototype demo
    this.resetData();
    localStorage.setItem("saga_initialized", "true");
  },

  // Reset all data with mock data (for testing)
  resetData() {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const mockEmployeeId1 = "EMP_1624896000000";
    const mockEmployeeId2 = "EMP_1624896000001";
    const mockEmployeeId3 = "EMP_1624896000002";

    const initialData = {
      applicants: [
        {
          id: "APP_1719662400000",
          name: "Maria Garcia",
          email: "maria.garcia@email.com",
          phone: "+63 917 234 5678",
          resume: "Senior IT Instructor with 8+ years of experience. Proficient in Java, Python, JavaScript, HTML, CSS, NodeJS. Strong leadership and communication skills. Experience in Agile methodology.",
          jobId: 1,
          status: "scored",
          compatibility_score: 92,
          extracted_skills: [
            { skill: "java", weight: 15 },
            { skill: "python", weight: 15 },
            { skill: "javascript", weight: 12 },
            { skill: "html", weight: 8 },
            { skill: "css", weight: 8 },
            { skill: "nodejs", weight: 13 },
            { skill: "teaching", weight: 18 },
            { skill: "leadership", weight: 16 }
          ],
          appliedDate: threeWeeksAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400001",
          name: "Juan Dela Cruz",
          email: "juan.delacruz@email.com",
          phone: "+63 918 789 0123",
          resume: "HR Manager with 10+ years experience. Expertise in recruitment, payroll, compliance with RA 10911 and Data Privacy Act. Strong HRBP background.",
          jobId: 2,
          status: "hired",
          compatibility_score: 88,
          extracted_skills: [
            { skill: "hr", weight: 16 },
            { skill: "recruitment", weight: 14 },
            { skill: "payroll", weight: 12 },
            { skill: "compliance", weight: 13 },
            { skill: "leadership", weight: 16 }
          ],
          appliedDate: twoWeeksAgo.toISOString(),
          hireDateApproved: oneWeekAgo.toISOString()
        },
        {
          id: "APP_1719662400002",
          name: "Rosa Santos",
          email: "rosa.santos@email.com",
          phone: "+63 919 456 7890",
          resume: "Finance Analyst with 5 years accounting experience. Expert in Excel, financial analysis. CPA in process.",
          jobId: 3,
          status: "applied",
          compatibility_score: null,
          extracted_skills: [],
          appliedDate: now.toISOString(),
          hireDateApproved: null
        }
      ],
      employees: {
        [mockEmployeeId1]: {
          id: mockEmployeeId1,
          applicantId: "APP_1719662400001",
          name: "Juan Dela Cruz",
          email: "juan.delacruz@email.com",
          phone: "+63 918 789 0123",
          username: "juan.delacruz",
          password: "Password123",
          jobId: 2,
          status: "active",
          onboardedDate: oneWeekAgo.toISOString(),
          leaveBalance: {
            vacation: 12,
            sick: 9,
            emergency: 5
          },
          performanceMetrics: {
            rating: 4.5,
            lastReviewDate: now.toISOString(),
            projects: 2,
            tasks_completed: 38
          },
          salaryInfo: {
            baseSalary: 45000,
            lastPaymentDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            currency: "PHP"
          }
        },
        [mockEmployeeId2]: {
          id: mockEmployeeId2,
          applicantId: "APP_existing1",
          name: "Ana Rodriguez",
          email: "ana.rodriguez@email.com",
          phone: "+63 917 111 2222",
          username: "ana.rodriguez",
          password: "SecurePass456",
          jobId: 1,
          status: "active",
          onboardedDate: twoMonthsAgo.toISOString(),
          leaveBalance: {
            vacation: 8,
            sick: 7,
            emergency: 4
          },
          performanceMetrics: {
            rating: 4.2,
            lastReviewDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            projects: 4,
            tasks_completed: 52
          },
          salaryInfo: {
            baseSalary: 38000,
            lastPaymentDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            currency: "PHP"
          }
        },
        [mockEmployeeId3]: {
          id: mockEmployeeId3,
          applicantId: "APP_existing2",
          name: "Carlo Mendoza",
          email: "carlo.mendoza@email.com",
          phone: "+63 916 333 4444",
          username: "carlo.mendoza",
          password: "TestPass789",
          jobId: 3,
          status: "pending_exit",
          onboardedDate: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
          exitReason: "voluntary_resignation",
          exitInitiatedDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          leaveBalance: {
            vacation: 5,
            sick: 3,
            emergency: 2
          },
          performanceMetrics: {
            rating: 3.8,
            lastReviewDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            projects: 2,
            tasks_completed: 28
          },
          salaryInfo: {
            baseSalary: 32000,
            lastPaymentDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            currency: "PHP"
          }
        }
      },
      archivedEmployees: [
        {
          id: "EMP_1624896000099",
          applicantId: "APP_old1",
          name: "Pedro Aquino",
          email: "pedro.aquino@email.com",
          phone: "+63 912 555 6666",
          username: "pedro.aquino",
          password: "OldPass123",
          jobId: 1,
          status: "separated",
          onboardedDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          exitReason: "retirement",
          clearanceApprovedDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          archivedDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          leaveBalance: {
            vacation: 0,
            sick: 0,
            emergency: 0
          },
          performanceMetrics: {
            rating: 4.6,
            lastReviewDate: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString(),
            projects: 15,
            tasks_completed: 128
          },
          salaryInfo: {
            baseSalary: 50000,
            lastPaymentDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            currency: "PHP"
          }
        }
      ],
      leaveRequests: [
        {
          id: "LEAVE_1719662400000",
          employeeId: mockEmployeeId1,
          leaveType: "vacation",
          fromDate: "2026-07-10",
          toDate: "2026-07-15",
          days: 6,
          reason: "Family vacation to Boracay",
          status: "approved",
          submittedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "LEAVE_1719662400001",
          employeeId: mockEmployeeId2,
          leaveType: "sick",
          fromDate: "2026-06-25",
          toDate: "2026-06-26",
          days: 2,
          reason: "Flu and fever",
          status: "approved",
          submittedDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      attendanceLogs: {
        [mockEmployeeId1]: [
          { type: "in", timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), date: now.toLocaleDateString() },
          { type: "out", timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), date: now.toLocaleDateString() },
          { type: "in", timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 - 8 * 60 * 60 * 1000).toISOString(), date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString() },
          { type: "out", timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(), date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString() }
        ],
        [mockEmployeeId2]: [
          { type: "in", timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), date: now.toLocaleDateString() },
          { type: "in", timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 - 8 * 60 * 60 * 1000).toISOString(), date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString() },
          { type: "out", timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(), date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString() }
        ]
      },
      currentUser: {
        id: mockEmployeeId1,
        username: "juan.delacruz"
      }
    };
    localStorage.setItem("saga_data", JSON.stringify(initialData));
  },

  // Get all data
  getData() {
    const data = localStorage.getItem("saga_data");
    return data ? JSON.parse(data) : this.resetData();
  },

  // Save all data
  saveData(data) {
    localStorage.setItem("saga_data", JSON.stringify(data));
  },

  // ============================================================================
  // APPLICANT MANAGEMENT
  // ============================================================================

  addApplicant(name, email, phone, resume, jobId) {
    const data = this.getData();
    const applicant = {
      id: "APP_" + Date.now(),
      name,
      email,
      phone,
      resume,
      jobId,
      status: "applied", // applied, scored, hired, onboarding
      compatibility_score: null,
      extracted_skills: [],
      appliedDate: new Date().toISOString(),
      hireDateApproved: null
    };
    data.applicants.push(applicant);
    this.saveData(data);
    return applicant;
  },

  getApplicants() {
    const data = this.getData();
    return data.applicants;
  },

  getApplicantById(id) {
    const data = this.getData();
    return data.applicants.find(a => a.id === id);
  },

  // Simulate AI resume parsing
  parseAndScoreApplicant(applicantId) {
    const data = this.getData();
    const applicant = data.applicants.find(a => a.id === applicantId);
    if (!applicant) return null;

    // Extract skills from resume text (simple keyword matching)
    const resumeUpper = applicant.resume.toUpperCase();
    const extractedSkills = [];
    let totalScore = 0;

    for (const [skill, weight] of Object.entries(this.skillsKeywords)) {
      if (resumeUpper.includes(skill.toUpperCase())) {
        extractedSkills.push({ skill, weight });
        totalScore += weight;
      }
    }

    // Generate compatibility score (0-100)
    const compatibility_score = Math.min(
      100,
      Math.round(35 + (extractedSkills.length * 8) + (Math.random() * 20))
    );

    applicant.extracted_skills = extractedSkills;
    applicant.compatibility_score = compatibility_score;
    applicant.status = "scored";

    this.saveData(data);
    return applicant;
  },

  // Hire applicant
  hireApplicant(applicantId) {
    const data = this.getData();
    const applicant = data.applicants.find(a => a.id === applicantId);
    if (!applicant) return null;

    applicant.status = "hired";
    applicant.hireDateApproved = new Date().toISOString();

    this.saveData(data);
    return applicant;
  },

  // ============================================================================
  // EMPLOYEE MANAGEMENT
  // ============================================================================

  createEmployee(applicantId, username, password) {
    const data = this.getData();
    const applicant = data.applicants.find(a => a.id === applicantId);
    if (!applicant) return null;

    const employeeId = "EMP_" + Date.now();
    const employee = {
      id: employeeId,
      applicantId,
      name: applicant.name,
      email: applicant.email,
      phone: applicant.phone,
      username,
      password, // In production: use bcrypt
      jobId: applicant.jobId,
      status: "active", // active, on_leave, suspended, pending_exit, separated
      onboardedDate: new Date().toISOString(),
      leaveBalance: {
        vacation: 15,
        sick: 10,
        emergency: 5
      },
      performanceMetrics: {
        rating: 4.2,
        lastReviewDate: new Date().toISOString(),
        projects: 3,
        tasks_completed: 45
      },
      salaryInfo: {
        baseSalary: 35000,
        lastPaymentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        currency: "PHP"
      }
    };

    data.employees[employeeId] = employee;
    applicant.status = "onboarding";

    // Initialize attendance logs for employee
    data.attendanceLogs[employeeId] = [];

    this.saveData(data);
    return employee;
  },

  getEmployeeById(id) {
    const data = this.getData();
    return data.employees[id] || null;
  },

  getEmployeeByUsername(username) {
    const data = this.getData();
    return Object.values(data.employees).find(e => e.username === username) || null;
  },

  getAllEmployees() {
    const data = this.getData();
    return Object.values(data.employees);
  },

  // ============================================================================
  // LEAVE MANAGEMENT
  // ============================================================================

  submitLeaveRequest(employeeId, leaveType, fromDate, toDate, reason) {
    const data = this.getData();
    const employee = data.employees[employeeId];
    if (!employee) return null;

    const days = Math.ceil((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)) + 1;

    if (employee.leaveBalance[leaveType] < days) {
      return { error: "Insufficient leave balance" };
    }

    const leaveRequest = {
      id: "LEAVE_" + Date.now(),
      employeeId,
      leaveType,
      fromDate,
      toDate,
      days,
      reason,
      status: "approved", // For demo: auto-approve
      submittedDate: new Date().toISOString()
    };

    // Deduct from leave balance
    employee.leaveBalance[leaveType] -= days;

    data.leaveRequests.push(leaveRequest);
    this.saveData(data);

    return leaveRequest;
  },

  getLeaveRequests(employeeId) {
    const data = this.getData();
    return data.leaveRequests.filter(l => l.employeeId === employeeId);
  },

  // ============================================================================
  // ATTENDANCE & TIMEKEEPING
  // ============================================================================

  recordTimeEntry(employeeId, type) {
    // type: "in" or "out"
    const data = this.getData();
    if (!data.attendanceLogs[employeeId]) {
      data.attendanceLogs[employeeId] = [];
    }

    const timestamp = new Date().toISOString();
    const entry = {
      type,
      timestamp,
      date: new Date(timestamp).toLocaleDateString()
    };

    data.attendanceLogs[employeeId].push(entry);
    this.saveData(data);

    return entry;
  },

  getAttendanceLogs(employeeId, days = 30) {
    const data = this.getData();
    const logs = data.attendanceLogs[employeeId] || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return logs.filter(log => new Date(log.timestamp) >= cutoffDate);
  },

  // ============================================================================
  // EXIT & OFFBOARDING
  // ============================================================================

  initiateExit(employeeId, reason) {
    const data = this.getData();
    const employee = data.employees[employeeId];
    if (!employee) return null;

    employee.status = "pending_exit";
    employee.exitReason = reason;
    employee.exitInitiatedDate = new Date().toISOString();

    this.saveData(data);
    return employee;
  },

  approveAndArchiveEmployee(employeeId) {
    const data = this.getData();
    const employee = data.employees[employeeId];
    if (!employee) return null;

    employee.status = "separated";
    employee.clearanceApprovedDate = new Date().toISOString();

    // Move to archived employees
    data.archivedEmployees.push({
      ...employee,
      archivedDate: new Date().toISOString()
    });

    // Remove from active employees
    delete data.employees[employeeId];

    this.saveData(data);

    return {
      employeeId,
      certificateOfEmployment: {
        issuedDate: new Date().toISOString(),
        employeeName: employee.name,
        position: "Employee",
        startDate: employee.onboardedDate,
        endDate: new Date().toISOString()
      }
    };
  },

  getPendingExits() {
    const data = this.getData();
    return Object.values(data.employees).filter(e => e.status === "pending_exit");
  },

  getArchivedEmployees() {
    const data = this.getData();
    return data.archivedEmployees;
  },

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  // Get job details
  getJobById(jobId) {
    return this.jobs.find(j => j.id === parseInt(jobId));
  },

  // Get all jobs
  getJobs() {
    return this.jobs;
  },

  // Format date
  formatDate(isoString) {
    return new Date(isoString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Format time
  formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  // Generate payslip
  generatePayslip(employeeId) {
    const employee = this.getEmployeeById(employeeId);
    if (!employee) return null;

    const grossSalary = employee.salaryInfo.baseSalary;
    const sss = Math.round(grossSalary * 0.045); // 4.5%
    const philhealth = Math.round(grossSalary * 0.025); // 2.5%
    const pagibig = Math.round(grossSalary * 0.02); // 2%
    const tax = Math.round(grossSalary * 0.10); // 10% simplified

    const totalDeductions = sss + philhealth + pagibig + tax;
    const netPay = grossSalary - totalDeductions;

    return {
      payslipId: "PAYSLIP_" + Date.now(),
      employeeName: employee.name,
      employeeId: employee.id,
      payPeriod: "Monthly",
      paymentDate: employee.salaryInfo.lastPaymentDate,
      grossSalary,
      deductions: {
        sss,
        philhealth,
        pagibig,
        tax
      },
      totalDeductions,
      netPay,
      currency: employee.salaryInfo.currency
    };
  }
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  SAGA.init();
});
