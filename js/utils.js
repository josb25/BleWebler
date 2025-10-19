// Supported printers (with namePrefix-based filters)
const supportedPrinters = [
  {
    name: "Marklife_P12",
    namePrefix: "P12_", //prefix to search for in the name while connecting via BLE
    pattern: /^P12_.+?_BLE$/, //Pattern used to distinguish this printer from others after connecting via BLE
    handler: printLabelOnP12, // function called to print a label -> Parameters: bluetooth device and bitmap
    optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb"], // UUIDs needed
    px: 96 //printed width in px
  },

  { 
    name: "Marklife_P15",
    namePrefix: "P15_", //prefix to search for in the name while connecting via BLE
    pattern: /^P15_.+?_BLE$/, //Pattern used to distinguish this printer from others after connecting via BLE
    handler: printLabelOnP12, // function called to print a label -> Parameters: bluetooth device and bitmap; uses the same function as P12 as it seems to work
    optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb"], // UUIDs needed
    px: 96 //printed width in px
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
      await printer.handler(device, constructBitmap(printer.px), document.getElementById("segmentedPaper").checked);
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
    const text = document.getElementById("labelText").value || "";
    const fontSize = parseFloat(document.getElementById("fontSize").value);
    const fontFamily = document.getElementById("fontFamily").value || "Arial";
    const isBold = document.getElementById("bold").checked;
    const isItalic = document.getElementById("italic").checked;
    const isUnderline = document.getElementById("underline").checked;

    const font = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}${fontSize}px "${fontFamily}"`;

    log("Font string: " + font);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    ctx.font = font;
    const textWidth = Math.ceil(ctx.measureText(text).width);
    const canvasWidth = textWidth;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#000000";
    ctx.font = font;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, canvasHeight / 2);

    if (isUnderline) {
        const underlineY = (canvasHeight / 2) + fontSize / 2;
        const underlineWidth = ctx.measureText(text).width;
        ctx.fillRect(0, underlineY, underlineWidth, 1);
    }

    const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;

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
