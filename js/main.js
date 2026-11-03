/* ===== Casa Fenollar — site behaviour ===== */

document.addEventListener("DOMContentLoaded", () => {

  /* ----- Mobile nav toggle ----- */
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ----- Menu tabs (Carta) ----- */
  const menuTabs = document.querySelectorAll(".menu-tab");
  const menuPanels = document.querySelectorAll(".menu-panel");

  menuTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-target");

      menuTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      menuPanels.forEach((panel) => {
        panel.classList.toggle("active", panel.id === target);
      });
    });
  });

  /* ----- Gallery lightbox ----- */
  const galleryItems = document.querySelectorAll(".gallery-item");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxClose = document.getElementById("lightboxClose");

  galleryItems.forEach((item) => {
    item.addEventListener("click", () => {
      const full = item.getAttribute("data-full");
      lightboxImage.src = full;
      lightboxImage.alt = item.querySelector("img").alt;
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
    });
  });

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImage.src = "";
    document.body.style.overflow = "";
  }

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox && !lightbox.hidden) closeLightbox();
  });

  /* ----- FAQ accordion ----- */
  document.querySelectorAll(".faq-question").forEach((question) => {
    question.addEventListener("click", () => {
      const answer = question.nextElementSibling;
      const isOpen = question.getAttribute("aria-expanded") === "true";

      document.querySelectorAll(".faq-question").forEach((q) => {
        q.setAttribute("aria-expanded", "false");
        q.nextElementSibling.style.maxHeight = null;
      });

      if (!isOpen) {
        question.setAttribute("aria-expanded", "true");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });

  /* ----- Reservation form ----- */
  const form = document.getElementById("reservationForm");
  const confirmation = document.getElementById("reserveConfirmation");
  const summary = document.getElementById("confirmationSummary");
  const newReservationBtn = document.getElementById("newReservationBtn");
  const dateInput = document.getElementById("resDate");
  const timeSelect = document.getElementById("resTime");
  const dateGroup = dateInput ? dateInput.closest(".form-group") : null;
  const dateErrorSpan = dateGroup ? dateGroup.querySelector(".field-error") : null;

  if (dateInput) {
    const today = new Date();
    dateInput.min = today.toISOString().split("T")[0];
  }

  function currentLang() {
    return document.documentElement.getAttribute("lang") || "es";
  }

  function t(key) {
    const entry = translations[key];
    if (!entry) return key;
    return entry[currentLang()] || entry.es;
  }

  function validateField(field) {
    const group = field.closest(".form-group");
    const valid = field.checkValidity();
    group.classList.toggle("invalid", !valid);
    return valid;
  }

  /* ----- Opening hours: day of week (0=Sun..6=Sat) -> [ [open, lastEntry], ... ] ----- */
  const SCHEDULE = {
    0: [["13:00", "15:30"]],                     // Domingo: solo comida
    1: [],                                       // Lunes: cerrado
    2: [["13:00", "15:30"], ["20:00", "22:30"]],  // Martes
    3: [["13:00", "15:30"], ["20:00", "22:30"]],  // Miércoles
    4: [["13:00", "15:30"], ["20:00", "22:30"]],  // Jueves
    5: [["13:00", "15:30"], ["20:00", "23:00"]],  // Viernes
    6: [["13:00", "15:30"], ["20:00", "23:00"]],  // Sábado
  };

  function timeToMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  function minutesToTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  function generateTimeSlots(dayOfWeek) {
    const ranges = SCHEDULE[dayOfWeek] || [];
    const slots = [];
    ranges.forEach(([start, end]) => {
      for (let m = timeToMinutes(start); m <= timeToMinutes(end); m += 30) {
        slots.push(minutesToTime(m));
      }
    });
    return slots;
  }

  function getDayOfWeek(dateStr) {
    return new Date(dateStr + "T00:00:00").getDay();
  }

  function setFieldErrorKey(span, key) {
    if (!span) return;
    span.setAttribute("data-i18n", key);
    span.textContent = t(key);
  }

  function rebuildTimeOptions(slots, keepValue, placeholderKey) {
    if (!timeSelect) return;
    timeSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.setAttribute("data-i18n", placeholderKey);
    placeholder.textContent = t(placeholderKey);
    timeSelect.appendChild(placeholder);

    slots.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      timeSelect.appendChild(opt);
    });

    timeSelect.value = keepValue && slots.includes(keepValue) ? keepValue : "";
  }

  function updateAvailability() {
    if (!dateInput || !timeSelect) return;
    const dateVal = dateInput.value;
    const previousTime = timeSelect.value;

    if (!dateVal) {
      timeSelect.disabled = true;
      rebuildTimeOptions([], previousTime, "reserve.time.choose_date_first");
      if (dateGroup) dateGroup.classList.remove("invalid");
      setFieldErrorKey(dateErrorSpan, "reserve.error.date");
      dateInput.setCustomValidity("");
      return;
    }

    const day = getDayOfWeek(dateVal);
    const slots = generateTimeSlots(day);

    if (slots.length === 0) {
      timeSelect.disabled = true;
      rebuildTimeOptions([], previousTime, "reserve.time.choose_date_first");
      setFieldErrorKey(dateErrorSpan, "reserve.error.closed");
      dateInput.setCustomValidity(t("reserve.error.closed"));
      if (dateGroup) dateGroup.classList.add("invalid");
    } else {
      timeSelect.disabled = false;
      rebuildTimeOptions(slots, previousTime, "reserve.time.placeholder");
      setFieldErrorKey(dateErrorSpan, "reserve.error.date");
      dateInput.setCustomValidity("");
      if (dateGroup) dateGroup.classList.remove("invalid");
    }
  }

  if (dateInput) {
    updateAvailability();
    dateInput.addEventListener("change", updateAvailability);
  }

  if (form) {
    const fields = form.querySelectorAll("input[required], select[required]");

    fields.forEach((field) => {
      field.addEventListener("blur", () => validateField(field));
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      let allValid = true;
      fields.forEach((field) => {
        if (!validateField(field)) allValid = false;
      });

      if (!allValid) {
        const firstInvalid = form.querySelector(".form-group.invalid input, .form-group.invalid select");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const data = new FormData(form);
      const name = data.get("name");
      const date = data.get("date");
      const time = data.get("time");
      const guests = data.get("guests");

      const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(
        currentLang() === "es" ? "es-ES" : "en-GB",
        { day: "numeric", month: "long", year: "numeric" }
      );

      summary.innerHTML = `
        <dt>${t("reserve.summary.name")}</dt><dd>${escapeHtml(name)}</dd>
        <dt>${t("reserve.summary.date")}</dt><dd>${escapeHtml(formattedDate)}</dd>
        <dt>${t("reserve.summary.time")}</dt><dd>${escapeHtml(time)}</dd>
        <dt>${t("reserve.summary.guests")}</dt><dd>${escapeHtml(guests)}</dd>
      `;

      form.hidden = true;
      confirmation.hidden = false;
      confirmation.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  if (newReservationBtn) {
    newReservationBtn.addEventListener("click", () => {
      form.reset();
      form.querySelectorAll(".form-group").forEach((g) => g.classList.remove("invalid"));
      form.hidden = false;
      confirmation.hidden = true;
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ----- Footer year ----- */
  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

});
