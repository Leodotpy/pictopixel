let originalImage = null;
let imageCanvas = document.getElementById('canvas');
let imageCtx = imageCanvas.getContext('2d');
let dropzone = document.getElementById('dropzone');
var controls = document.getElementById('controls');

let statslabel = document.getElementById('statslabel');
let hasImgLoaded = false;

// JS enabled so swap the dropzone text
dropzone.textContent = "Drop or Click to Load Image";

function dropzoneClickHandler() {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function (event) {
        loadImage(event.target.files[0]);
    };
    input.click();
}

// Adding the dropzone click listener
dropzone.addEventListener('click', dropzoneClickHandler);

document.addEventListener('dragover', function (e) {
    e.preventDefault();
});

document.addEventListener('drop', function (e) {
    e.preventDefault();
    if (e.dataTransfer.items && e.dataTransfer.items[0].kind === 'file') {
        let file = e.dataTransfer.items[0].getAsFile();
        loadImage(file);
    }
});


document.getElementById('resetBtn').addEventListener('click', function () {
    resetFilters();
});

function resetFilters() {
    // Reset filter values to defaults
    document.getElementById('downscale').value = "1";
    document.getElementById('brightness').value = "100";
    document.getElementById('contrast').value = "100";
    document.getElementById('saturation').value = "100";
    document.getElementById('paletteSize').value = "256";

    // Redraw the original image
    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    imageCtx.drawImage(originalImage, 0, 0, originalImage.width, originalImage.height);
    applyFilters();
}

['downscale', 'brightness', 'contrast', 'saturation', 'paletteSize'].forEach((id) => {
    document.getElementById(id).addEventListener('input', function () {
        applyFilters();
    });
});

function loadImage(file) {
    let reader = new FileReader();
    reader.onload = function (event) {
        originalImage = new Image();
        originalImage.onload = function () {
            dropzone.textContent = "";

            // Reset the canvas dimensions and clear it
            imageCanvas.width = originalImage.width;
            imageCanvas.height = originalImage.height;
            imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);

            // Reset canvas scale
            scale = 1;
            updateCanvasTransform();
            
            // remove click event for dropzone but leave drop dropzone event 
            dropzone.removeEventListener('click', dropzoneClickHandler);

            // Draw the original image with filters applied
            applyFilters();

            hasImgLoaded = true;

            // Display controls
            controls.style.display = "inherit";
            document.getElementById("canvasContainer").style.display = "inherit";

            dropzone.style.cursor = "default";
        };
        originalImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Filters
function limitPalette(paletteSize) {
    let imageData = imageCtx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
    let data = imageData.data;
    let factor = Math.floor(256 / paletteSize);

    // Effect first 3 channels, leave alpha unchanged
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.floor(data[i] / factor) * factor;
        data[i + 1] = Math.floor(data[i + 1] / factor) * factor;
        data[i + 2] = Math.floor(data[i + 2] / factor) * factor;
    }

    imageCtx.putImageData(imageData, 0, 0);
}

function downscaleImage(image, factor) {
    let scaledWidth = Math.round(image.width / factor);
    let scaledHeight = Math.round(image.height / factor);

    let tmpCanvas = document.createElement('canvas');
    let tmpCtx = tmpCanvas.getContext('2d');
    tmpCanvas.width = scaledWidth;
    tmpCanvas.height = scaledHeight;

    tmpCtx.imageSmoothingEnabled = false; // Ensure Nearest Neighbor scaling
    tmpCtx.drawImage(image, 0, 0, scaledWidth, scaledHeight);

    return tmpCanvas;
}

// Apply filters with slider values
function applyFilters() {
    if (!originalImage) return;

    let maxSliderValueForWidth = originalImage.width / 8;
    let maxSliderValueForHeight = originalImage.height / 8;
    let maxDownscale = Math.min(maxSliderValueForWidth, maxSliderValueForHeight);
    document.getElementById('downscale').max = maxDownscale;

    let downscaleFactor = parseFloat(document.getElementById('downscale').value);

    let tmpCanvas = downscaleImage(originalImage, downscaleFactor);

    // Apply CSS filters
    let brightness = parseFloat(document.getElementById('brightness').value);
    let contrast = parseFloat(document.getElementById('contrast').value);
    let saturation = parseFloat(document.getElementById('saturation').value);

    let filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    imageCtx.filter = filterString;
    imageCtx.imageSmoothingEnabled = false;
    imageCtx.drawImage(tmpCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height, 0, 0, originalImage.width, originalImage.height); // Draw it with the original dimensions

    if (tmpCanvas.height > 0 && tmpCanvas.width > 0) {
        statslabel.textContent = `${tmpCanvas.width}x${tmpCanvas.height}`;
        statslabel.style.display = "block";
    } else {
        statslabel.style.display = "none";
    }

    // Limit the color palette
    const paletteSize = parseInt(document.getElementById('paletteSize').value);
    limitPalette(paletteSize);
}


