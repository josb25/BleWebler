// Supported printers (with namePrefix-based filters)
const LEFT_MARGIN_PX = 3; // left margin in pixels to compensate non-printing columns
const RIGHT_MARGIN_PX = 5; // right margin in pixels after printed content

// Build filters from namePrefix
const bluetoothFilters = supportedPrinters.map(p => ({
  namePrefix: p.namePrefix
}));

// Collect all optional services from all supported printers
const optionalServices = [
  ...new Set(
    supportedPrinters
      .flatMap(p => p.optionalServices || [])
  )
];

let device = null;

// State for bitmap image labels
let loadedImageCanvas = null;

function getSelectedPrinterForPreview() {
  const select = document.getElementById("printerSelect");
  if (select) {
    const selectedName = select.value;
    const found = supportedPrinters.find(p => p.name === selectedName);
    if (found) {
      return found;
    }
  }
  return supportedPrinters.length > 0 ? supportedPrinters[0] : null;
}

document.addEventListener("DOMContentLoaded", () => {
  const printerSelect = document.getElementById("printerSelect");
  if (printerSelect && supportedPrinters.length > 0) {
    supportedPrinters.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = p.name;
      printerSelect.appendChild(opt);
    });
    // select the first printer by default
    printerSelect.value = supportedPrinters[0].name;

    printerSelect.addEventListener("change", () => {
      renderTextPreview();
      renderImagePreview();
      updateEstimatedLengthPreview();
    });
  }

  const imageInput = document.getElementById("imageFile");
  if (imageInput) {
    imageInput.addEventListener("change", handleImageFileChange);
  }

  const textInputs = [
    "labelText",
    "labelText2",
    "fontSize",
    "fontFamily"
  ];
  textInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        renderTextPreview();
        updateEstimatedLengthPreview();
      });
      el.addEventListener("change", () => {
        renderTextPreview();
        updateEstimatedLengthPreview();
      });
    }
  });

  const checkboxes = ["bold", "italic", "underline", "shrinkToWidth"]; 
  checkboxes.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        renderTextPreview();
        updateEstimatedLengthPreview();
      });
    }
  });

  const imageMode = document.getElementById("imageScaleMode"); 
  if (imageMode) {
    imageMode.addEventListener("change", () => {
      renderImagePreview();
      updateEstimatedLengthPreview();
    });
  }

  const typeButtons = document.querySelectorAll(".label-type-btn");
  typeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      renderTextPreview();
      renderImagePreview();
      updateEstimatedLengthPreview();
    });
  });

  renderTextPreview();
  renderImagePreview();
  updateEstimatedLengthPreview();
});

async function printLabel() {
  try {
    if (device == null) {
        device = await navigator.bluetooth.requestDevice({
        filters: bluetoothFilters,
        optionalServices: optionalServices
        });
    }

    // Find matching printer handler (connected device)
    const printer = supportedPrinters.find(p => p.pattern.test(device.name));

    if (printer) {
      log(`Detected printer: ${device.name} -> matched ${printer.name}`);

      // Compare with selected printer in dropdown
      const select = document.getElementById("printerSelect");
      const selectedName = select ? select.value : null;
      const selectedPrinter = selectedName ? supportedPrinters.find(p => p.name === selectedName) : null;

      if (selectedPrinter && selectedPrinter.name !== printer.name) {
        const proceed = window.confirm(`Connected printer '${printer.name}' does not match selected printer '${selectedPrinter.name}'.\n\nPress OK to print anyway, or Cancel to switch selection to the connected printer.`);
        if (!proceed) {
          if (select) {
            select.value = printer.name;
          }
          renderTextPreview();
          renderImagePreview();
          updateEstimatedLengthPreview();
          return;
        } else {
          if (select) {
            select.value = printer.name;
          }
          renderTextPreview();
          renderImagePreview();
          updateEstimatedLengthPreview();
        }
      }

      const activeBtn = document.querySelector(".label-type-btn.active");
      const type = activeBtn ? activeBtn.dataset.type : "text";

      let bitmap;

      if (type === "bitmap") {
        bitmap = constructImageBitmap(printer);
      } else if (type === "text") {
        bitmap = constructBitmap(printer);
      } else {
        log(`Label type '${type}' is not supported for printing yet.`);
        return;
      }

      if (!bitmap || bitmap.length === 0) {
        log("Bitmap is empty or print was cancelled.");
        return;
      }

      // Update estimated length based on final bitmap width
      const widthPx = bitmap[0] ? bitmap[0].length : 0;
      const estimatedSpan = document.getElementById("estimatedLengthValue");
      if (estimatedSpan) {
        if (widthPx > 0 && printer && printer.labelWidthMM) {
          const mmPerPx = printer.labelWidthMM / printer.canvasHeight;
          const lengthMm = widthPx * mmPerPx;
          estimatedSpan.textContent = `${widthPx} px (~${lengthMm.toFixed(1)} mm)`;
        } else if (widthPx > 0) {
          estimatedSpan.textContent = `${widthPx} px`;
        } else {
          estimatedSpan.textContent = "-";
        }
      }

      await printer.handler(
        device,
        bitmap,
        document.getElementById("segmentedPaper").checked,
        printer.canvasHeight
      );
    } else {
      log(`Unsupported printer model: ${device.name}`);
    }

  } catch (err) {
    log("Bluetooth error: " + err);
  }
  const printerSelectEl = document.getElementById("printerSelect");
  if (printerSelectEl) {
    printerSelectEl.disabled = true;
  }
}

