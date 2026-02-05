const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('fileInput');
const uploadPrompt = document.getElementById('uploadPrompt');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const feedbackBtn = document.getElementById('feedbackBtn');
const feedbackMenu = document.getElementById('feedbackMenu');
const rotateLeftBtn = document.getElementById('rotateLeft');
const rotateRightBtn = document.getElementById('rotateRight');
const flipHBtn = document.getElementById('flipH');
const flipVBtn = document.getElementById('flipV');
const textInput = document.getElementById('textInput');
const textSizeSlider = document.getElementById('textSize');
const textColorInput = document.getElementById('textColor');
const textStrokeInput = document.getElementById('textStroke');

let originalImage = null;
let rotation = 0; // 0, 90, 180, 270
let flipHorizontal = false;
let flipVertical = false;

// Text overlay state
const textOverlay = {
  content: '',
  size: 32,
  color: '#ffffff',
  strokeColor: '#000000',
  x: 0.5, // Position as percentage of canvas width
  y: 0.5  // Position as percentage of canvas height
};

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

  // Feedback menu toggle
  feedbackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    feedbackMenu.classList.toggle('visible');
  });

  document.addEventListener('click', () => {
    feedbackMenu.classList.remove('visible');
  });

  // Transform buttons
  rotateLeftBtn.addEventListener('click', () => {
    rotation = (rotation - 90 + 360) % 360;
    updateCanvasSize();
    applyFilters();
  });

  rotateRightBtn.addEventListener('click', () => {
    rotation = (rotation + 90) % 360;
    updateCanvasSize();
    applyFilters();
  });

  flipHBtn.addEventListener('click', () => {
    flipHorizontal = !flipHorizontal;
    applyFilters();
  });

  flipVBtn.addEventListener('click', () => {
    flipVertical = !flipVertical;
    applyFilters();
  });

  // Focus canvas container for keyboard events
  const canvasContainer = document.getElementById('canvasContainer');
  canvasContainer.focus();
  canvasContainer.addEventListener('click', () => canvasContainer.focus());

  // Drag and drop
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
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;
    
    // Check items first (required for macOS Chrome with screenshots/copied images)
    const items = clipboardData.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            loadImage(file);
            return;
          }
        }
      }
    }
    
    // Fallback to files array (for drag-drop or some browsers)
    if (clipboardData.files && clipboardData.files.length > 0) {
      const file = clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        loadImage(file);
        return;
      }
    }
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });

  // Text overlay controls
  textInput.addEventListener('input', (e) => {
    textOverlay.content = e.target.value;
    applyFilters();
  });

  textSizeSlider.addEventListener('input', (e) => {
    textOverlay.size = parseInt(e.target.value);
    textSizeSlider.nextElementSibling.textContent = `${textOverlay.size}px`;
    applyFilters();
  });

  textColorInput.addEventListener('input', (e) => {
    textOverlay.color = e.target.value;
    applyFilters();
  });

  textStrokeInput.addEventListener('input', (e) => {
    textOverlay.strokeColor = e.target.value;
    applyFilters();
  });

  // Click on canvas to position text
  canvas.addEventListener('click', (e) => {
    if (!originalImage || !textOverlay.content) return;
    
    const rect = canvas.getBoundingClientRect();
    textOverlay.x = (e.clientX - rect.left) / canvas.width;
    textOverlay.y = (e.clientY - rect.top) / canvas.height;
    applyFilters();
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
      rotation = 0;
      flipHorizontal = false;
      flipVertical = false;
      
      updateCanvasSize();
      uploadPrompt.classList.add('hidden');
      canvas.classList.add('visible');
      
      applyFilters();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateCanvasSize() {
  if (!originalImage) return;
  
  const maxWidth = canvas.parentElement.clientWidth - 64;
  const maxHeight = canvas.parentElement.clientHeight - 64;
  
  // Swap dimensions if rotated 90 or 270 degrees
  const isRotated = rotation === 90 || rotation === 270;
  const imgWidth = isRotated ? originalImage.height : originalImage.width;
  const imgHeight = isRotated ? originalImage.width : originalImage.height;
  
  const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
  
  canvas.width = imgWidth * ratio;
  canvas.height = imgHeight * ratio;
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
  
  // Apply transforms
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
  
  // Calculate draw dimensions based on rotation
  const isRotated = rotation === 90 || rotation === 270;
  const drawWidth = isRotated ? canvas.height : canvas.width;
  const drawHeight = isRotated ? canvas.width : canvas.height;
  
  ctx.drawImage(originalImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
  
  // Draw text overlay (without filters)
  drawTextOverlay(ctx, canvas.width, canvas.height);
}

function drawTextOverlay(context, width, height) {
  if (!textOverlay.content) return;
  
  context.filter = 'none';
  context.save();
  
  const x = textOverlay.x * width;
  const y = textOverlay.y * height;
  
  context.font = `bold ${textOverlay.size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Draw stroke
  context.strokeStyle = textOverlay.strokeColor;
  context.lineWidth = Math.max(2, textOverlay.size / 16);
  context.lineJoin = 'round';
  context.strokeText(textOverlay.content, x, y);
  
  // Draw fill
  context.fillStyle = textOverlay.color;
  context.fillText(textOverlay.content, x, y);
  
  context.restore();
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
  
  // Reset transforms
  rotation = 0;
  flipHorizontal = false;
  flipVertical = false;
  updateCanvasSize();
  
  // Reset text overlay
  textOverlay.content = '';
  textOverlay.size = 32;
  textOverlay.color = '#ffffff';
  textOverlay.strokeColor = '#000000';
  textOverlay.x = 0.5;
  textOverlay.y = 0.5;
  textInput.value = '';
  textSizeSlider.value = 32;
  textSizeSlider.nextElementSibling.textContent = '32px';
  textColorInput.value = '#ffffff';
  textStrokeInput.value = '#000000';
  
  applyFilters();
}

function downloadImage() {
  if (!originalImage) return;
  
  // Create a temporary canvas at full resolution for download
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  // Set canvas size based on rotation
  const isRotated = rotation === 90 || rotation === 270;
  tempCanvas.width = isRotated ? originalImage.height : originalImage.width;
  tempCanvas.height = isRotated ? originalImage.width : originalImage.height;
  
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
  
  // Apply transforms
  tempCtx.save();
  tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
  tempCtx.rotate((rotation * Math.PI) / 180);
  tempCtx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
  
  const drawWidth = isRotated ? tempCanvas.height : tempCanvas.width;
  const drawHeight = isRotated ? tempCanvas.width : tempCanvas.height;
  
  tempCtx.drawImage(originalImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  tempCtx.restore();
  
  // Draw text overlay at full resolution
  if (textOverlay.content) {
    const scale = tempCanvas.width / canvas.width;
    const scaledSize = textOverlay.size * scale;
    
    tempCtx.filter = 'none';
    tempCtx.save();
    
    const x = textOverlay.x * tempCanvas.width;
    const y = textOverlay.y * tempCanvas.height;
    
    tempCtx.font = `bold ${scaledSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    
    tempCtx.strokeStyle = textOverlay.strokeColor;
    tempCtx.lineWidth = Math.max(2, scaledSize / 16);
    tempCtx.lineJoin = 'round';
    tempCtx.strokeText(textOverlay.content, x, y);
    
    tempCtx.fillStyle = textOverlay.color;
    tempCtx.fillText(textOverlay.content, x, y);
    
    tempCtx.restore();
  }
  
  const link = document.createElement('a');
  link.download = 'edited-photo.png';
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
}

init();
