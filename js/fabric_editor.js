let canvas;
let fontSizeInput;
let fontFamilyInput;
let ditheringAlgorithmSelect; // New reference

// Padding state (in pixels)
let paddingState = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0
};

// Padding guide rectangles (for visual display)
let paddingGuides = {
  top: null,
  bottom: null,
  left: null,
  right: null
};

let qrUpdateTimer = null; // Debounce timer for QR updates

document.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas('fabricCanvas', {
    enableRetinaScaling: true,
    objectCaching: false,
    allowTouchScrolling: true
  });
  canvas.setHeight(96); // Printer height
  canvas.setWidth(320); // Max width for a label

  // Get references to control elements
  fontSizeInput = document.getElementById('fontSize');
  fontFamilyInput = document.getElementById('fontFamilyInput');
  ditheringAlgorithmSelect = document.getElementById('ditheringAlgorithmSelect'); // Initialize new reference

  // QR Code content input event listener
  const qrContentInput = document.getElementById('qrContentInput');
  const qrTypeSelect = document.getElementById('qrTypeSelect');

  // Sections
  const qrSectionText = document.getElementById('qr-section-text');
  const qrSectionWifi = document.getElementById('qr-section-wifi');
  const qrSectionContact = document.getElementById('qr-section-contact');
  const qrSectionPhone = document.getElementById('qr-section-phone');
  const qrSectionSms = document.getElementById('qr-section-sms');
  const qrSectionEmail = document.getElementById('qr-section-email');
  const qrSectionGeo = document.getElementById('qr-section-geo');
  const qrSectionCalendar = document.getElementById('qr-section-calendar');

  const sections = {
    text: qrSectionText,
    wifi: qrSectionWifi,
    contact: qrSectionContact,
    phone: qrSectionPhone,
    sms: qrSectionSms,
    email: qrSectionEmail,
    geo: qrSectionGeo,
    calendar: qrSectionCalendar
  };

  // Inputs
  const inputsToMonitor = [
    'qrContentInput',
    'qrWifiSsid', 'qrWifiPassword', 'qrWifiEncryption', 'qrWifiHidden',
    'qrContactName', 'qrContactOrg', 'qrContactTitle', 'qrContactPhone', 'qrContactEmail', 'qrContactUrl', 'qrContactAddress',
    'qrPhone',
    'qrSmsPhone', 'qrSmsMessage',
    'qrEmailTo', 'qrEmailSubject', 'qrEmailBody',
    'qrGeoLat', 'qrGeoLong',
    'qrCalSummary', 'qrCalStart', 'qrCalEnd', 'qrCalLocation', 'qrCalDesc'
  ];

  inputsToMonitor.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateQRCodeFromInput);
      el.addEventListener('change', updateQRCodeFromInput);
    }
  });

  // Event listeners for QR Type
  if (qrTypeSelect) {
    qrTypeSelect.addEventListener('change', () => {
      const type = qrTypeSelect.value;
      // Hide all first
      Object.values(sections).forEach(s => { if (s) s.style.display = 'none'; });
      // Show selected
      if (sections[type]) sections[type].style.display = (type === 'wifi' || type === 'contact' || type === 'sms' || type === 'email' || type === 'geo' || type === 'calendar' || type === 'phone') ? 'flex' : 'block';

      updateQRCodeFromInput();
    });
  }

  // Event listener for object selection to update UI controls
  canvas.on('selection:cleared', (e) => {
    clearTextControls();
    removeEmptyTextObjects(e);
  });
  canvas.on('selection:updated', (e) => {
    updateTextControls();
    removeEmptyTextObjects(e);
  });
  canvas.on('selection:created', updateTextControls);
  canvas.on('object:modified', handleObjectModified); // Update controls when object is modified (e.g., scaled)

  // Double-click to focus input
  canvas.on('mouse:dblclick', (e) => {
    if (e.target && e.target.isQRCode) {
      const typeSelect = document.getElementById('qrTypeSelect');
      const type = typeSelect ? typeSelect.value : 'text';
      let inputToFocus = null;

      switch (type) {
        case 'wifi':
          inputToFocus = document.getElementById('qrWifiSsid');
          break;
        case 'contact':
          inputToFocus = document.getElementById('qrContactName');
          break;
        case 'phone':
          inputToFocus = document.getElementById('qrPhone');
          break;
        case 'sms':
          inputToFocus = document.getElementById('qrSmsPhone');
          break;
        case 'email':
          inputToFocus = document.getElementById('qrEmailTo');
          break;
        case 'geo':
          inputToFocus = document.getElementById('qrGeoLat');
          break;
        case 'calendar':
          inputToFocus = document.getElementById('qrCalSummary');
          break;
        case 'text':
        default:
          inputToFocus = document.getElementById('qrContentInput');
          break;
      }

      if (inputToFocus) {
        inputToFocus.focus();
        if (inputToFocus.select) {
          inputToFocus.select();
        }
      }
    }
  });

  // Save state when starting to transform an object
  canvas.on('before:transform', (e) => {
    const obj = e.transform.target;
    obj.lastState = {
      top: obj.top,
      left: obj.left,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
    };
  });

  canvas.on('object:modified', (e) => {
    const obj = e.target;
    obj.setCoords();
    delete obj.lastState;
  });

  // Constrain object scaling to stay within padding bounds
  canvas.on('object:scaling', (e) => {
    const obj = e.target;

    // QR Code Snapping Logic
    if (obj.isQRCode && obj.qrModuleCount) {
      let currentScaledDimension;
      let baseDimension;

      const corner = (e.transform && e.transform.corner) ? e.transform.corner : 'br';

      // If dragging vertical handles (mt/mb), use height/scaleY as the driver
      if (corner === 'mt' || corner === 'mb') {
        currentScaledDimension = obj.height * obj.scaleY;
        baseDimension = obj.height || 1;
      } else {
        // Default to width/scaleX for everything else
        currentScaledDimension = obj.width * obj.scaleX;
        baseDimension = obj.width || 1;
      }

      const moduleSize = Math.max(1, Math.round(currentScaledDimension / obj.qrModuleCount));
      const newScale = (moduleSize * obj.qrModuleCount) / baseDimension;

      // Update scale while maintaining the correct anchor point
      // When resizing from top/left, we must adjust position because Fabric's scale change
      // is always relative to the object's origin (usually top-left), but user interaction
      // expects a different fixed point (e.g. dragging TL means BR is fixed).
      if (e.transform && e.transform.corner) {
        const corner = e.transform.corner;
        const cornerMap = {
          'tl': { x: 'right', y: 'bottom' },
          'tr': { x: 'left', y: 'bottom' },
          'bl': { x: 'right', y: 'top' },
          'br': { x: 'left', y: 'top' },
          'mt': { x: 'center', y: 'bottom' },
          'mb': { x: 'center', y: 'top' },
          'ml': { x: 'right', y: 'center' },
          'mr': { x: 'left', y: 'center' }
        };

        // If we have a defined pivot for this corner
        if (cornerMap[corner]) {
          const pivot = cornerMap[corner];
          // Get current absolute position of pivot with CURRENT scale/pos
          const pivotPoint = obj.translateToOriginPoint(obj.getCenterPoint(), pivot.x, pivot.y);

          // Update scale
          obj.scaleX = newScale;
          obj.scaleY = newScale;

          // Adjust position so pivot remains at pivotPoint with NEW scale
          obj.setPositionByOrigin(pivotPoint, pivot.x, pivot.y);
        } else {
          // Fallback (e.g. rotation or unknown)
          obj.scaleX = newScale;
          obj.scaleY = newScale;
        }
      } else {
        // Fallback if no transform info
        obj.scaleX = newScale;
        obj.scaleY = newScale;
      }
    }

    // Update cached bounding box
    obj.setCoords();

    const objBBox = obj.getBoundingRect();
    const bounds = getPaddingBounds();

    // Revert changes in scale and position if exceeding boundaries,
    // but always allow to scale object down
    if ((obj.scaleX > obj.lastState.scaleX ||
          obj.scaleY > obj.lastState.scaleY) &&
        (objBBox.top < bounds.top ||
          objBBox.left < bounds.left ||
          objBBox.top + objBBox.height > bounds.bottom ||
          objBBox.left + objBBox.width > bounds.right)) {
      obj.top = obj.lastState.top;
      obj.left = obj.lastState.left;
      obj.scaleX = obj.lastState.scaleX;
      obj.scaleY = obj.lastState.scaleY;
      obj.setCoords();
      return;
    }

    constrainObjectToCanvas(obj);

    obj.lastState.top = obj.top;
    obj.lastState.left = obj.left;
    obj.lastState.scaleX = obj.scaleX;
    obj.lastState.scaleY = obj.scaleY;
  });

  // Constrain object movement to stay within padding bounds
  canvas.on('object:moving', (e) => {
    constrainObjectToCanvas(e.target);
  });

  // Event listeners for styling controls
  // fontSizeInput.addEventListener('change', applyTextProperties); // Handled in ui.js
  // fontFamilySelect.addEventListener('change', applyTextProperties); // Handled in ui.js

  // Event listener for dithering algorithm selection
  if (ditheringAlgorithmSelect) {
    ditheringAlgorithmSelect.addEventListener('change', applyDitheringToActiveImage);
  }

  // Event listener for image upload
  const imageUploadInput = document.getElementById('imageUploadInput');
  if (imageUploadInput) {
    imageUploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          const imgDataUrl = event.target.result;
          // Create a temporary image element to get ImageData
          const tempImage = new Image();
          tempImage.onload = function () {
            const canvasWidth = canvas.getWidth();
            const canvasHeight = canvas.getHeight();

            // Calculate scaling factors
            const scaleX = canvasWidth / tempImage.width;
            const scaleY = canvasHeight / tempImage.height;
            const initialScale = Math.min(scaleX, scaleY, 1); // Only scale down if image is larger than canvas

            const targetWidth = tempImage.width * initialScale;
            const targetHeight = tempImage.height * initialScale;

            // Get ImageData at the target scaled size
            const originalImageData = getImageDataFromImage(tempImage, targetWidth, targetHeight, false);

            // Default dithering algorithm for now
            const currentDitheringAlgorithm = 'floyd-steinberg';
            const ditheredImageData = ditheringAlgorithms[currentDitheringAlgorithm](toGrayscale(originalImageData));
            const ditheredDataURL = imageDataToDataURL(ditheredImageData);

            fabric.Image.fromURL(ditheredDataURL, function (img) {
              img.originalImageDataURL = imgDataUrl; // Store original URL
              img.ditheringAlgorithm = currentDitheringAlgorithm; // Store selected algorithm
              img.originalWidth = tempImage.width; // Store original width
              img.originalHeight = tempImage.height; // Store original height

              const bounds = getPaddingBounds();
              const contentHeight = bounds.bottom - bounds.top;

              img.set({
                scaleX: 1, // Image data is already scaled, so set base scale to 1
                scaleY: 1, // Image data is already scaled, so set base scale to 1
                left: bounds.left, // Align to left padding boundary
                top: bounds.top + (contentHeight - img.height) / 2, // Vertically center within padding bounds
                isUploadedImage: true
              }); canvas.add(img);
              canvas.setActiveObject(img);
              canvas.renderAll();
            }, {
              crossOrigin: 'anonymous' // Important for loading external images, though data URL might not strictly need it
            });
          }; tempImage.src = imgDataUrl; // This will trigger tempImage.onload
          e.target.value = ''; // Clear the input so the same file can be uploaded again
        };
        reader.readAsDataURL(file);
      }
    });
  }
});