function splitIntoChunks(data, chunkSize = 96) {
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return chunks;
}

function log(message) {
  const output = document.getElementById("logOutput");
  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-EN', { hour12: false });
  output.textContent += `[${timestamp}] ${message}\n`;
  output.scrollTop = output.scrollHeight;
  console.log(message)
}

function disconnectPrinter() {
  if (device && device.gatt.connected) {
    device.gatt.disconnect();
    log("Printer has been removed.");
    device = null;
    const printerSelectEl = document.getElementById("printerSelect");
    if (printerSelectEl) {
      printerSelectEl.disabled = false;
    }
  } else {
    log("No printer connected.");
  }
}

function handleImageFileChange(event) {
  const file = event.target.files && event.target.files[0];
  const previewCanvas = document.getElementById("imagePreview");
  const infoDiv = document.getElementById("imageInfo");

  if (infoDiv) {
    infoDiv.textContent = "";
  }

  loadedImageCanvas = null;

  if (!file) {
    if (previewCanvas) {
      const ctx = previewCanvas.getContext("2d");
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    }
    updateEstimatedLengthPreview();
    return;
  }

  const reader = new FileReader();

  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      loadedImageCanvas = canvas;

      if (infoDiv) {
        infoDiv.textContent = `Image size: ${img.width} x ${img.height} px`;
      }

      renderImagePreview();
      updateEstimatedLengthPreview();
    };

    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
}

