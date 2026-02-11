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
const textLayersContainer = document.getElementById('textLayers');
const addTextBtn = document.getElementById('addTextBtn');
const textEditor = document.getElementById('textEditor');
const redEyeToggle = document.getElementById('redEyeToggle');
const redEyeSizeSlider = document.getElementById('redEyeSize');
const redEyeHint = document.getElementById('redEyeHint');
const canvasContainer = document.getElementById('canvasContainer');

let originalImage = null;
let rotation = 0; // 0, 90, 180, 270
let flipHorizontal = false;
let flipVertical = false;

// Multiple text overlays
let textOverlays = [];
let selectedTextIndex = -1;

// Red eye tool state
let redEyeToolActive = false;
let redEyeBrushSize = 20;

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
  addTextBtn.addEventListener('click', addNewText);

  textInput.addEventListener('input', (e) => {
    if (selectedTextIndex < 0) return;
    textOverlays[selectedTextIndex].content = e.target.value;
    renderTextLayers();
    applyFilters();
  });

  textSizeSlider.addEventListener('input', (e) => {
    if (selectedTextIndex < 0) return;
    textOverlays[selectedTextIndex].size = parseInt(e.target.value);
    textSizeSlider.nextElementSibling.textContent = `${e.target.value}px`;
    applyFilters();
  });

  textColorInput.addEventListener('input', (e) => {
    if (selectedTextIndex < 0) return;
    textOverlays[selectedTextIndex].color = e.target.value;
    applyFilters();
  });

  textStrokeInput.addEventListener('input', (e) => {
    if (selectedTextIndex < 0) return;
    textOverlays[selectedTextIndex].strokeColor = e.target.value;
    applyFilters();
  });

  // Click on canvas to position text or apply red-eye removal
  canvas.addEventListener('click', (e) => {
    if (!originalImage) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Red eye tool takes priority
    if (redEyeToolActive) {
      applyRedEyeRemoval(x, y);
      return;
    }
    
    // Text positioning
    if (selectedTextIndex >= 0) {
      textOverlays[selectedTextIndex].x = x / canvas.width;
      textOverlays[selectedTextIndex].y = y / canvas.height;
      applyFilters();
    }
  });

  // Red eye tool controls
  redEyeToggle.addEventListener('click', () => {
    redEyeToolActive = !redEyeToolActive;
    redEyeToggle.classList.toggle('active', redEyeToolActive);
    redEyeToggle.textContent = redEyeToolActive ? 'Disable Red Eye Tool' : 'Enable Red Eye Tool';
    redEyeHint.style.display = redEyeToolActive ? 'block' : 'none';
    canvasContainer.classList.toggle('red-eye-mode', redEyeToolActive);
    
    // Deselect text when enabling red eye tool
    if (redEyeToolActive && selectedTextIndex >= 0) {
      selectText(-1);
    }
  });

  redEyeSizeSlider.addEventListener('input', (e) => {
    redEyeBrushSize = parseInt(e.target.value);
    redEyeSizeSlider.nextElementSibling.textContent = `${redEyeBrushSize}px`;
  });
}

function addNewText() {
  const newText = {
    content: '',
    size: 32,
    color: '#ffffff',
    strokeColor: '#000000',
    x: 0.5,
    y: 0.5
  };
  textOverlays.push(newText);
  selectText(textOverlays.length - 1);
  renderTextLayers();
  textInput.focus();
}

function selectText(index) {
  selectedTextIndex = index;
  
  if (index >= 0 && index < textOverlays.length) {
    const text = textOverlays[index];
    textInput.value = text.content;
    textSizeSlider.value = text.size;
    textSizeSlider.nextElementSibling.textContent = `${text.size}px`;
    textColorInput.value = text.color;
    textStrokeInput.value = text.strokeColor;
    textEditor.style.display = 'block';
  } else {
    textEditor.style.display = 'none';
  }
  
  renderTextLayers();
  applyFilters();
}

function deleteText(index) {
  textOverlays.splice(index, 1);
  
  if (selectedTextIndex === index) {
    selectedTextIndex = textOverlays.length > 0 ? Math.min(index, textOverlays.length - 1) : -1;
    if (selectedTextIndex >= 0) {
      selectText(selectedTextIndex);
    } else {
      textEditor.style.display = 'none';
    }
  } else if (selectedTextIndex > index) {
    selectedTextIndex--;
  }
  
  renderTextLayers();
  applyFilters();
}

