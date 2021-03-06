export default class MpqBlock {
    constructor() {
        /** @member {number} */
        this.offset = 0;
        /** @member {number} */
        this.compressedSize = 0;
        /** @member {number} */
        this.normalSize = 0;
        /** @member {number} */
        this.flags = 0;
    }

    load(typedArray) {
        this.offset = typedArray[0];
        this.compressedSize = typedArray[1];
        this.normalSize = typedArray[2];
        this.flags = typedArray[3];
    }

    save(typedArray) {
        typedArray[0] = this.offset;
        typedArray[1] = this.compressedSize;
        typedArray[2] = this.normalSize;
        typedArray[3] = this.flags;
    }
};
