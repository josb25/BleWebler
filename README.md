# BleWebler

**BleWebler** is a browser-based solution for thermal label printing. It leverages the **Web Bluetooth API** to connect directly to supported Bluetooth Low Energy (BLE) printers, eliminating the need for drivers, proprietary apps, or vendor lock-in.

# [**Try it here!**](https://josb25.github.io/BleWebler/)

---

## Key Features

### Privacy-First & Open Source
BleWebler runs entirely within your browser. **No data is ever sent to a server.** Your designs and labels stay on your device, ensuring complete privacy and security.

### Zero Installation
- **No Drivers**: Connects directly to hardware via Web Bluetooth.
- **No Apps**: Works on any modern operating system (Windows, macOS, Linux, Android, ChromeOS) with a compatible browser.
- **Instant Start**: Just open the URL and start printing.

### Image Processing
Thermal printers require specific image preparation. BleWebler includes industry standard dithering algorithms to ensure your images look crisp and clear on 1-bit printers:
- **Floyd-Steinberg**
- **Atkinson**
- **Bayer**
- **Binary Threshold**

### Flexible Media Support
- **Infinite Paper**: Support for continuous label rolls with variable lengths.
- **Fixed Sizes**: Presets for standard label sizes.
- **Auto-Scaling**: Canvas automatically adjusts to the printer's resolution (DPI).

---

## Supported Hardware

BleWebler currently supports the following Marklife printers:
- Marklife P12
- Marklife P15

*More models can and will be added via the modular printer driver architecture.*

---

## Requirements

- **Browser**: A Chromium-based browser (Chrome, Edge, ...) with Web Bluetooth Support.
- **Hardware**: A computer or mobile device with Bluetooth 4.0+ support.

---

## License

Licensed under the **GPLv3 License**. You are free to use, modify, and distribute this software in accordance with the license terms.


## Credits / Third Party Libraries

This project makes use of open source libraries:

### Fabric.js
* **Website:** [http://fabricjs.com/](http://fabricjs.com/)
* **Version:** 5.3.0
* **Copyright:** © 2008-2015 Juriy Zaytsev & Kangax
* **License:** [MIT License](https://github.com/fabricjs/fabric.js/blob/master/LICENSE)