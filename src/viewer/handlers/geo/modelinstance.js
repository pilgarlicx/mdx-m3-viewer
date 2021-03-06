import { mat4 } from 'gl-matrix';
import ModelInstance from '../../modelinstance';
import BoundingShape from '../../boundingshape';

export default class GeometryModelInstance extends ModelInstance {
    /**
     * @param {GeometryModel} model
     */
    constructor(model) {
        super(model);

        this.vertexColor = new Uint8Array(4);
        this.edgeColor = new Uint8Array(4);
    }

    initialize() {
        this.boundingShape = new BoundingShape();
        this.boundingShape.fromVertices(this.model.vertexArray);
        this.boundingShape.setParent(this);

        // Initialize to the model's material color
        this.setVertexColor(this.model.vertexColor);
        this.setEdgeColor(this.model.edgeColor);
    }

    setSharedData(sharedData) {
        this.boneArray = sharedData.boneArray;
        this.vertexColorArray = sharedData.vertexColorArray;
        this.edgeColorArray = sharedData.edgeColorArray;

        this.vertexColorArray.set(this.vertexColor);
        this.bucket.updateVertexColors[0] = 1;

        this.edgeColorArray.set(this.edgeColor);
        this.bucket.updateEdgeColors[0] = 1;
    }

    invalidateSharedData() {
        this.boneArray = null;
        this.vertexColorArray = null;
        this.edgeColorArray = null;
    }

    update() {
        mat4.copy(this.boneArray, this.worldMatrix);
    }

    setVertexColor(color) {
        this.vertexColor.set(color);

        if (this.bucket) {
            this.vertexColorArray.set(color);
            this.bucket.updateVertexColors[0] = 1;
        }

        return this;
    }

    setEdgeColor(color) {
        this.edgeColor.set(color);

        if (this.bucket) {
            this.edgeColorArray.set(color);
            this.bucket.updateEdgeColors[0] = 1;
        }

        return this;
    }
};
