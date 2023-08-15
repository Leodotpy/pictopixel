let originalImage = null;
let imageCanvas = document.getElementById('canvas');
let imageCtx = imageCanvas.getContext('2d');
let dropzone = document.getElementById('dropzone');
var controls = document.getElementById('controls');

let statslabel = document.getElementById('statslabel');
let hasImgLoaded = false;
let tooltipShown = false;
let mademove = false;


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

document.addEventListener("DOMContentLoaded", function () {
    const exampleImages = document.querySelectorAll('.exampleImage');
    exampleImages.forEach(function (imageElem) {
        imageElem.addEventListener('click', function (event) {
            let imagePath = event.target.getAttribute('data-image-path');
            fetch(imagePath)
                .then(response => response.blob())
                .then(blob => {
                    loadImage(blob);
                });
        });
        imageElem.addEventListener('contextmenu', function (e) {
            if (event.target.getAttribute('data-image-path')) {
                e.preventDefault();
            }
        });
    });
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

    sliderValues();

    // Redraw the original image
    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    imageCtx.drawImage(originalImage, 0, 0, originalImage.width, originalImage.height);
    applyFilters();
}

['downscale', 'brightness', 'contrast', 'saturation', 'paletteSize'].forEach((id) => {
    document.getElementById(id).addEventListener('input', function () {
        renderImageToCanvas();
    });
});

function sliderValues() {
    var sliders = document.querySelectorAll('input[type="range"]');

    sliders.forEach(function (slider) {
        // Set the value on page load
        var valueDisplay = slider.nextElementSibling;
        valueDisplay.textContent = slider.value;

        // Event listener to update the value when the slider changes
        slider.addEventListener('input', function () {
            valueDisplay.textContent = slider.value;
        });
    });
}

document.addEventListener("DOMContentLoaded", sliderValues);

const MAX_CANVAS_WIDTH = 800;
const MAX_CANVAS_HEIGHT = 600;
const MIN_CANVAS_WIDTH = 100;
const MIN_CANVAS_HEIGHT = 100;

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

            scale = 1;

            // Scale down if exceeding max dimensions
            if (imageCanvas.width / imageCanvas.height > MAX_CANVAS_WIDTH / MAX_CANVAS_HEIGHT) {
                if (imageCanvas.width > MAX_CANVAS_WIDTH) {
                    scale = MAX_CANVAS_WIDTH / imageCanvas.width;
                }
            } else {
                if (imageCanvas.height > MAX_CANVAS_HEIGHT) {
                    scale = MAX_CANVAS_HEIGHT / imageCanvas.height;
                }
            }

            // Scale up if below min dimensions (using the possibly already scaled values)
            let newWidth = imageCanvas.width * scale;
            let newHeight = imageCanvas.height * scale;
            if (newWidth / newHeight < MIN_CANVAS_WIDTH / MIN_CANVAS_HEIGHT) {
                if (newWidth < MIN_CANVAS_WIDTH) {
                    scale = MIN_CANVAS_WIDTH / imageCanvas.width;
                }
            } else {
                if (newHeight < MIN_CANVAS_HEIGHT) {
                    scale = MIN_CANVAS_HEIGHT / imageCanvas.height;
                }
            }

            updateCanvasTransform();

            // remove click event for dropzone but leave drop dropzone event 
            dropzone.removeEventListener('click', dropzoneClickHandler);

            // Draw the original image with filters applied
            renderImageToCanvas();

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
function limitPalette(ctx, width, height, paletteSize) {
    if (paletteSize <= 1) {
        throw new Error("Palette size should be greater than 1");
    }

    let imageData = ctx.getImageData(0, 0, width, height);
    let data = imageData.data;
    let factor = Math.floor(256 / (paletteSize - 1));

    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / factor) * factor;
        data[i + 1] = Math.round(data[i + 1] / factor) * factor;
        data[i + 2] = Math.round(data[i + 2] / factor) * factor;
    }

    ctx.putImageData(imageData, 0, 0);
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

function renderImageToCanvas() {
    let filteredCanvas = applyFilters();

    // Clear main canvas
    imageCtx.clearRect(0, 0, filteredCanvas.width, filteredCanvas.height);

    // Draw the filtered canvas to the main canvas without stretching
    imageCtx.drawImage(filteredCanvas, 0, 0);
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

    let filteredCanvas = document.createElement('canvas');
    let filteredCtx = filteredCanvas.getContext('2d');
    filteredCanvas.width = originalImage.width;
    filteredCanvas.height = originalImage.height;

    filteredCtx.filter = filterString;
    filteredCtx.imageSmoothingEnabled = false;
    filteredCtx.drawImage(tmpCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height, 0, 0, originalImage.width, originalImage.height); // Draw it with the original dimensions

    if (tmpCanvas.height > 0 && tmpCanvas.width > 0) {
        statslabel.textContent = `${tmpCanvas.width}x${tmpCanvas.height}`;
        statslabel.style.display = "block";
    } else {
        statslabel.style.display = "none";
    }

    // Limit the color palette
    const paletteSize = parseInt(document.getElementById('paletteSize').value);
    limitPalette(filteredCtx, filteredCanvas.width, filteredCanvas.height, paletteSize);

    return filteredCanvas;
}