function constrainObjectToCanvas(obj) {
  const bounds = getPaddingBounds();

  // Update cached bounding box
  obj.setCoords();

  // Get object dimensions
  const objBBox = obj.getBoundingRect();
  const objWidth = objBBox.width;
  const objHeight = objBBox.height;

  // Constrain position
  let newLeft = objBBox.left;
  let newTop = objBBox.top;

  // Left constraint
  if (newLeft < bounds.left) {
    newLeft = bounds.left;
  }
  // Right constraint
  if (newLeft + objWidth > bounds.right) {
    newLeft = bounds.right - objWidth;
  }
  // Top constraint
  if (newTop < bounds.top) {
    newTop = bounds.top;
  }
  // Bottom constraint
  if (newTop + objHeight > bounds.bottom) {
    newTop = bounds.bottom - objHeight;
  }

  obj.left += newLeft - objBBox.left;
  obj.top += newTop - objBBox.top;
  obj.setCoords();
}

function removeEmptyTextObjects(e) {
  if (e.deselected) {
    e.deselected.forEach(obj => {
      if (obj.type === 'i-text' && (!obj.text || obj.text.trim() === '')) {
        canvas.remove(obj);
      }
    });
    canvas.renderAll();
  }
}

function handleObjectModified(e) {
  const modifiedObject = e.target;
  if (modifiedObject && modifiedObject.type === 'image') {
    reDitherImageOnScale(modifiedObject);
  }
  updateTextControls(); // Always update text controls regardless of object type
}

