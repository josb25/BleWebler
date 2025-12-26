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
        alert("Your browser does not support the Local Font Access API.");
        loadSystemFontsBtn.style.display = 'none';
      }
    });
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;

      // Set active class
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Hide all option divs
      const textDiv = document.getElementById("textOptions");
      const infoDiv = document.getElementById("infoOptions");

      if (!textDiv || !infoDiv) {
        console.error("Option divs not found!");
        return;
      }

      textDiv.style.display = "none";
      infoDiv.style.display = "none";

      // Show selected option
      if (type === "text") textDiv.style.display = "block";
      else if (type === "info") {
        infoDiv.style.display = "block";
        handleInfoTab();
      }
    });
  });

  async function handleInfoTab() {
    const infoDisplay = document.getElementById("printerInfoDisplay");
    infoDisplay.textContent = "Connecting to printer...";

    try {
      // Ensure connectPrinter is available globally or imported
      if (typeof connectPrinter === 'function') {
        const printer = await connectPrinter();
        if (printer) {
          infoDisplay.textContent = "Retrieving information...";
          const info = await printer.getPrinterInfo();
          infoDisplay.innerHTML = info;
        } else {
          infoDisplay.textContent = "Could not connect to printer.";
        }
      } else {
        infoDisplay.textContent = "Error: connectPrinter function not found.";
      }
    } catch (err) {
      infoDisplay.textContent = "Error: " + err.message;
    }
  }

  const refreshInfoBtn = document.getElementById("refreshInfoBtn");
  if (refreshInfoBtn) {
    refreshInfoBtn.addEventListener("click", handleInfoTab);
  }

  // Set initial state
  const activeBtn = document.querySelector(".label-type-btn.active");
  if (activeBtn) activeBtn.click(); // Triggers display of text options

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

  // Show/hide label spacing based on infinite paper setting
  const labelSpacingContainer = document.getElementById("labelSpacingContainer");
  if (infinitePaperCheckbox && labelSpacingContainer) {
    const updateSpacingVisibility = () => {
      labelSpacingContainer.style.display = infinitePaperCheckbox.checked ? 'none' : 'flex';
    };
    infinitePaperCheckbox.addEventListener("change", updateSpacingVisibility);
    updateSpacingVisibility(); // Set initial state
  }
  const resizeHandle = document.getElementById("resizeHandle");
  const canvasWrapper = document.getElementById("canvasWrapper");
  const homeTitle = document.getElementById("homeTitle");

  // Resize Handle Logic
  let isDragging = false;
  let startX;
  let startWidth;
  let currentPrinterDpm = 8; // Default dpm, will be updated when printer is selected
  const dimensionControls = document.getElementById("dimensionControls");
  const widthInput = document.getElementById("widthInput");
  const heightInput = document.getElementById("heightInput");

  // Function to get current printer dpm
  const getCurrentPrinterDpm = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPrinter = urlParams.get('printer');
    if (urlPrinter !== null && typeof supportedPrinters !== 'undefined') {
      const pIndex = parseInt(urlPrinter);
      if (!isNaN(pIndex) && supportedPrinters[pIndex]) {
        return supportedPrinters[pIndex].dpm;
      }
    }
    return currentPrinterDpm; // Fallback to stored value
  };

  // Function to update dimension inputs from canvas
  const updateDimensionInputs = () => {
    const canvas = window.getFabricCanvas();
    if (canvas && widthInput && heightInput) {
      currentPrinterDpm = getCurrentPrinterDpm();
      const widthMm = canvas.getWidth() / currentPrinterDpm;
      const heightMm = canvas.getHeight() / currentPrinterDpm;
      widthInput.value = widthMm.toFixed(1);
      heightInput.value = heightMm.toFixed(1);
    }
  };

  // Function to update canvas from dimension inputs
  const updateCanvasFromInputs = () => {
    const canvas = window.getFabricCanvas();
    if (canvas && widthInput && heightInput) {
      currentPrinterDpm = getCurrentPrinterDpm();
      const widthMm = parseFloat(widthInput.value);
      const heightMm = parseFloat(heightInput.value);
      
      if (!isNaN(widthMm) && widthMm > 0 && !isNaN(heightMm) && heightMm > 0) {
        const widthPx = Math.round(widthMm * currentPrinterDpm);
        const heightPx = Math.round(heightMm * currentPrinterDpm);
        if (window.fabricEditor) {
          window.fabricEditor.updateCanvasSize(widthPx, heightPx);
        }
      }
    }
  };

  if (resizeHandle) {
    const startDrag = (clientX) => {
      isDragging = true;
      startX = clientX;
      resizeHandle.classList.add('active');
      // Update dpm from current printer
      currentPrinterDpm = getCurrentPrinterDpm();
      if (window.fabricEditor && window.fabricEditor.getActiveObject) {
        // Get current canvas width
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
            // Update width input
            updateDimensionInputs();
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

  // Flag to prevent update loops
  let isUpdatingFromInputs = false;

  // Dimension input handlers
  if (widthInput) {
    widthInput.addEventListener('change', () => {
      isUpdatingFromInputs = true;
      updateCanvasFromInputs();
      isUpdatingFromInputs = false;
    });
    widthInput.addEventListener('blur', () => {
      isUpdatingFromInputs = true;
      updateCanvasFromInputs();
      isUpdatingFromInputs = false;
    });
  }

  if (heightInput) {
    heightInput.addEventListener('change', () => {
      isUpdatingFromInputs = true;
      updateCanvasFromInputs();
      isUpdatingFromInputs = false;
    });
    heightInput.addEventListener('blur', () => {
      isUpdatingFromInputs = true;
      updateCanvasFromInputs();
      isUpdatingFromInputs = false;
    });
  }

  // Update dimension inputs when canvas size changes (but not when updating from inputs)
  if (window.fabricEditor) {
    const originalUpdateCanvasSize = window.fabricEditor.updateCanvasSize;
    if (originalUpdateCanvasSize) {
      window.fabricEditor.updateCanvasSize = function(width, height) {
        originalUpdateCanvasSize.call(this, width, height);
        if (!isUpdatingFromInputs) {
          updateDimensionInputs();
        }
      };
    }
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
        // Store dpm for resize handle
        currentPrinterDpm = dpm;

        // Calculate pixels
        let widthPx;
        if (isInfinite) {
          widthPx = Math.round((widthMm || 100) * dpm);
          if (resizeHandle) resizeHandle.classList.remove('hidden');
          if (dimensionControls) dimensionControls.classList.remove('hidden');
        } else {
          widthPx = Math.round(widthMm * dpm);
          if (resizeHandle) resizeHandle.classList.add('hidden');
          if (dimensionControls) dimensionControls.classList.add('hidden');
        }

        // Cap height at printer's max printable height
        let heightPx = Math.round(heightMm * dpm);
        if (heightPx > printer.px) {
          heightPx = printer.px;
        }

        // Update Canvas
        if (window.fabricEditor && window.fabricEditor.updateCanvasSize) {
          window.fabricEditor.updateCanvasSize(widthPx, heightPx);
          // Update dimension inputs after canvas is updated
          setTimeout(updateDimensionInputs, 0);
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

    // Close settings modal
    const closeSettingsModal = document.getElementById("closeSettingsModal");
    if (closeSettingsModal && startupModal) {
      closeSettingsModal.addEventListener("click", () => {
        startupModal.classList.remove("show");
      });
      
      // Close modal when clicking outside
      startupModal.addEventListener("click", (e) => {
        if (e.target === startupModal) {
          startupModal.classList.remove("show");
        }
      });
    }

    // Home title click handler - go back to home (clear URL params)
    if (homeTitle) {
      homeTitle.addEventListener("click", () => {
        window.location.href = window.location.pathname;
      });
    }

    // Infinite Paper Checkbox Logic
    if (infinitePaperCheckbox && paperWidthInput && paperWidthContainer) {
      infinitePaperCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          paperWidthInput.removeAttribute("max");
          paperWidthContainer.style.display = 'none'; // Hide width input
          if (resizeHandle) resizeHandle.classList.remove('hidden');
          if (dimensionControls) dimensionControls.classList.remove('hidden');
          // Update dimension inputs when enabling infinite paper
          updateDimensionInputs();
        } else {
          paperWidthInput.setAttribute("max", "100"); // Restore default max
          if (parseFloat(paperWidthInput.value) > 100) {
            paperWidthInput.value = 100; // Cap value if it exceeds max
          }
          paperWidthContainer.style.display = 'block'; // Show width input
          if (resizeHandle) resizeHandle.classList.add('hidden');
          if (dimensionControls) dimensionControls.classList.add('hidden');
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
