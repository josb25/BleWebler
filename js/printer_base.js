class PrinterBase {
    constructor() {
        this.device = null;
        this.serviceUUID = null;
        this.charUUID = null;
    }

    async connect(device) {
        this.device = device;
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(this.serviceUUID);
        const characteristic = await service.getCharacteristic(this.charUUID);
        log(device.name + " (" + device.id + ") connected: " + device.gatt.connected);
        return characteristic;
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
}
