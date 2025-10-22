const canvasHeight = 96;

async function printLabelOnP12(device, bitmap, segmentedPaper = false) {
    const canvasWidth = bitmap[0].length

    const payload = bitmapToPacket(bitmap, canvasWidth);

    try {
        const serviceUUID = "0000ff00-0000-1000-8000-00805f9b34fb";
        const charUUID = "0000ff02-0000-1000-8000-00805f9b34fb";

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(serviceUUID);
        const characteristic = await service.getCharacteristic(charUUID);

        log(device.name + " (" + device.id + ") connected: " + device.gatt.connected);

        var packets = [
        Uint8Array.from([0x10, 0xff, 0x40]), // initialization packet
        Uint8Array.from([
            ...new Array(15).fill(0x00),
            0x10, 0xff, 0xf1, 0x02, 0x1d,
            0x76,
            0x30, 0x00,
            0x0c, 0x00,
            canvasWidth & 0xff, (canvasWidth >> 8) & 0xff
        ]),
        payload,
        ];

        if (segmentedPaper){
          packets.push(
            Uint8Array.from([0x1d, 0x0c, 0x10]),
            Uint8Array.from([0xff, 0xf1, 0x45]),
            Uint8Array.from([0x10, 0xff, 0x40]),
            Uint8Array.from([0x10, 0xff, 0x40]),
          )
        }
        else {
          packets.push(
        Uint8Array.from([0x1b, 0x4a, 0x5B]), // purge
        Uint8Array.from([0x10, 0xff, 0xf1, 0x45]) // end
          )     
        }

        for (const p of packets) {
        const chunks = splitIntoChunks(p, 96);
        for (const chunk of chunks) {
            await characteristic.writeValue(chunk);
            await new Promise(r => setTimeout(r, 30));
        }
        }

        log("Print successful!");
    } catch (err) {
        log("Print error: " + err);
        console.error("Print error:", err);
    }
}

function bitmapToPacket(bitmap, width) {
  const height = bitmap.length;
  const bytes = [];

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y += 8) {
      const invertedY = height - 8 - y;
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const row = bitmap[invertedY + bit];
        if (row && row[x] === "1") {
          byte |= (1 << bit);
        }
      }
      bytes.push(byte);
    }
  }

  return new Uint8Array(bytes);
}