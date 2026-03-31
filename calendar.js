// Constants
const AVAILABLE_COLORS = [
  "#8ce0bc","#c2e4ff","#FAEAC8","#D7D9D8",
  "#471754","#991d5d","#f2445e","#f07951","#dec87a",
  "#3f324d", "#93c2b1", "#ffeacc", "#ff995e", "#de1d6a",
  "#524e4e", "#ff2b73", "#ff5a6a", "#ff9563", "#ffcd37"
];

const DEFAULT_COLORS = {
  pregacao: "#8ce0bc",
  louvor: "#c2e4ff",
  oracao: "#FAEAC8",
  ofertas: "#D7D9D8"
};

const monthNames = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

// Global variables
let currentDate = new Date();
let selectedCell = null;
let editingTask = null;
let selectedColor;

// DOM elements
const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");

// Initialization
if (typeof bootstrap === 'undefined') {
  console.error("Bootstrap JS não carregado!");
}

monthNames.forEach((month, index) => {
  monthSelect.innerHTML += `<option value="${index}">${month}</option>`;
});

for (let year = 2020; year <= 2035; year++) {
  yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
}

monthSelect.value = currentDate.getMonth();
yearSelect.value = currentDate.getFullYear();

monthSelect.onchange = yearSelect.onchange = renderCalendar;

// ====================
// Calendar Rendering
// ====================

