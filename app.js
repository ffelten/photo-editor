const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('fileInput');
const uploadPrompt = document.getElementById('uploadPrompt');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
let originalImage = null;

const filters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
  hueRotate: 0
};

const presets = {
  vintage: { brightness: 110, contrast: 85, saturation: 70, grayscale: 0, sepia: 40, blur: 0, hueRotate: 0 },
  cool: { brightness: 100, contrast: 100, saturation: 90, grayscale: 0, sepia: 0, blur: 0, hueRotate: 180 },
  warm: { brightness: 105, contrast: 105, saturation: 110, grayscale: 0, sepia: 20, blur: 0, hueRotate: 0 },
  dramatic: { brightness: 90, contrast: 150, saturation: 80, grayscale: 0, sepia: 0, blur: 0, hueRotate: 0 },
  bw: { brightness: 100, contrast: 120, saturation: 0, grayscale: 100, sepia: 0, blur: 0, hueRotate: 0 }
};

function init() {
  setupEventListeners();
  setupSliders();
}

function setupEventListeners() {
  fileInput.addEventListener('change', handleFileSelect);
  downloadBtn.addEventListener('click', downloadImage);
  resetBtn.addEventListener('click', resetFilters);

  // Drag and drop
  const canvasContainer = document.querySelector('.canvas-container');
  canvasContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadPrompt.style.borderColor = 'var(--accent)';
  });

  canvasContainer.addEventListener('dragleave', () => {
    uploadPrompt.style.borderColor = '';
  });

  canvasContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadPrompt.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadImage(file);
    }
  });

  // Paste from clipboard
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) loadImage(file);
        break;
      }
    }
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });
}

function setupSliders() {
  Object.keys(filters).forEach(filter => {
    const slider = document.getElementById(filter);
    if (slider) {
      slider.addEventListener('input', (e) => {
        filters[filter] = parseFloat(e.target.value);
        updateSliderValue(filter);
        applyFilters();
      });
    }
  });
}

function updateSliderValue(filter) {
  const slider = document.getElementById(filter);
  const valueSpan = slider.nextElementSibling;
  
  if (filter === 'blur') {
    valueSpan.textContent = `${filters[filter]}px`;
  } else if (filter === 'hueRotate') {
    valueSpan.textContent = `${filters[filter]}°`;
  } else {
    valueSpan.textContent = `${filters[filter]}%`;
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    loadImage(file);
  }
}

function loadImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      originalImage = img;
      
      // Set canvas size maintaining aspect ratio
      const maxWidth = canvas.parentElement.clientWidth - 64;
      const maxHeight = canvas.parentElement.clientHeight - 64;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      uploadPrompt.classList.add('hidden');
      canvas.classList.add('visible');
      
      applyFilters();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function applyFilters() {
  if (!originalImage) return;
  
  // Build CSS filter string
  const filterString = `
    brightness(${filters.brightness}%)
    contrast(${filters.contrast}%)
    saturate(${filters.saturation}%)
    grayscale(${filters.grayscale}%)
    sepia(${filters.sepia}%)
    blur(${filters.blur}px)
    hue-rotate(${filters.hueRotate}deg)
  `.trim();
  
  ctx.filter = filterString;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
}

function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;
  
  Object.keys(preset).forEach(filter => {
    filters[filter] = preset[filter];
    const slider = document.getElementById(filter);
    if (slider) {
      slider.value = preset[filter];
      updateSliderValue(filter);
    }
  });
  
  applyFilters();
}

function resetFilters() {
  Object.keys(filters).forEach(filter => {
    if (filter === 'blur') {
      filters[filter] = 0;
    } else if (filter === 'hueRotate') {
      filters[filter] = 0;
    } else if (filter === 'grayscale' || filter === 'sepia') {
      filters[filter] = 0;
    } else {
      filters[filter] = 100;
    }
    
    const slider = document.getElementById(filter);
    if (slider) {
      slider.value = filters[filter];
      updateSliderValue(filter);
    }
  });
  
  applyFilters();
}

function downloadImage() {
  if (!originalImage) return;
  
  // Create a temporary canvas at full resolution for download
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  tempCanvas.width = originalImage.width;
  tempCanvas.height = originalImage.height;
  
  const filterString = `
    brightness(${filters.brightness}%)
    contrast(${filters.contrast}%)
    saturate(${filters.saturation}%)
    grayscale(${filters.grayscale}%)
    sepia(${filters.sepia}%)
    blur(${filters.blur}px)
    hue-rotate(${filters.hueRotate}deg)
  `.trim();
  
  tempCtx.filter = filterString;
  tempCtx.drawImage(originalImage, 0, 0);
  
  const link = document.createElement('a');
  link.download = 'edited-photo.png';
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
}

init();
