// Supported printers (with namePrefix-based filters)
const supportedPrinters = [
  {
    name: "Marklife_P12",
    namePrefix: "P12_", //prefix to search for in the name while connecting via BLE
    pattern: /^P12_.+?_BLE$/, //Pattern used to distinguish this printer from others after connecting via BLE
    printerClass: MarklifeP12Printer, // Class to instantiate
    optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb"], // UUIDs needed
    px: 96, //printed width in px
    dpm: 8 //printer dots per mm (203 dpi)
  },

  {
    name: "Marklife_P15",
    namePrefix: "P15_", //prefix to search for in the name while connecting via BLE
    pattern: /^P15_.+?_BLE$/, //Pattern used to distinguish this printer from others after connecting via BLE
    printerClass: MarklifeP12Printer, // Class to instantiate
    optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb"], // UUIDs needed
    px: 96, //printed width in px
    dpm: 8 //printer dots per mm (203 dpi)
  },

  // Add more printers here
];

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

async function printLabel() {
  try {
    if (device == null) {
      device = await navigator.bluetooth.requestDevice({
        filters: bluetoothFilters,
        optionalServices: optionalServices
      });
    }

    // Find matching printer handler
    const printer = supportedPrinters.find(p => p.pattern.test(device.name));

    if (printer) {
      log(`Detected printer: ${device.name} -> matched ${printer.name}`);
      const infinitePaperCheckbox = document.getElementById("infinitePaperCheckbox");
      const isSegmented = infinitePaperCheckbox ? !infinitePaperCheckbox.checked : true; // Default to segmented if checkbox missing
      const printerInstance = new printer.printerClass();
      await printerInstance.print(device, constructBitmap(printer.px), isSegmented);
    } else {
      log(`Unsupported printer model: ${device.name}`);
    }

  } catch (err) {
    log("Bluetooth error: " + err);
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
  } else {
    log("No printer connected.");
  }
}

function constructBitmap(canvasHeight) {
  const fabricCanvas = getFabricCanvas();
  if (!fabricCanvas) {
    log("Fabric.js canvas not initialized.");
    return null;
  }

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  const canvasWidth = fabricCanvas.width; // Use Fabric canvas width
  tempCanvas.width = canvasWidth;
  tempCanvas.height = canvasHeight;

  // Render the fabric canvas content onto the temporary canvas
  fabricCanvas.backgroundColor = '#ffffff'; // Ensure white background
  fabricCanvas.renderAll(); // Re-render to ensure background is applied if needed
  tempCtx.drawImage(fabricCanvas.getElement(), 0, 0, canvasWidth, canvasHeight);

  const imgData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight).data;

  const bitmap = [];
  for (let y = 0; y < canvasHeight; y++) {
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

