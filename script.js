/* ================= NAVIGATION ================= */
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetPage = link.getAttribute('data-page');
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(targetPage)?.classList.add('active');
  });
});

/* ================= GLITTER CARD ================= */
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--y', `${e.clientY - rect.top}px`);
  });
});

/* ================= CONFIGURATION ================= */
/* ✅ PPM base sudah disesuaikan (2.0 / 3.0 / 4.5) */
const MODE_CONFIG = {
  soft: { v_kv: 21, base_ppm: 2.0, duration: 150 },
  normal: { v_kv: 25, base_ppm: 3.0, duration: 100 },
  intensive: { v_kv: 29, base_ppm: 4.5, duration: 75 }
};

let running = false;
let intervalID = null;
let loadValue = 100;     // ✅ slider value (dinamis)
let mode = 'normal';
let logData = [];
let chart = null;

let remainingSeconds = 0;
let targetDuration = 0;

/* ================= ELEMENTS ================= */
const loadRange = document.getElementById('load-range');
const loadDisplay = document.getElementById('load-display');
const vinMeter = document.getElementById('vin');
const voutMeter = document.getElementById('vout');
const ozonMeter = document.getElementById('ozon');
const loadMeter = document.getElementById('load');
const modeSelect = document.getElementById('mode-select');
const fanIcon = document.getElementById('fan-icon');
const fanStatusEl = document.getElementById('fan-status');
const statusSteril = document.getElementById('status-steril');
const plasmaBox = document.getElementById('plasma');
const timerDisplay = document.getElementById('timer-display');
const percentDisplay = document.getElementById('progress-percent');
const percentFill = document.getElementById('progress-fill');

const safetyIndicator = document.getElementById('safety-indicator');
const indicatorMain = document.getElementById('indicator-main');
const indicatorStatus = document.getElementById('indicator-status');

const btnStart = document.getElementById('btn-start');
const btnFinish = document.getElementById('btn-finish');
const btnReset = document.getElementById('btn-reset');

/* ================= CHART ================= */
function initChart() {
  const canvas = document.getElementById('chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Ozon (ppm)',
          data: [],
          borderColor: '#0ea5e9',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(14,165,233,0.1)'
        },
        {
          label: 'Output (kV)',
          data: [],
          borderColor: '#fbbf24',
          borderWidth: 2,
          borderDash: [5,5],
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: '#64748b' }, grid: { display: false } }
      }
    }
  });
}
window.addEventListener('load', initChart);

/* ================= LOGIC ================= */
/* ✅ FIX SLIDER: sekarang benar-benar baca value slider */
if (loadRange && loadDisplay) {
  // optional: enforce range dari JS juga
  loadRange.min = 100;
  loadRange.max = 500;
  loadRange.step = loadRange.step || 10;

  // set awal dari value input HTML, kalau ada
  loadValue = parseInt(loadRange.value || "100", 10);
  loadDisplay.innerText = loadValue;

  loadRange.addEventListener('input', () => {
    loadValue = parseInt(loadRange.value, 10);
    loadDisplay.innerText = loadValue;
  });
}

modeSelect?.addEventListener('change', e => mode = e.target.value);

/* ================= START ================= */
btnStart?.addEventListener('click', () => {
  if (running) return;

  const conf = MODE_CONFIG[mode];
  targetDuration = conf.duration;
  remainingSeconds = targetDuration;

  running = true;
  btnStart.disabled = true;

  // Optional: kunci slider saat running (kalau kamu mau)
  // loadRange.disabled = true;

  fanIcon?.classList.add('fan-running');
  if (fanStatusEl) {
    fanStatusEl.innerText = "RUNNING";
    fanStatusEl.style.color = "#22c55e";
  }

  if (safetyIndicator) {
    safetyIndicator.classList.remove('off');
    safetyIndicator.classList.add('on');
  }
  if (indicatorMain) indicatorMain.innerText = "DO NOT OPEN";
  if (indicatorStatus) indicatorStatus.innerText = "SYSTEM RUNNING";

  if (plasmaBox) plasmaBox.style.opacity = "1";
  if (statusSteril) statusSteril.innerText = "STERILISASI BERLANGSUNG...";

  updateTimerDisplay();
  if (percentDisplay) percentDisplay.innerText = "0%";
  if (percentFill) percentFill.style.width = "0%";

  intervalID = setInterval(step, 1000);
});

/* ================= STEP ================= */
function step() {
  remainingSeconds--;
  updateTimerDisplay();

  const progress = Math.floor(((targetDuration - remainingSeconds) / targetDuration) * 100);
  if (percentDisplay) percentDisplay.innerText = progress + "%";
  if (percentFill) percentFill.style.width = progress + "%";

  const conf = MODE_CONFIG[mode];

  // VIN
  if (vinMeter) vinMeter.innerText = "220 VAC";

  // VOUT ±0.5%
  const voutVal = conf.v_kv + (Math.random() * 2 - 1) * (conf.v_kv * 0.005);
  if (voutMeter) voutMeter.innerText = voutVal.toFixed(2);

  // ✅ OZON ±0.5% dari base_ppm
  const ppmVar = conf.base_ppm * 0.005;
  const ozonVal = conf.base_ppm + (Math.random() * 2 - 1) * ppmVar;
  if (ozonMeter) ozonMeter.innerText = ozonVal.toFixed(2);

  // ✅ LOAD meter mengikuti slider
  if (loadMeter) loadMeter.innerText = String(loadValue);

  // Chart update
  if (chart) {
    if (chart.data.labels.length > 20) {
      chart.data.labels.shift();
      chart.data.datasets.forEach(d => d.data.shift());
    }
    chart.data.labels.push((targetDuration - remainingSeconds) + "s");
    chart.data.datasets[0].data.push(Number(ozonVal.toFixed(2)));
    chart.data.datasets[1].data.push(Number(voutVal.toFixed(2)));
    chart.update();
  }

  if (remainingSeconds <= 0) btnFinish?.click();
}

