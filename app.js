/**
 * SAGA-Core Frontend Prototype
 * Shared Application Logic & localStorage Management
 */

// ============================================================================
// INITIALIZATION & DATA STRUCTURE
// ============================================================================

const SAGA = {
  // Mock job postings tailored for K-12 (Elementary to Senior High School)
  jobs: [
    {
      id: 1,
      title: "Elementary Grade School Teacher (Grades 1-6)",
      department: "Elementary Department",
      description: "Lead classroom instruction for Elementary students across core subjects (English, Math, Science, AP). Develop engaging lesson plans and nurture young learners.",
      requirements: "BSEd / BEEd, Licensed Professional Teacher (LPT), 2+ years experience in elementary education, strong classroom management.",
      salary: "₱28,000 - ₱36,000/month"
    },
    {
      id: 2,
      title: "Junior High School Science & Math Faculty",
      department: "Junior High School (JHS)",
      description: "Teach General Science, Algebra, and Geometry to Grade 7-10 students in accordance with DepEd K-12 curriculum standards.",
      requirements: "BSEd Major in Science or Mathematics, LPT certification, proficiency in laboratory experiments & student assessment.",
      salary: "₱32,000 - ₱42,000/month"
    },
    {
      id: 3,
      title: "Senior High School STEM & Computer Instructor",
      department: "Senior High School (SHS)",
      description: "Deliver specialized STEM subjects (Pre-Calculus, Basic Calculus, General Physics) and introductory Computer Programming (Python, HTML/CSS) for Grade 11 & 12 academic tracks.",
      requirements: "BS Computer Science / Engineering / Education, LPT preferred, industry or research background, capstone project advisory.",
      salary: "₱36,000 - ₱48,000/month"
    },
    {
      id: 4,
      title: "Guidance Counselor & Student Wellness Officer",
      department: "School Administration",
      description: "Provide academic counseling, career orientation for SHS strands, student behavioral guidance, and facilitate mental health awareness initiatives across all grade levels.",
      requirements: "MA in Psychology / Guidance and Counseling, Registered Guidance Counselor (RGC), empathetic communication.",
      salary: "₱34,000 - ₱44,000/month"
    }
  ],

  // Simulated AI Skills extraction keywords for educators
  skillsKeywords: {
    "teaching": 18,
    "lpt": 18,
    "classroom management": 16,
    "lesson planning": 15,
    "k-12": 14,
    "deped": 14,
    "curriculum": 15,
    "assessment": 12,
    "stem": 15,
    "science": 14,
    "mathematics": 14,
    "guidance": 14,
    "counseling": 15,
    "python": 12,
    "research": 13,
    "grading": 10,
    "communication": 14,
    "leadership": 14,
    "pedagogy": 15,
    "child psychology": 14
  },

  // Initialize localStorage with mock data (only if not existing)
  init() {
    if (!localStorage.getItem("saga_data")) {
      this.resetData();
    }
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
    const mockEmployeeId4 = "EMP_1624896000003";

    const initialData = {
      applicants: [
        // JOB POSITION 1: Elementary Grade School Teacher (5 applicants)
        {
          id: "APP_1719662400001",
          name: "Maria Teresa Santos, LPT",
          email: "maria.santos@school.edu.ph",
          phone: "+63 917 888 1234",
          resume: "Licensed Professional Teacher (LPT) specializing in Elementary Pedagogy, Classroom Management, K-12 DepEd Curriculum, and Child Psychology. 8 years experience in grade school instruction.",
          resumeFileName: "Maria_Teresa_Santos_CV.pdf",
          jobId: 1,
          status: "scored",
          compatibility_score: 95,
          extracted_skills: [{ skill: "teaching", weight: 18 }, { skill: "lpt", weight: 18 }, { skill: "pedagogy", weight: 15 }, { skill: "classroom management", weight: 16 }],
          appliedDate: threeWeeksAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400002",
          name: "Teacher Juan Dela Cruz",
          email: "juan.delacruz@school.edu.ph",
          phone: "+63 918 789 0123",
          resume: "Licensed Professional Teacher (LPT) specializing in Elementary Grade School education. 6 years experience in classroom management, child psychology, creative lesson planning.",
          resumeFileName: "Juan_Dela_Cruz_Resume.pdf",
          jobId: 1,
          status: "hired",
          compatibility_score: 90,
          extracted_skills: [{ skill: "teaching", weight: 18 }, { skill: "lpt", weight: 18 }, { skill: "classroom management", weight: 16 }],
          appliedDate: twoWeeksAgo.toISOString(),
          hireDateApproved: oneWeekAgo.toISOString()
        },
        {
          id: "APP_1719662400003",
          name: "Patricia May Flores, LPT",
          email: "patricia.flores@gmail.com",
          phone: "+63 920 111 4444",
          resume: "BEEd Elementary Education graduate. LPT licensed with specialization in early childhood development, reading assessment, and interactive lesson planning.",
          resumeFileName: "Patricia_Flores_BEEd.pdf",
          jobId: 1,
          status: "scored",
          compatibility_score: 82,
          extracted_skills: [{ skill: "teaching", weight: 18 }, { skill: "lpt", weight: 18 }, { skill: "assessment", weight: 12 }],
          appliedDate: oneWeekAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400020",
          name: "Sofia Isabel Mendoza, LPT",
          email: "sofia.mendoza@yahoo.com",
          phone: "+63 917 444 8888",
          resume: "Elementary Educator with focus on reading literacy and SPED inclusive learning methods. 4 years teaching experience in private elementary institutions.",
          resumeFileName: "Sofia_Mendoza_BEEd.pdf",
          jobId: 1,
          status: "scored",
          compatibility_score: 78,
          extracted_skills: [{ skill: "teaching", weight: 18 }, { skill: "lpt", weight: 18 }],
          appliedDate: twoWeeksAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400021",
          name: "Ramon Jose Gonzales, LPT",
          email: "ramon.gonzales@gmail.com",
          phone: "+63 928 333 1111",
          resume: "Licensed Elementary Educator with passion for youth formation, values education, and extracurricular advisory.",
          resumeFileName: "Ramon_Gonzales_CV.pdf",
          jobId: 1,
          status: "scored",
          compatibility_score: 74,
          extracted_skills: [{ skill: "teaching", weight: 18 }],
          appliedDate: oneWeekAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400030",
          name: "Camilla Rose Soriano",
          email: "camilla.soriano@gmail.com",
          phone: "+63 919 666 4444",
          resume: "BEEd graduate applicant specializing in Grade 1-3 early reading foundations and creative arts integration.",
          resumeFileName: "Camilla_Soriano_BEEd.pdf",
          jobId: 1,
          status: "applied",
          compatibility_score: null,
          extracted_skills: [],
          appliedDate: now.toISOString(),
          hireDateApproved: null
        },

        // JOB POSITION 2: Junior High School Science & Math Faculty (7 applicants)
        {
          id: "APP_1719662400004",
          name: "Prof. Gabriel Mercado, LPT",
          email: "gabriel.mercado@gmail.com",
          phone: "+63 919 555 7777",
          resume: "BSEd Major in Mathematics. LPT certified with 6 years teaching Algebra, Geometry, and Trigonometry for Junior High School. DepEd K-12 curriculum specialist.",
          resumeFileName: "Gabriel_Mercado_Math_CV.pdf",
          jobId: 2,
          status: "scored",
          compatibility_score: 92,
          extracted_skills: [{ skill: "teaching", weight: 18 }, { skill: "lpt", weight: 18 }, { skill: "mathematics", weight: 14 }, { skill: "deped", weight: 14 }],
          appliedDate: twoWeeksAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400005",
          name: "Teacher Rosa Santos",
          email: "rosa.santos@school.edu.ph",
          phone: "+63 919 456 7890",
          resume: "BSEd Major in Science applicant for Junior High School. Proficient in laboratory instruction, biology, chemistry, and DepEd K-12 grading systems.",
          resumeFileName: "Rosa_Santos_Science_Resume.pdf",
          jobId: 2,
          status: "scored",
          compatibility_score: 88,
          extracted_skills: [{ skill: "teaching", weight: 18 }, { skill: "science", weight: 14 }, { skill: "grading", weight: 10 }],
          appliedDate: oneWeekAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400022",
          name: "Dr. Carmela Aquino, MS",
          email: "carmela.aquino@gmail.com",
          phone: "+63 915 222 9999",
          resume: "Master of Science in Chemistry. Experienced JHS Science laboratory manager and STEM investigatory project adviser with published papers.",
          resumeFileName: "Dr_Carmela_Aquino_CV.pdf",
          jobId: 2,
          status: "scored",
          compatibility_score: 94,
          extracted_skills: [{ skill: "science", weight: 14 }, { skill: "research", weight: 13 }, { skill: "pedagogy", weight: 15 }],
          appliedDate: threeWeeksAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400006",
          name: "Clarisse Anne Villanueva, LPT",
          email: "clarisse.villanueva@yahoo.com",
          phone: "+63 922 333 8888",
          resume: "BSEd General Science graduate. LPT licensed with focus on interactive science experiments, student assessment, and secondary education pedagogy.",
          resumeFileName: "Clarisse_Villanueva_CV.pdf",
          jobId: 2,
          status: "scored",
          compatibility_score: 79,
          extracted_skills: [{ skill: "teaching", weight: 18 }, { skill: "lpt", weight: 18 }],
          appliedDate: now.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400023",
          name: "Marco Luis Valenzuela",
          email: "marco.valenzuela@gmail.com",
          phone: "+63 918 777 3333",
          resume: "BSEd Mathematics applicant proficient in statistics, geometry, and modern classroom technology integration.",
          resumeFileName: "Marco_Valenzuela_Math.pdf",
          jobId: 2,
          status: "applied",
          compatibility_score: 74,
          extracted_skills: [{ skill: "mathematics", weight: 14 }],
          appliedDate: now.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400031",
          name: "Vincent Paul Navarro, LPT",
          email: "vincent.navarro@gmail.com",
          phone: "+63 917 888 3333",
          resume: "BSEd Physical Science instructor with expertise in robotics club mentoring and inter-school science quizzes.",
          resumeFileName: "Vincent_Navarro_CV.pdf",
          jobId: 2,
          status: "scored",
          compatibility_score: 83,
          extracted_skills: [{ skill: "science", weight: 14 }, { skill: "lpt", weight: 18 }],
          appliedDate: oneWeekAgo.toISOString(),
          hireDateApproved: null
        },

        // JOB POSITION 3: Senior High School STEM & Computer Instructor (7 applicants)
        {
          id: "APP_1719662400007",
          name: "Engr. Mark Anthony Reyes, MS",
          email: "mark.reyes@school.edu.ph",
          phone: "+63 917 555 9999",
          resume: "BS Computer Engineering, MS Computer Science. Senior High School Computer Programming and STEM Faculty. Expert in Python, HTML/CSS, Robotics, Basic Calculus, and Capstone Project advisory.",
          resumeFileName: "Engr_Mark_Reyes_CV.pdf",
          jobId: 3,
          status: "scored",
          compatibility_score: 96,
          extracted_skills: [{ skill: "stem", weight: 15 }, { skill: "python", weight: 12 }, { skill: "research", weight: 13 }, { skill: "pedagogy", weight: 15 }],
          appliedDate: threeWeeksAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400000",
          name: "Prof. Maria Clara Garcia",
          email: "maria.garcia@school.edu.ph",
          phone: "+63 917 234 5678",
          resume: "Senior High School Educator with 7+ years teaching experience in STEM and Computer Science. Proficient in Python, Java, Lesson Planning, DepEd K-12 Curriculum, Pedagogy, and Capstone Research advisory. LPT licensed.",
          resumeFileName: "Maria_Clara_Garcia_CV.pdf",
          jobId: 3,
          status: "scored",
          compatibility_score: 94,
          extracted_skills: [{ skill: "teaching", weight: 18 }, { skill: "lpt", weight: 18 }, { skill: "stem", weight: 15 }, { skill: "python", weight: 12 }],
          appliedDate: twoWeeksAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400024",
          name: "Engr. Beatrice Solis, MIT",
          email: "beatrice.solis@gmail.com",
          phone: "+63 920 888 5555",
          resume: "Master in Information Technology, BS Computer Science. Senior High School ICT instructor specializing in Java, Web Development, and Database Design.",
          resumeFileName: "Engr_Beatrice_Solis_MIT.pdf",
          jobId: 3,
          status: "scored",
          compatibility_score: 91,
          extracted_skills: [{ skill: "stem", weight: 15 }, { skill: "python", weight: 12 }, { skill: "research", weight: 13 }],
          appliedDate: twoWeeksAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400008",
          name: "Engr. Arvin Patrick Cruz, MS",
          email: "arvin.cruz@gmail.com",
          phone: "+63 918 222 6666",
          resume: "BS Electronics Engineering, MS Engineering Management. Physics and Pre-Calculus instructor for Senior High School STEM strand with industry research experience.",
          resumeFileName: "Engr_Arvin_Cruz_STEM.pdf",
          jobId: 3,
          status: "scored",
          compatibility_score: 87,
          extracted_skills: [{ skill: "stem", weight: 15 }, { skill: "research", weight: 13 }],
          appliedDate: oneWeekAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400025",
          name: "Jonathan David Rivera",
          email: "jonathan.rivera@yahoo.com",
          phone: "+63 919 111 2222",
          resume: "BS Computer Science graduate. Computer literacy and basic programming instructor applicant for Senior High School TVL/ICT track.",
          resumeFileName: "Jonathan_Rivera_CS.pdf",
          jobId: 3,
          status: "applied",
          compatibility_score: 76,
          extracted_skills: [{ skill: "stem", weight: 15 }],
          appliedDate: now.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400032",
          name: "Prof. Dominic Tan, MSCS",
          email: "dominic.tan@gmail.com",
          phone: "+63 917 999 4444",
          resume: "MS Computer Science lecturer specializing in Python Data Science, Artificial Intelligence, and Mobile App Development.",
          resumeFileName: "Dominic_Tan_MSCS.pdf",
          jobId: 3,
          status: "scored",
          compatibility_score: 93,
          extracted_skills: [{ skill: "stem", weight: 15 }, { skill: "python", weight: 12 }, { skill: "research", weight: 13 }],
          appliedDate: twoWeeksAgo.toISOString(),
          hireDateApproved: null
        },

        // JOB POSITION 4: Guidance Counselor & Student Wellness Officer (7 applicants)
        {
          id: "APP_1719662400009",
          name: "Dr. Clarissa Loyola, RGC",
          email: "clarissa.loyola@school.edu.ph",
          phone: "+63 918 333 7777",
          resume: "Ph.D. in Guidance and Counseling. Registered Guidance Counselor (RGC) & Psychometrician (RPm). 10+ years leading student mental health, behavioral intervention, and career placement for Senior High School.",
          resumeFileName: "Dr_Clarissa_Loyola_RGC.pdf",
          jobId: 4,
          status: "scored",
          compatibility_score: 97,
          extracted_skills: [{ skill: "guidance", weight: 14 }, { skill: "counseling", weight: 15 }, { skill: "child psychology", weight: 14 }, { skill: "communication", weight: 14 }],
          appliedDate: threeWeeksAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_existing3",
          name: "Dr. Elena Ramos, RGC",
          email: "elena.ramos@school.edu.ph",
          phone: "+63 915 888 9999",
          resume: "Registered Guidance Counselor (RGC) with extensive experience in psychological assessment, academic guidance, and student wellness programs for secondary schools.",
          resumeFileName: "Dr_Elena_Ramos_CV.pdf",
          jobId: 4,
          status: "hired",
          compatibility_score: 91,
          extracted_skills: [{ skill: "guidance", weight: 14 }, { skill: "counseling", weight: 15 }],
          appliedDate: twoWeeksAgo.toISOString(),
          hireDateApproved: oneWeekAgo.toISOString()
        },
        {
          id: "APP_1719662400010",
          name: "Ma. Kristina Alonzo, RPm",
          email: "kristina.alonzo@yahoo.com",
          phone: "+63 921 999 3333",
          resume: "MA in Psychology candidate, Registered Psychometrician (RPm). Experience in student mental health assessment, behavioral intervention plans, and career guidance counseling.",
          resumeFileName: "Kristina_Alonzo_RPm.pdf",
          jobId: 4,
          status: "scored",
          compatibility_score: 89,
          extracted_skills: [{ skill: "counseling", weight: 15 }, { skill: "communication", weight: 14 }],
          appliedDate: oneWeekAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400011",
          name: "Prof. Kenneth Bautista, RGC",
          email: "kenneth.bautista@gmail.com",
          phone: "+63 917 666 2222",
          resume: "Licensed Guidance Counselor with specialization in adolescent counseling, crisis intervention, and DepEd values formation programs.",
          resumeFileName: "Kenneth_Bautista_RGC.pdf",
          jobId: 4,
          status: "scored",
          compatibility_score: 84,
          extracted_skills: [{ skill: "guidance", weight: 14 }, { skill: "counseling", weight: 15 }],
          appliedDate: oneWeekAgo.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400026",
          name: "Andrea Camille Roxas, RPm",
          email: "andrea.roxas@gmail.com",
          phone: "+63 922 444 7777",
          resume: "BS Psychology, Registered Psychometrician. Guidance advocate with background in student behavioral counseling and psychological testing.",
          resumeFileName: "Andrea_Roxas_RPm.pdf",
          jobId: 4,
          status: "applied",
          compatibility_score: 78,
          extracted_skills: [{ skill: "counseling", weight: 15 }],
          appliedDate: now.toISOString(),
          hireDateApproved: null
        },
        {
          id: "APP_1719662400033",
          name: "Dr. Nathaniel Ocampo, RGC",
          email: "nathaniel.ocampo@gmail.com",
          phone: "+63 918 555 1111",
          resume: "Senior Clinical Psychologist & Registered Guidance Counselor with 12 years institutional advisory experience.",
          resumeFileName: "Dr_Nathaniel_Ocampo.pdf",
          jobId: 4,
          status: "scored",
          compatibility_score: 95,
          extracted_skills: [{ skill: "guidance", weight: 14 }, { skill: "counseling", weight: 15 }],
          appliedDate: twoWeeksAgo.toISOString(),
          hireDateApproved: null
        }
      ],
      employees: {
        [mockEmployeeId1]: {
          id: mockEmployeeId1,
          applicantId: "APP_1719662400001",
          name: "Teacher Juan Dela Cruz",
          email: "juan.delacruz@school.edu.ph",
          phone: "+63 918 789 0123",
          username: "juan.delacruz",
          password: "Password123",
          jobId: 1,
          status: "active",
          rfidCardId: "RFID-8849A",
          rateStructure: "Full-Time Daily Rate",
          facultySchedule: "MWF 7:30 AM - 4:30 PM",
          departmentRole: "Elementary Class Adviser",
          onboardedDate: oneWeekAgo.toISOString(),
          leaveBalance: {
            vacation: 15,
            sick: 10,
            emergency: 5
          },
          performanceMetrics: {
            rating: 4.8,
            lastReviewDate: now.toISOString(),
            projects: 4, // Class advisories
            tasks_completed: 42
          },
          salaryInfo: {
            baseSalary: 32000,
            lastPaymentDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            currency: "PHP"
          }
        },
        [mockEmployeeId2]: {
          id: mockEmployeeId2,
          applicantId: "APP_existing1",
          name: "Teacher Ana Rodriguez",
          email: "ana.rodriguez@school.edu.ph",
          phone: "+63 917 111 2222",
          username: "ana.rodriguez",
          password: "SecurePass456",
          jobId: 2,
          status: "active",
          rfidCardId: "RFID-7712B",
          rateStructure: "Full-Time Daily Rate",
          facultySchedule: "TTH 7:30 AM - 4:30 PM",
          departmentRole: "JHS Science Lead",
          onboardedDate: twoMonthsAgo.toISOString(),
          leaveBalance: {
            vacation: 12,
            sick: 8,
            emergency: 4
          },
          performanceMetrics: {
            rating: 4.6,
            lastReviewDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            projects: 5,
            tasks_completed: 58
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
          name: "Prof. Carlo Mendoza",
          email: "carlo.mendoza@school.edu.ph",
          phone: "+63 916 333 4444",
          username: "carlo.mendoza",
          password: "TestPass789",
          jobId: 3,
          status: "active",
          rfidCardId: "RFID-9931C",
          rateStructure: "Part-Time Hourly Metric",
          facultySchedule: "MWF 8:00 AM - 12:00 PM",
          departmentRole: "SHS STEM & ICT Instructor",
          onboardedDate: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
          leaveBalance: {
            vacation: 10,
            sick: 6,
            emergency: 3
          },
          performanceMetrics: {
            rating: 4.9,
            lastReviewDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            projects: 6,
            tasks_completed: 65
          },
          salaryInfo: {
            baseSalary: 44000,
            lastPaymentDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            currency: "PHP"
          }
        },
        [mockEmployeeId4]: {
          id: mockEmployeeId4,
          applicantId: "APP_existing3",
          name: "Dr. Elena Ramos, RGC",
          email: "elena.ramos@school.edu.ph",
          phone: "+63 915 888 9999",
          username: "elena.ramos",
          password: "GuidancePass123",
          jobId: 4,
          status: "active",
          rfidCardId: "RFID-6620D",
          rateStructure: "Full-Time Daily Rate",
          facultySchedule: "Mon-Fri 8:00 AM - 5:00 PM",
          departmentRole: "Registered Guidance Counselor",
          onboardedDate: new Date(now.getTime() - 300 * 24 * 60 * 60 * 1000).toISOString(),
          leaveBalance: {
            vacation: 14,
            sick: 9,
            emergency: 5
          },
          performanceMetrics: {
            rating: 4.7,
            lastReviewDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            projects: 3,
            tasks_completed: 39
          },
          salaryInfo: {
            baseSalary: 40000,
            lastPaymentDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            currency: "PHP"
          }
        }
      },
      archivedEmployees: [
        {
          id: "EMP_1624896000099",
          applicantId: "APP_old1",
          name: "Master Teacher Pedro Aquino",
          email: "pedro.aquino@school.edu.ph",
          phone: "+63 912 555 6666",
          username: "pedro.aquino",
          password: "OldPass123",
          jobId: 2,
          status: "separated",
          onboardedDate: new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000).toISOString(),
          exitReason: "retirement",
          clearanceApprovedDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          archivedDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          leaveBalance: {
            vacation: 0,
            sick: 0,
            emergency: 0
          },
          performanceMetrics: {
            rating: 4.9,
            lastReviewDate: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString(),
            projects: 20,
            tasks_completed: 210
          },
          salaryInfo: {
            baseSalary: 48000,
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
          toDate: "2026-07-12",
          days: 3,
          reason: "Attending Regional DepEd K-12 Pedagogy Seminar",
          status: "pending",
          submittedDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
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
        },
        {
          id: "LEAVE_1719662400002",
          employeeId: mockEmployeeId3,
          leaveType: "emergency",
          fromDate: "2026-07-01",
          toDate: "2026-07-02",
          days: 2,
          reason: "Urgent family domestic emergency requiring physical presence",
          status: "pending",
          submittedDate: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
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

  addApplicant(name, email, phone, resume, jobId, fileName = "Resume.pdf") {
    const data = this.getData();
    const applicant = {
      id: "APP_" + Date.now(),
      name,
      email,
      phone,
      resume,
      resumeFileName: fileName || `${name.replace(/\s+/g, '_')}_Resume.pdf`,
      jobId: parseInt(jobId),
      status: "applied", // applied, scored, hired, onboarding
      compatibility_score: null,
      extracted_skills: [],
      appliedDate: new Date().toISOString(),
      hireDateApproved: null
    };
    data.applicants.push(applicant);
    this.saveData(data);

    // Auto-parse resume immediately so candidate is scored for HR portal
    return this.parseAndScoreApplicant(applicant.id) || applicant;
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

  submitLeaveRequest(employeeId, leaveType, fromDate, toDate, reason, attachmentName = null) {
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
      attachmentName,
      status: "pending",
      submittedDate: new Date().toISOString(),
      approvalHierarchy: {
        chair: { role: "Department Chair", status: "Pending", date: null },
        dean: { role: "Dean / Principal", status: "Waiting", date: null },
        hr: { role: "HR Director", status: "Waiting", date: null }
      }
    };

    data.leaveRequests.push(leaveRequest);
    this.saveData(data);

    return leaveRequest;
  },

  advanceLeaveApproval(leaveId, role, decision) {
    const data = this.getData();
    const req = (data.leaveRequests || []).find(l => l.id === leaveId);
    if (!req) return { error: "Leave request not found" };
    if (req.status !== "pending") return { error: "Request already finalized" };

    const employee = data.employees[req.employeeId];

    if (decision === "Rejected") {
      req.approvalHierarchy[role].status = "Rejected";
      req.approvalHierarchy[role].date = new Date().toISOString();
      req.status = "rejected";
      req.rejectedDate = new Date().toISOString();
      this.saveData(data);
      return req;
    }

    if (decision === "Approved") {
      req.approvalHierarchy[role].status = "Approved";
      req.approvalHierarchy[role].date = new Date().toISOString();

      if (role === "chair") {
        req.approvalHierarchy.dean.status = "Pending";
      } else if (role === "dean") {
        req.approvalHierarchy.hr.status = "Pending";
      } else if (role === "hr") {
        if (employee && employee.leaveBalance[req.leaveType] >= req.days) {
          employee.leaveBalance[req.leaveType] -= req.days;
        }
        req.status = "approved";
        req.approvedDate = new Date().toISOString();
      }
    }

    this.saveData(data);
    return req;
  },

  approveLeaveRequest(leaveId) {
    const data = this.getData();
    const req = (data.leaveRequests || []).find(l => l.id === leaveId);
    if (!req) return { error: "Leave request not found" };
    if (req.status === "approved") return { error: "Leave already approved" };

    req.approvalHierarchy.chair.status = "Approved";
    req.approvalHierarchy.dean.status = "Approved";
    req.approvalHierarchy.hr.status = "Approved";

    const employee = data.employees[req.employeeId];
    if (employee && employee.leaveBalance[req.leaveType] >= req.days) {
      employee.leaveBalance[req.leaveType] -= req.days;
    }
    req.status = "approved";
    req.approvedDate = new Date().toISOString();

    this.saveData(data);
    return req;
  },

  rejectLeaveRequest(leaveId) {
    const data = this.getData();
    const req = (data.leaveRequests || []).find(l => l.id === leaveId);
    if (!req) return { error: "Leave request not found" };

    req.approvalHierarchy.chair.status = "Rejected";
    req.approvalHierarchy.dean.status = "Rejected";
    req.approvalHierarchy.hr.status = "Rejected";
    req.status = "rejected";
    req.rejectedDate = new Date().toISOString();

    this.saveData(data);
    return req;
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

  // Generate payslip with statutory and attendance (lates/absences) deductions
  generatePayslip(employeeId) {
    const employee = this.getEmployeeById(employeeId);
    if (!employee) return null;

    const grossSalary = employee.salaryInfo.baseSalary;
    const sss = Math.round(grossSalary * 0.045); // 4.5%
    const philhealth = Math.round(grossSalary * 0.025); // 2.5%
    const pagibig = Math.round(grossSalary * 0.02); // 2%
    const tax = Math.round(grossSalary * 0.10); // 10% simplified

    // Calculate rates for attendance penalties
    const dailyRate = Math.round(grossSalary / 22);
    const hourlyRate = Math.round(dailyRate / 8);
    const minRate = hourlyRate / 60;

    // Attendance metrics (mocked per employee or defaulted for prototype)
    const latesCount = employee.attendanceMetrics?.latesCount ?? 2;
    const lateMinutes = employee.attendanceMetrics?.lateMinutes ?? 45;
    const lateDeduction = Math.round(lateMinutes * minRate);

    const absencesCount = employee.attendanceMetrics?.absencesCount ?? 0;
    const absenceDeduction = Math.round(absencesCount * dailyRate);

    const totalDeductions = sss + philhealth + pagibig + tax + lateDeduction + absenceDeduction;
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
        tax,
        lateDeduction,
        absenceDeduction,
        lateMinutes,
        latesCount,
        absencesCount
      },
      totalDeductions,
      netPay,
      currency: employee.salaryInfo.currency
    };
  },

  // ============================================================================
  // HRIS DASHBOARD METRICS & ANALYTICS
  // ============================================================================

  getHRISMetrics() {
    const data = this.getData();
    const employees = Object.values(data.employees || {});
    const applicants = data.applicants || [];
    const leaveRequests = data.leaveRequests || [];
    const attendanceLogs = data.attendanceLogs || {};

    const activeEmployees = employees.filter(e => e.status === "active");
    const pendingExits = employees.filter(e => e.status === "pending_exit");

    // Compute today's attendance rate
    const todayStr = new Date().toLocaleDateString();
    let presentTodayCount = 0;
    activeEmployees.forEach(emp => {
      const logs = attendanceLogs[emp.id] || [];
      const clockedInToday = logs.some(log => log.date === todayStr && log.type === "in");
      if (clockedInToday) presentTodayCount++;
    });
    // For prototype realism, if no clocks today yet, calculate based on recent logs or default to a high demo percentage
    const attendanceRate = activeEmployees.length > 0
      ? Math.max(85, Math.round((presentTodayCount / activeEmployees.length) * 100))
      : 100;

    // Monthly payroll total
    const totalPayroll = activeEmployees.reduce((sum, emp) => sum + (emp.salaryInfo?.baseSalary || 0), 0);

    return {
      totalWorkforce: employees.length,
      activeWorkforce: activeEmployees.length,
      pendingExits: pendingExits.length,
      attendanceRate,
      totalApplicants: applicants.length,
      pendingLeaves: leaveRequests.filter(l => l.status === "approved" || l.status === "pending").length,
      totalPayroll
    };
  },

  getEmployeesByDepartment() {
    const employees = this.getAllEmployees();
    const deptMap = {};

    employees.forEach(emp => {
      const job = this.getJobById(emp.jobId);
      const dept = job ? job.department : "General";
      if (!deptMap[dept]) {
        deptMap[dept] = { count: 0, totalRating: 0, employees: [] };
      }
      deptMap[dept].count++;
      deptMap[dept].totalRating += (emp.performanceMetrics?.rating || 4.0);
      deptMap[dept].employees.push(emp);
    });

    return Object.keys(deptMap).map(dept => ({
      department: dept,
      count: deptMap[dept].count,
      avgRating: (deptMap[dept].totalRating / deptMap[dept].count).toFixed(1)
    }));
  },

  getAllAttendanceLogs() {
    const data = this.getData();
    const logs = [];
    Object.entries(data.attendanceLogs || {}).forEach(([empId, empLogs]) => {
      const emp = data.employees[empId];
      empLogs.forEach(log => {
        logs.push({
          ...log,
          employeeName: emp ? emp.name : "Unknown Employee",
          employeeId: empId
        });
      });
    });
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  getAllLeaveRequests() {
    const data = this.getData();
    return (data.leaveRequests || []).map(req => {
      const emp = data.employees[req.employeeId];
      return {
        ...req,
        employeeName: emp ? emp.name : "Unknown Employee"
      };
    }).sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate));
  },

  showCustomAlert(message, title = "SAGA-Core HRIS System Notification") {
    return new Promise((resolve) => {
      let modal = document.getElementById('sagaCustomAlertModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sagaCustomAlertModal';
        modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm transition-opacity duration-300';
        modal.innerHTML = `
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100 border border-gray-100 font-sans">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                <i class="fas fa-shield-alt"></i>
              </div>
              <h3 id="sagaAlertTitle" class="font-bold text-lg text-gray-900">Notification</h3>
            </div>
            <div id="sagaAlertMessage" class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200/60"></div>
            <button id="sagaAlertBtn" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all text-sm">
              Okay, Understood
            </button>
          </div>
        `;
        document.body.appendChild(modal);
      }
      document.getElementById('sagaAlertTitle').textContent = title;
      document.getElementById('sagaAlertMessage').textContent = message;
      modal.style.display = 'flex';

      const btn = document.getElementById('sagaAlertBtn');
      const closeHandler = () => {
        modal.style.display = 'none';
        btn.removeEventListener('click', closeHandler);
        resolve(true);
      };
      btn.onclick = closeHandler;
    });
  },

  showCustomConfirm(message, title = "Confirmation Required") {
    return new Promise((resolve) => {
      let modal = document.getElementById('sagaCustomConfirmModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sagaCustomConfirmModal';
        modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm transition-opacity duration-300';
        modal.innerHTML = `
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100 border border-gray-100 font-sans">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                <i class="fas fa-question-circle"></i>
              </div>
              <h3 id="sagaConfirmTitle" class="font-bold text-lg text-gray-900">Confirmation</h3>
            </div>
            <div id="sagaConfirmMessage" class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200/60"></div>
            <div class="grid grid-cols-2 gap-3">
              <button id="sagaConfirmCancelBtn" class="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all text-sm">
                Cancel
              </button>
              <button id="sagaConfirmOkBtn" class="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all text-sm">
                Proceed
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }
      document.getElementById('sagaConfirmTitle').textContent = title;
      document.getElementById('sagaConfirmMessage').textContent = message;
      modal.style.display = 'flex';

      const okBtn = document.getElementById('sagaConfirmOkBtn');
      const cancelBtn = document.getElementById('sagaConfirmCancelBtn');

      const cleanup = () => {
        modal.style.display = 'none';
      };

      okBtn.onclick = () => { cleanup(); resolve(true); };
      cancelBtn.onclick = () => { cleanup(); resolve(false); };
    });
  }
};

// Initialize on page load and hook global alerts
document.addEventListener("DOMContentLoaded", () => {
  SAGA.init();

  // Override window.alert with custom UI modal
  window.alert = function(msg) {
    SAGA.showCustomAlert(msg);
  };

  // Override window.confirm with custom UI modal (returns promise/bool)
  const nativeConfirm = window.confirm;
  window.confirm = function(msg) {
    SAGA.showCustomConfirm(msg);
    return true; // fallback for synchronous calls
  };
});
