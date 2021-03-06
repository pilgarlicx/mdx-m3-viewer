import Resource from './resource';
import { NotifiedNodeMixin } from './node';

/**
 * @constructor
 * @augments AsyncResource
 * @augments NotifiedNode
 * @param {Model} model
 */
export default class ModelInstance extends NotifiedNodeMixin(Resource) {
    constructor(model) {
        super(model.env);

        this.dontInheritScaling = true;

        /** @member {?ModelView} */
        this.modelView = null;
        /** @member {?Bucket} */
        this.bucket = null;
        /** @member {Model} */
        this.model = model;
        /** @member {boolean} */
        this.paused = false;
        /** 
         * @see Note: do not set this member directly, instead use show() and hide().
         * 
         * @member {boolean}
         */
        this.shouldRender = true;
        /** 
         * @see Note: do not set this member.
         * 
         * @member {boolean}
         */
        this.culled = false;

        this.noCulling = false; // Set to true if the model should always be rendered

        this.isVisible = false;
    }

    get objectType() {
        return 'instance';
    }

    /**
     * Hides this instance.
     * 
     * @returns {boolean}
     */
    hide() {
        if (this.shouldRender) {
            this.shouldRender = false;

            // Is this instance actually shown? (e.g. not culled)
            if (this.bucket) {
                this.modelView.setVisibility(this, false);
            }

            return true;
        }

        return false;
    }

    /**
     * Shows this instance.
     * 
     * @returns {boolean}
     */
    show() {
        if (!this.shouldRender) {
            this.shouldRender = true;

            // Is this instance ready to be shown?
            if (this.loaded && this.scene && !this.culled) {
                this.modelView.setVisibility(this, true);
            }

            return true;
        }

        return false;
    }

    // Cull the instance.
    cull() {
        this.culled = true;

        if (this.bucket) {
            this.modelView.setVisibility(this, false);
        }
    }

    // Stop culling the instance.
    uncull() {
        this.culled = false;

        // Only show the instance if the client didn't hide it.
        if (this.shouldRender && this.scene && !this.bucket) {
            this.modelView.setVisibility(this, true);
        }
    }

    /**
     * Is this instance shown?
     * 
     * @returns {boolean}
     */
    shown() {
        return this.bucket !== null;
    }

    /**
     * Is this instance hidden?
     * 
     * @returns {boolean}
     */
    hidden() {
        return this.bucket === null;
    }

    /**
     * Detach this instance from the scene it's in.
     * 
     * @returns {boolean}
     */
    detach() {
        if (this.scene) {
            return this.scene.removeInstance(this);
        }

        return false;
    }

    updateTimers() {

    }

    modelReady() {
        if (this.model.loaded) {
            this.loaded = true;

            this.initialize();

            if (this.shouldRender && this.scene) {
                this.modelView.setVisibility(this, true);
            }

            this.dispatchEvent({ type: 'load' });
            this.dispatchEvent({ type: 'loadend' });
        } else {
            this.error = true;

            this.dispatchEvent({ type: 'error', error: 'InvalidModel' });
            this.dispatchEvent({ type: 'loadend' });
        }
    }

    setSharedData(sharedData) {

    }

    invalidateSharedData() {

    }
};