/* ================= STOP ================= */
btnFinish?.addEventListener('click', () => {
  if (!running) return;

  clearInterval(intervalID);
  running = false;
  btnStart.disabled = false;

  if (fanStatusEl) {
    fanStatusEl.innerText = "COOLING";
    fanStatusEl.style.color = "#fbbf24";
  }

  if (plasmaBox) plasmaBox.style.opacity = "0";
  if (statusSteril) statusSteril.innerText = "SELESAI — Pending Cooling";

  // ✅ log data (LOAD dinamis masuk ke history)
  logData.push({
    time: new Date().toLocaleTimeString(),
    mode: mode.toUpperCase(),
    vin: vinMeter ? vinMeter.innerText : "220 VAC",
    vout: voutMeter ? voutMeter.innerText : "-",
    ozon: ozonMeter ? ozonMeter.innerText : "-",
    load: String(loadValue),
    duration: formatDuration(targetDuration)
  });

  updateTable();
  document.getElementById('alarm-sound')?.play();

  // safety 30 detik
  setTimeout(() => {
    fanIcon?.classList.remove('fan-running');
    if (fanStatusEl) {
      fanStatusEl.innerText = "STOP";
      fanStatusEl.style.color = "#ef4444";
    }

    if (safetyIndicator) {
      safetyIndicator.classList.remove('on');
      safetyIndicator.classList.add('off');
    }
    if (indicatorMain) indicatorMain.innerText = "PLEASE OPEN";
    if (indicatorStatus) indicatorStatus.innerText = "SYSTEM OFF";

    // Optional: buka slider lagi setelah selesai
    // loadRange.disabled = false;
  }, 30000);
});

/* ================= RESET ================= */
btnReset?.addEventListener('click', () => {
  if (running) return;

  remainingSeconds = 0;
  if (timerDisplay) timerDisplay.innerText = "00:00";
  if (percentDisplay) percentDisplay.innerText = "0%";
  if (percentFill) percentFill.style.width = "0%";

  if (vinMeter) vinMeter.innerText = "-";
  if (voutMeter) voutMeter.innerText = "-";
  if (ozonMeter) ozonMeter.innerText = "-";
  if (loadMeter) loadMeter.innerText = "-";

  if (statusSteril) statusSteril.innerText = "IDLE — Sistem Siap";

  if (chart) {
    chart.data.labels = [];
    chart.data.datasets.forEach(d => d.data = []);
    chart.update();
  }
});

/* ================= UTIL ================= */
function updateTimerDisplay() {
  const m = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const s = (remainingSeconds % 60).toString().padStart(2, '0');
  if (timerDisplay) timerDisplay.innerText = `${m}:${s}`;
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

/* ================= HISTORY ================= */
function updateTable() {
  const tbody = document.getElementById('history-tbody');
  if (!tbody) return;

  if (logData.length > 0) {
    const noData = tbody.querySelector('.no-data');
    if (noData) noData.remove();
  }

  tbody.innerHTML = logData.slice().reverse().map(d => `
    <tr>
      <td>${d.time}</td>
      <td>${d.mode}</td>
      <td>${d.vin}</td>
      <td>${d.vout} kV</td>
      <td>${d.ozon} ppm</td>
      <td>${d.load} g</td>
      <td>${d.duration}</td>
    </tr>
  `).join('');
}

/* =====================================================
   =============== EXPORT CSV ==========================
   ===================================================== */
const btnCsv = document.getElementById('btn-export-csv');
btnCsv?.addEventListener('click', () => {
  if (!logData.length) {
    alert("No data to export");
    return;
  }

  const headers = [
    "Time",
    "Mode",
    "Input Voltage",
    "Output Voltage",
    "Ozone",
    "Load",
    "Duration"
  ];

  let csv = headers.join(",") + "\n";

  logData.forEach(d => {
    csv += [
      d.time,
      d.mode,
      d.vin,
      d.vout,
      d.ozon,
      d.load,
      d.duration
    ].join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "conpas_history.csv";
  a.click();

  URL.revokeObjectURL(url);
});

/* =====================================================
   =============== EXPORT PDF ==========================
   ===================================================== */
/* ✅ support dua id tombol: btn-download-pdf atau btn-export-pdf */
const btnPdf = document.getElementById('btn-download-pdf') || document.getElementById('btn-export-pdf');

btnPdf?.addEventListener('click', () => {
  if (!logData.length) {
    alert("No data to export");
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("jsPDF belum ter-load. Pastikan script jsPDF & autotable ada di HTML sebelum script.js");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "mm", "a4");

  doc.setFontSize(14);
  doc.text("CONPAS Sterilization History", 14, 15);

  const tableData = logData.map(d => [
    d.time,
    d.mode,
    d.vin,
    d.vout + " kV",
    d.ozon + " ppm",
    d.load + " g",
    d.duration
  ]);

  doc.autoTable({
    startY: 25,
    head: [[
      "Time",
      "Mode",
      "Input Voltage",
      "Output Voltage",
      "Ozone",
      "Load",
      "Duration"
    ]],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [14, 165, 233] }
  });

  doc.save("conpas_history.pdf");
});
