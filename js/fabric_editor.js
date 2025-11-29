let canvas;
let fontSizeInput;
let fontFamilyInput;
let boldCheckbox;
let italicCheckbox;
let underlineCheckbox;

document.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas('fabricCanvas');
  canvas.setHeight(96); // Printer height
  canvas.setWidth(320); // Max width for a label

  // Get references to control elements
  fontSizeInput = document.getElementById('fontSize');
  fontFamilyInput = document.getElementById('fontFamilyInput');
  boldCheckbox = document.getElementById('bold');
  italicCheckbox = document.getElementById('italic');
  underlineCheckbox = document.getElementById('underline');

  // Add initial text
  const initialText = new fabric.IText(document.getElementById('newTextContent').value || 'Hello World', {
    left: 50,
    top: 20,
    fontFamily: fontFamilyInput.value || 'Arial', // Use fontFamilySelect
    fontSize: parseFloat(fontSizeInput.value) || 48,
    fill: '#000000',
  });
  canvas.add(initialText);
  canvas.setActiveObject(initialText);

  // Event listener for object selection to update UI controls
  canvas.on('selection:updated', updateTextControls);
  canvas.on('selection:created', updateTextControls);
  canvas.on('selection:cleared', clearTextControls);
  canvas.on('object:modified', updateTextControls); // Update controls when object is modified (e.g., scaled)

  // Event listeners for styling controls
  // fontSizeInput.addEventListener('change', applyTextProperties); // Handled in ui.js
  // fontFamilySelect.addEventListener('change', applyTextProperties); // Handled in ui.js
  boldCheckbox.addEventListener('change', applyTextProperties);
  italicCheckbox.addEventListener('change', applyTextProperties);
  underlineCheckbox.addEventListener('change', applyTextProperties);

  // Event listener for image upload
  const imageUploadInput = document.getElementById('imageUploadInput');
  if (imageUploadInput) {
    imageUploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          const imgDataUrl = event.target.result;
          fabric.Image.fromURL(imgDataUrl, function(img) {
            const canvasWidth = canvas.getWidth();
            const canvasHeight = canvas.getHeight();

            // Set a maximum width for the image to fit within the canvas
            const maxWidth = canvasWidth;
            const maxHeight = canvasHeight;

            // Calculate scaling factors
            const scaleX = maxWidth / img.width;
            const scaleY = maxHeight / img.height;
            const scale = Math.min(scaleX, scaleY, 1); // Only scale down if image is larger than canvas

            img.set({
              scaleX: scale,
              scaleY: scale,
              left: (canvasWidth - img.width * scale) / 2,
              top: (canvasHeight - img.height * scale) / 2,
              // Set a custom property to identify image objects
              isUploadedImage: true
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
          }, {
            crossOrigin: 'anonymous' // Important for loading external images
          });
          e.target.value = ''; // Clear the input so the same file can be uploaded again
        };
        reader.readAsDataURL(file);
      }
    });
  }
});

function addTextToCanvas() {
  const textContent = document.getElementById('newTextContent').value;
  if (!textContent) return;

  const newText = new fabric.IText(textContent, {
    left: 50,
    top: 50,
    fontFamily: fontFamilyInput.value || 'Arial', // Use fontFamilySelect
    fontSize: parseFloat(fontSizeInput.value) || 48,
    fill: '#000000',
    fontWeight: boldCheckbox.checked ? 'bold' : 'normal',
    fontStyle: italicCheckbox.checked ? 'italic' : 'normal',
    underline: underlineCheckbox.checked,
  });
  canvas.add(newText);
  canvas.setActiveObject(newText);
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
      fontWeight: boldCheckbox.checked ? 'bold' : 'normal',
      fontStyle: italicCheckbox.checked ? 'italic' : 'normal',
      underline: underlineCheckbox.checked,
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
  const newTextContentInput = document.getElementById('newTextContent');
  const addTextButton = document.querySelector('button[onclick="addTextToCanvas()"]');
  const deleteSelectedButton = document.querySelector('button[onclick="deleteSelectedObject()"]');

  const textStyleControls = [
    fontSizeInput,
    fontFamilyInput,
    boldCheckbox,
    italicCheckbox,
    underlineCheckbox,
  ];

  if (activeObject && activeObject.type === 'i-text') {
    textStyleControls.forEach(control => control.disabled = false);
    newTextContentInput.disabled = false;
    addTextButton.disabled = false;
    deleteSelectedButton.disabled = false;

    const effectiveFontSize = Math.round(activeObject.fontSize * activeObject.scaleY);
    fontSizeInput.value = effectiveFontSize;
    fontFamilyInput.value = activeObject.fontFamily;
    boldCheckbox.checked = activeObject.fontWeight === 'bold';
    italicCheckbox.checked = activeObject.fontStyle === 'italic';
    underlineCheckbox.checked = activeObject.underline;
    newTextContentInput.value = activeObject.text; // Update text content input
  } else if (activeObject && activeObject.type === 'image') {
    textStyleControls.forEach(control => control.disabled = true);
    newTextContentInput.disabled = true;
    addTextButton.disabled = false; // Still allow adding new text
    deleteSelectedButton.disabled = false; // Still allow deleting images
    clearTextControls(); // Clear text control values
  } else {
    // No object selected
    textStyleControls.forEach(control => control.disabled = false);
    newTextContentInput.disabled = false;
    addTextButton.disabled = false;
    deleteSelectedButton.disabled = true; // No object to delete
    newTextContentInput.value = ''; // Clear new text content input
    clearTextControls(); // Reset text control values to default
  }
}

function clearTextControls() {
  // Reset to default or clear when no text object is selected
  fontSizeInput.value = '48';
  fontFamilyInput.value = 'Arial';
  boldCheckbox.checked = false;
  italicCheckbox.checked = false;
  underlineCheckbox.checked = false;
}

// Expose canvas for utils.js to access it
window.getFabricCanvas = function() {
  return canvas;
}

window.fabricEditor = {
  setTextAlign: function(alignment) {
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

  setVerticalAlign: function(alignment) {
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

  setFontFamily: function(fontFamily) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
      activeObject.set({ fontFamily: fontFamily });
      canvas.renderAll();
      updateTextControls(); // Update UI to reflect change
    }
  },

  setFontSize: function(fontSize) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
      activeObject.set({ fontSize: fontSize });
      canvas.renderAll();
      updateTextControls(); // Update UI to reflect change
    }
  },

  getActiveObject: function() {
    return canvas.getActiveObject();
  },


};