function renderTextPreview() {
  const previewCanvas = document.getElementById("textPreview");
  if (!previewCanvas) return;

  const ctx = previewCanvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

  const previewPrinter = getSelectedPrinterForPreview();
  if (!previewPrinter) {
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, previewCanvas.width - 2, previewCanvas.height - 2);
    return;
  }

  const canvasHeight = previewPrinter.canvasHeight || 96;

  const textLine1El = document.getElementById("labelText");
  const textLine2El = document.getElementById("labelText2");
  const textLine1 = textLine1El ? (textLine1El.value || "") : "";
  const textLine2 = textLine2El ? (textLine2El.value || "") : "";
  const hasSecondLine = !!textLine2;

  if (!textLine1 && !textLine2) {
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, previewCanvas.width - 2, previewCanvas.height - 2);
    return;
  }

  const fontSizeEl = document.getElementById("fontSize");
  const fontFamilyEl = document.getElementById("fontFamily");
  const boldEl = document.getElementById("bold");
  const italicEl = document.getElementById("italic");
  const underlineEl = document.getElementById("underline");
  const shrinkEl = document.getElementById("shrinkToWidth");

  const fontSize = fontSizeEl ? parseFloat(fontSizeEl.value) : 48;
  const fontFamily = fontFamilyEl ? (fontFamilyEl.value || "Arial") : "Arial";
  const isBold = boldEl ? boldEl.checked : false;
  const isItalic = italicEl ? italicEl.checked : false;
  const isUnderline = underlineEl ? underlineEl.checked : false;
  const shrinkToWidth = shrinkEl ? shrinkEl.checked : false;

  const linesCount = hasSecondLine ? 2 : 1;
  let effectiveFontSize = fontSize;

  if (shrinkToWidth && fontSize * linesCount > canvasHeight) {
    effectiveFontSize = canvasHeight / linesCount;
  }

  const font = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}${effectiveFontSize}px "${fontFamily}"`;

  const baseCanvas = document.createElement("canvas");
  const baseCtx = baseCanvas.getContext("2d");
  baseCtx.font = font;

  const line1Width = Math.ceil(baseCtx.measureText(textLine1).width);
  const line2Width = hasSecondLine ? Math.ceil(baseCtx.measureText(textLine2).width) : 0;
  const canvasWidth = Math.max(line1Width, line2Width, 1) + LEFT_MARGIN_PX;

  baseCanvas.width = canvasWidth;
  baseCanvas.height = canvasHeight;

  baseCtx.fillStyle = "#ffffff";
  baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);

  baseCtx.fillStyle = "#000000";
  baseCtx.font = font;
  baseCtx.textBaseline = "middle";

  if (hasSecondLine) {
    const line1Y = canvasHeight / 3;
    const line2Y = (2 * canvasHeight) / 3;
    baseCtx.fillText(textLine1, LEFT_MARGIN_PX, line1Y);
    baseCtx.fillText(textLine2, LEFT_MARGIN_PX, line2Y);

    if (isUnderline) {
      const underlineWidth1 = baseCtx.measureText(textLine1).width;
      const underlineWidth2 = baseCtx.measureText(textLine2).width;
      const underlineY1 = line1Y + effectiveFontSize / 2;
      const underlineY2 = line2Y + effectiveFontSize / 2;
      baseCtx.fillRect(LEFT_MARGIN_PX, underlineY1, underlineWidth1, 1);
      baseCtx.fillRect(LEFT_MARGIN_PX, underlineY2, underlineWidth2, 1);
    }
  } else {
    const lineY = canvasHeight / 2;
    baseCtx.fillText(textLine1, LEFT_MARGIN_PX, lineY);

    if (isUnderline) {
      const underlineY = lineY + effectiveFontSize / 2;
      const underlineWidth = baseCtx.measureText(textLine1).width;
      baseCtx.fillRect(LEFT_MARGIN_PX, underlineY, underlineWidth, 1);
    }
  }

  const scale = Math.min(
    previewCanvas.width / canvasWidth,
    previewCanvas.height / canvasHeight
  );
  const drawW = canvasWidth * scale;
  const drawH = canvasHeight * scale;
  const offsetX = (previewCanvas.width - drawW) / 2;
  const offsetY = (previewCanvas.height - drawH) / 2;

  ctx.drawImage(baseCanvas, 0, 0, canvasWidth, canvasHeight, offsetX, offsetY, drawW, drawH);

  ctx.strokeStyle = "green";
  ctx.lineWidth = 2;
  ctx.strokeRect(offsetX, offsetY, drawW, drawH);
}

function renderImagePreview() {
  const previewCanvas = document.getElementById("imagePreview");
  if (!previewCanvas) return;

  const ctx = previewCanvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

  const previewPrinter = getSelectedPrinterForPreview();
  if (!previewPrinter || !loadedImageCanvas) {
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, previewCanvas.width - 2, previewCanvas.height - 2);
    return;
  }

  const canvasHeight = previewPrinter.canvasHeight || 96;
  const srcWidth = loadedImageCanvas.width;
  const srcHeight = loadedImageCanvas.height;

  if (srcWidth === 0 || srcHeight === 0) {
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, previewCanvas.width - 2, previewCanvas.height - 2);
    return;
  }

  const modeSelect = document.getElementById("imageScaleMode");
  const mode = modeSelect ? modeSelect.value : "scale";

  let finalCanvas = document.createElement("canvas");
  let finalWidth = srcWidth;

  if (mode === "scale") {
    const scaleY = canvasHeight / srcHeight;
    const normalizedWidth = Math.max(1, Math.round(srcWidth * scaleY));
    finalCanvas.width = normalizedWidth;
    finalCanvas.height = canvasHeight;
    const fctx = finalCanvas.getContext("2d");
    fctx.fillStyle = "#ffffff";
    fctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    fctx.drawImage(
      loadedImageCanvas,
      0,
      0,
      srcWidth,
      srcHeight,
      0,
      0,
      normalizedWidth,
      canvasHeight
    );
    finalWidth = normalizedWidth;
  } else {
    finalCanvas.width = srcWidth;
    finalCanvas.height = canvasHeight;
    const fctx = finalCanvas.getContext("2d");
    fctx.fillStyle = "#ffffff";
    fctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    if (srcHeight > canvasHeight) {
      const offsetSrcY = (srcHeight - canvasHeight) / 2;
      fctx.drawImage(
        loadedImageCanvas,
        0,
        offsetSrcY,
        srcWidth,
        canvasHeight,
        0,
        0,
        srcWidth,
        canvasHeight
      );
    } else {
      const offsetY = (canvasHeight - srcHeight) / 2;
      fctx.drawImage(
        loadedImageCanvas,
        0,
        0,
        srcWidth,
        srcHeight,
        0,
        offsetY,
        srcWidth,
        srcHeight
      );
    }
    finalWidth = srcWidth;
  }

  const scale = Math.min(
    previewCanvas.width / finalWidth,
    previewCanvas.height / canvasHeight
  );
  const drawW = finalWidth * scale;
  const drawH = canvasHeight * scale;
  const offsetX = (previewCanvas.width - drawW) / 2;
  const offsetY = (previewCanvas.height - drawH) / 2;

  ctx.drawImage(finalCanvas, 0, 0, finalWidth, canvasHeight, offsetX, offsetY, drawW, drawH);

  ctx.strokeStyle = "green";
  ctx.lineWidth = 2;
  ctx.strokeRect(offsetX, offsetY, drawW, drawH);
}

function updateEstimatedLengthPreview() {
  const estimatedSpan = document.getElementById("estimatedLengthValue");
  if (!estimatedSpan) return;

  const activeBtn = document.querySelector(".label-type-btn.active");
  const type = activeBtn ? activeBtn.dataset.type : "text";

  const previewPrinter = getSelectedPrinterForPreview();
  if (!previewPrinter) {
    estimatedSpan.textContent = "-";
    return;
  }

  let widthPx = 0;

  if (type === "bitmap") {
    widthPx = computeImageWidthPreview(previewPrinter);
  } else if (type === "text") {
    widthPx = computeTextWidthPreview(previewPrinter);
  }

  if (widthPx > 0 && previewPrinter && previewPrinter.labelWidthMM) {
    const mmPerPx = previewPrinter.labelWidthMM / previewPrinter.canvasHeight;
    const lengthMm = widthPx * mmPerPx;
    estimatedSpan.textContent = `${widthPx} px (~${lengthMm.toFixed(1)} mm)`;
  } else if (widthPx > 0) {
    estimatedSpan.textContent = `${widthPx} px`;
  } else {
    estimatedSpan.textContent = "-";
  }
}

function constructBitmap(printer) {
    const canvasHeight = printer.canvasHeight || 96;

    const textLine1 = document.getElementById("labelText").value || "";
    const secondLineInput = document.getElementById("labelText2");
    const textLine2 = secondLineInput ? (secondLineInput.value || "") : "";
    const hasSecondLine = !!textLine2;

    const fontSize = parseFloat(document.getElementById("fontSize").value);
    const fontFamily = document.getElementById("fontFamily").value || "Arial";
    const isBold = document.getElementById("bold").checked;
    const isItalic = document.getElementById("italic").checked;
    const isUnderline = document.getElementById("underline").checked;

    const shrinkCheckbox = document.getElementById("shrinkToWidth");
    const shrinkToWidth = shrinkCheckbox ? shrinkCheckbox.checked : false;

    const linesCount = hasSecondLine ? 2 : 1;
    let effectiveFontSize = fontSize;

    if (shrinkToWidth && fontSize * linesCount > canvasHeight) {
        effectiveFontSize = canvasHeight / linesCount;
    } else if (!shrinkToWidth && fontSize * linesCount > canvasHeight) {
        log(`Warning: font size (${fontSize}px) with ${linesCount} line(s) is larger than canvas height (${canvasHeight}px).`);
    }

    const font = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}${effectiveFontSize}px "${fontFamily}"`;

    log("Font string: " + font);

    const baseCanvas = document.createElement("canvas");
    const baseCtx = baseCanvas.getContext("2d");

    baseCtx.font = font;

    const line1Width = Math.ceil(baseCtx.measureText(textLine1).width);
    const line2Width = hasSecondLine ? Math.ceil(baseCtx.measureText(textLine2).width) : 0;
    const canvasWidth = Math.max(line1Width, line2Width, 1);

    if (canvasWidth === 0) {
        log("No text provided, nothing to print.");
        return [];
    }

    baseCanvas.width = canvasWidth;
    baseCanvas.height = canvasHeight;

    baseCtx.fillStyle = "#ffffff";
    baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);

    baseCtx.fillStyle = "#000000";
    baseCtx.font = font;
    baseCtx.textBaseline = "middle";

    if (hasSecondLine) {
        const line1Y = canvasHeight / 3;
        const line2Y = (2 * canvasHeight) / 3;
        baseCtx.fillText(textLine1, 0, line1Y);
        baseCtx.fillText(textLine2, 0, line2Y);

        if (isUnderline) {
            const underlineWidth1 = baseCtx.measureText(textLine1).width;
            const underlineWidth2 = baseCtx.measureText(textLine2).width;
            const underlineY1 = line1Y + effectiveFontSize / 2;
            const underlineY2 = line2Y + effectiveFontSize / 2;
            baseCtx.fillRect(0, underlineY1, underlineWidth1, 1);
            baseCtx.fillRect(0, underlineY2, underlineWidth2, 1);
        }
    } else {
        const lineY = canvasHeight / 2;
        baseCtx.fillText(textLine1, 0, lineY);

        if (isUnderline) {
            const underlineY = lineY + effectiveFontSize / 2;
            const underlineWidth = baseCtx.measureText(textLine1).width;
            baseCtx.fillRect(0, underlineY, underlineWidth, 1);
        }
    }

    const finalCanvas = baseCanvas;
    const finalWidth = canvasWidth;

    const finalCtx = finalCanvas.getContext("2d");
    const imgData = finalCtx.getImageData(0, 0, finalWidth, canvasHeight).data;

    const bitmap = [];
    for (let y = 0; y < canvasHeight; y++) {
        let row = "";
        for (let m = 0; m < LEFT_MARGIN_PX; m++) {
            row += "0";
        }
        for (let x = 0; x < finalWidth; x++) {
            const i = (y * finalWidth + x) * 4;
            const avg = (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
            row += avg < 128 ? "1" : "0";
        }
        for (let r = 0; r < RIGHT_MARGIN_PX; r++) {
            row += "0";
        }
        bitmap.push(row);
    }
    return bitmap
}

