// js/dithering.js

/**
 * Converts a given ImageData object to grayscale.
 * @param {ImageData} imageData The input image data.
 * @returns {ImageData} A new ImageData object in grayscale.
 */
function toGrayscale(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;     // red
        data[i + 1] = avg; // green
        data[i + 2] = avg; // blue
    }
    return imageData;
}

/**
 * Applies Floyd-Steinberg dithering to a grayscale ImageData object.
 * @param {ImageData} imageData The input grayscale image data.
 * @returns {ImageData} A new ImageData object with Floyd-Steinberg dithering applied.
 */
function floydSteinbergDithering(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Create a new ImageData object for the dithered output
    const ditheredImageData = new ImageData(width, height);
    const ditheredData = ditheredImageData.data;

    // Copy original data to ditheredData initially
    for (let i = 0; i < data.length; i++) {
        ditheredData[i] = data[i];
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4; // Index for current pixel (R component)

            const oldRed = ditheredData[i];
            const oldGreen = ditheredData[i + 1];
            const oldBlue = ditheredData[i + 2];

            // Convert to binary (black or white)
            const newRed = oldRed < 128 ? 0 : 255;
            const newGreen = oldGreen < 128 ? 0 : 255;
            const newBlue = oldBlue < 128 ? 0 : 255;

            // Set the new binary color
            ditheredData[i] = newRed;
            ditheredData[i + 1] = newGreen;
            ditheredData[i + 2] = newBlue;

            // Calculate error (using red channel as it's grayscale)
            const errorRed = oldRed - newRed;
            const errorGreen = oldGreen - newGreen;
            const errorBlue = oldBlue - newBlue;

            // Distribute error to neighboring pixels (Floyd-Steinberg coefficients)
            // Pixel (x+1, y)   : 7/16
            // Pixel (x-1, y+1) : 3/16
            // Pixel (x, y+1)   : 5/16
            // Pixel (x+1, y+1) : 1/16

            // Helper function to safely add error
            const addError = (px, py, er, eg, eb, multiplier) => {
                if (px >= 0 && px < width && py >= 0 && py < height) {
                    const idx = (py * width + px) * 4;
                    ditheredData[idx] = Math.min(255, Math.max(0, ditheredData[idx] + er * multiplier));
                    ditheredData[idx + 1] = Math.min(255, Math.max(0, ditheredData[idx + 1] + eg * multiplier));
                    ditheredData[idx + 2] = Math.min(255, Math.max(0, ditheredData[idx + 2] + eb * multiplier));
                }
            };

            // (x+1, y)
            addError(x + 1, y, errorRed, errorGreen, errorBlue, 7 / 16);
            // (x-1, y+1)
            addError(x - 1, y + 1, errorRed, errorGreen, errorBlue, 3 / 16);
            // (x, y+1)
            addError(x, y + 1, errorRed, errorGreen, errorBlue, 5 / 16);
            // (x+1, y+1)
            addError(x + 1, y + 1, errorRed, errorGreen, errorBlue, 1 / 16);
        }
    }
    return ditheredImageData;
}

// Function to convert an Image object to ImageData, optionally scaling it
function getImageDataFromImage(image, targetWidth, targetHeight) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Use target dimensions if provided, otherwise use original image dimensions
    canvas.width = targetWidth || image.width;
    canvas.height = targetHeight || image.height;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height); // Draw and scale
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Function to convert ImageData back to a Data URL
function imageDataToDataURL(imageData) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

// Map of dithering algorithms
const ditheringAlgorithms = {
    'none': (imageData) => imageData, // No dithering, just return original
    'floyd-steinberg': floydSteinbergDithering,
    // Add other algorithms here later
};
