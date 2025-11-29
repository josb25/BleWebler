function toggleAdvanced() {
  const section = document.getElementById("advancedSection");
  const toggleButton = document.querySelector("button[onclick='toggleAdvanced()']");

  const visible = section.style.display !== "none";
  section.style.display = visible ? "none" : "block";
  toggleButton.textContent = visible ? "Show Advanced" : "Hide Advanced";
}


document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".label-type-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;

      // Active-Klasse setzen
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Alle Options-Divs ausblenden
      const textDiv = document.getElementById("textOptions");
      const imageDiv = document.getElementById("imageOptions");
      const qrDiv = document.getElementById("qrcodeOptions");
      const infoDiv = document.getElementById("infoOptions");

      if (!textDiv || !imageDiv || !qrDiv || !infoDiv) {
        console.error("Options-Divs nicht gefunden!");
        return;
      }

      textDiv.style.display = "none";
      imageDiv.style.display = "none";
      qrDiv.style.display = "none";
      infoDiv.style.display = "none";

      // Gewählte Option einblenden
      if (type === "text") textDiv.style.display = "block";
      else if (type === "bitmap") imageDiv.style.display = "block";
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
