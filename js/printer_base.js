class PrinterBase {
    constructor() {
        this.device = null;
        this.serviceUUID = null;
        this.charUUID = null;
    }

    async connect(device) {
        this.device = device;
        if (this.device.gatt.connected) {
            log(device.name + " already connected.");
        } else {
            await device.gatt.connect();
            log(device.name + " (" + device.id + ") connected: " + device.gatt.connected);
        }

        try {
            const server = await device.gatt.connect(); // Ensure we have the server
            const service = await server.getPrimaryService(this.serviceUUID);
            const characteristic = await service.getCharacteristic(this.charUUID);
            return characteristic;
        } catch (e) {


            const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
            const service = await server.getPrimaryService(this.serviceUUID);
            const characteristic = await service.getCharacteristic(this.charUUID);
            return characteristic;
        }
    }

    async sendPackets(characteristic, packets) {
        for (const p of packets) {
            const chunks = splitIntoChunks(p, 96);
            for (const chunk of chunks) {
                await characteristic.writeValue(chunk);
                await new Promise(r => setTimeout(r, 30));
            }
        }
    }

    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
            log("Printer has been removed.");
            this.device = null;
        } else {
            log("No printer connected.");
        }
    }

    async getPrinterInfo() {
        console.log("Printer info not implemented.");
        return ("Printer info not implemented.");
    }
}
