/* ===== Altura — comportamiento del sitio ===== */

document.addEventListener("DOMContentLoaded", () => {

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----- Aviso de web de muestra: cerrar ----- */
  const demoBanner = document.getElementById("demoBanner");
  const demoBannerClose = document.getElementById("demoBannerClose");
  if (demoBannerClose && demoBanner) {
    demoBannerClose.addEventListener("click", () => {
      demoBanner.classList.add("is-hidden");
    });
  }

  /* ----- Aparición de los capítulos al hacer scroll ----- */
  const chapters = document.querySelectorAll(".chapter");

  if ("IntersectionObserver" in window) {
    const chapterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.3 }
    );
    chapters.forEach((chapter) => chapterObserver.observe(chapter));
  } else {
    chapters.forEach((chapter) => chapter.classList.add("is-visible"));
  }

  /* ----- Profundidad suave en las fotos al hacer scroll ----- */
  const parallaxEls = Array.from(document.querySelectorAll("[data-parallax]"));
  let ticking = false;

  function updateParallax() {
    const viewportH = window.innerHeight;
    parallaxEls.forEach((el) => {
      const rect = el.parentElement.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewportH) return;
      const progress = (rect.top) / viewportH; // ~1 al entrar, ~-1 al salir
      const shift = progress * 42;
      el.style.transform = `translate3d(0, ${shift}px, 0)`;
    });
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  if (!reduceMotion && parallaxEls.length) {
    window.addEventListener("scroll", onScroll, { passive: true });
    updateParallax();
  }

  /* ----- Barra de progreso de lectura ----- */
  const progressBar = document.getElementById("scrollProgress");

  function updateProgress() {
    if (!progressBar) return;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progressBar.style.width = pct + "%";
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  /* ----- Botón de reserva fijo: aparece tras la portada ----- */
  const reserveFab = document.getElementById("reserveFab");
  const introSection = document.getElementById("inicio");
  const reservasSection = document.getElementById("reservas");

  if (reserveFab && introSection) {
    const fabObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          reserveFab.classList.toggle("is-visible", !entry.isIntersecting);
        });
      },
      { threshold: 0 }
    );
    fabObserver.observe(introSection);

    if (reservasSection) {
      const hideOnReserve = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) reserveFab.classList.remove("is-visible");
          });
        },
        { threshold: 0.6 }
      );
      hideOnReserve.observe(reservasSection);
    }
  }

  /* ----- Reserva: horario válido por día de la semana ----- */
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
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 3);
    dateInput.max = maxDate.toISOString().split("T")[0];
  }

  function currentLang() {
    return document.documentElement.getAttribute("lang") || "es";
  }

  function t(key) {
    const entry = window.translations && window.translations[key];
    if (!entry) return key;
    return entry[currentLang()] || entry.es;
  }

  function validateField(field) {
    const group = field.closest(".form-group");
    const valid = field.checkValidity();
    group.classList.toggle("invalid", !valid);
    return valid;
  }

  /* Día de la semana (0=domingo..6=sábado) -> franjas [inicio, última entrada] */
  const SCHEDULE = {
    0: [["13:30", "16:30"]],                        // Domingo: solo comida
    1: [],                                           // Lunes: cerrado
    2: [["20:00", "23:00"]],                         // Martes: solo cena
    3: [["20:00", "23:00"]],                         // Miércoles: solo cena
    4: [["20:00", "23:00"]],                         // Jueves: solo cena
    5: [["13:30", "15:30"], ["20:00", "23:30"]],     // Viernes: comida y cena
    6: [["13:30", "15:30"], ["20:00", "23:30"]],     // Sábado: comida y cena
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

  function isTodaySelected(dateStr) {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    return dateStr === todayStr;
  }

  function filterPastTimesIfToday(slots, dateStr) {
    if (!isTodaySelected(dateStr)) return slots;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return slots.filter((s) => timeToMinutes(s) > nowMinutes + 30);
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
      dateInput.setCustomValidity("");
      return;
    }

    const day = getDayOfWeek(dateVal);
    let slots = generateTimeSlots(day);
    slots = filterPastTimesIfToday(slots, dateVal);

    if (slots.length === 0) {
      timeSelect.disabled = true;
      rebuildTimeOptions([], previousTime, "reserve.time.choose_date_first");
      const key = SCHEDULE[day] && SCHEDULE[day].length === 0
        ? "reserve.error.closed"
        : "reserve.error.no_slots_today";
      setFieldErrorKey(dateErrorSpan, key);
      dateInput.setCustomValidity(t(key));
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
    dateInput.addEventListener("change", updateAvailability);
    document.addEventListener("altura:langchange", updateAvailability);
  }

  if (form) {
    const fields = form.querySelectorAll("input[required], select[required]");

    fields.forEach((field) => {
      field.addEventListener("blur", () => validateField(field));
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      updateAvailability();

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
      confirmation.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
  }

  if (newReservationBtn) {
    newReservationBtn.addEventListener("click", () => {
      form.reset();
      form.querySelectorAll(".form-group").forEach((g) => g.classList.remove("invalid"));
      updateAvailability();
      form.hidden = false;
      confirmation.hidden = true;
      form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  updateAvailability();

  /* ----- Año del footer ----- */
  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

});
