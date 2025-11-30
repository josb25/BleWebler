// Supported printers (with namePrefix-based filters)
const supportedPrinters = [
  {
    name: "Marklife_P12",
    namePrefix: "P12_", //prefix to search for in the name while connecting via BLE
    pattern: /^P12_.+?_BLE$/, //Pattern used to distinguish this printer from others after connecting via BLE
    handler: printLabelOnP12, // function called to print a label -> Parameters: bluetooth device and bitmap
    optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb"], // UUIDs needed
    canvasHeight: 96, //printed width in px
    labelWidthMM: 12
  },

  { 
    name: "Marklife_P15",
    namePrefix: "P15_", //prefix to search for in the name while connecting via BLE
    pattern: /^P15_.+?_BLE$/, //Pattern used to distinguish this printer from others after connecting via BLE
    handler: printLabelOnP12, // function called to print a label -> Parameters: bluetooth device and bitmap; uses the same function as P12 as it seems to work
    optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb"], // UUIDs needed
    canvasHeight: 96, //printed width in px
    labelWidthMM: 12
  },

  // Add more printers here
];
