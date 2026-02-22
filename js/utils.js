// Build filters from namePrefix and inject GATT Services to force LE connection (bypassing BlueZ Classic cache on Linux)
const bluetoothFilters = supportedPrinters.map(p => {
  const filter = { namePrefix: p.namePrefix };
  if (p.optionalServices && p.optionalServices.length > 0) {
    filter.services = p.optionalServices;
  }
  return filter;
});

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


      // Loop to print each copy individually
      for (let i = 0; i < copyCount; i++) {
        log(`Printing copy ${i + 1} of ${copyCount}...`);

        // Construct bitmap for a SINGLE copy
        // We pass 1 as copyCount to constructBitmap so it generates just one label
        // We preserve isInfinitePaper and spacingMm logic, though spacingMm mostly applies to the "gap" in the canvas method. 
        // For separate print jobs, the printer's feed commands (in the class) handle the separation.
        const bitmap = constructBitmap(printer.px, 1, isInfinitePaper);

        if (bitmap) {
          await printerInstance.print(device, bitmap, isSegmented);
        }

        // Add a small delay between copies to ensure printer processes the buffer
        if (i < copyCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      log("All copies printed successfully.");
    }

  } catch (err) {
    console.error("Print failed:", err);
    log("Print failed: " + err);
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



function rasterizeCanvas(canvasHeight, isInfinitePaper, ignoreSelection = false) {
  const fabricCanvas = getFabricCanvas();
  if (!fabricCanvas) {
    log("Fabric.js canvas not initialized.");
    return null;
  }

  // Save current selection and deselect only if not ignoring selection
  const activeObject = fabricCanvas.getActiveObject();

  if (!ignoreSelection) {
    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
    fabricCanvas.renderAll(); // Ensure render happens synchronously
  }

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  const canvasWidth = fabricCanvas.width; // Use Fabric canvas width
  tempCanvas.width = canvasWidth;
  tempCanvas.height = canvasHeight;

  // Render the fabric canvas content onto the temporary canvas
  fabricCanvas.backgroundColor = '#ffffff'; // Ensure white background

  // Force a render of the lower canvas to ensure it's up to date
  fabricCanvas.renderAll();
  tempCtx.drawImage(fabricCanvas.getElement(), 0, 0, canvasWidth, canvasHeight);

  // Restore selection if we modified it
  if (!ignoreSelection && activeObject) {
    fabricCanvas.setActiveObject(activeObject);
    fabricCanvas.requestRenderAll();
  }

  const imgData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);
  return imgData;
}

function constructBitmap(canvasHeight, copyCount, isInfinitePaper, ignoreSelection = false) {
  const imgDataObj = rasterizeCanvas(canvasHeight, isInfinitePaper, ignoreSelection);
  if (!imgDataObj) return null;

  const imgData = imgDataObj.data;
  const canvasWidth = imgDataObj.width;
  const height = imgDataObj.height;

  const bitmap = [];
  for (let y = 0; y < height; y++) {
    let row = "";
    for (let x = 0; x < canvasWidth; x++) {
      const i = (y * canvasWidth + x) * 4;
      const avg = (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
      row += avg < 128 ? "1" : "0";
    }
    bitmap.push(row);
  }
  return bitmap;
}
