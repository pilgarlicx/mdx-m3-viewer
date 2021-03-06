import DownloadableResource from './downloadableresource';

export default class Model extends DownloadableResource {
    /**
     * @param {ModelViewer} env
     * @param {function(?)} pathSolver
     * @param {Handler} handler
     * @param {string} extension
     */
    constructor(env, pathSolver, handler, extension) {
        super(env, pathSolver, handler, extension);

        /** @member {Array<ModelInstance>} */
        this.instances = [];

        /** @member {Array<ModelView>} */
        this.views = [];
    }

    get objectType() {
        return 'model';
    }

    /**
     * Adds a new instance to this model, and returns it.
     * 
     * @returns {ModelInstance}
     */
    addInstance() {
        let views = this.views,
            instance = new this.handler.instance(this);

        instance.load(this);

        this.instances.push(instance);

        if (views.length === 0) {
            this.addView();
        }

        views[0].addInstance(instance);

        if (this.loaded || this.error) {
            instance.modelReady();
        }

        return instance;
    }

    /**
     * Detach this model from the viewer. This removes references to it from the viewer, and also detaches all of the model views it owns.
     */
    detach() {
        // Detach all of the views
        let views = this.views;

        for (let i = 0, l = views.length; i < l; i++) {
            views[i].clear();
        }

        // Remove references from the viewer
        this.env.removeReference(this);
    }

    renderOpaque(bucket) {

    }

    renderTranslucent(bucket) {

    }

    renderEmitters(bucket) {

    }

    addView() {
        let view = new this.handler.view(this);

        this.views.push(view);

        return view;
    }

    removeView(modelView) {
        let views = this.views;

        views.splice(views.indexOf(modelView), 1);
    }

    viewChanged(instance, shallowView) {
        // Check if there's another view that matches the instance
        let views = this.views;

        for (let i = 0, l = views.length; i < l; i++) {
            let view = views[i];

            if (view.equals(shallowView)) {
                view.addInstance(instance);
                return;
            }
        }

        // Since no view matched, create a new one
        let view = this.addView();

        view.applyShallowCopy(shallowView);
        view.addInstance(instance);
    }

    // This allows setting up preloaded instances without event listeners.
    resolve() {
        super.resolve();

        let instances = this.instances;

        for (let i = 0, l = instances.length; i < l; i++) {
            instances[i].modelReady();
        }
    }
};
