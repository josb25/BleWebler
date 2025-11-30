# BleWebler
BleWebler is a lightweight, browser-based label printing tool that connects to Bluetooth Low Energy (BLE) thermal printers – no drivers, no apps, no vendor lock-in. It runs entirely in Chromium-based browsers and communicates directly with supported devices using the Web Bluetooth API.

Try it: https://josb25.github.io/BleWebler/

Features
  - Bluetooth LE connection via Web Bluetooth API
  - Direct printing text and bitmap images to compatible label printers
  - Runs entirely in the browser: No installation required
  - Modular structure: Ready to support more printer models
  - Open source and privacy-friendly: Nothing is sent to any server

Use Cases
  - Creating labels on mobile or desktop without proprietary apps
  - Replacing stock label printer apps with a cleaner, open alternative

Requirements
  - A Chromium-based browser (e.g. Chrome, Edge)
  - A supported BLE-compatible label printer
  - A user-initiated connection (via button click, due to Web Bluetooth restrictions)

Future Plans
  - Support for more printer models and brands
  - Print QR- and Barcodes


Licensed under the GPLv3 License.