// Function to re-dither an image when it's scaled on the canvas
function reDitherImageOnScale(fabricImageObject) {
  if (!fabricImageObject.originalImageDataURL || !fabricImageObject.ditheringAlgorithm) {
    return; // Cannot re-dither without original data or algorithm
  }

  const originalImageDataURL = fabricImageObject.originalImageDataURL;
  const ditheringAlgorithm = fabricImageObject.ditheringAlgorithm;

  const tempImage = new Image();
  tempImage.onload = function () {
    const targetWidth = fabricImageObject.getScaledWidth();
    const targetHeight = fabricImageObject.getScaledHeight();
    const originalImageData = getImageDataFromImage(tempImage, targetWidth, targetHeight, false);
    const ditheredImageData = ditheringAlgorithms[ditheringAlgorithm](toGrayscale(originalImageData)); const ditheredDataURL = imageDataToDataURL(ditheredImageData);

    // Get current scale and position to re-apply after source change
    const currentScaleX = fabricImageObject.scaleX;
    const currentScaleY = fabricImageObject.scaleY;
    const currentLeft = fabricImageObject.left;
    const currentTop = fabricImageObject.top;
    const currentAngle = fabricImageObject.angle;

    // Use setSrc to update the image data without replacing the object
    fabricImageObject.setSrc(ditheredDataURL, function () {
      // After setSrc, Fabric.js has updated its internal width/height to the dithered image's dimensions.
      // Since the dithered image is already scaled to the desired size, set scaleX/Y to 1.
      fabricImageObject.set({
        scaleX: 1, // Dithered image data is already scaled to current object size
        scaleY: 1, // Dithered image data is already scaled to current object size
        left: currentLeft,     // Re-apply position
        top: currentTop,       // Re-apply position
        angle: currentAngle,   // Re-apply rotation
      });
      canvas.renderAll();
    });
  };
  tempImage.src = originalImageDataURL;
}

function addTextToCanvas() {
  const textContent = 'Type here';

  const bounds = getPaddingBounds();
  const contentWidth = bounds.right - bounds.left;
  const contentHeight = bounds.bottom - bounds.top;

  const newText = new fabric.IText(textContent, {
    left: bounds.left,
    fontFamily: fontFamilyInput.value || 'Arial', // Use fontFamilySelect
    fontSize: parseFloat(fontSizeInput.value) || 48,
    fill: '#000000',
    fontWeight: 'normal', // Default to normal, will be set by toggleStyle if active
    fontStyle: 'normal',  // Default to normal, will be set by toggleStyle if active
    underline: false,     // Default to false, will be set by toggleStyle if active
    textBaseline: 'alphabetic', // Explicitly set a valid textBaseline
  });

  // Center vertically within padding bounds
  newText.set({
    top: bounds.top + (contentHeight - newText.getScaledHeight()) / 2
  });
  canvas.add(newText);
  canvas.setActiveObject(newText);
  newText.enterEditing();
  newText.selectAll();
  canvas.renderAll();
  updateTextControls();
  canvas.renderAll();
}

function deleteSelectedObject() {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.remove(activeObject);
    canvas.renderAll();
    clearTextControls();
  }
}

