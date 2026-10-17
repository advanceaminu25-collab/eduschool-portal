"use strict";

/*
 * EduCore School Portal
 * Static demonstration version for GitHub Pages.
 *
 * Storage: localStorage in the current browser only.
 * Not suitable for confidential or production school data.
 */

const STORAGE_KEY = "educore-premium-demo-v1";

const DEFAULT_DATA = {
  students: [],
  teachers: [],
  attendance: {},
  results: [],
  fees: [],
  announcements: [],
  selectedPlan: "Trial",
  settings: {
    schoolName: "Crestfield Academy",
    schoolEmail: "",
    academicSession: "2026/2027",
    academicTerm: "First Term",
    schoolAddress: "",
    schoolPhone: ""
  }
};

const PAGE_TITLES = {
  dashboard: ["Dashboard Overview", "Overview"],
  students: ["Student Management", "Students"],
  teachers: ["Teachers & Staff", "Teachers & Staff"],
  academics: ["Classes & Subjects", "Academics"],
  attendance: ["Attendance Management", "Attendance"],
  exams: ["Exams & Results", "Exams & Results"],
  fees: ["Fees & Payments", "Fees & Payments"],
  communication: ["Communication Centre", "Communication"],
  subscriptions: ["EduCore Subscription", "Subscription"],
  settings: ["School Settings", "Settings"]
};

let data = loadData();
let editingStudentId = null;
let editingTeacherId = null;
let toastTimeout = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(DEFAULT_DATA);

    const saved = JSON.parse(raw);

    return {
      ...clone(DEFAULT_DATA),
      ...saved,
      students: Array.isArray(saved.students) ? saved.students : [],
      teachers: Array.isArray(saved.teachers) ? saved.teachers : [],
      attendance: saved.attendance && typeof saved.attendance === "object"
        ? saved.attendance : {},
      results: Array.isArray(saved.results) ? saved.results : [],
      fees: Array.isArray(saved.fees) ? saved.fees : [],
      announcements: Array.isArray(saved.announcements)
        ? saved.announcements : [],
      settings: {
        ...DEFAULT_DATA.settings,
        ...(saved.settings || {})
      },
      selectedPlan: saved.selectedPlan || "Trial"
    };
  } catch (error) {
    console.error("EduCore data could not be loaded:", error);
    return clone(DEFAULT_DATA);
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    updateDashboard();
    return true;
  } catch (error) {
    console.error("EduCore data could not be saved:", error);
    showToast("Could not save data. Check browser storage.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function newId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function today() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function money(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function studentById(id) {
  return data.students.find(student => student.id === id);
}

function gradeFor(score) {
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 45) return "D";
  if (score >= 40) return "E";
  return "F";
}

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

/* --------------------------------
   NAVIGATION: MENU BUTTONS
--------------------------------- */

function showPage(pageName) {
  if (!PAGE_TITLES[pageName]) pageName = "dashboard";

  $$(".page").forEach(page => {
    page.classList.toggle("active", page.id === `page-${pageName}`);
  });

  $$("#main-nav [data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });

  setText("#page-heading", PAGE_TITLES[pageName][0]);
  setText("#breadcrumb", PAGE_TITLES[pageName][1]);

  $("#sidebar")?.classList.remove("open");

  if (pageName === "students") renderStudents();
  if (pageName === "teachers") renderTeachers();
  if (pageName === "attendance") renderAttendance();
  if (pageName === "exams") {
    populateStudentSelect("#result-student");
    renderResults();
  }
  if (pageName === "fees") {
    populateStudentSelect("#fee-student");
    renderFees();
  }
  if (pageName === "communication") renderAnnouncements();
}

function setupNavigation() {
  $("#main-nav")?.addEventListener("click", event => {
    const button = event.target.closest("[data-page]");
    if (button) showPage(button.dataset.page);
  });

  document.addEventListener("click", event => {
    const link = event.target.closest("[data-go]");
    if (link) showPage(link.dataset.go);
  });

  $("#mobile-menu")?.addEventListener("click", () => {
    $("#sidebar")?.classList.toggle("open");
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      $("#sidebar")?.classList.remove("open");
    }
  });
}

