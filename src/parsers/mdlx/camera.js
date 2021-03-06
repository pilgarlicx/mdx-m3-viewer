import AnimatedObject from './animatedobject';

export default class Camera extends AnimatedObject {
    constructor() {
        super();

        /** @member {string} */
        this.name = '';
        /** @member {Float32Array} */
        this.position = new Float32Array(3);
        /** @member {number} */
        this.fieldOfView = 0;
        /** @member {number} */
        this.farClippingPlane = 0;
        /** @member {number} */
        this.nearClippingPlane = 0;
        /** @member {Float32Array} */
        this.targetPosition = new Float32Array(3);
    }

    readMdx(stream) {
        let size = stream.readUint32();

        this.name = stream.read(80);
        stream.readFloat32Array(this.position);
        this.fieldOfView = stream.readFloat32();
        this.farClippingPlane = stream.readFloat32();
        this.nearClippingPlane = stream.readFloat32();
        stream.readFloat32Array(this.targetPosition);

        this.readAnimations(stream, size - 120);
    }

    writeMdx(stream) {
        stream.writeUint32(this.getByteLength());
        stream.write(this.name);
        stream.skip(80 - this.name.length);
        stream.writeFloat32Array(this.position);
        stream.writeFloat32(this.fieldOfView);
        stream.writeFloat32(this.farClippingPlane);
        stream.writeFloat32(this.nearClippingPlane);
        stream.writeFloat32Array(this.targetPosition);

        this.writeAnimations(stream);
    }

    readMdl(stream) {
        this.name = stream.read();

        for (let token of stream.readBlock()) {
            if (token === 'Position') {
                stream.readFloatArray(this.position);
            } else if (token === 'Translation') {
                this.readAnimation(stream, 'KCTR');
            } else if (token === 'Rotation') {
                this.readAnimation(stream, 'KCRL');
            } else if (token === 'FieldOfView') {
                this.fieldOfView = stream.readFloat();
            } else if (token === 'FarClip') {
                this.farClippingPlane = stream.readFloat();
            } else if (token === 'NearClip') {
                this.nearClippingPlane = stream.readFloat();
            } else if (token === 'Target') {
                for (token of stream.readBlock()) {
                    if (token === 'Position') {
                        stream.readFloatArray(this.targetPosition);
                    } else if (token === 'Translation') {
                        this.readAnimation(stream, 'KTTR');
                    } else {
                        throw new Error(`Unknown token in Camera ${this.name}'s Target: "${token}"`);
                    }
                }
            } else {
                throw new Error(`Unknown token in Camera ${this.name}: "${token}"`);
            }
        }
    }

    writeMdl(stream) {
        stream.startObjectBlock('Camera', this.name);

        stream.writeArrayAttrib('Position', this.position);
        this.writeAnimation(stream, 'KCTR');
        this.writeAnimation(stream, 'KCRL');
        stream.writeAttrib('FieldOfView', this.fieldOfView);
        stream.writeAttrib('FarClip', this.farClippingPlane);
        stream.writeAttrib('NearClip', this.nearClippingPlane);

        stream.startBlock('Target');
        stream.writeArrayAttrib('Position', this.targetPosition);
        this.writeAnimation(stream, 'KTTR');
        stream.endBlock();

        stream.endBlock();
    }

    getByteLength() {
        return 120 + super.getByteLength();
    }
};
