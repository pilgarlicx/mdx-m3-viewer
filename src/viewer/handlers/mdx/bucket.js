import Bucket from '../../bucket';
import MdxParticleEmitter from './particleemitter';
import MdxParticleEmitter2 from './particleemitter2';
import MdxRibbonEmitter from './ribbonemitter';
import MdxEventObjectSpnEmitter from './eventobjectspnemitter';
import MdxEventObjectSplEmitter from './eventobjectsplemitter';
import MdxEventObjectUbrEmitter from './eventobjectubremitter';

export default class MdxBucket extends Bucket {
    /**
     * @param {MdxModelView} modelView
     */
    constructor(modelView) {
        super(modelView);

        let model = this.model,
            gl = model.env.gl,
            numberOfBones = model.bones.length + 1,
            objects;

        this.boneArrayInstanceSize = numberOfBones * 16;
        this.boneArray = new Float32Array(this.boneArrayInstanceSize * this.size);

        this.updateBoneTexture = false;
        this.boneTexture = gl.createTexture();
        this.boneTextureWidth = numberOfBones * 4;
        this.boneTextureHeight = this.size;
        this.vectorSize = 1 / this.boneTextureWidth;
        this.rowSize = 1 / this.boneTextureHeight;

        gl.activeTexture(gl.TEXTURE15);
        gl.bindTexture(gl.TEXTURE_2D, this.boneTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.boneTextureWidth, this.boneTextureHeight, 0, gl.RGBA, gl.FLOAT, this.boneArray);

        // Team colors (per instance)
        this.updateTeamColors = false;
        this.teamColorArray = new Uint8Array(this.size);
        this.teamColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.teamColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.teamColorArray, gl.DYNAMIC_DRAW);

