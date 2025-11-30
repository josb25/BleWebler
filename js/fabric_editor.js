let canvas;
let fontSizeInput;
let fontFamilyInput;
let ditheringAlgorithmSelect; // New reference

document.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas('fabricCanvas', {
    enableRetinaScaling: true,
    objectCaching: false
  });
  canvas.setHeight(96); // Printer height
  canvas.setWidth(320); // Max width for a label

  // Get references to control elements
  fontSizeInput = document.getElementById('fontSize');
  fontFamilyInput = document.getElementById('fontFamilyInput');
  ditheringAlgorithmSelect = document.getElementById('ditheringAlgorithmSelect'); // Initialize new reference


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

              img.set({
                scaleX: 1, // Image data is already scaled, so set base scale to 1
                scaleY: 1, // Image data is already scaled, so set base scale to 1
                left: 0, // Align to left
                top: (canvasHeight - img.height) / 2, // Vertically center
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

  const newText = new fabric.IText(textContent, {
    left: 0,
    fontFamily: fontFamilyInput.value || 'Arial', // Use fontFamilySelect
    fontSize: parseFloat(fontSizeInput.value) || 48,
    fill: '#000000',
    fontWeight: 'normal', // Default to normal, will be set by toggleStyle if active
    fontStyle: 'normal',  // Default to normal, will be set by toggleStyle if active
    underline: false,     // Default to false, will be set by toggleStyle if active
    textBaseline: 'alphabetic', // Explicitly set a valid textBaseline
  });

  // Center vertically
  const canvasHeight = canvas.getHeight();
  newText.set({
    top: (canvasHeight - newText.getScaledHeight()) / 2
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
  const objectSpecificControlsBox = document.getElementById('object-specific-controls');

  // Groups that are object-specific styling controls
  const textStylingGroups = [fontStyleGroup, textFormatGroup];
  const imageStylingGroup = imageControlsGroup;

  // Hide all object-specific groups initially
  textStylingGroups.forEach(group => {
    if (group) group.style.display = 'none';
  });
  if (imageStylingGroup) imageStylingGroup.style.display = 'none';

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
      // Show image styling group
      if (imageStylingGroup) imageStylingGroup.style.display = 'flex';

      if (ditheringAlgorithmSelect) {
        if (activeObject.ditheringAlgorithm) {
          ditheringAlgorithmSelect.value = activeObject.ditheringAlgorithm;
        } else {
          ditheringAlgorithmSelect.value = 'none';
        }
      }
    }
  } else {
    // No object selected, hide the object-specific box
    if (objectSpecificControlsBox) objectSpecificControlsBox.style.display = 'none';

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

    const canvasWidth = canvas.getWidth();
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

    // Adjust the object's left position to align it within the canvas
    switch (alignment) {
      case 'left':
        newLeft = 0; // Align to left edge of canvas
        break;
      case 'center':
        newLeft = (canvasWidth - objectWidth) / 2; // Center horizontally
        break;
      case 'right':
        newLeft = canvasWidth - objectWidth; // Align to right edge of canvas
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

    const canvasHeight = canvas.getHeight();
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
        newTop = 0; // Align to top of canvas
        break;
      case 'middle':
        newTop = (canvasHeight - objectHeight) / 2; // Center vertically
        break;
      case 'bottom':
        newTop = canvasHeight - objectHeight; // Align to bottom of canvas
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
      canvas.renderAll();
    }
  }
};
