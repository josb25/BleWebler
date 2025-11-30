function toggleAdvanced() {
  const section = document.getElementById("advancedSection");
  const toggleButton = document.querySelector("button[onclick='toggleAdvanced()']");

  const visible = section.style.display !== "none";
  section.style.display = visible ? "none" : "block";
  toggleButton.textContent = visible ? "Show Advanced" : "Hide Advanced";
}


function setVerticalAlign(alignment) {
  if (window.fabricEditor) {
    window.fabricEditor.setVerticalAlign(alignment);
  }
}

// Function to update the font family in fabric editor
function updateFontFamily(fontFamily) {
  if (window.fabricEditor) {
    window.fabricEditor.setFontFamily(fontFamily);
  }
}

// Function to update the font size in fabric editor
function updateFontSize(fontSize) {
  if (window.fabricEditor) {
    window.fabricEditor.setFontSize(fontSize);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".label-type-btn");
  const fontFamilyInput = document.getElementById("fontFamilyInput");
  const fontList = document.getElementById("fontList");
  const loadSystemFontsBtn = document.getElementById("loadSystemFontsBtn");
  const fontSizeInput = document.getElementById("fontSize");

  // Basic web-safe fonts
  const basicFonts = ["Arial", "Verdana", "Times New Roman", "Courier New", "Georgia", "Impact", "Tahoma", "Trebuchet MS"];

  // Event listeners for toggle buttons
  document.querySelectorAll('.toggle-btn').forEach(button => {
    button.addEventListener('click', () => {
      const property = button.dataset.property;
      if (window.fabricEditor) {
        const isActive = window.fabricEditor.toggleStyle(property);
        button.classList.toggle('active', isActive);
      }
    });
  });

  function populateFontDropdown(fonts) {
    fontList.innerHTML = ""; // Clear existing options
    fonts.forEach(font => {
      const option = document.createElement("option");
      option.value = font;
      fontList.appendChild(option);
    });
    // Set initial value
    if (window.fabricEditor && window.fabricEditor.getActiveObject()) {
      fontFamilyInput.value = window.fabricEditor.getActiveObject().fontFamily;
    } else {
      fontFamilyInput.value = "Arial"; // Default
    }
  }

  // Populate with basic fonts on load
  populateFontDropdown(basicFonts);

  // Event listener for font family change
  fontFamilyInput.addEventListener("input", (event) => {
    updateFontFamily(event.target.value);
  });

  // Event listener for font size change
  if (fontSizeInput) {
    fontSizeInput.addEventListener("change", (event) => {
      updateFontSize(parseInt(event.target.value, 10));
    });
  }

  // Event listener for loading system fonts
  if (loadSystemFontsBtn) {
    // Hide button if API not supported
    if (!('queryLocalFonts' in window)) {
      loadSystemFontsBtn.style.display = 'none';
    }

    loadSystemFontsBtn.addEventListener("click", async () => {
      if ('queryLocalFonts' in window) {
        try {
          const systemFonts = await window.queryLocalFonts();
          const fontNames = systemFonts.map(font => font.family).filter((value, index, self) => self.indexOf(value) === index); // Get unique font names
          populateFontDropdown([...basicFonts, ...fontNames].filter((value, index, self) => self.indexOf(value) === index).sort()); // Merge, make unique, sort, and repopulate
          loadSystemFontsBtn.style.display = 'none'; // Hide button after successful load
        } catch (err) {
          console.error("Error querying local fonts:", err);
          alert("Failed to load system fonts. Please check console for details.");
        }
      } else {
        // This else block might be redundant if the button is already hidden, but good for explicit handling
        alert("Your browser does not support the Local Font Access API.");
        loadSystemFontsBtn.style.display = 'none';
      }
    });
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;

      // Active-Klasse setzen
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Alle Options-Divs ausblenden
      const textDiv = document.getElementById("textOptions");
      const qrDiv = document.getElementById("qrcodeOptions");
      const infoDiv = document.getElementById("infoOptions");

      if (!textDiv || !qrDiv || !infoDiv) {
        console.error("Options-Divs nicht gefunden!");
        return;
      }

      textDiv.style.display = "none";
      qrDiv.style.display = "none";
      infoDiv.style.display = "none";

      // Gewählte Option einblenden
      if (type === "text") textDiv.style.display = "block";
      else if (type === "qrcode") qrDiv.style.display = "block";
      else if (type === "info") qrDiv.style.display = "block";
    });
  });

  // Initialen Zustand setzen
  const activeBtn = document.querySelector(".label-type-btn.active");
  if (activeBtn) activeBtn.click(); // löst Anzeige der Text-Optionen aus

  // Add event listener for the print button
  const printButton = document.getElementById("printButton");
  if (printButton) {
    printButton.addEventListener("click", printLabel);
  }

  // --- Printer Selection Modal Logic ---
  const startupModal = document.getElementById("startupModal");
  const printerSelect = document.getElementById("printerSelect");
  const startBtn = document.getElementById("startBtn");
  const paperWidthInput = document.getElementById("paperWidth");
  const paperWidthContainer = document.getElementById("paperWidthContainer");
  const paperHeightInput = document.getElementById("paperHeight");
  const settingsBtn = document.getElementById("settingsBtn");
  const infinitePaperCheckbox = document.getElementById("infinitePaperCheckbox");
  const resizeHandle = document.getElementById("resizeHandle");
  const canvasWrapper = document.getElementById("canvasWrapper");

  // Resize Handle Logic
  let isDragging = false;
  let startX;
  let startWidth;

  if (resizeHandle) {
    const startDrag = (clientX) => {
      isDragging = true;
      startX = clientX;
      resizeHandle.classList.add('active');
      if (window.fabricEditor && window.fabricEditor.getActiveObject) {
        // We need the current canvas width. 
        // Since we don't have direct access to canvas object here easily without getter,
        // let's assume we can get it from the DOM element or expose a getter.
        // Actually, fabricEditor.updateCanvasSize updates it.
        // Let's use the canvas element's width for now or get it from fabric instance if possible.
        // window.getFabricCanvas() is available.
        const canvas = window.getFabricCanvas();
        if (canvas) {
          startWidth = canvas.getWidth();
        }
      }
    };

    const onDrag = (clientX) => {
      if (!isDragging) return;
      const dx = clientX - startX;
      const newWidth = startWidth + dx;

      if (newWidth > 50) { // Minimum width
        if (window.fabricEditor) {
          // We only want to update width, keep height same.
          const canvas = window.getFabricCanvas();
          if (canvas) {
            window.fabricEditor.updateCanvasSize(newWidth, canvas.getHeight());
          }
        }
      }
    };

    const endDrag = () => {
      isDragging = false;
      resizeHandle.classList.remove('active');
    };

    // Mouse events
    resizeHandle.addEventListener('mousedown', (e) => {
      startDrag(e.clientX);
      e.preventDefault(); // Prevent text selection
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        onDrag(e.clientX);
      }
    });

    window.addEventListener('mouseup', endDrag);

    // Touch events
    resizeHandle.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        startDrag(e.touches[0].clientX);
        e.preventDefault(); // Prevent scrolling
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length > 0) {
        onDrag(e.touches[0].clientX);
      }
    });

    window.addEventListener('touchend', endDrag);
  }

  if (startupModal && printerSelect && startBtn) {
    // 1. Populate Printer List
    if (typeof supportedPrinters !== 'undefined') {
      supportedPrinters.forEach((printer, index) => {
        const option = document.createElement("option");
        option.value = index; // Use index to easily retrieve printer object later
        option.textContent = printer.name;
        printerSelect.appendChild(option);
      });
    }

    // Function to apply settings
    const applyPrinterSettings = (printerIndex, widthMm, heightMm, isInfinite) => {
      if (typeof supportedPrinters !== 'undefined' && supportedPrinters[printerIndex]) {
        const printer = supportedPrinters[printerIndex];
        const dpm = printer.dpm;

        // Calculate pixels
        let widthPx;
        if (isInfinite) {
          widthPx = Math.round((widthMm || 100) * dpm);
          if (resizeHandle) resizeHandle.classList.remove('hidden');
        } else {
          widthPx = Math.round(widthMm * dpm);
          if (resizeHandle) resizeHandle.classList.add('hidden');
        }

        // Cap height at printer's max printable height
        let heightPx = Math.round(heightMm * dpm);
        if (heightPx > printer.px) {
          heightPx = printer.px;
        }

        // Update Canvas
        if (window.fabricEditor && window.fabricEditor.updateCanvasSize) {
          window.fabricEditor.updateCanvasSize(widthPx, heightPx);
        }

        // Hide Modal
        startupModal.classList.remove("show");
      }
    };

    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlPrinter = urlParams.get('printer');
    const urlWidth = urlParams.get('width');
    const urlHeight = urlParams.get('height');
    const urlInfinite = urlParams.get('infinite') === 'true';

    if (urlPrinter !== null && urlWidth !== null && urlHeight !== null) {
      // Apply settings from URL
      const pIndex = parseInt(urlPrinter);
      const w = parseFloat(urlWidth);
      const h = parseFloat(urlHeight);

      if (!isNaN(pIndex) && !isNaN(w) && !isNaN(h)) {
        // Update inputs to match URL (so if they open settings later, it's correct)
        printerSelect.value = pIndex;
        paperWidthInput.value = w;
        paperHeightInput.value = h;
        if (infinitePaperCheckbox) {
          infinitePaperCheckbox.checked = urlInfinite;
          // Trigger change event to update UI state (hide/show width input)
          infinitePaperCheckbox.dispatchEvent(new Event('change'));
        }

        applyPrinterSettings(pIndex, w, h, urlInfinite);
      } else {
        // Invalid params, show modal
        startupModal.classList.add("show");
      }
    } else {
      // No URL params, show modal
      startupModal.classList.add("show");
    }

    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        startupModal.classList.add("show");
      });
    }

    // Infinite Paper Checkbox Logic
    if (infinitePaperCheckbox && paperWidthInput && paperWidthContainer) {
      infinitePaperCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          paperWidthInput.removeAttribute("max");
          paperWidthContainer.style.display = 'none'; // Hide width input
          if (resizeHandle) resizeHandle.classList.remove('hidden');
        } else {
          paperWidthInput.setAttribute("max", "100"); // Restore default max
          if (parseFloat(paperWidthInput.value) > 100) {
            paperWidthInput.value = 100; // Cap value if it exceeds max
          }
          paperWidthContainer.style.display = 'block'; // Show width input
          if (resizeHandle) resizeHandle.classList.add('hidden');
        }
      });
    }

    // 3. Handle Start Button Click
    startBtn.addEventListener("click", () => {
      const selectedPrinterIndex = printerSelect.value;
      const widthMm = parseFloat(paperWidthInput.value);
      const heightMm = parseFloat(paperHeightInput.value);
      const isInfinite = infinitePaperCheckbox ? infinitePaperCheckbox.checked : false;

      applyPrinterSettings(selectedPrinterIndex, widthMm, heightMm, isInfinite);

      // Update URL
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('printer', selectedPrinterIndex);
      newUrl.searchParams.set('width', widthMm);
      newUrl.searchParams.set('height', heightMm);
      newUrl.searchParams.set('infinite', isInfinite);
      window.history.replaceState({}, '', newUrl);
    });
  }
});

function setTextAlign(alignment) {
  if (window.fabricEditor) {
    window.fabricEditor.setTextAlign(alignment);
  }
}

function setVerticalAlign(alignment) {
  if (window.fabricEditor) {
    window.fabricEditor.setVerticalAlign(alignment);
  }
}