// Background pixels handleing
document.addEventListener('DOMContentLoaded', function () {
    const grid = document.querySelector('.pixelgrid');

    // Generate the 10x10 grid of pixels for background
    for (let i = 0; i < 100; i++) {
        const pixel = document.createElement('div');
        pixel.className = 'pixel';
        const randomDelay = Math.random() * 5;
        pixel.style.animationDelay = `${randomDelay}s`;
        pixel.style.filter = `hue-rotate(${randomDelay*-5}deg)`
        grid.appendChild(pixel);
    }
});

// Canvas zoom functionality
let scale = 1;
let minscale = 0.1

function zoomOut(amount = 0.2) {
    if (scale - amount > minscale) {
        scale -= amount;
    } else {
        scale = minscale;
    }
    updateCanvasTransform();
}

function zoomReset() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateCanvasTransform();
}

function zoomIn(amount = 0.2) {
    scale += amount;
    updateCanvasTransform();
}


// Handle scroll zooming
document.addEventListener('wheel', function (event) {
    // If the scroll direction is positive, it's a scroll up. If negative, it's a scroll down.
    if (event.deltaY < 0) {
        zoomIn(amount = 0.1);
    } else {
        zoomOut(amount = 0.1);
    }
    // Prevent default scroll behavior.
    event.preventDefault();
}, {
    passive: false
});



// Handle image dragging
let dragging = false;
let lastX = 0;
let lastY = 0;
let translateX = 0;
let translateY = 0;
const DEFAULT_TRANSITION_DURATION = "0.2s";
const DRAG_TRANSITION_DURATION = "0.0s"; // shorter duration for a snappy feel during drag
imageCanvas.style.willChange = "transform";

document.addEventListener('mousemove', function (e) {
    if (dragging) {
        let deltaX = e.clientX - lastX;
        let deltaY = e.clientY - lastY;

        translateX += deltaX;
        translateY += deltaY;

        lastX = e.clientX;
        lastY = e.clientY;

        updateCanvasTransform();
    }
});

imageCanvas.addEventListener('mousedown', function (e) {
    dragging = true;
    imageCanvas.style.transitionDuration = DRAG_TRANSITION_DURATION;
    imageCanvas.style.cursor = "move";
    lastX = e.clientX;
    lastY = e.clientY;
});

document.addEventListener('mouseup', function () {
    dragging = false;
    imageCanvas.style.transitionDuration = DEFAULT_TRANSITION_DURATION;
    imageCanvas.style.cursor = "move";
});

document.addEventListener('mouseleave', function () {
    dragging = false;
    imageCanvas.style.transitionDuration = DEFAULT_TRANSITION_DURATION;
    imageCanvas.style.cursor = "auto";
});

function updateCanvasTransform() {
    imageCanvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}


// Context menu
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    if (hasImgLoaded) {
        let contextMenu = document.getElementById('customContextMenu');
        contextMenu.style.top = e.clientY + "px";
        contextMenu.style.left = e.clientX + "px";
        contextMenu.style.display = "flex";
    }
});

document.addEventListener('click', function () {
    document.getElementById('customContextMenu').style.display = "none";
});

document.getElementById('loadNew').addEventListener('click', function () {
    dropzoneClickHandler();
});

function downloadSmall() {
    let downscaleFactor = parseFloat(document.getElementById('downscale').value);
    let downscaledCanvas = downscaleImage(originalImage, downscaleFactor); // Use the new function for downscaling

    let link = document.createElement('a');
    // Convert canvas to a smaller image data URL. You can modify the toDataURL parameters to achieve desired compression.
    link.href = downscaledCanvas.toDataURL('image/png');
    link.download = 'small_image-pictopixel.png';
    link.click()
}
document.getElementById('downloadSmall').addEventListener('click', downloadSmall);
document.getElementById('downloadSmallContext').addEventListener('click', downloadSmall);

function downloadLarge() {
    let link = document.createElement('a');
    link.href = imageCanvas.toDataURL();
    link.download = 'large_image-pictopixel.png';
    link.click();
}
document.getElementById('downloadLarge').addEventListener('click', downloadLarge);
document.getElementById('downloadLargeContext').addEventListener('click', downloadLarge);

document.getElementById("gitfooter").addEventListener('click', function (e) {
    window.open("https://github.com/Leodotpy").focus();
});