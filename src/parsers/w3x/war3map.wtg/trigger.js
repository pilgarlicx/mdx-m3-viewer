import ECA from './eca';

export default class Trigger {
    constructor() {
        this.name = '';
        this.description = '';
        this.isComment = 0;
        this.isEnabled = 0;
        this.isCustom = 0;
        this.isInitiallyOff = 0;
        this.runOnInitialization = 0;
        this.triggerCategory = 0;
        this.ecas = [];
    }

    load(stream, version, argumentMap) {
        this.name = stream.readUntilNull();
        this.description = stream.readUntilNull();

        if (version === 7) {
            this.isComment = stream.readInt32();
        }

        this.isEnabled = stream.readInt32();
        this.isCustomText = stream.readInt32();
        this.isInitiallyOff = stream.readInt32();
        this.runOnInitialization = stream.readInt32();
        this.triggerCategory = stream.readInt32();

        for (let i = 0, l = stream.readUint32(); i < l; i++) {
            let eca = new ECA();

            eca.load(stream, version, false, argumentMap);

            this.ecas[i] = eca;
        }
    }

    save(stream, version) {
        stream.write(`${this.name}\0`);
        stream.write(`${this.description}\0`);

        if (version === 7) {
            stream.writeInt32(this.isComment);
        }

        stream.writeInt32(this.isEnabled);
        stream.writeInt32(this.isCustomText);
        stream.writeInt32(this.isInitiallyOff);
        stream.writeInt32(this.runOnInitialization);
        stream.writeInt32(this.triggerCategory);
        stream.writeUint32(this.ecas.length);

        for (let eca of this.ecas) {
            eca.save(stream, version);
        }
    }

    /**
     * @param {number} version 
     * @returns {number} 
     */
    getByteLength(version) {
        let size = 26 + this.name.length + this.description.length;

        if (version === 7) {
            size += 4;
        }

        for (let eca of this.ecas) {
            size += eca.getByteLength(version);
        }

        return size;
    }
};