/* --------------------------------
   DASHBOARD
--------------------------------- */

function updateDashboard() {
  setText("#stat-students", data.students.length);
  setText("#stat-teachers", data.teachers.length);
  setText("#stat-results", data.results.length);
  setText("#notification-count", data.announcements.length);

  const todayRecords = data.attendance[today()] || {};
  const statuses = Object.values(todayRecords);

  const present = statuses.filter(status => status === "Present").length;
  const absent = statuses.filter(status => status === "Absent").length;
  const late = statuses.filter(status => status === "Late").length;
  const excused = statuses.filter(status => status === "Excused").length;

  setText("#stat-present", present);
  setText(
    "#attendance-summary",
    statuses.length
      ? `${present} present · ${absent} absent · ${late + excused} other`
      : "Attendance not yet recorded"
  );

  setText("#student-total", data.students.length);
  setText(
    "#student-classes",
    new Set(data.students.map(student => student.className)).size
  );
  setText(
    "#student-contacts",
    data.students.filter(student => student.parentPhone || student.parentEmail).length
  );
  setText("#teacher-count-label", `${data.teachers.length} staff records`);
  setText("#student-count-label", `${data.students.length} student records`);
  setText("#results-count-label", `${data.results.length} results`);

  const sidebarName = $("#sidebar-school-name");
  if (sidebarName) {
    sidebarName.textContent = data.settings.schoolName || "My School";
  }

  setText(
    "#session-display",
    `${data.settings.academicSession || "Academic session"} · ${data.settings.academicTerm || "Term"}`
  );

  setText("#current-plan", data.selectedPlan);

  renderRecentStudents();
  renderDashboardAnnouncements();
  renderAttendanceHistory();
  renderFeesSummary();
}

function renderRecentStudents() {
  const tbody = $("#recent-students");
  if (!tbody) return;

  const recent = [...data.students].reverse().slice(0, 5);

  tbody.innerHTML = recent.length
    ? recent.map(student => `
        <tr>
          <td>${escapeHTML(student.name)}</td>
          <td>${escapeHTML(student.id)}</td>
          <td>${escapeHTML(student.className)}</td>
          <td><span class="status-badge">Registered</span></td>
        </tr>
      `).join("")
    : `<tr><td colspan="4" class="empty-state">No students registered yet.</td></tr>`;
}

function renderDashboardAnnouncements() {
  const container = $("#dashboard-announcements");
  if (!container) return;

  const latest = [...data.announcements].reverse().slice(0, 3);

  container.innerHTML = latest.length
    ? latest.map(item => `
        <article class="announcement-item">
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.message)}</p>
          <small>Published ${escapeHTML(formatDate(item.date))}</small>
        </article>
      `).join("")
    : `<p class="empty-state">No announcements published yet.</p>`;
}

/* --------------------------------
   STUDENTS
--------------------------------- */

function toggleStudentForm(show) {
  $("#student-form-panel")?.classList.toggle("hidden", !show);
  if (show) $("#student-name")?.focus();
}

function resetStudentForm() {
  $("#student-form")?.reset();
  editingStudentId = null;
  setText("#student-form-title", "Register a student");
  const submit = $("#student-form button[type='submit']");
  if (submit) submit.textContent = "Save Student";
}

