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
let printerInstance = null;

async function connectPrinter() {
  if (device && device.gatt.connected && printerInstance) {
    return printerInstance;
  }

  try {
    device = await navigator.bluetooth.requestDevice({
      filters: bluetoothFilters,
      optionalServices: optionalServices
    });

    const printer = supportedPrinters.find(p => p.pattern.test(device.name));

    if (printer) {
      log(`Detected printer: ${device.name} -> matched ${printer.name}`);
      printerInstance = new printer.printerClass();
      await printerInstance.connect(device);
      return printerInstance;
    } else {
      log(`Unsupported printer model: ${device.name}`);
      return null;
    }
  } catch (err) {
    log("Bluetooth error: " + err);
    throw err;
  }
}

async function printLabel() {
  try {
    await connectPrinter();

    if (printerInstance) {
      const printer = supportedPrinters.find(p => p.pattern.test(device.name));
      const infinitePaperCheckbox = document.getElementById("infinitePaperCheckbox");
      const isSegmented = infinitePaperCheckbox ? !infinitePaperCheckbox.checked : true; // Default to segmented if checkbox missing
      const isInfinitePaper = infinitePaperCheckbox ? infinitePaperCheckbox.checked : false;
      
      // Get copy count and spacing
      const copyCountInput = document.getElementById("copyCount");
      const copyCount = copyCountInput ? parseInt(copyCountInput.value) || 1 : 1;
      
      const spacingInput = document.getElementById("labelSpacing");
      const spacingMm = spacingInput && !isInfinitePaper ? parseFloat(spacingInput.value) || 0 : 0;

      // Construct bitmap with all copies, spacing, and separators
      await printerInstance.print(device, constructBitmap(printer.px, copyCount, isInfinitePaper, spacingMm), isSegmented);
    }

  } catch (err) {
    console.error("Print failed:", err);
  }
}

async function disconnectPrinter() {
  if (printerInstance) {
    await printerInstance.disconnect();
    printerInstance = null;
    device = null;
  } else {
    log("No printer instance found to disconnect.");
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



function constructBitmap(canvasHeight, copyCount = 1, isInfinitePaper = false, spacingMm = 0) {
  const fabricCanvas = getFabricCanvas();
  if (!fabricCanvas) {
    log("Fabric.js canvas not initialized.");
    return null;
  }

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  const canvasWidth = fabricCanvas.width; // Use Fabric canvas width
  
  // Get printer DPM for spacing calculations
  const urlParams = new URLSearchParams(window.location.search);
  const urlPrinter = urlParams.get('printer');
  let dpm = 8; // Default
  if (urlPrinter !== null && typeof supportedPrinters !== 'undefined') {
    const pIndex = parseInt(urlPrinter);
    if (!isNaN(pIndex) && supportedPrinters[pIndex]) {
      dpm = supportedPrinters[pIndex].dpm;
    }
  }
  
  const spacingPx = Math.round(spacingMm * dpm);
  const separatorLineWidth = 1; // 1 pixel wide vertical line

  // Calculate total height needed
  let totalHeight = canvasHeight * copyCount;
  if (isInfinitePaper) {
    // Add separator lines between copies (1px each)
    totalHeight += (copyCount - 1) * separatorLineWidth;
  } else {
    // Add spacing between copies for segmented paper
    totalHeight += (copyCount - 1) * spacingPx;
  }
  
  tempCanvas.width = canvasWidth;
  tempCanvas.height = totalHeight;
  
  // Fill with white background
  tempCtx.fillStyle = '#ffffff';
  tempCtx.fillRect(0, 0, canvasWidth, totalHeight);

  // Render the fabric canvas content onto the temporary canvas
  fabricCanvas.backgroundColor = '#ffffff';
  fabricCanvas.renderAll();
  
  let currentY = 0;
  for (let copy = 0; copy < copyCount; copy++) {
    // Draw the label
    tempCtx.drawImage(fabricCanvas.getElement(), 0, currentY, canvasWidth, canvasHeight);
    currentY += canvasHeight;
    
    // Add separator or spacing
    if (copy < copyCount - 1) { // Don't add after last copy
      if (isInfinitePaper) {
        // Draw vertical line separator
        tempCtx.fillStyle = '#000000';
        tempCtx.fillRect(0, currentY, canvasWidth, separatorLineWidth);
        currentY += separatorLineWidth;
      } else {
        // Add spacing (already white, just move position)
        currentY += spacingPx;
      }
    }
  }

  const imgData = tempCtx.getImageData(0, 0, canvasWidth, totalHeight).data;

  const bitmap = [];
  for (let y = 0; y < totalHeight; y++) {
    let row = "";
    for (let x = 0; x < canvasWidth; x++) {
      const i = (y * canvasWidth + x) * 4;
      const avg = (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
      row += avg < 128 ? "1" : "0";
    }
    bitmap.push(row);
  }
  return bitmap
}
