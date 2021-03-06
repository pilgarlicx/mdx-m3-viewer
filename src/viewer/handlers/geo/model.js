import Model from '../../model';

export default class GeometryModel extends Model {
    initialize(src) {
        const gl = this.env.gl;

        var geometry = src.geometry;
        var material = src.material;

        var vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);

        var uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.uvs, gl.STATIC_DRAW);

        var faceBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faceBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.faces, gl.STATIC_DRAW);

        var edgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.edges, gl.STATIC_DRAW);

        this.boundingRadius = geometry.boundingRadius;

        this.vertexArray = geometry.vertices;
        this.uvArray = geometry.uvs;
        this.faceArray = geometry.faces;
        this.edgeArray = geometry.edges;
        this.vertexBuffer = vertexBuffer;
        this.uvBuffer = uvBuffer;
        this.faceBuffer = faceBuffer;
        this.edgeBuffer = edgeBuffer;

        var bytesPerElement = geometry.faces.BYTES_PER_ELEMENT;

        if (bytesPerElement === 1) {
            this.faceIndexType = gl.UNSIGNED_BYTE;
        } else if (bytesPerElement === 2) {
            this.faceIndexType = gl.UNSIGNED_SHORT;
        } else {
            this.faceIndexType = gl.UNSIGNED_INT;
        }

        bytesPerElement = geometry.edges.BYTES_PER_ELEMENT;

        if (bytesPerElement === 1) {
            this.edgeIndexType = gl.UNSIGNED_BYTE;
        } else if (bytesPerElement === 2) {
            this.edgeIndexType = gl.UNSIGNED_SHORT;
        } else {
            this.edgeIndexType = gl.UNSIGNED_INT;
        }

        this.texture = material.texture;

        this.twoSided = material.twoSided || false;
        this.noDepthTest = material.noDepthSet || false;
        this.noDepthSet = material.noDepthSet || false;

        this.uvScale = material.uvScale || new Float32Array([1, 1]);
        this.uvOffset = material.uvOffset || new Float32Array(2);

        this.vertexColor = material.vertexColor || new Float32Array([255, 255, 255, 255]);
        this.edgeColor = material.edgeColor || new Float32Array([255, 255, 255, 255]);

        this.renderMode = 0;

        if (material.renderMode > 0) {
            this.renderMode = material.renderMode;
        }

        this.isBGR = material.isBGR || false;
        this.isBlended = material.isBlended || false;

        if (this.isBlended) {
            this.translucent = true;
        } else {
            this.opaque = true;
        }

        return true;
    }

    render(bucket, scene) {
        let webgl = this.env.webgl,
            gl = this.env.gl,
            instancedArrays = webgl.extensions.instancedArrays,
            shader = this.env.shaderMap.get('GeoStandardShader'),
            uniforms = shader.uniforms,
            attribs = shader.attribs,
            instances = bucket.instances,
            modelView = bucket.modelView;

        webgl.useShaderProgram(shader);

        gl.uniformMatrix4fv(uniforms.get('u_mvp'), false, scene.camera.worldProjectionMatrix);

        // Bone texture
        gl.activeTexture(gl.TEXTURE15);
        gl.bindTexture(gl.TEXTURE_2D, bucket.boneTexture);
        gl.uniform1i(uniforms.get('u_boneMap'), 15);
        gl.uniform1f(uniforms.get('u_vectorSize'), bucket.vectorSize);
        gl.uniform1f(uniforms.get('u_rowSize'), bucket.rowSize);

        // Instanced IDs
        let instanceIdAttrib = attribs.get('a_InstanceID');
        gl.bindBuffer(gl.ARRAY_BUFFER, bucket.instanceIdBuffer);
        gl.vertexAttribPointer(instanceIdAttrib, 1, gl.UNSIGNED_SHORT, false, 2, 0);
        instancedArrays.vertexAttribDivisorANGLE(instanceIdAttrib, 1);

        // Vertices
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(attribs.get('a_position'), 3, gl.FLOAT, false, 12, 0);

        // UVs
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(attribs.get('a_uv'), 2, gl.FLOAT, false, 8, 0);

        if (this.twoSided) {
            gl.disable(gl.CULL_FACE);
        } else {
            gl.enable(gl.CULL_FACE);
        }

        if (this.noDepthTest) {
            gl.disable(gl.DEPTH_TEST);
        } else {
            gl.enable(gl.DEPTH_TEST);
        }

        if (this.noDepthSet) {
            gl.depthMask(0);
        } else {
            gl.depthMask(1);
        }

        if (this.isBlended) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        } else {
            gl.disable(gl.BLEND);
        }

        gl.uniform1i(uniforms.get('u_texture'), 0);

        let colorAttrib = attribs.get('a_color');
        instancedArrays.vertexAttribDivisorANGLE(colorAttrib, 1);

        if (this.renderMode === 0 || this.renderMode === 2) {
            let texture = modelView.texture || this.texture;

            webgl.bindTexture(modelView.texture || this.texture, 0);

            let hasTexture = uniforms.get('u_hasTexture');
            if (texture) {
                gl.uniform1f(hasTexture, 1);
            } else {
                gl.uniform1f(hasTexture, 0);
            }

            gl.uniform1f(uniforms.get('u_isEdge'), 0);
            gl.uniform2fv(uniforms.get('u_uvScale'), this.uvScale);
            gl.uniform2fv(uniforms.get('u_uvOffset'), this.uvOffset);
            gl.uniform1f(uniforms.get('u_isBGR'), this.isBGR);
            gl.uniform1f(uniforms.get('u_alphaMod'), this.alpha)

            // Colors
            gl.bindBuffer(gl.ARRAY_BUFFER, bucket.vertexColorBuffer);
            gl.vertexAttribPointer(colorAttrib, 4, gl.UNSIGNED_BYTE, true, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.faceBuffer);
            instancedArrays.drawElementsInstancedANGLE(gl.TRIANGLES, this.faceArray.length, this.faceIndexType, 0, instances.length);
        }

        if (this.renderMode === 1 || this.renderMode === 2) {
            gl.uniform1f(uniforms.get('u_isEdge'), 1);

            // Edge colors
            gl.bindBuffer(gl.ARRAY_BUFFER, bucket.edgeColorBuffer);
            gl.vertexAttribPointer(colorAttrib, 4, gl.UNSIGNED_BYTE, true, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeBuffer);
            instancedArrays.drawElementsInstancedANGLE(gl.LINES, this.edgeArray.length, this.edgeIndexType, 0, instances.length);
        }

        /// Reset the attributes to play nice with other handlers
        instancedArrays.vertexAttribDivisorANGLE(instanceIdAttrib, 0);
        instancedArrays.vertexAttribDivisorANGLE(colorAttrib, 0);
    }

    renderOpaque(bucket, scene) {
        if (this.opaque) {
            this.render(bucket, scene);
        }
    }

    renderTranslucent(bucket, scene) {
        if (this.translucent) {
            this.render(bucket, scene);
        }
    }

    renderEmitters(bucket, scene) {

    }
};
