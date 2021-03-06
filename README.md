mdx-m3-viewer
=============

Originally a simple model viewer used to render MDX and M3 models, used by the games Warcraft 3 and Starcraft 2 respectively. 
Nowadays it is more of a general model viewer, that can handle any format the client can supply a handler for.
Built-in handlers exist for the following formats:
* MDX (Warcraft 3 model): extensive support, almost everything should work.
* M3 (Starcraft 2 model): partial support, file format not quite reverse engineered yet.
* W3M/W3X (Warcraft 3 map): partial support, will grow in future.
* BLP1 (Warcraft 3 texture): extensive support, almost everything should work.
* MPQ1 (Warcraft 3 archive): partial support, only inflate (which accounts for all models, textures, and table files, but no sound files or weird things).
* TGA (image): partial support, only simple 24bit images.
* SLK (table data): partial support, but will probably keep working for Warcraft 3 files.
* DDS (compressed texture, used by Starcraft 2): partial support, should work for every Starcraft 2 texture, and probably for most DDS files in existence (DXT1/3/5).
* PNG/JPG/GIF: supported as a wrapper around Image.
* GEO (a simple JS format used for geometric shapes): note that this is solely a run-time handler.
* OBJ: partial support (more of an example handler).
* BMP: partial support (more of an example handler).

------------------------

#### Building

1. Download and install NodeJS from https://nodejs.org/en/.
2. Open a command prompt in the viewer's directory, and run "npm install".
3. Run the given webpack dev/prod file, this will generate `viewer.min.js`.
4. Note that the API is given under the global object ModelViewer.

------------------------

#### Getting started

The examples directory has a simple example, I highly suggest looking at it first.

In case you don't have an HTTP server:
1. Open a command prompt, run "npm install http-server -g".
2. Once it is done, at any time go to the viewer's folder, fire up the command prompt, and run "http-server -p 80".
3. In your browser, open `http://localhost/examples/`.

------------------------

#### Usage

First, let's create the viewer.
```javascript
let canvas = ...; // A <canvas> aka HTMLCanvasElement object

let viewer = new ModelViewer(canvas);
```

If the client doesn't have the WebGL requierments to run the viewer, an exception will be thrown when trying to create it.

When a new viewer instance is created, it doesn't yet support loading anything, since it has no handlers.
Handlers are simple JS objects with a specific signature, that give information to the viewer (such as a file format(s), and the implementation objects).
When you want to load something, the viewer will select the appropriate handler, if there is one, and use it to construct the object.

Let's add the MDX handler.
This handler handles MDX files, unsurprisingly. It also adds the SLK, BLP, and TGA handlers automatically, since it requires them.

```javascript
viewer.addHandler(Mdx);
```

Next, let's create a scene and add it to the viewer. Each scene has its own camera and viewport, and holds a list of things to render.
```javascript
let scene = new Scene();

viewer.addScene(scene);
```

Finally, setup the scene's camera.
```javascript
let camera = scene.camera;

// Use the whole canvas
camera.setViewport([0, 0, canvas.width, canvas.height]);

// Use perspective projection with normal settings
camera.setPerspective(Math.PI / 4, 1, 8, 100000);

// Move the camera back, so you could see things
camera.move([0, 0, -500]);
```


So how do you actually load models and other files?
The model viewer uses a system of path solving functions.
That is, you supply a function that takes a source you want to load, such as an url, and you need to return specific results so the viewer knows what to do.
The load function itself looks like this:

```javascript
let resource = viewer.load(src, pathSolver)
```

In other words, you give it a source, and a resource is returned.
A resource in this context means a model, a texture, or a generic file (any handler that is not a model or texture handler, such as SLK).

The source here can be anything - a string, an object, a typed array, whatever - it highly depends on your code, and on the path solver.
Generally speaking though, the source will probably be a an url string.

The path solver is a function with this signature: `function(src) => [finalSrc, srcExtension, isServerFetch]`, where:
* `src` is the source you gave the load call.
* `finalSrc` is the actual source to load from. If this is a server fetch, then this is the url to fetch from.
If it's an in-memory load, it depends on what each handler expects.
* `srcExtension` is the extension of the resource you are loading, which selects the handler to use. The extension is given in a ".ext" format.
That is, a string that contains a dot, followed by the extension.
Generally speaking, this will usually be the extension of an url.
* `isServerFetch` is a boolean, and will determine if this is an in-memory load, or a server fetch. This will usually be true.

So let's use an example.

Suppose we have the following directory structure:

```
index.html
Resources
	model.mdx
	texture.blp
```

And suppose we know that `model.mdx` uses the texture `texture.blp`.

Let's see how a possible path solver could look.
I'll make it assume it's getting urls, and automatically prepend "Resources/" to sources.

```javascript
function myPathSolver(path) {
	return ["Resources/" + path, SomeFunctionThatGetsFileExtensions(path), true];
}
```

Now let's try to load the model.

```javascript
let model = viewer.load("model.mdx", myPathSolver);
```

This function call results in the following chain of events:

