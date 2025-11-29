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