function renderCalendar() {
  const month = +monthSelect.value;
  const year = +yearSelect.value;

  document.getElementById("monthTitle").innerText =
    `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const tbody = document.getElementById("calendarBody");
  tbody.innerHTML = "";

  let date = 1 - firstDay;

  while (true) {
    let row = document.createElement("tr");

    for (let i = 0; i < 7; i++) {
      let cell = document.createElement("td");
      let cellDate = new Date(year, month, date);

      let isCurrentMonth = cellDate.getMonth() === month;

      if (isCurrentMonth) {
        cell.innerHTML = `
          <div class="day-number">${cellDate.getDate()}</div>
          <button class="btn btn-secondary add-btn no-export" onclick="openModal(this)">+</button>
          <div class="tasks"></div>
        `;
      } else {
        cell.classList.add("inactive-day");
      }

      row.appendChild(cell);
      date++;
    }

    tbody.appendChild(row);

    if (date > daysInMonth && new Date(year, month, date).getDay() === 0) break;
  }

  enableDrag();
  loadTasksFromStorage();
}

// ====================
// Color Picker
// ====================

function renderTaskColorPicker(initialColor) {
  // Ensure initialColor is valid, fallback to first available color
  if (!AVAILABLE_COLORS.includes(initialColor)) {
    selectedColor = AVAILABLE_COLORS[0];
  } else {
    selectedColor = initialColor;
  }

  const colorDiv = document.getElementById("taskColor");
  colorDiv.innerHTML = "";
  colorDiv.classList.add("color-picker");

  AVAILABLE_COLORS.forEach(color => {
    const circle = document.createElement("div");
    circle.className = "color-option";
    circle.style.backgroundColor = color;
    circle.dataset.color = color;

    if (color === selectedColor) {
      circle.classList.add("selected");
    }

    circle.onclick = () => {
      colorDiv.querySelectorAll(".color-option").forEach(c => c.classList.remove("selected"));
      circle.classList.add("selected");
      selectedColor = color;
    };

    colorDiv.appendChild(circle);
  });
}

function updateColorSelection() {
  const colorDiv = document.getElementById("taskColor");
  colorDiv.querySelectorAll(".color-option").forEach(c => {
    c.classList.toggle("selected", c.dataset.color === selectedColor);
  });
}

// ====================
// Task Management
// ====================

function loadTasksFromStorage() {
  let storage = getStorage();
  let monthKey = getMonthKey();

  if (!storage[monthKey]) return;

  // Clear existing tasks
  document.querySelectorAll(".tasks").forEach(container => container.innerHTML = "");

  document.querySelectorAll("#calendarBody td").forEach(cell => {
    const dayNumber = cell.querySelector(".day-number");
    const tasksContainer = cell.querySelector(".tasks");

    if (!dayNumber || !tasksContainer) return;

    const day = dayNumber.innerText;
    const tasks = storage[monthKey][day];

    if (!tasks) return;

    tasks.forEach(task => {
      // Ensure color is valid
      if (!AVAILABLE_COLORS.includes(task.color)) {
        task.color = AVAILABLE_COLORS[0];
      }
      
      let badge = document.createElement("div");
      badge.className = `task-badge task-${task.type}`;
      badge.innerHTML = `<strong>${getTaskName(task.type)}</strong><br><span class="task-person-name">${task.name}</span>`;
      badge.style.backgroundColor = task.color;
      badge.style.color = getContrastColor(task.color);

      // salvar dados estruturados
      badge.dataset.type = task.type;
      badge.dataset.name = task.name;
      badge.dataset.color = task.color;

      badge.onclick = () => editTask(badge);

      tasksContainer.appendChild(badge);
    });
  });

  enableDrag();
}

function openModal(btn) {
  selectedCell = btn.parentElement.querySelector(".tasks");
  editingTask = null;

  document.getElementById("personName").value = "";
  document.getElementById("errorMsg").classList.add("d-none");
  document.getElementById("deleteBtn").style.display = "none";  

  const typeSelect = document.getElementById("taskType");
  const defaultColors = getTaskColors();

  let initialColor = defaultColors[typeSelect.value];
  if (!AVAILABLE_COLORS.includes(initialColor)) {
    initialColor = AVAILABLE_COLORS[0];
  }
  renderTaskColorPicker(initialColor);

  typeSelect.onchange = () => {
    selectedColor = getTaskColors()[typeSelect.value];
    if (!AVAILABLE_COLORS.includes(selectedColor)) {
      selectedColor = AVAILABLE_COLORS[0];
    }
    updateColorSelection();
  };

  new bootstrap.Modal(document.getElementById("taskModal")).show();
}

function saveTask() {
  const type = document.getElementById("taskType").value;
  const name = document.getElementById("personName").value.trim();
  const color = selectedColor;

  if (!name) {
    document.getElementById("errorMsg").classList.remove("d-none");
    return;
  }

  if (editingTask) {
    editingTask.innerHTML = `<strong>${getTaskName(type)}</strong><br><span class="task-person-name">${name}</span>`;
    editingTask.className = `task-badge task-${type}`;
    editingTask.style.backgroundColor = color;
    editingTask.style.color = getContrastColor(color);
    // salvar dados estruturados
    editingTask.dataset.type = type;
    editingTask.dataset.name = name;
    editingTask.dataset.color = color;
  } else {
    let badge = document.createElement("div");
    badge.className = `task-badge task-${type}`;
    badge.innerHTML = `<strong>${getTaskName(type)}</strong><br><span class="task-person-name">${name}</span>`;
    badge.style.backgroundColor = color;
    badge.style.color = getContrastColor(color);
    
    // salvar dados estruturados
    badge.dataset.type = type;
    badge.dataset.name = name;
    badge.dataset.color = color;

    badge.onclick = () => editTask(badge);

    selectedCell.appendChild(badge);
  }

  bootstrap.Modal.getInstance(document.getElementById("taskModal")).hide();
  saveTasksToStorage();
}

// ====================
// Storage
// ====================

function saveTasksToStorage() {
  let storage = getStorage();
  let monthKey = getMonthKey();

  storage[monthKey] = {};

  document.querySelectorAll("#calendarBody td").forEach(cell => {
    const dayNumber = cell.querySelector(".day-number");
    const tasksContainer = cell.querySelector(".tasks");

    if (!dayNumber || !tasksContainer) return;

    const day = dayNumber.innerText;
    const tasks = [];

    tasksContainer.querySelectorAll(".task-badge").forEach(badge => {
      const type = badge.dataset.type;
      const name = badge.dataset.name;
      const color = badge.dataset.color;

      tasks.push({ type, name, color: color });
    });

    if (tasks.length > 0) {
      storage[monthKey][day] = tasks;
    }
  });

  saveStorage(storage);
}

function editTask(badge) {
  editingTask = badge;

  // Assign default color if not present (for backward compatibility)
  if (!badge.dataset.color) {
    const defaultColors = getTaskColors();
    let color = defaultColors[badge.dataset.type];
    if (!AVAILABLE_COLORS.includes(color)) {
      color = AVAILABLE_COLORS[0];
    }
    badge.dataset.color = color;
    badge.style.backgroundColor = color;
    badge.style.color = getContrastColor(color);
  }

  document.getElementById("personName").value = badge.dataset.name;
  document.getElementById("taskType").value = badge.dataset.type;
  
  renderTaskColorPicker(badge.dataset.color);

  document.getElementById("taskType").onchange = () => {
    selectedColor = getTaskColors()[document.getElementById("taskType").value];
    if (!AVAILABLE_COLORS.includes(selectedColor)) {
      selectedColor = AVAILABLE_COLORS[0];
    }
    updateColorSelection();
  };

  document.getElementById("deleteBtn").style.display = "inline-block";
  document.getElementById("deleteBtn").onclick = () => {
    badge.remove();
    bootstrap.Modal.getInstance(document.getElementById("taskModal")).hide();
    saveTasksToStorage()
  };

  new bootstrap.Modal(document.getElementById("taskModal")).show();
}

function getTaskName(type) {
  return {
    pregacao: "Pregação",
    louvor: "Louvor",
    oracao: "Oração",
    ofertas: "Ofertas"
  }[type];
}

// ====================
// Utilities
// ====================

function getContrastColor(hexColor) {
  // Remove # if present
  hexColor = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, white for dark
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

function enableDrag() {
  document.querySelectorAll(".tasks").forEach(el => {
    new Sortable(el, {
      animation: 150,
      ghostClass: 'dragging',
      onEnd: () => saveTasksToStorage()
    });
  });
}

function clearMonth() {
  if (!confirm("Deseja limpar todas as tarefas?")) return;

  document.querySelectorAll(".tasks").forEach(el => el.innerHTML = "");

  let storage = getStorage();
  delete storage[getMonthKey()];
  saveStorage(storage);
}

// ====================
// Export and Theme
// ====================

function exportImage() {
  const wrapper = document.getElementById("calendarWrapper");

  // força background correto
  wrapper.style.backgroundColor = getComputedStyle(document.body).backgroundColor;

  document.querySelectorAll(".no-export").forEach(el => el.style.visibility = "hidden");

  html2canvas(wrapper, {
    scale: 2
  }).then(canvas => {

    let link = document.createElement("a");
    link.download = "calendario.png";
    link.href = canvas.toDataURL();
    link.click();

    document.querySelectorAll(".no-export").forEach(el => el.style.visibility = "visible");

    // limpa override
    wrapper.style.backgroundColor = "";
  });
}

const STORAGE_KEY = "calendarTasks";

// ====================
// Local Storage Helpers
// ====================

function getStorage() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
}

function saveStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getMonthKey() {
  return `${yearSelect.value}-${monthSelect.value}`;
}

// ====================
// Theme and Colors
// ====================

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute("data-bs-theme");

  if (current === "dark") {
    html.setAttribute("data-bs-theme", "light");
    localStorage.setItem("theme", "light");
  } else {
    html.setAttribute("data-bs-theme", "dark");
    localStorage.setItem("theme", "dark");
  }
}

function getTaskColors() {
  return JSON.parse(localStorage.getItem("taskColors")) || DEFAULT_COLORS;
}

function saveTaskColors(colors) {
  localStorage.setItem("taskColors", JSON.stringify(colors));
}

function updateTasksColors(oldColors, newColors) {
  let storage = getStorage();

  for (let monthKey in storage) {
    for (let day in storage[monthKey]) {
      storage[monthKey][day].forEach(task => {
        if (task.color === oldColors[task.type]) {
          task.color = newColors[task.type];
        }
      });
    }
  }

  saveStorage(storage);
  loadTasksFromStorage(); // refresh the display
}

let tempTaskColors = {};

// ====================
// Customization
// ====================

function renderCustomization() {
  const container = document.getElementById("customization");
  const savedColors = getTaskColors();

  // cópia temporária
  tempTaskColors = { ...savedColors };

  // Ensure all colors are valid, fallback to first available
  Object.keys(tempTaskColors).forEach(type => {
    if (!AVAILABLE_COLORS.includes(tempTaskColors[type])) {
      tempTaskColors[type] = AVAILABLE_COLORS[0];
    }
  });

  container.innerHTML = "";

  Object.keys(DEFAULT_COLORS).forEach(type => {

    const wrapper = document.createElement("div");
    wrapper.className = "mb-3";

    const label = document.createElement("div");
    label.className = "mb-1 fw-bold";
    label.innerText = type.charAt(0).toUpperCase() + type.slice(1);

    const picker = document.createElement("div");
    picker.className = "color-picker";

    AVAILABLE_COLORS.forEach(color => {

      const circle = document.createElement("div");
      circle.className = "color-option";
      circle.style.backgroundColor = color;

      if (color === tempTaskColors[type]) {
        circle.classList.add("selected");
      }

      circle.onclick = () => {

        // remove seleção anterior
        picker.querySelectorAll(".color-option").forEach(c => {
          c.classList.remove("selected");
        });

        // seleciona nova
        circle.classList.add("selected");

        // salva no estado temporário
        tempTaskColors[type] = color;
      };

      picker.appendChild(circle);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(picker);
    container.appendChild(wrapper);
  });

  // botão salvar
  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn-success mt-2";
  saveBtn.innerText = "Salvar padrão";

  saveBtn.onclick = () => {
    const oldColors = getTaskColors();
    saveTaskColors(tempTaskColors);
    updateTasksColors(oldColors, tempTaskColors);
    alert("Padrão de cores salvo com sucesso!");
  };

  container.appendChild(saveBtn);
}

// ====================
// Initialization
// ====================

renderCalendar();
renderCustomization();