1. myPathSolver is called with `"model.mdx"` and returns `["Resources/model.mdx", ".mdx", true]`.
2. The viewer chooses the correct handler based on the extension - in this case the MDX handler - sees this is a server fetch, and uses the source for the fetch.
3. A new MDX model is created and starts loading (at this point the viewer gets a `loadstart` event from the model).
4. The model is returned.
5. ...time passes until the model finishes loading...(meanwhile, the model sends `progress` events, if it's a server fetch, which it is in this case)
6. The model is constructed successfuly, or not, and sends a `load` or `error` event respectively, followed by the `loadend` event.
7. In the case of a MDX model, the previous step will also cause it to load its textures, in this case `texture.blp`.
8. myPathSolver is called with `texture.blp`, which returns `["Resources/texture.blp", ".blp", true]`, and we loop back to step 2, but with a texture this time.

Had we used the paths directly, `model.mdx` would have tried to load `texture.blp`, a relative path, and would get a 404 error.
Generally speaking, an identity solver is what you'll need (as in, it returns the source assuming its an url but prepended by some directory, its extension, and true for server fetch), but there are times where this is not the case, such as loading models with custom textures, handling both in-memory and server-fetches in the same solver (used by the W3X handler), etc.

We now have a model, however a model in this context is simply a source of data, not something that you see.
The next step is to create an instance of this model.
Instances can be rendered, moved, rotated, scaled, parented to other instances or nodes, play animations, and so on.
```javascript
let instance = model.addInstance();
```

Finally, let's add the instance to the scene, so it's rendered:
```javascript
scene.addInstance(instance);
```

Never forget the actual rendering loop!
```javascript
(function step() {
    requestAnimationFrame(step);

    viewer.updateAndRender();
}());
```

------------------------

#### Async everywhere I go

A big design part of this viewer is that it tries to allow you to write as linear code as you can.
That is, even though this code heavily relies on asyncronous actions (and not only in server fetches, you'd be surprised), it tries to hide this fact, and make the code feel syncronous to the client.

For example, let's say we want the instance above to play an animation, assuming its model has any.

```javascript
instance.setSequence(0); // first animation, -1 == no animation.
```

This method needs to get animation data from the model, which, if all of this code is put together, is not loaded yet! (even if you run locally, the file fetch will finish after this line).
In fact, even constructing the instance itself with `model.addInstance()` is an asyncronous action - the model doesn't need to be loaded for instances of it to exist, and for you to be able to manipulate them.
Generally speaking, whenever you want to set/change something, you will be able to do it with straightforward code that looks syncronous, whether it really is or not behind the scenes.

If you want to get any information from the model, like a list of animations, or textures, then the model obviously needs to exist before.
For this reason, there are two ways to react to resources being loaded.
First of all, as the next section explains (and as is mentioned above), every resource uses event dispatching, much like regular asyncronous JS objects (Image, XMLHttpRequest, and so on).
In addition, every resource has a `whenLoaded(callback)` method that calls `callback` when the resource loads, or immediately if it was already loaded.
The viewer itself has `whenLoaded(resources, callback)` which does the same when all of the given resources in an array have been loaded, and also `whenAllLoaded(callback)`, which calls the callback when there are no longer resources being loaded.

------------------------

#### Events

Resources, including the viewer, can send events, very similar to those of native JS objects, and with the same API:

```
resource.addEventListener(type, listener)
resource.removeEventListener(type, listener)
resource.dispatchEvent(event)
```

When an event listener is attached to a specific resource, such as a model, it only gets events from that object.
If a listener is attached to the viewer itself, it will receive events for all resources.

Note that attaching a `loadstart` listener to a resource that is not the viewer is pointless, since the listener is registered after the resource started loading.

The type can be one of:
* `loadstart` - a resource started loading.
* `progress` - progress updates for loads. The `loaded`, `total`, and `lengthComputable` properties will be set.
* `load` - a resource finished loading.
* `error` - an error occured when loading a resource. The `error` property will be set.
* `loadend` - sent when a resource finishes loading, either because of an error, or because it loaded successfully.

The event object that a listener recieves has the same structure as JS events.
For example, for the load call above, the following is how a `progress` event could look: `{type: "progress", target: MdxModel, loaded: 101, total: 9001, lengthComputable: true}`, `MdxModel` being our `model` variable in this case. That is, `e.target === model`.

Errors might occur, but don't panic.
These are the errors the code uses:
* InvalidHandler - sent by the viewer when adding an invalid handler - either its type is unknown, or its `initialize()` function failed (e.g. a shader failed to compile).
* MissingHandler - sent by the viewer if you try to load some resource with an unknown extension (did you forget to add the handler?).
* HttpError - sent by handlers when a server fetch failed.
* InvalidSource - sent by handlers when they think your source is not valid, such as trying to load a file as MDX, but it's not really an MDX file.
* UnsupportedFeature - sent by handlers when the source is valid, but a feature in the format isn't supported, such as DDS textures not supporting encodings that are not DXT1/3/5.

Together with these error strings (in the `error` property naturally), more information can be added in the `extra` property.
For example, when you get a MissingHandler error because you tried loading an unknown extension, the `extra` property will hold the result from your path solver.
Another example - when an HttpError occurs, `extra` will contain the XMLHttpRequest object of the fetch.
You can choose to respond to errors (or not) however you want.