function addQRCodeToCanvas() {
  // Check if QRCode library is loaded
  if (typeof QRCode === 'undefined') {
    alert("QR code library failed to load. Please refresh the page.");
    console.error('QRCode library not available');
    return;
  }

  // Prompt user for QR code content
  // Default content for new QR code
  const qrContent = "https://example.com";

  // Create a temporary container for QR code generation
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '200px';
  tempDiv.style.height = '200px';
  document.body.appendChild(tempDiv);

  // Generate QR code using the library (this library uses constructor pattern)
  const qrcode = new QRCode(tempDiv, {
    text: qrContent,
    width: 200,
    height: 200,
    colorDark: '#000000',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.H
  });

  // Capture module count for snapping
  let moduleCount = 21; // Default fallback
  if (qrcode._oQRCode && qrcode._oQRCode.moduleCount) {
    moduleCount = qrcode._oQRCode.moduleCount;
  }

  // Wait a bit for the QR code to render, then get the image
  setTimeout(() => {
    // Get the canvas or image element from the QR code
    const qrImg = tempDiv.querySelector('img');
    const qrCanvas = tempDiv.querySelector('canvas');

    let imageSrc;
    if (qrImg && qrImg.src) {
      imageSrc = qrImg.src;
    } else if (qrCanvas) {
      imageSrc = qrCanvas.toDataURL('image/png');
    } else {
      // Fallback: try to get from SVG
      const qrSvg = tempDiv.querySelector('svg');
      if (qrSvg) {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        imageSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      } else {
        alert("Failed to generate QR code image.");
        document.body.removeChild(tempDiv);
        return;
      }
    }

    // Add QR code image to canvas
    fabric.Image.fromURL(imageSrc, function (img) {
      const bounds = getPaddingBounds();
      const contentWidth = bounds.right - bounds.left;
      const contentHeight = bounds.bottom - bounds.top;

      // Scale QR code to fit within the padding bounds (max 80% of content area)
      const maxWidth = contentWidth * 0.8;
      const maxHeight = contentHeight * 0.8;

      // Calculate scale based on module count to snap to integer pixels
      // Each module should be an integer number of pixels (1x, 2x, 3x...)
      let targetModuleSize = 1;

      // Try to make it as large as possible within the 80% bounds
      const maxPossibleModuleScaleX = maxWidth / (img.width / (img.width / moduleCount)); // Approx? No.
      // img.width is 200 (or whatever generated). moduleCount is real count.
      // We want finalWidth = K * moduleCount.
      // scale = finalWidth / img.width

      // Calculate initial snap size
      const availableSize = Math.min(maxWidth, maxHeight);
      let idealModuleSizePixels = Math.floor(availableSize / moduleCount);
      if (idealModuleSizePixels < 1) idealModuleSizePixels = 1;

      const targetDimension = idealModuleSizePixels * moduleCount;
      const scale = targetDimension / img.width;

      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      img.set({
        scaleX: scale,
        scaleY: scale,
        left: bounds.left + (contentWidth - scaledWidth) / 2, // Center horizontally within padding bounds
        top: bounds.top + (contentHeight - scaledHeight) / 2, // Center vertically within padding bounds
        isQRCode: true,
        qrContent: qrContent, // Store the content for potential re-editing
        qrModuleCount: moduleCount,
        lockUniScaling: true,
        lockScalingFlip: true,
      });

      img.setControlsVisibility({ mtr: false });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();

      // Clean up temporary div
      document.body.removeChild(tempDiv);
    }, {
      crossOrigin: 'anonymous'
    });
  }, 100);
}