function constructImageBitmap(printer) {
    const canvasHeight = printer.canvasHeight || 96;

    if (!loadedImageCanvas) {
        log("No image loaded for bitmap label.");
        return [];
    }

    const srcWidth = loadedImageCanvas.width;
    const srcHeight = loadedImageCanvas.height;

    if (srcWidth === 0 || srcHeight === 0) {
        log("Loaded image has invalid dimensions.");
        return [];
    }

    const modeSelect = document.getElementById("imageScaleMode");
    const mode = modeSelect ? modeSelect.value : "scale";

    let finalCanvas = document.createElement("canvas");
    let finalWidth = srcWidth;

    if (mode === "scale") {
        const scaleY = canvasHeight / srcHeight;
        const normalizedWidth = Math.max(1, Math.round(srcWidth * scaleY));
        finalCanvas.width = normalizedWidth;
        finalCanvas.height = canvasHeight;
        const ctx = finalCanvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        ctx.drawImage(
            loadedImageCanvas,
            0,
            0,
            srcWidth,
            srcHeight,
            0,
            0,
            normalizedWidth,
            canvasHeight
        );
        finalWidth = normalizedWidth;
    } else {
        finalCanvas.width = srcWidth;
        finalCanvas.height = canvasHeight;
        const ctx = finalCanvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

        if (srcHeight > canvasHeight) {
            const offsetSrcY = (srcHeight - canvasHeight) / 2;
            ctx.drawImage(
                loadedImageCanvas,
                0,
                offsetSrcY,
                srcWidth,
                canvasHeight,
                0,
                0,
                srcWidth,
                canvasHeight
            );
        } else {
            const offsetY = (canvasHeight - srcHeight) / 2;
            ctx.drawImage(
                loadedImageCanvas,
                0,
                0,
                srcWidth,
                srcHeight,
                0,
                offsetY,
                srcWidth,
                srcHeight
            );
        }
        finalWidth = srcWidth;
    }

    const finalCtx = finalCanvas.getContext("2d");
    const imgData = finalCtx.getImageData(0, 0, finalWidth, canvasHeight).data;

    const bitmap = [];
    for (let y = 0; y < canvasHeight; y++) {
        let row = "";
        for (let m = 0; m < LEFT_MARGIN_PX; m++) {
            row += "0";
        }
        for (let x = 0; x < finalWidth; x++) {
            const i = (y * finalWidth + x) * 4;
            const avg = (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
            row += avg < 128 ? "1" : "0";
        }
        bitmap.push(row);
    }

    return bitmap;
}

function computeTextWidthPreview(printer) {
    const canvasHeight = printer.canvasHeight || 96;

    const textLine1El = document.getElementById("labelText");
    const textLine2El = document.getElementById("labelText2");
    const textLine1 = textLine1El ? (textLine1El.value || "") : "";
    const textLine2 = textLine2El ? (textLine2El.value || "") : "";
    const hasSecondLine = !!textLine2;

    const fontSizeEl = document.getElementById("fontSize");
    const fontFamilyEl = document.getElementById("fontFamily");
    const boldEl = document.getElementById("bold");
    const italicEl = document.getElementById("italic");

    const fontSize = fontSizeEl ? parseFloat(fontSizeEl.value) : 48;
    const fontFamily = fontFamilyEl ? (fontFamilyEl.value || "Arial") : "Arial";
    const isBold = boldEl ? boldEl.checked : false;
    const isItalic = italicEl ? italicEl.checked : false;

    const shrinkCheckbox = document.getElementById("shrinkToWidth");
    const shrinkToWidth = shrinkCheckbox ? shrinkCheckbox.checked : false;

    const linesCount = hasSecondLine ? 2 : 1;
    let effectiveFontSize = fontSize;

    if (shrinkToWidth && fontSize * linesCount > canvasHeight) {
        effectiveFontSize = canvasHeight / linesCount;
    }

    const font = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}${effectiveFontSize}px "${fontFamily}"`;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = font;

    const line1Width = Math.ceil(ctx.measureText(textLine1).width);
    const line2Width = hasSecondLine ? Math.ceil(ctx.measureText(textLine2).width) : 0;
    const canvasWidth = Math.max(line1Width, line2Width, 0);

    return canvasWidth + LEFT_MARGIN_PX + RIGHT_MARGIN_PX;
}

function computeImageWidthPreview(printer) {
    const canvasHeight = printer.canvasHeight || 96;

    if (!loadedImageCanvas) {
        return 0;
    }

    const srcWidth = loadedImageCanvas.width;
    const srcHeight = loadedImageCanvas.height;

    if (srcWidth === 0 || srcHeight === 0) {
        return 0;
    }

    const modeSelect = document.getElementById("imageScaleMode");
    const mode = modeSelect ? modeSelect.value : "scale";

    if (mode === "scale") {
        const scaleY = canvasHeight / srcHeight;
        const normalizedWidth = Math.max(1, Math.round(srcWidth * scaleY));
        return normalizedWidth + LEFT_MARGIN_PX + RIGHT_MARGIN_PX;
    }

    return srcWidth + LEFT_MARGIN_PX + RIGHT_MARGIN_PX;
}
