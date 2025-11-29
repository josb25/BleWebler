let canvas;

document.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas('fabricCanvas');
  canvas.setHeight(96); // Printer height
  canvas.setWidth(384); // Max width for a label

  // Add initial text
  const initialText = new fabric.IText('Hello World', {
    left: 50,
    top: 20,
    fontFamily: 'Arial',
    fontSize: 48,
    fill: '#000000',
  });
  canvas.add(initialText);
  canvas.setActiveObject(initialText);

  // Event listener for object selection to update UI controls
  canvas.on('selection:updated', updateStylingCheckboxes);
  canvas.on('selection:created', updateStylingCheckboxes);
  canvas.on('selection:cleared', clearStylingCheckboxes);

  // Event listeners for styling checkboxes
  document.getElementById('bold').addEventListener('change', applyStyle);
  document.getElementById('italic').addEventListener('change', applyStyle);
  document.getElementById('underline').addEventListener('change', applyStyle);
});

function addTextToCanvas() {
  const textContent = document.getElementById('newTextContent').value;
  if (!textContent) return;

  const newText = new fabric.IText(textContent, {
    left: 50,
    top: 50,
    fontFamily: 'Arial',
    fontSize: 48, // Default font size
    fill: '#000000',
  });
  canvas.add(newText);
  canvas.setActiveObject(newText);
  updateStylingCheckboxes();
  canvas.renderAll();
}

function deleteSelectedObject() {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.remove(activeObject);
    canvas.renderAll();
    clearStylingCheckboxes();
  }
}

function applyStyle() {
  const activeObject = canvas.getActiveObject();
  if (activeObject && activeObject.type === 'i-text') {
    const isBold = document.getElementById('bold').checked;
    const isItalic = document.getElementById('italic').checked;
    const isUnderline = document.getElementById('underline').checked;

    activeObject.set({
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      underline: isUnderline,
    });
    canvas.renderAll();
  }
}

function updateStylingCheckboxes() {
  const activeObject = canvas.getActiveObject();
  if (activeObject && activeObject.type === 'i-text') {
    document.getElementById('bold').checked = activeObject.fontWeight === 'bold';
    document.getElementById('italic').checked = activeObject.fontStyle === 'italic';
    document.getElementById('underline').checked = activeObject.underline;
  } else {
    clearStylingCheckboxes();
  }
}

function clearStylingCheckboxes() {
  document.getElementById('bold').checked = false;
  document.getElementById('italic').checked = false;
  document.getElementById('underline').checked = false;
}

// Expose canvas for utils.js to access it
window.getFabricCanvas = function() {
  return canvas;
}