// Function to update QR code content while maintaining position and size
function updateQRCodeFromInput() {
  const activeObject = canvas.getActiveObject();
  if (!activeObject || !activeObject.isQRCode) return;

  const qrTypeSelect = document.getElementById('qrTypeSelect');
  let newContent = "";

  if (qrTypeSelect) {
    const type = qrTypeSelect.value;
    if (type === 'wifi') {
      const ssid = document.getElementById('qrWifiSsid').value || '';
      const pass = document.getElementById('qrWifiPassword').value || '';
      const enc = document.getElementById('qrWifiEncryption').value || 'WPA';
      const hidden = document.getElementById('qrWifiHidden').checked;
      const escapeWifi = (str) => str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/:/g, '\\:');

      if (ssid) {
        newContent = `WIFI:T:${enc};S:${escapeWifi(ssid)};P:${escapeWifi(pass)};H:${hidden};;`;
      } else {
        newContent = activeObject.qrContent;
      }
    } else if (type === 'contact') {
      // vCard 3.0
      const n = document.getElementById('qrContactName').value || '';
      const org = document.getElementById('qrContactOrg').value || '';
      const title = document.getElementById('qrContactTitle').value || '';
      const tel = document.getElementById('qrContactPhone').value || '';
      const email = document.getElementById('qrContactEmail').value || '';
      const url = document.getElementById('qrContactUrl').value || '';
      const adr = document.getElementById('qrContactAddress').value || '';

      if (n || org || title || tel || email || url || adr) {
        newContent = `BEGIN:VCARD\nVERSION:3.0\nN:${n}\nFN:${n}\nORG:${org}\nTITLE:${title}\nTEL:${tel}\nEMAIL:${email}\nURL:${url}\nADR:${adr}\nEND:VCARD`;
      } else {
        newContent = activeObject.qrContent;
      }
    } else if (type === 'phone') {
      const tel = document.getElementById('qrPhone').value || '';
      newContent = tel ? `tel:${tel}` : activeObject.qrContent;
    } else if (type === 'sms') {
      const tel = document.getElementById('qrSmsPhone').value || '';
      const msg = document.getElementById('qrSmsMessage').value || '';
      newContent = tel ? `SMSTO:${tel}:${msg}` : activeObject.qrContent;
    } else if (type === 'email') {
      const to = document.getElementById('qrEmailTo').value || '';
      const sub = document.getElementById('qrEmailSubject').value || '';
      const body = document.getElementById('qrEmailBody').value || '';
      if (to) {
        newContent = `mailto:${to}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
      } else {
        newContent = activeObject.qrContent;
      }
    } else if (type === 'geo') {
      const lat = document.getElementById('qrGeoLat').value || '';
      const long = document.getElementById('qrGeoLong').value || '';
      newContent = (lat && long) ? `geo:${lat},${long}` : activeObject.qrContent;
    } else if (type === 'calendar') {
      const sum = document.getElementById('qrCalSummary').value || '';
      const start = document.getElementById('qrCalStart').value || ''; // yyyy-MM-ddThh:mm
      const end = document.getElementById('qrCalEnd').value || '';
      const loc = document.getElementById('qrCalLocation').value || '';
      const desc = document.getElementById('qrCalDesc').value || '';

      if (sum && start && end) {
        const formatTime = (iso) => iso.replace(/[-:]/g, '') + "00";
        newContent = `BEGIN:VEVENT\nSUMMARY:${sum}\nDTSTART:${formatTime(start)}\nDTEND:${formatTime(end)}\nLOCATION:${loc}\nDESCRIPTION:${desc}\nEND:VEVENT`;
      } else {
        newContent = activeObject.qrContent;
      }
    } else {
      // Text Mode
      const qrContentInput = document.getElementById('qrContentInput');
      if (qrContentInput) {
        newContent = qrContentInput.value.trim();
      }
    }
  }

  if (!newContent || newContent === activeObject.qrContent) return;

  // Debounce the update
  if (qrUpdateTimer) {
    clearTimeout(qrUpdateTimer);
  }

  qrUpdateTimer = setTimeout(() => {
    // Check if QRCode library is loaded
    if (typeof QRCode === 'undefined') {
      alert("QR code library failed to load. Please refresh the page.");
      return;
    }

    // Capture activeObject again inside timeout to ensure it's still valid/selected
    // Actually, we should probably stick to the one we checked outside, OR re-check.
    // If user changed selection during debounce, we probably shouldn't update the OLD selection unless we tracked it.
    // But since `updateQRCodeFromInput` is driven by global inputs that adhere to the *currently* active object (via UI updates), 
    // it is safer to re-check specific object validity or just target `activeObject` caught in closure if we want to be sure.
    // However, if selection changed, the inputs would have been updated to the new selection's values.
    // Let's re-acquire active object to be safe and ensure we are modifying what the user thinks they are modifying.
    const currentActive = canvas.getActiveObject();
    if (!currentActive || !currentActive.isQRCode) return; // Abort if selection changed

    // Store current position and size
    const currentLeft = currentActive.left;
    const currentTop = currentActive.top;
    const currentScaleX = currentActive.scaleX;
    const currentScaleY = currentActive.scaleY;
    const currentAngle = currentActive.angle || 0;

    // Create a temporary container for QR code generation
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '200px';
    tempDiv.style.height = '200px';
    document.body.appendChild(tempDiv);

    // Generate new QR code
    const qrcode = new QRCode(tempDiv, {
      text: newContent,
      width: 200,
      height: 200,
      colorDark: '#000000',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.H
    });

    // Capture module count for snapping
    let moduleCount = 21; // Default fallback
    if (qrcode._oQRCode && qrcode._oQRCode.moduleCount) {
      moduleCount = qrcode._oQRCode.moduleCount;
    }

    // Wait for QR code to render
    setTimeout(() => {
      const qrImg = tempDiv.querySelector('img');
      const qrCanvas = tempDiv.querySelector('canvas');

      let imageSrc;
      if (qrImg && qrImg.src) {
        imageSrc = qrImg.src;
      } else if (qrCanvas) {
        imageSrc = qrCanvas.toDataURL('image/png');
      } else {
        const qrSvg = tempDiv.querySelector('svg');
        if (qrSvg) {
          const svgData = new XMLSerializer().serializeToString(qrSvg);
          imageSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        } else {
          // Failure
          document.body.removeChild(tempDiv);
          return;
        }
      }

      // Update the existing object source
      currentActive.setSrc(imageSrc, function () {
        // Logic to maintain size but snap to new module count
        // Note: currentActive.width might have been reset by setSrc to the new image natural width (200)

        // Calculate scale based on module count to snap to integer pixels
        // We want to keep the object roughly the same physical size on the canvas
        // Visual Size = currentActive.getScaledWidth();
        // Since we just called setSrc, fabric might have reset scale to 1 or changed width.
        // Actually setSrc resets width/height to new image dims, and usually resets scale unless we re-apply it.

        // Let's rely on `currentActive.getScaledWidth()` BUT we need to know what it was *before* we called setSrc.
        // We captured `currentScaleX`. And we assume previous natural width was 200 (since we generate 200x200).
        // If previous natural width was different, we might drift. 
        // But we always generate 200x200 here.

        const previousVisualWidth = currentScaleX * (currentActive.width || 200); // approximate if width changed already?
        // Wait, setSrc callback: `this` is the object. `this.width` is new width (200).

        let idealModuleSizePixels = Math.round(previousVisualWidth / moduleCount);
        if (idealModuleSizePixels < 1) idealModuleSizePixels = 1;

        const targetDimension = idealModuleSizePixels * moduleCount;
        const newScale = targetDimension / currentActive.width;

        currentActive.set({
          scaleX: newScale,
          scaleY: newScale,
          left: currentLeft,
          top: currentTop,
          angle: currentAngle,
          qrContent: newContent,
          qrModuleCount: moduleCount,
          dirty: true
        });

        currentActive.setCoords();
        canvas.renderAll();

        // Clean up temporary div
        document.body.removeChild(tempDiv);
      }); // end setSrc

    }, 50); // inner timeout for rendering
  }, 300); // debounce delay
}

function applyTextProperties() {
  const activeObject = canvas.getActiveObject();
  if (activeObject && activeObject.type === 'i-text') {
    const newFontSize = parseFloat(fontSizeInput.value);
    activeObject.set({
      fontSize: newFontSize,
      fontFamily: fontFamilyInput.value || activeObject.fontFamily, // Use fontFamilySelect
      scaleX: 1, // Reset scale when font size is manually set
      scaleY: 1, // Reset scale when font size is manually set
    });
    canvas.renderAll();
    // After applying new font size, update controls to reflect the change
    updateTextControls();
  }
}

function updateTextControls() {
  const activeObject = canvas.getActiveObject();

  const textInputGroup = document.getElementById('text-input-group');
  const fontStyleGroup = document.getElementById('font-style-group');
  const textFormatGroup = document.getElementById('text-format-group');
  const alignmentGroup = document.getElementById('alignment-group');
  const imageControlsGroup = document.getElementById('image-controls-group');
  const qrControlsGroup = document.getElementById('qr-controls-group');
  const objectSpecificControlsBox = document.getElementById('object-specific-controls');

  // Groups that are object-specific styling controls
  const textStylingGroups = [fontStyleGroup, textFormatGroup];
  const imageStylingGroup = imageControlsGroup;

  // Hide all object-specific groups initially
  textStylingGroups.forEach(group => {
    if (group) group.style.display = 'none';
  });
  if (imageStylingGroup) imageStylingGroup.style.display = 'none';
  if (qrControlsGroup) qrControlsGroup.style.display = 'none';

  // The general controls (text input, alignment) are always visible based on the HTML structure.

  if (activeObject) {
    if (objectSpecificControlsBox) objectSpecificControlsBox.style.display = 'block';

    if (activeObject.type === 'i-text') {
      // Show text styling groups
      textStylingGroups.forEach(group => {
        if (group) group.style.display = 'flex';
      });

      const effectiveFontSize = Math.round(activeObject.fontSize * activeObject.scaleY);
      fontSizeInput.value = effectiveFontSize;
      fontFamilyInput.value = activeObject.fontFamily;

      document.querySelectorAll('.toggle-btn').forEach(button => {
        const property = button.dataset.property;
        let isActive = false;
        if (property === 'bold') isActive = activeObject.fontWeight === 'bold';
        else if (property === 'italic') isActive = activeObject.fontStyle === 'italic';
        else if (property === 'underline') isActive = activeObject.underline;
        button.classList.toggle('active', isActive);
      });
    } else if (activeObject.type === 'image') {
      // Check if it's a QR code
      if (activeObject.isQRCode) {
        // Show QR controls ONLY when QR code is selected
        if (qrControlsGroup) {
          qrControlsGroup.style.display = 'flex';

          const content = activeObject.qrContent || '';

          const qrTypeSelect = document.getElementById('qrTypeSelect');
          const sections = {
            text: document.getElementById('qr-section-text'),
            wifi: document.getElementById('qr-section-wifi'),
            contact: document.getElementById('qr-section-contact'),
            phone: document.getElementById('qr-section-phone'),
            sms: document.getElementById('qr-section-sms'),
            email: document.getElementById('qr-section-email'),
            geo: document.getElementById('qr-section-geo'),
            calendar: document.getElementById('qr-section-calendar')
          };

          let detectedType = 'text';

          // Detect Type and populate fields
          if (content.startsWith('WIFI:')) {
            detectedType = 'wifi';
            const unescapeWifi = (str) => (str || '').replace(/\\(:|;|\\|,)/g, '$1');
            const matchS = content.match(/S:([^;]*)/);
            const matchT = content.match(/T:([^;]*)/);
            const matchP = content.match(/P:([^;]*)/);
            const matchH = content.match(/H:([^;]*)/);

            if (document.getElementById('qrWifiSsid')) document.getElementById('qrWifiSsid').value = matchS ? unescapeWifi(matchS[1]) : '';
            if (document.getElementById('qrWifiEncryption')) document.getElementById('qrWifiEncryption').value = matchT ? matchT[1] : 'WPA';
            if (document.getElementById('qrWifiPassword')) document.getElementById('qrWifiPassword').value = matchP ? unescapeWifi(matchP[1]) : '';
            if (document.getElementById('qrWifiHidden')) document.getElementById('qrWifiHidden').checked = matchH ? matchH[1] === 'true' : false;

          } else if (content.startsWith('BEGIN:VCARD')) {
            detectedType = 'contact';
            const getValue = (key) => {
              const match = content.match(new RegExp(`${key}:(.*)`));
              return match ? match[1] : '';
            };
            if (document.getElementById('qrContactName')) document.getElementById('qrContactName').value = getValue('FN') || getValue('N');
            if (document.getElementById('qrContactOrg')) document.getElementById('qrContactOrg').value = getValue('ORG');
            if (document.getElementById('qrContactTitle')) document.getElementById('qrContactTitle').value = getValue('TITLE');
            if (document.getElementById('qrContactPhone')) document.getElementById('qrContactPhone').value = getValue('TEL');
            if (document.getElementById('qrContactEmail')) document.getElementById('qrContactEmail').value = getValue('EMAIL');
            if (document.getElementById('qrContactUrl')) document.getElementById('qrContactUrl').value = getValue('URL');
            if (document.getElementById('qrContactAddress')) document.getElementById('qrContactAddress').value = getValue('ADR');

          } else if (content.toLowerCase().startsWith('tel:')) {
            detectedType = 'phone';
            if (document.getElementById('qrPhone')) document.getElementById('qrPhone').value = content.substring(4);

          } else if (content.startsWith('SMSTO:')) {
            detectedType = 'sms';
            const parts = content.split(':');
            if (parts.length >= 2) {
              if (document.getElementById('qrSmsPhone')) document.getElementById('qrSmsPhone').value = parts[1];
              if (document.getElementById('qrSmsMessage')) document.getElementById('qrSmsMessage').value = parts.slice(2).join(':');
            }

          } else if (content.toLowerCase().startsWith('mailto:')) {
            detectedType = 'email';
            try {
              const url = new URL(content.replace('mailto:', 'http://dummy.com/'));
              if (document.getElementById('qrEmailTo')) document.getElementById('qrEmailTo').value = content.match(/^mailto:([^?]*)/)[1];
              if (document.getElementById('qrEmailSubject')) document.getElementById('qrEmailSubject').value = url.searchParams.get('subject') || '';
              if (document.getElementById('qrEmailBody')) document.getElementById('qrEmailBody').value = url.searchParams.get('body') || '';
            } catch (e) { console.error("Error parsing mailto", e); }

          } else if (content.startsWith('geo:')) {
            detectedType = 'geo';
            const parts = content.substring(4).split(',');
            if (document.getElementById('qrGeoLat')) document.getElementById('qrGeoLat').value = parts[0];
            if (document.getElementById('qrGeoLong')) document.getElementById('qrGeoLong').value = parts[1];

          } else if (content.startsWith('BEGIN:VEVENT')) {
            detectedType = 'calendar';
            // Parsing omitted
          } else {
            detectedType = 'text';
            if (document.getElementById('qrContentInput')) {
              document.getElementById('qrContentInput').value = content;
            }
          }

          if (qrTypeSelect) {
            qrTypeSelect.value = detectedType;
            // Trigger visibility update
            Object.values(sections).forEach(s => { if (s) s.style.display = 'none'; });
            if (sections[detectedType]) sections[detectedType].style.display = (detectedType === 'wifi' || detectedType === 'contact' || detectedType === 'sms' || detectedType === 'email' || detectedType === 'geo' || detectedType === 'calendar' || detectedType === 'phone') ? 'flex' : 'block';
          }
        }
        // Make sure image controls are hidden
        if (imageStylingGroup) imageStylingGroup.style.display = 'none';
      } else {
        // Show image styling group for regular images
        if (imageStylingGroup) imageStylingGroup.style.display = 'flex';
        // Make sure QR controls are hidden
        if (qrControlsGroup) qrControlsGroup.style.display = 'none';

        if (ditheringAlgorithmSelect) {
          if (activeObject.ditheringAlgorithm) {
            ditheringAlgorithmSelect.value = activeObject.ditheringAlgorithm;
          } else {
            ditheringAlgorithmSelect.value = 'none';
          }
        }
      }
    } else {
      // Not text or image, hide all controls
      if (qrControlsGroup) qrControlsGroup.style.display = 'none';
      if (imageStylingGroup) imageStylingGroup.style.display = 'none';
    }
  } else {
    // No object selected, hide the object-specific box and all controls
    if (objectSpecificControlsBox) objectSpecificControlsBox.style.display = 'none';
    if (qrControlsGroup) qrControlsGroup.style.display = 'none';
    if (imageStylingGroup) imageStylingGroup.style.display = 'none';

    // Ensure controls are reset
    clearTextControls();
  }
}

function clearTextControls() {
  // Reset to default or clear when no text object is selected
  fontSizeInput.value = '48';
  fontFamilyInput.value = 'Arial';
  document.querySelectorAll('.toggle-btn').forEach(button => {
    button.classList.remove('active');
  });
}

// Function to re-apply dithering to the active image
function applyDitheringToActiveImage() {
  const activeObject = canvas.getActiveObject();
  if (activeObject && activeObject.type === 'image' && activeObject.originalImageDataURL) {
    const selectedAlgorithm = ditheringAlgorithmSelect.value;
    activeObject.ditheringAlgorithm = selectedAlgorithm; // Update the stored algorithm

    const tempImage = new Image();
    tempImage.onload = function () {
      const targetWidth = activeObject.getScaledWidth();
      const targetHeight = activeObject.getScaledHeight();
      const originalImageData = getImageDataFromImage(tempImage, targetWidth, targetHeight);
      // Apply dithering (to grayscale first)
      const ditheredImageData = ditheringAlgorithms[selectedAlgorithm](toGrayscale(originalImageData)); const ditheredDataURL = imageDataToDataURL(ditheredImageData);

      // Preserve current position and scale
      const currentScaleX = activeObject.scaleX;
      const currentScaleY = activeObject.scaleY;
      const currentLeft = activeObject.left;
      const currentTop = activeObject.top;

      fabric.Image.fromURL(ditheredDataURL, function (newImg) {
        // Replace the old image object with the new dithered one
        canvas.remove(activeObject);
        // The newImg's intrinsic width/height are already scaled to the desired size.
        // So, we set scaleX/Y to 1 and re-apply position.
        newImg.set({
          scaleX: 1,
          scaleY: 1,
          left: currentLeft,
          top: currentTop,
          isUploadedImage: true,
          originalImageDataURL: activeObject.originalImageDataURL, // Keep original reference
          ditheringAlgorithm: activeObject.ditheringAlgorithm, // Keep selected algorithm
        });
        canvas.add(newImg);
        canvas.setActiveObject(newImg);
        canvas.renderAll();
      });
    };
    tempImage.src = activeObject.originalImageDataURL;
  }
}

// Expose canvas for utils.js to access it
window.getFabricCanvas = function () {
  return canvas;
}

window.fabricEditor = {
  setTextAlign: function (alignment) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    const bounds = getPaddingBounds();
    const contentWidth = bounds.right - bounds.left;
    let objectWidth;
    let newLeft;

    if (activeObject.type === 'i-text') {
      objectWidth = activeObject.getScaledWidth();
      // Set text alignment within the object's bounding box (for multi-line text)
      activeObject.set({ textAlign: alignment });
    } else if (activeObject.type === 'image') {
      objectWidth = activeObject.getScaledWidth();
    } else {
      return; // Not a text or image object, do nothing
    }

    // Adjust the object's left position to align it within the padding bounds
    switch (alignment) {
      case 'left':
        newLeft = bounds.left; // Align to left padding boundary
        break;
      case 'center':
        newLeft = bounds.left + (contentWidth - objectWidth) / 2; // Center within padding bounds
        break;
      case 'right':
        newLeft = bounds.right - objectWidth; // Align to right padding boundary
        break;
      default:
        return;
    }
    activeObject.set({ left: newLeft });
    canvas.renderAll();
  },

  setVerticalAlign: function (alignment) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    const bounds = getPaddingBounds();
    const contentHeight = bounds.bottom - bounds.top;
    let objectHeight;
    let newTop;

    if (activeObject.type === 'i-text') {
      objectHeight = activeObject.getScaledHeight();
    } else if (activeObject.type === 'image') {
      objectHeight = activeObject.getScaledHeight();
    } else {
      return; // Not a text or image object, do nothing
    }

    switch (alignment) {
      case 'top':
        newTop = bounds.top; // Align to top padding boundary
        break;
      case 'middle':
        newTop = bounds.top + (contentHeight - objectHeight) / 2; // Center within padding bounds
        break;
      case 'bottom':
        newTop = bounds.bottom - objectHeight; // Align to bottom padding boundary
        break;
      default:
        return;
    }
    activeObject.set({ top: newTop });
    canvas.renderAll();
  },

  setFontFamily: function (fontFamily) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
      activeObject.set({ fontFamily: fontFamily });
      canvas.renderAll();
      updateTextControls(); // Update UI to reflect change
    }
  },

  setFontSize: function (fontSize) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
      activeObject.set({
        fontSize: fontSize,
        scaleX: 1,
        scaleY: 1
      });
      canvas.renderAll();
      updateTextControls(); // Update UI to reflect change
    }
  },

  getActiveObject: function () {
    return canvas.getActiveObject();
  },

  toggleStyle: function (property) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
      let value;
      if (property === 'bold') {
        value = activeObject.fontWeight === 'bold' ? 'normal' : 'bold';
        activeObject.set({ fontWeight: value });
      } else if (property === 'italic') {
        value = activeObject.fontStyle === 'italic' ? 'normal' : 'italic';
        activeObject.set({ fontStyle: value });
      } else if (property === 'underline') {
        value = !activeObject.underline;
        activeObject.set({ underline: value });
      }
      canvas.renderAll();
      updateTextControls(); // Update UI to reflect change
      return value; // Return the new state
    }
    return false;
  },

  updateCanvasSize: function (width, height) {
    if (canvas) {
      canvas.setWidth(width);
      canvas.setHeight(height);
      updatePaddingGuides();
      canvas.renderAll();
    }
  },

  setPadding: function (top, bottom, left, right) {
    paddingState.top = top;
    paddingState.bottom = bottom;
    paddingState.left = left;
    paddingState.right = right;
    updatePaddingGuides();
    canvas.renderAll();
  },

  getPaddingBounds: function () {
    return getPaddingBounds();
  }
};

// Helper function to get padding bounds in pixels
function getPaddingBounds() {
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();

  return {
    left: paddingState.left,
    top: paddingState.top,
    right: canvasWidth - paddingState.right,
    bottom: canvasHeight - paddingState.bottom
  };
}

// Update visual padding guides on canvas
function updatePaddingGuides() {
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();

  // Remove existing guides
  Object.values(paddingGuides).forEach(guide => {
    if (guide) {
      canvas.remove(guide);
    }
  });

  // Only show guides if padding is set
  if (paddingState.top === 0 && paddingState.bottom === 0 &&
    paddingState.left === 0 && paddingState.right === 0) {
    return;
  }

  // Create guide rectangles (semi-transparent overlays)
  const guideOptions = {
    fill: 'rgba(255, 0, 0, 0.1)',
    stroke: 'rgba(255, 0, 0, 0.3)',
    strokeWidth: 1,
    selectable: false,
    evented: false,
    excludeFromExport: true,
    paddingGuide: true
  };

  // Top padding guide
  if (paddingState.top > 0) {
    paddingGuides.top = new fabric.Rect({
      left: 0,
      top: 0,
      width: canvasWidth,
      height: paddingState.top,
      ...guideOptions
    });
    canvas.add(paddingGuides.top);
    canvas.sendToBack(paddingGuides.top);
  }

  // Bottom padding guide
  if (paddingState.bottom > 0) {
    paddingGuides.bottom = new fabric.Rect({
      left: 0,
      top: canvasHeight - paddingState.bottom,
      width: canvasWidth,
      height: paddingState.bottom,
      ...guideOptions
    });
    canvas.add(paddingGuides.bottom);
    canvas.sendToBack(paddingGuides.bottom);
  }

  // Left padding guide
  if (paddingState.left > 0) {
    paddingGuides.left = new fabric.Rect({
      left: 0,
      top: paddingState.top,
      width: paddingState.left,
      height: canvasHeight - paddingState.top - paddingState.bottom,
      ...guideOptions
    });
    canvas.add(paddingGuides.left);
    canvas.sendToBack(paddingGuides.left);
  }

  // Right padding guide
  if (paddingState.right > 0) {
    paddingGuides.right = new fabric.Rect({
      left: canvasWidth - paddingState.right,
      top: paddingState.top,
      width: paddingState.right,
      height: canvasHeight - paddingState.top - paddingState.bottom,
      ...guideOptions
    });
    canvas.add(paddingGuides.right);
    canvas.sendToBack(paddingGuides.right);
  }
}