function applyPreset(preset) {
    switch (preset) {
        case "default":
            resetFilters();
            break;
        case "gameGuy":
            document.getElementById('downscale').value = "16";
            document.getElementById('brightness').value = "110";
            document.getElementById('contrast').value = "100";
            document.getElementById('saturation').value = "0";
            document.getElementById('paletteSize').value = "3";
            break;
        case "vintage":
            document.getElementById('downscale').value = "2";
            document.getElementById('brightness').value = "90";
            document.getElementById('contrast').value = "130";
            document.getElementById('saturation').value = "80";
            document.getElementById('paletteSize').value = "64";
            break;
        case "highContrast":
            document.getElementById('downscale').value = "1";
            document.getElementById('brightness').value = "100";
            document.getElementById('contrast').value = "150";
            document.getElementById('saturation').value = "100";
            document.getElementById('paletteSize').value = "256";
            break;
        case "desaturated":
            document.getElementById('downscale').value = "1";
            document.getElementById('brightness').value = "100";
            document.getElementById('contrast').value = "100";
            document.getElementById('saturation').value = "50";
            document.getElementById('paletteSize').value = "256";
            break;
        default:
            resetFilters();
            break;
    }
    sliderValues();
    renderImageToCanvas();
}

document.getElementById('presets').addEventListener('change', function () {
    applyPreset(this.value);
});


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
const DRAG_TRANSITION_DURATION = "0.0s";
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
    mademove = true;
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

// Tooltip for mouse drag and scroll zoom functionality
let hoverTimeout;
imageCanvas.addEventListener('mouseover', function () {
    hoverTimeout = setTimeout(function () {
        if (!mademove && !tooltipShown) {
            const tooltip = document.getElementById('tooltip');
            tooltip.style.display = 'block';
            setTimeout(() => {
                tooltip.style.opacity = '1';
            }, 20);
            tooltipShown = true;
        }
    }, 1000);
});

imageCanvas.addEventListener('mouseout', function () {
    clearTimeout(hoverTimeout); // Clear the timeout if the mouse leaves before 1 second
    const tooltip = document.getElementById('tooltip');
    tooltip.style.opacity = '0';
    // After the fade out completes, set display to 'none'
    setTimeout(() => tooltip.style.display = 'none', 300); // Transition duration from the CSS
});


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
    let filteredCanvas = applyFilters();
    let downscaleFactor = parseFloat(document.getElementById('downscale').value);
    let downscaledCanvas = downscaleImage(filteredCanvas, downscaleFactor);

    let downloadLink = document.createElement('a');
    downloadLink.href = downscaledCanvas.toDataURL('image/png');
    downloadLink.download = 'filtered-downscaled-image.png';
    downloadLink.click();
}


document.getElementById('downloadSmall').addEventListener('click', downloadSmall);
document.getElementById('downloadSmallContext').addEventListener('click', downloadSmall);

function downloadLarge() {
    let filteredCanvas = applyFilters();
    let link = document.createElement('a');
    link.href = filteredCanvas.toDataURL();
    link.download = 'large_image-pictopixel.png';
    link.click();
}

document.getElementById('downloadLarge').addEventListener('click', downloadLarge);
document.getElementById('downloadLargeContext').addEventListener('click', downloadLarge);

document.getElementById("gitfooter").addEventListener('click', function (e) {
    window.open("https://github.com/Leodotpy/PicToPixel").focus();
});

// For the love of coding
const hearts = ["❤️", "💜", "💙", "💚", "💛", "🧡"];
let currentIndex = 0;
let heartscale = 1;
let resetTimer;

document.getElementById("heart").addEventListener('mouseover', function (e) {
    // Clear any existing timers when hovered over the heart
    clearTimeout(resetTimer);

    // Update the index
    currentIndex = (currentIndex + 1) % hearts.length;

    // Set the new heart color
    document.getElementById("heart").textContent = hearts[currentIndex];
    document.getElementById("heart").style.animation = "none";
    heartscale += 0.2;
    document.getElementById("heart").style.transform = `scale(${heartscale})`;
    document.getElementById("heart").style.bottom = `${heartscale * 20}%`;
});

document.getElementById("heart").addEventListener('mouseout', function (e) {
    // Start the timer when mouse is out of the heart
    resetTimer = setTimeout(function () {
        // Float the heart off the screen
        document.getElementById("heart").style.transition = "3000ms";
        document.getElementById("heart").style.bottom = "180vh"; // Ensure it's off screen

        // After 2 seconds (same as the transition time), reset the heart's properties
        setTimeout(function () {
            heartscale = 1; // Reset the scale
            currentIndex = (currentIndex + 1) % hearts.length;
            document.getElementById("heart").textContent = hearts[currentIndex];
            document.getElementById("heart").style.transition = "0ms";
            document.getElementById("heart").style.transform = `scale(${heartscale})`;
            document.getElementById("heart").style.bottom = "14%";

        }, 3000);
    }, 2000);
});