function renderTextLayers() {
  textLayersContainer.innerHTML = '';
  
  textOverlays.forEach((text, index) => {
    const layer = document.createElement('div');
    layer.className = `text-layer${index === selectedTextIndex ? ' selected' : ''}`;
    layer.innerHTML = `
      <span class="text-layer-content">${text.content || '(empty)'}</span>
      <button class="text-layer-delete" title="Delete">×</button>
    `;
    
    layer.addEventListener('click', (e) => {
      if (!e.target.classList.contains('text-layer-delete')) {
        selectText(index);
      }
    });
    
    layer.querySelector('.text-layer-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteText(index);
    });
    
    textLayersContainer.appendChild(layer);
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

function drawTextOverlay(context, width, height, scale = 1) {
  if (textOverlays.length === 0) return;
  
  context.filter = 'none';
  
  textOverlays.forEach((textOverlay, index) => {
    if (!textOverlay.content) return;
    
    context.save();
    
    const x = textOverlay.x * width;
    const y = textOverlay.y * height;
    const size = textOverlay.size * scale;
    
    context.font = `bold ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Draw stroke
    context.strokeStyle = textOverlay.strokeColor;
    context.lineWidth = Math.max(2, size / 16);
    context.lineJoin = 'round';
    context.strokeText(textOverlay.content, x, y);
    
    // Draw fill
    context.fillStyle = textOverlay.color;
    context.fillText(textOverlay.content, x, y);
    
    // Draw selection indicator for selected text (preview only)
    if (index === selectedTextIndex && scale === 1) {
      context.strokeStyle = 'rgba(233, 69, 96, 0.8)';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      const metrics = context.measureText(textOverlay.content);
      const padding = 8;
      context.strokeRect(
        x - metrics.width / 2 - padding,
        y - size / 2 - padding,
        metrics.width + padding * 2,
        size + padding * 2
      );
      context.setLineDash([]);
    }
    
    context.restore();
  });
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
  
  // Reset text overlays
  textOverlays = [];
  selectedTextIndex = -1;
  textInput.value = '';
  textSizeSlider.value = 32;
  textSizeSlider.nextElementSibling.textContent = '32px';
  textColorInput.value = '#ffffff';
  textStrokeInput.value = '#000000';
  textEditor.style.display = 'none';
  renderTextLayers();
  
  // Reset red eye tool
  redEyeToolActive = false;
  redEyeBrushSize = 20;
  redEyeToggle.classList.remove('active');
  redEyeToggle.textContent = 'Enable Red Eye Tool';
  redEyeHint.style.display = 'none';
  redEyeSizeSlider.value = 20;
  redEyeSizeSlider.nextElementSibling.textContent = '20px';
  canvasContainer.classList.remove('red-eye-mode');
  
  applyFilters();
}

function applyRedEyeRemoval(clickX, clickY) {
  // Get the image data from canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  const radius = redEyeBrushSize / 2;
  const radiusSquared = radius * radius;
  
  // Process pixels within the brush radius
  for (let y = Math.max(0, Math.floor(clickY - radius)); y < Math.min(canvas.height, Math.ceil(clickY + radius)); y++) {
    for (let x = Math.max(0, Math.floor(clickX - radius)); x < Math.min(canvas.width, Math.ceil(clickX + radius)); x++) {
      // Check if pixel is within circular brush
      const dx = x - clickX;
      const dy = y - clickY;
      const distSquared = dx * dx + dy * dy;
      
      if (distSquared <= radiusSquared) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Detect red pixels: high red, low green and blue
        // Red eye typically has R > 100, R > G * 1.5, R > B * 1.5
        if (r > 80 && r > g * 1.4 && r > b * 1.4) {
          // Calculate intensity based on distance from center (smoother edges)
          const distRatio = Math.sqrt(distSquared) / radius;
          const intensity = 1 - (distRatio * distRatio); // Quadratic falloff
          
          // Calculate the replacement color (desaturated and darkened)
          const avg = (g + b) / 2;
          const newR = r - (r - avg) * intensity;
          const newG = g;
          const newB = b;
          
          // Darken slightly to simulate pupil
          const darkenFactor = 0.7 + (0.3 * distRatio);
          data[i] = Math.round(newR * darkenFactor);
          data[i + 1] = Math.round(newG * darkenFactor);
          data[i + 2] = Math.round(newB * darkenFactor);
        }
      }
    }
  }
  
  // Put the modified image data back
  ctx.putImageData(imageData, 0, 0);
  
  // Redraw text overlays on top
  drawTextOverlay(ctx, canvas.width, canvas.height);
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
  
  // Draw all text overlays at full resolution
  const scale = tempCanvas.width / canvas.width;
  drawTextOverlay(tempCtx, tempCanvas.width, tempCanvas.height, scale);
  
  const link = document.createElement('a');
  link.download = 'edited-photo.png';
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
}

init();
