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
  if (activeObject && activeObject.type === 'i-text') {
    const effectiveFontSize = Math.round(activeObject.fontSize * activeObject.scaleY);
    fontSizeInput.value = effectiveFontSize;
    fontFamilyInput.value = activeObject.fontFamily; // Update fontFamilySelect
    boldCheckbox.checked = activeObject.fontWeight === 'bold';
    italicCheckbox.checked = activeObject.fontStyle === 'italic';
    underlineCheckbox.checked = activeObject.underline;
  } else {
    clearTextControls();
  }
}

function clearTextControls() {
  // Reset to default or clear when no text object is selected
  fontSizeInput.value = '48';
  fontFamilyInput.value = 'Arial'; // Reset fontFamilySelect
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
    if (activeObject && activeObject.type === 'i-text') {
      const canvasWidth = canvas.getWidth();
      const objectWidth = activeObject.getScaledWidth();
      let newLeft = activeObject.left;

      // Set text alignment within the object's bounding box (for multi-line text)
      activeObject.set({ textAlign: alignment });

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
      }
      activeObject.set({ left: newLeft });
      canvas.renderAll();
    }
  },

  setVerticalAlign: function(alignment) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
      const canvasHeight = canvas.getHeight();
      const objectHeight = activeObject.getScaledHeight();
      let newTop = activeObject.top; // Default to current top

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
      }
      activeObject.set({ top: newTop });
      canvas.renderAll();
    }
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

  // This method will be called when an object on the canvas is selected to update the UI controls.
  // It's exposed so ui.js can trigger it if needed, though canvas.on('selection:...') already handles it.
  updateUiControls: function() {
    updateTextControls();
  }
};
