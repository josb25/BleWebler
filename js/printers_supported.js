// Supported printers (with namePrefix-based filters)
const supportedPrinters = [
    {
        name: "Marklife_P12",
        namePrefix: "P12_", //prefix to search for in the name while connecting via BLE
        pattern: /^P12_.+?_BLE$/, //Pattern used to distinguish this printer from others after connecting via BLE
        printerClass: MarklifeP12Printer, // Class to instantiate
        optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb", "49535343-fe7d-4ae5-8fa9-9fafd205e455"], // UUIDs needed
        px: 96, //printed width in px
        dpm: 8, //printer dots per mm (203 dpi)
        printerInfo:
            `Name             : Marklife P12
Pixel Density    : 203 dpi
Print Width      : 12mm (96 Pixels)
Paper Width      : 15mm
Print Tech       : Thermal (Inkless)
Battery Cap.     : 1200mAh
Connection       : Bluetooth 4.0 (BLE)
Dimensions       : 74*90*35 mm
Manufacturer     : Shenzhen Yinxiaoqian Technology Co., Ltd.
FCC-ID           : 2A2AI-P12
User Manual      : <a href="https://fcc.report/FCC-ID/2A2AI-P12/5793950.pdf" target="_blank" rel="noopener noreferrer">View Manual</a>`
    },

    {
        name: "Marklife_P15",
        namePrefix: "P15_", //prefix to search for in the name while connecting via BLE
        pattern: /^P15_.+?_BLE$/, //Pattern used to distinguish this printer from others after connecting via BLE
        printerClass: MarklifeP12Printer, // Class to instantiate
        optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb", "49535343-fe7d-4ae5-8fa9-9fafd205e455"], // UUIDs needed
        px: 96, //printed width in px
        dpm: 8, //printer dots per mm (203 dpi)
        printerInfo:
            `Name             : Marklife P15
Pixel Density    : 203 dpi
Print Width      : 12mm (96 Pixels)
Paper Width      : 15mm
Print Tech       : Thermal (Inkless)
Manufacturer     : Shenzhen Yinxiaoqian Technology Co., Ltd.
FCC-ID           : 2A2AI-P15
User Manual      : <a href="https://fcc.report/FCC-ID/2A2AI-P15/7600816.pdf" target="_blank" rel="noopener noreferrer">View Manual</a>`
    },


    {
        name: "L13 (SilverCrest and others)",
        namePrefix: "L13_", //prefix to search for in the name while connecting via BLE
        pattern: /^L13_.+?_BLE$/, //Pattern used to distinguish this printer from others after connecting via BLE
        printerClass: MarklifeP12Printer, // Class to instantiate
        optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb", "49535343-fe7d-4ae5-8fa9-9fafd205e455"], // UUIDs needed
        px: 96, //printed width in px
        dpm: 8, //printer dots per mm (203 dpi)
        printerInfo:
            `Name             : L13 (SilverCrest and others)
Pixel Density    : 203 dpi
Print Width      : 12mm (96 Pixels)
Paper Width      : 15mm
Print Tech       : Thermal (Inkless)
Manufacturer     : e. g. KARSTEN INTERNATIONAL BV
FCC-ID           : 2BHE2-KS4732
User Manual      : <a href="https://manuals.sit-connect.com/public/articlemanual/2839aca0-43b7-4b17-8695-a7a63d23ecfe.pdf">View Manual</a>`
    },

    // Add more printers here
];