        // Vertex color (per instance)
        this.updateVertexColors = false;
        this.vertexColorArray = new Uint8Array(4 * this.size).fill(255); // Vertex color initialized to white
        this.vertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexColorArray, gl.DYNAMIC_DRAW);

        // Batch visibility (per instance per batch)
        this.updateGeosetAlphas = false;
        this.geosetAlphaArrays = [];
        this.geosetAlphaBuffers = [];

        // Geoset colors (per instance per geoset)
        this.updateGeosetColors = false;
        this.geosetColorArrays = [];
        this.geosetColorBuffers = [];

        // Layer alphas (per instance per layer)
        this.updateLayerAlphas = false;
        this.layerAlphaArrays = [];
        this.layerAlphaBuffers = [];

        // Texture coordinate animations (per instance per layer)
        this.updateUvOffsets = false;
        this.uvOffsetArrays = [];
        this.uvOffsetBuffers = [];

        this.hasBatches = model.batches.length > 0;

        // Batches
        if (this.hasBatches) {
            for (var i = 0, l = model.geosets.length; i < l; i++) {
                this.geosetAlphaArrays[i] = new Uint8Array(this.size).fill(255);
                this.geosetAlphaBuffers[i] = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.geosetAlphaBuffers[i]);
                gl.bufferData(gl.ARRAY_BUFFER, this.geosetAlphaArrays[i], gl.DYNAMIC_DRAW);

                this.geosetColorArrays[i] = new Uint8Array(3 * this.size).fill(255); // Geoset colors are initialized to white
                this.geosetColorBuffers[i] = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.geosetColorBuffers[i]);
                gl.bufferData(gl.ARRAY_BUFFER, this.geosetColorArrays[i], gl.DYNAMIC_DRAW);
            }

            for (var i = 0, l = model.layers.length; i < l; i++) {
                this.uvOffsetArrays[i] = new Float32Array(4 * this.size);
                this.uvOffsetBuffers[i] = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.uvOffsetBuffers[i]);
                gl.bufferData(gl.ARRAY_BUFFER, this.uvOffsetArrays[i], gl.DYNAMIC_DRAW);

                this.layerAlphaArrays[i] = new Uint8Array(this.size).fill(255); // Layer alphas are initialized to opaque
                this.layerAlphaBuffers[i] = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.layerAlphaBuffers[i]);
                gl.bufferData(gl.ARRAY_BUFFER, this.layerAlphaArrays[i], gl.DYNAMIC_DRAW);
            }
        }

        // Instantiate all of the pointers to all of the structures that were just made.
        this.sharedData = [];
        this.prefetchSharedData();

        // Emitters
        this.particleEmitters = [];
        this.particle2Emitters = [];
        this.eventObjectEmitters = [];
        this.ribbonEmitters = [];

        for (let emitter of model.particleEmitters) {
            this.particleEmitters.push(new MdxParticleEmitter(emitter));
        }

        for (let emitter of model.particleEmitters2) {
            this.particle2Emitters.push(new MdxParticleEmitter2(emitter));
        }

        for (let emitter of model.ribbonEmitters) {
            this.ribbonEmitters.push(new MdxRibbonEmitter(emitter));
        }

        for (let emitter of model.eventObjects) {
            let type = emitter.type;

            if (type === 'SPN') {
                this.eventObjectEmitters.push(new MdxEventObjectSpnEmitter(emitter));
            } else if (type === 'SPL') {
                this.eventObjectEmitters.push(new MdxEventObjectSplEmitter(emitter));
            } else if (type === 'UBR') {
                this.eventObjectEmitters.push(new MdxEventObjectUbrEmitter(emitter));
            }
        }
    }

    getRenderStats() {
        let model = this.model,
            calls = 0,
            instances = this.instances.length,
            vertices = 0,
            polygons = 0,
            dynamicVertices = 0,
            dynamicPolygons = 0,
            objects;

        objects = model.batches;
        for (let i = 0, l = objects.length; i < l; i++) {
            let geoset = objects[i].geoset;

            calls += 1;
            vertices += (geoset.locationArray.length / 3) * instances;
            polygons += (geoset.faceArray.length / 3) * instances;
        }

        objects = this.particle2Emitters;
        for (let i = 0, l = objects.length; i < l; i++) {
            let emitter = objects[i],
                active = emitter.active.length;

            if (active > 0) {
                calls += 1;
                dynamicVertices += active * 6;
                dynamicPolygons += active * 2;
            }
        }

        objects = this.ribbonEmitters;
        for (let i = 0, l = objects.length; i < l; i++) {
            let emitter = objects[i],
                active = emitter.active.length;

            if (active > 0) {
                calls += 1;
                dynamicVertices += active * 6;
                dynamicPolygons += active * 2;
            }
        }

        objects = this.eventObjectEmitters;
        for (let i = 0, l = objects.length; i < l; i++) {
            let emitter = objects[i],
                active = emitter.active.length;

            if (active > 0) {
                let type = emitter.type;

                if (type === 'SPL' || type === 'UBR') {
                    calls += 1;
                    dynamicVertices += active * 6;
                    dynamicPolygons += active * 2;
                }
            }
        }

        return { calls, instances, vertices, polygons, dynamicVertices, dynamicPolygons };
    }

    update(scene) {
        let gl = this.model.env.gl,
            size = this.instances.length,
            objects;

        if (window.BETA) {
            let instances = this.instances;
            let boneArray = this.boneArray;
            let teamColorArray = this.teamColorArray;
            let vertexColorArray = this.vertexColorArray;

            for (let i = 0, l = instances.length; i < l; i++) {
                let instance = instances[i];

                if (instance.isVisible) {
                    let bones = instance.skeleton.bones;
                    let vertexColor = instance.vertexColor;
                    let boneMatrices = instance.skeleton.boneMatrices;
                    let base = 16 + i * (16 + boneMatrices.length);

                    for (let j = 0, k = boneMatrices.length / 4; j < k; j += 4) {
                        let b = base + j;

                        boneArray[b] = boneMatrices[j];
                        boneArray[b + 1] = boneMatrices[j + 1];
                        boneArray[b + 2] = boneMatrices[j + 2];
                        boneArray[b + 3] = boneMatrices[j + 3];
                    }
                    //boneArray.set(instance.skeleton.boneMatrices, 16 + i * (16 + instance.skeleton.boneMatrices.length));

                    teamColorArray[i] = instance.teamColor;

                    vertexColorArray[i * 4 + 0] = vertexColor[0];
                    vertexColorArray[i * 4 + 1] = vertexColor[1];
                    vertexColorArray[i * 4 + 2] = vertexColor[2];
                    vertexColorArray[i * 4 + 3] = vertexColor[3];
                }
            }

            gl.activeTexture(gl.TEXTURE15);
            gl.bindTexture(gl.TEXTURE_2D, this.boneTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.boneTextureWidth, size, gl.RGBA, gl.FLOAT, boneArray);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.teamColorBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.teamColorArray);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColorBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexColorArray);
        } else {
            if (this.updateBoneTexture) {
                this.updateBoneTexture = false;

                gl.activeTexture(gl.TEXTURE15);
                gl.bindTexture(gl.TEXTURE_2D, this.boneTexture);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.boneTextureWidth, size, gl.RGBA, gl.FLOAT, this.boneArray);
            }

            if (this.updateTeamColors) {
                this.updateTeamColors = false;

                gl.bindBuffer(gl.ARRAY_BUFFER, this.teamColorBuffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.teamColorArray.subarray(0, size));
            }

            if (this.updateVertexColors) {
                this.updateVertexColors = false;

                gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColorBuffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexColorArray.subarray(0, 4 * size));
            }
        }

        objects = this.particleEmitters;
        for (let i = 0, l = objects.length; i < l; i++) {
            objects[i].update();
        }

        objects = this.particle2Emitters;
        for (let i = 0, l = objects.length; i < l; i++) {
            objects[i].update(scene);
        }

        objects = this.ribbonEmitters;
        for (let i = 0, l = objects.length; i < l; i++) {
            objects[i].update(scene);
        }

        objects = this.eventObjectEmitters;
        for (let i = 0, l = objects.length; i < l; i++) {
            objects[i].update(scene);
        }

        if (this.updateGeosetAlphas) {
            this.updateGeosetAlphas = false;

            for (var i = 0, l = this.geosetAlphaArrays.length; i < l; i++) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.geosetAlphaBuffers[i]);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.geosetAlphaArrays[i].subarray(0, size));
            }
        }

        if (this.updateGeosetColors) {
            this.updateGeosetColors = false;

            for (var i = 0, l = this.geosetColorArrays.length; i < l; i++) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.geosetColorBuffers[i]);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.geosetColorArrays[i].subarray(0, 3 * size));
            }
        }

        if (this.updateUvOffsets) {
            this.updateUvOffsets = false;

            for (var i = 0, l = this.uvOffsetArrays.length; i < l; i++) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.uvOffsetBuffers[i]);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.uvOffsetArrays[i].subarray(0, 4 * size));
            }
        }

        if (this.updateLayerAlphas) {
            this.updateLayerAlphas = false;

            for (var i = 0, l = this.layerAlphaArrays.length; i < l; i++) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.layerAlphaBuffers[i]);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.layerAlphaArrays[i].subarray(0, size));
            }
        }
    }

    prefetchSharedData() {
        for (let i = 0, l = this.size; i < l; i++) {
            this.sharedData[i] = this.prefetchSharedDataInstance(i);
        }
    }

    prefetchSharedDataInstance(index) {
        let data = {
            boneArray: new Float32Array(this.boneArray.buffer, this.boneArrayInstanceSize * 4 * index, this.boneArrayInstanceSize),
            teamColorArray: new Uint8Array(this.teamColorArray.buffer, index, 1),
            vertexColorArray: new Uint8Array(this.vertexColorArray.buffer, 4 * index, 4),
            batches: [],
            geosetAlphaArrays: [],
            geosetColorArrays: [],
            uvOffsetArrays: [],
            layerAlphaArrays: []
        };

        if (this.batchesCount) {
            let buffer = this.dataArray.buffer,
                base = this.dataInstanceSize * index;

            for (let i = 0, l = this.batchesCount; i < l; i++) {
                let batchBase = base + 4 * 12 * i;

                data.batches[i] = {
                    teamColor: new Float32Array(buffer, batchBase, 1),
                    vertexColor: new Float32Array(buffer, batchBase + 4, 3),
                    layerAlpha: new Float32Array(buffer, batchBase + 16, 1),
                    geosetColor: new Float32Array(buffer, batchBase + 20, 3),
                    textureAnimation: new Float32Array(buffer, batchBase + 32, 2),
                    spriteAnimation: new Float32Array(buffer, batchBase + 40, 2),
                };
            }
        }

        if (this.hasBatches) {
            for (let i = 0, l = this.geosetAlphaArrays.length; i < l; i++) {
                data.geosetAlphaArrays[i] = new Uint8Array(this.geosetAlphaArrays[i].buffer, index, 1);
                data.geosetColorArrays[i] = new Uint8Array(this.geosetColorArrays[i].buffer, 3 * index, 3);
            }

            for (let i = 0, l = this.uvOffsetArrays.length; i < l; i++) {
                data.uvOffsetArrays[i] = new Float32Array(this.uvOffsetArrays[i].buffer, 4 * 4 * index, 4);
                data.layerAlphaArrays[i] = new Uint8Array(this.layerAlphaArrays[i].buffer, index, 1);
            }
        }

        return data;
    }

    getSharedData(index) {
        return this.sharedData[index];
    }
};