function renderStudentClassFilter() {
  const select = $("#student-class-filter");
  if (!select) return;

  const selected = select.value;
  const classes = [...new Set(data.students.map(s => s.className))]
    .filter(Boolean)
    .sort();

  select.innerHTML = `<option value="">All classes</option>` +
    classes.map(name => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join("");

  if (classes.includes(selected)) select.value = selected;
}

function renderStudents() {
  const tbody = $("#students-table");
  if (!tbody) return;

  renderStudentClassFilter();

  const term = ($("#student-search")?.value || "").trim().toLowerCase();
  const classFilter = $("#student-class-filter")?.value || "";

  const filtered = data.students.filter(student => {
    const haystack = [
      student.id, student.name, student.className,
      student.parentName, student.parentPhone, student.parentEmail
    ].join(" ").toLowerCase();

    return haystack.includes(term) &&
      (!classFilter || student.className === classFilter);
  });

  tbody.innerHTML = filtered.length
    ? filtered.map(student => `
        <tr>
          <td>${escapeHTML(student.id)}</td>
          <td>${escapeHTML(student.name)}</td>
          <td>${escapeHTML(student.className)}</td>
          <td>${escapeHTML(student.parentPhone || student.parentEmail || "—")}</td>
          <td>
            <button class="action-button" type="button" data-edit-student="${escapeHTML(student.id)}">Edit</button>
            <button class="action-button danger" type="button" data-delete-student="${escapeHTML(student.id)}">Delete</button>
          </td>
        </tr>
      `).join("")
    : `<tr><td colspan="5" class="empty-state">${term || classFilter ? "No matching students." : "No student records yet."}</td></tr>`;

  populateStudentSelect("#result-student");
  populateStudentSelect("#fee-student");
  updateDashboard();
}

function setupStudents() {
  $("#toggle-student-form")?.addEventListener("click", () => {
    toggleStudentForm($("#student-form-panel")?.classList.contains("hidden"));
  });

  $("#cancel-student")?.addEventListener("click", () => {
    resetStudentForm();
    toggleStudentForm(false);
  });

  $("#student-form-cancel")?.addEventListener("click", () => {
    resetStudentForm();
    toggleStudentForm(false);
  });

  $("#student-search")?.addEventListener("input", renderStudents);
  $("#student-class-filter")?.addEventListener("change", renderStudents);

  $("#student-form")?.addEventListener("submit", event => {
    event.preventDefault();

    const student = {
      id: $("#student-id").value.trim(),
      name: $("#student-name").value.trim(),
      className: $("#student-class").value,
      gender: $("#student-gender").value,
      dob: $("#student-dob").value,
      parentName: $("#parent-name").value.trim(),
      parentPhone: $("#parent-phone").value.trim(),
      parentEmail: $("#parent-email").value.trim()
    };

    if (!student.id || !student.name || !student.className) {
      showToast("Complete all required student fields.");
      return;
    }

    const duplicate = data.students.some(item =>
      item.id.toLowerCase() === student.id.toLowerCase() &&
      item.id !== editingStudentId
    );

    if (duplicate) {
      showToast("That student ID already exists.");
      return;
    }

    if (editingStudentId) {
      const index = data.students.findIndex(item => item.id === editingStudentId);
      if (index < 0) {
        showToast("Student record not found.");
        return;
      }

      const oldId = data.students[index].id;
      student.createdAt = data.students[index].createdAt;
      data.students[index] = student;

      if (oldId !== student.id) {
        Object.keys(data.attendance).forEach(date => {
          if (data.attendance[date][oldId] !== undefined) {
            data.attendance[date][student.id] = data.attendance[date][oldId];
            delete data.attendance[date][oldId];
          }
        });

        data.results.forEach(result => {
          if (result.studentId === oldId) result.studentId = student.id;
        });

        data.fees.forEach(fee => {
          if (fee.studentId === oldId) fee.studentId = student.id;
        });
      }
    } else {
      student.createdAt = new Date().toISOString();
      data.students.push(student);
    }

    if (!saveData()) return;

    resetStudentForm();
    toggleStudentForm(false);
    renderStudents();
    renderAttendance();
    renderResults();
    renderFees();

    showToast("Student record saved successfully.");
  });

  $("#students-table")?.addEventListener("click", event => {
    const edit = event.target.closest("[data-edit-student]");
    const remove = event.target.closest("[data-delete-student]");

    if (edit) {
      const student = studentById(edit.dataset.editStudent);
      if (!student) return;

      editingStudentId = student.id;
      $("#student-id").value = student.id;
      $("#student-name").value = student.name;
      $("#student-class").value = student.className;
      $("#student-gender").value = student.gender || "";
      $("#student-dob").value = student.dob || "";
      $("#parent-name").value = student.parentName || "";
      $("#parent-phone").value = student.parentPhone || "";
      $("#parent-email").value = student.parentEmail || "";

      setText("#student-form-title", "Edit student record");
      const submit = $("#student-form button[type='submit']");
      if (submit) submit.textContent = "Update Student";

      toggleStudentForm(true);
      $("#student-form-panel")?.scrollIntoView({ behavior: "smooth" });
    }

    if (remove) {
      const id = remove.dataset.deleteStudent;
      const student = studentById(id);
      if (!student) return;

      if (!confirm(`Delete ${student.name} and their linked attendance, results, and fee records?`)) return;

      data.students = data.students.filter(item => item.id !== id);

      Object.keys(data.attendance).forEach(date => {
        delete data.attendance[date][id];
        if (!Object.keys(data.attendance[date]).length) delete data.attendance[date];
      });

      data.results = data.results.filter(item => item.studentId !== id);
      data.fees = data.fees.filter(item => item.studentId !== id);

      if (!saveData()) return;

      renderStudents();
      renderAttendance();
      renderResults();
      renderFees();
      showToast("Student and linked demo records deleted.");
    }
  });
}

/* --------------------------------
   TEACHERS AND STAFF
--------------------------------- */

function setupTeachers() {
  $("#toggle-teacher-form")?.addEventListener("click", () => {
    $("#teacher-form-panel")?.classList.toggle("hidden");
    $("#teacher-name")?.focus();
  });

  $("#cancel-teacher")?.addEventListener("click", () => {
    $("#teacher-form")?.reset();
    editingTeacherId = null;
    $("#teacher-form-panel")?.classList.add("hidden");
  });

  $("#teacher-search")?.addEventListener("input", renderTeachers);

  $("#teacher-form")?.addEventListener("submit", event => {
    event.preventDefault();

    const staff = {
      id: $("#teacher-id").value.trim(),
      name: $("#teacher-name").value.trim(),
      department: $("#teacher-department").value.trim(),
      email: $("#teacher-email").value.trim()
    };

    if (!staff.id || !staff.name) {
      showToast("Enter the staff ID and name.");
      return;
    }

    const duplicate = data.teachers.some(item =>
      item.id.toLowerCase() === staff.id.toLowerCase() &&
      item.id !== editingTeacherId
    );

    if (duplicate) {
      showToast("That staff ID already exists.");
      return;
    }

    if (editingTeacherId) {
      const index = data.teachers.findIndex(item => item.id === editingTeacherId);
      if (index < 0) return;
      data.teachers[index] = staff;
    } else {
      data.teachers.push(staff);
    }

    if (!saveData()) return;

    $("#teacher-form").reset();
    editingTeacherId = null;
    $("#teacher-form-panel")?.classList.add("hidden");
    renderTeachers();
    showToast("Staff record saved.");
  });

  $("#teachers-table")?.addEventListener("click", event => {
    const edit = event.target.closest("[data-edit-teacher]");
    const remove = event.target.closest("[data-delete-teacher]");

    if (edit) {
      const staff = data.teachers.find(item => item.id === edit.dataset.editTeacher);
      if (!staff) return;

      editingTeacherId = staff.id;
      $("#teacher-id").value = staff.id;
      $("#teacher-name").value = staff.name;
      $("#teacher-department").value = staff.department || "";
      $("#teacher-email").value = staff.email || "";
      $("#teacher-form-panel")?.classList.remove("hidden");
      $("#teacher-form-panel")?.scrollIntoView({ behavior: "smooth" });
    }

    if (remove) {
      const id = remove.dataset.deleteTeacher;
      if (!confirm("Delete this staff record?")) return;

      data.teachers = data.teachers.filter(item => item.id !== id);
      if (!saveData()) return;
      renderTeachers();
      showToast("Staff record deleted.");
    }
  });
}

function renderTeachers() {
  const tbody = $("#teachers-table");
  if (!tbody) return;

  const term = ($("#teacher-search")?.value || "").trim().toLowerCase();
  const list = data.teachers.filter(staff =>
    [staff.id, staff.name, staff.department, staff.email]
      .join(" ").toLowerCase().includes(term)
  );

  tbody.innerHTML = list.length
    ? list.map(staff => `
        <tr>
          <td>${escapeHTML(staff.id)}</td>
          <td>${escapeHTML(staff.name)}</td>
          <td>${escapeHTML(staff.department || "—")}</td>
          <td>${escapeHTML(staff.email || "—")}</td>
          <td>
            <button class="action-button" type="button" data-edit-teacher="${escapeHTML(staff.id)}">Edit</button>
            <button class="action-button danger" type="button" data-delete-teacher="${escapeHTML(staff.id)}">Delete</button>
          </td>
        </tr>
      `).join("")
    : `<tr><td colspan="5" class="empty-state">No matching staff records.</td></tr>`;

  setText("#teacher-count-label", `${data.teachers.length} staff records`);
}

/* --------------------------------
   STUDENT SELECTS
--------------------------------- */

function populateStudentSelect(selector) {
  const select = $(selector);
  if (!select) return;

  const oldValue = select.value;
  const firstOption = selector === "#fee-student"
    ? "Select student" : "Select student";

  select.innerHTML = `<option value="">${firstOption}</option>` +
    data.students.map(student => `
      <option value="${escapeHTML(student.id)}">
        ${escapeHTML(student.name)} — ${escapeHTML(student.id)}
      </option>
    `).join("");

  if (data.students.some(student => student.id === oldValue)) {
    select.value = oldValue;
  }
}

/* --------------------------------
   ATTENDANCE
--------------------------------- */

function renderAttendance() {
  const tbody = $("#attendance-table");
  const date = $("#attendance-date")?.value || today();
  if (!tbody) return;

  if (!data.students.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Register students to begin.</td></tr>`;
    updateAttendanceCounts({});
    return;
  }

  const records = data.attendance[date] || {};

  tbody.innerHTML = data.students.map(student => {
    const status = records[student.id] || "Present";

    return `
      <tr>
        <td>${escapeHTML(student.id)}</td>
        <td>${escapeHTML(student.name)}</td>
        <td>${escapeHTML(student.className)}</td>
        <td>
          <select class="status-select" data-attendance-student="${escapeHTML(student.id)}" aria-label="Attendance for ${escapeHTML(student.name)}">
            ${["Present", "Absent", "Late", "Excused"].map(option =>
              `<option value="${option}" ${status === option ? "selected" : ""}>${option}</option>`
            ).join("")}
          </select>
        </td>
      </tr>
    `;
  }).join("");

  updateAttendanceCounts(records);
}

function updateAttendanceCounts(records) {
  const values = Object.values(records || {});
  setText("#attendance-present-count", values.filter(v => v === "Present").length);
  setText("#attendance-absent-count", values.filter(v => v === "Absent").length);
  setText("#attendance-other-count", values.filter(v => v === "Late" || v === "Excused").length);
}

function setupAttendance() {
  const dateInput = $("#attendance-date");
  if (dateInput) {
    dateInput.value = today();
    dateInput.addEventListener("change", renderAttendance);
  }

  $("#attendance-table")?.addEventListener("change", event => {
    const select = event.target.closest("[data-attendance-student]");
    if (!select) return;

    const date = dateInput?.value || today();
    if (!data.attendance[date]) data.attendance[date] = {};

    data.attendance[date][select.dataset.attendanceStudent] = select.value;
    updateAttendanceCounts(data.attendance[date]);
  });

  $("#save-attendance")?.addEventListener("click", () => {
    const date = dateInput?.value;

    if (!date) {
      showToast("Choose an attendance date.");
      return;
    }
    if (!data.students.length) {
      showToast("Register students before taking attendance.");
      return;
    }

    if (!data.attendance[date]) data.attendance[date] = {};

    $$("#attendance-table [data-attendance-student]").forEach(select => {
      data.attendance[date][select.dataset.attendanceStudent] = select.value;
    });

    if (!saveData()) return;

    renderAttendanceHistory();
    showToast(`Attendance saved for ${formatDate(date)}.`);
  });
}

function renderAttendanceHistory() {
  const tbody = $("#attendance-history");
  if (!tbody) return;

  const dates = Object.keys(data.attendance).sort().reverse();

  tbody.innerHTML = dates.length
    ? dates.map(date => {
        const records = Object.values(data.attendance[date]);
        return `
          <tr>
            <td>${escapeHTML(formatDate(date))}</td>
            <td>${records.filter(v => v === "Present").length}</td>
            <td>${records.filter(v => v === "Absent").length}</td>
            <td>${records.filter(v => v === "Late").length}</td>
            <td>${records.filter(v => v === "Excused").length}</td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="5" class="empty-state">No saved attendance records.</td></tr>`;
}

/* --------------------------------
   EXAMS AND RESULTS
--------------------------------- */

function setupResults() {
  $("#result-term").value = data.settings.academicTerm || "First Term";

  $("#result-form")?.addEventListener("submit", event => {
    event.preventDefault();

    const studentId = $("#result-student").value;
    const subject = $("#result-subject").value.trim();
    const term = $("#result-term").value;
    const rawScore = $("#result-score").value;
    const score = Number(rawScore);

    if (!studentById(studentId)) {
      showToast("Select a registered student.");
      return;
    }
    if (!subject) {
      showToast("Enter a subject.");
      return;
    }
    if (rawScore === "" || !Number.isFinite(score) || score < 0 || score > 100) {
      showToast("Score must be between 0 and 100.");
      return;
    }

    data.results.push({
      id: newId("result"),
      studentId,
      subject,
      term,
      score,
      date: today()
    });

    if (!saveData()) return;

    $("#result-form").reset();
    $("#result-term").value = data.settings.academicTerm || "First Term";
    renderResults();
    showToast("Examination result saved.");
  });

  $("#results-search")?.addEventListener("input", renderResults);

  $("#results-table")?.addEventListener("click", event => {
    const button = event.target.closest("[data-delete-result]");
    if (!button) return;

    if (!confirm("Delete this examination result?")) return;

    data.results = data.results.filter(item => item.id !== button.dataset.deleteResult);
    if (!saveData()) return;

    renderResults();
    showToast("Result deleted.");
  });
}

function renderResults() {
  const tbody = $("#results-table");
  if (!tbody) return;

  const term = ($("#results-search")?.value || "").trim().toLowerCase();

  const results = [...data.results].reverse().filter(result => {
    const student = studentById(result.studentId);
    return [
      student?.name || "",
      result.studentId,
      student?.className || "",
      result.subject,
      result.term
    ].join(" ").toLowerCase().includes(term);
  });

  tbody.innerHTML = results.length
    ? results.map(result => {
        const student = studentById(result.studentId);
        return `
          <tr>
            <td>${escapeHTML(student?.name || "Unknown student")}</td>
            <td>${escapeHTML(student?.className || "—")}</td>
            <td>${escapeHTML(result.subject)}</td>
            <td>${escapeHTML(result.term)}</td>
            <td>${escapeHTML(result.score)}</td>
            <td><span class="status-badge">${gradeFor(Number(result.score))}</span></td>
            <td><button class="action-button danger" type="button" data-delete-result="${escapeHTML(result.id)}">Delete</button></td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="7" class="empty-state">No matching results found.</td></tr>`;

  setText("#results-count-label", `${data.results.length} results`);
}

/* --------------------------------
   FEES AND PAYMENT RECORDS
--------------------------------- */

function setupFees() {
  $("#toggle-fee-form")?.addEventListener("click", () => {
    $("#fee-form-panel")?.classList.toggle("hidden");
    populateStudentSelect("#fee-student");
  });

  $("#cancel-fee")?.addEventListener("click", () => {
    $("#fee-form")?.reset();
    $("#fee-form-panel")?.classList.add("hidden");
  });

  $("#fee-form")?.addEventListener("submit", event => {
    event.preventDefault();

    const studentId = $("#fee-student").value;
    const description = $("#fee-description").value.trim();
    const dueRaw = $("#fee-due").value;
    const paidRaw = $("#fee-paid").value;
    const due = Number(dueRaw);
    const paid = Number(paidRaw);

    if (!studentById(studentId) || !description) {
      showToast("Select a student and enter a fee description.");
      return;
    }
    if (dueRaw === "" || paidRaw === "" || !Number.isFinite(due) ||
        !Number.isFinite(paid) || due < 0 || paid < 0 || paid > due) {
      showToast("Check the fee amounts. Paid cannot exceed the amount due.");
      return;
    }

    data.fees.push({
      id: newId("fee"),
      studentId,
      description,
      due,
      paid,
      date: today()
    });

    if (!saveData()) return;

    $("#fee-form").reset();
    $("#fee-paid").value = "0";
    $("#fee-form-panel")?.classList.add("hidden");
    renderFees();
    showToast("Fee record saved.");
  });

  $("#fees-table")?.addEventListener("click", event => {
    const button = event.target.closest("[data-delete-fee]");
    if (!button) return;

    if (!confirm("Delete this fee record?")) return;

    data.fees = data.fees.filter(item => item.id !== button.dataset.deleteFee);
    if (!saveData()) return;

    renderFees();
    showToast("Fee record deleted.");
  });
}

function renderFeesSummary() {
  const due = data.fees.reduce((sum, fee) => sum + Number(fee.due || 0), 0);
  const paid = data.fees.reduce((sum, fee) => sum + Number(fee.paid || 0), 0);

  setText("#fees-total", money(due));
  setText("#fees-paid", money(paid));
  setText("#fees-outstanding", money(Math.max(0, due - paid)));
}

function renderFees() {
  const tbody = $("#fees-table");
  if (!tbody) return;

  tbody.innerHTML = data.fees.length
    ? [...data.fees].reverse().map(fee => {
        const student = studentById(fee.studentId);
        const balance = Math.max(0, Number(fee.due) - Number(fee.paid));
        const status = balance === 0 ? "Paid" : Number(fee.paid) > 0 ? "Part-paid" : "Outstanding";

        return `
          <tr>
            <td>${escapeHTML(student?.name || "Unknown student")}</td>
            <td>${escapeHTML(fee.description)}</td>
            <td>${escapeHTML(money(fee.due))}</td>
            <td>${escapeHTML(money(fee.paid))}</td>
            <td>${escapeHTML(money(balance))}</td>
            <td><span class="status-badge ${balance > 0 ? "late" : ""}">${status}</span></td>
            <td><button class="action-button danger" type="button" data-delete-fee="${escapeHTML(fee.id)}">Delete</button></td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="7" class="empty-state">No fee records yet.</td></tr>`;

  renderFeesSummary();
}

/* --------------------------------
   ANNOUNCEMENTS
--------------------------------- */

function setupAnnouncements() {
  $("#announcement-form")?.addEventListener("submit", event => {
    event.preventDefault();

    const title = $("#announcement-title").value.trim();
    const message = $("#announcement-message").value.trim();

    if (!title || !message) {
      showToast("Enter an announcement title and message.");
      return;
    }

    data.announcements.push({
      id: newId("announcement"),
      title,
      message,
      date: today()
    });

    if (!saveData()) return;

    $("#announcement-form").reset();
    renderAnnouncements();
    renderDashboardAnnouncements();
    showToast("Announcement published.");
  });

  $("#announcement-list")?.addEventListener("click", event => {
    const button = event.target.closest("[data-delete-announcement]");
    if (!button) return;

    if (!confirm("Delete this announcement?")) return;

    data.announcements = data.announcements.filter(
      item => item.id !== button.dataset.deleteAnnouncement
    );

    if (!saveData()) return;

    renderAnnouncements();
    renderDashboardAnnouncements();
    showToast("Announcement deleted.");
  });
}

function renderAnnouncements() {
  const container = $("#announcement-list");
  if (!container) return;

  container.innerHTML = data.announcements.length
    ? [...data.announcements].reverse().map(item => `
        <article class="announcement-item">
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.message)}</p>
          <small>Published ${escapeHTML(formatDate(item.date))}</small>
          <button type="button" data-delete-announcement="${escapeHTML(item.id)}">Delete</button>
        </article>
      `).join("")
    : `<p class="empty-state">No announcements published yet.</p>`;
}

/* --------------------------------
   SETTINGS
--------------------------------- */

function populateSettings() {
  const settings = data.settings;

  $("#school-name").value = settings.schoolName || "";
  $("#school-email").value = settings.schoolEmail || "";
  $("#academic-session").value = settings.academicSession || "";
  $("#academic-term").value = settings.academicTerm || "First Term";
  $("#school-address").value = settings.schoolAddress || "";
  $("#school-phone").value = settings.schoolPhone || "";
}

function setupSettings() {
  $("#settings-form")?.addEventListener("submit", event => {
    event.preventDefault();

    const schoolName = $("#school-name").value.trim();
    if (!schoolName) {
      showToast("Enter your school name.");
      return;
    }

    data.settings = {
      schoolName,
      schoolEmail: $("#school-email").value.trim(),
      academicSession: $("#academic-session").value.trim(),
      academicTerm: $("#academic-term").value,
      schoolAddress: $("#school-address").value.trim(),
      schoolPhone: $("#school-phone").value.trim()
    };

    if (!saveData()) return;

    populateSettings();
    updateDashboard();
    showToast("School settings saved.");
  });

  $("#export-data")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "educore-demo-backup.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    showToast("Demo data backup exported.");
  });

  $("#clear-data")?.addEventListener("click", () => {
    if (!confirm("This will permanently delete all EduCore demo data saved in this browser. Continue?")) return;

    localStorage.removeItem(STORAGE_KEY);
    data = clone(DEFAULT_DATA);

    editingStudentId = null;
    editingTeacherId = null;

    $("#student-form")?.reset();
    $("#teacher-form")?.reset();
    $("#result-form")?.reset();
    $("#fee-form")?.reset();
    $("#announcement-form")?.reset();
    $("#student-search").value = "";
    $("#teacher-search").value = "";
    $("#results-search").value = "";

    $("#student-form-panel")?.classList.add("hidden");
    $("#teacher-form-panel")?.classList.add("hidden");
    $("#fee-form-panel")?.classList.add("hidden");

    populateSettings();
    renderStudents();
    renderTeachers();
    renderAttendance();
    renderResults();
    renderFees();
    renderAnnouncements();
    renderDashboardAnnouncements();
    renderAttendanceHistory();
    updateDashboard();

    showToast("Demo data cleared.");
  });
}

/* --------------------------------
   SUBSCRIPTIONS AND NOTIFICATIONS
--------------------------------- */

function setupSubscriptions() {
  $$(".choose-plan").forEach(button => {
    button.addEventListener("click", () => {
      const plan = button.dataset.plan;
      if (!confirm(`Select the ${plan} demo plan? No payment will be taken.`)) return;

      data.selectedPlan = plan;
      if (!saveData()) return;

      showToast(`${plan} selected for this demo. No payment was processed.`);
    });
  });
}

function setupNotifications() {
  $("#notification-button")?.addEventListener("click", () => {
    showToast(
      data.announcements.length
        ? `You have ${data.announcements.length} announcement(s) saved.`
        : "You have no announcements yet."
    );
  });
}

/* --------------------------------
   START THE PORTAL
--------------------------------- */

function initializePortal() {
  setText("#year", new Date().getFullYear());
  setText("#today-label", new Date().toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }));

  setupNavigation();
  setupStudents();
  setupTeachers();
  setupAttendance();
  setupResults();
  setupFees();
  setupAnnouncements();
  setupSettings();
  setupSubscriptions();
  setupNotifications();

  populateSettings();
  renderStudents();
  renderTeachers();
  renderAttendance();
  renderResults();
  renderFees();
  renderAnnouncements();
  renderAttendanceHistory();
  updateDashboard();
  showPage("dashboard");
}

document.addEventListener("DOMContentLoaded", initializePortal);
