;(function(undefined) {
  'use strict';

  var __instances = {};

  /**
   * This is the sigma instances constructor. One instance of sigma represent
   * one graph. It is possible to represent this grapĥ with several renderers
   * at the same time. By default, the default renderer (WebGL + Canvas
   * polyfill) will be used as the only renderer, with the container specified
   * in the configuration.
   *
   * @param  {?*}    conf The configuration of the instance. There are a lot of
   *                      different recognized forms to instantiate sigma, check
   *                      example files, documentation in this file and unit
   *                      tests to know more.
   * @return {sigma}      The fresh new sigma instance.
   *
   * Instanciating sigma:
   * ********************
   * If no parameter is given to the constructor, the instance will be created
   * without any renderer or camera. It will just instantiate the graph, and
   * other modules will have to be instantiated through the public methods,
   * like "addRenderer" etc:
   *
   *  > s0 = new sigma();
   *  > s0.addRenderer({
   *  >   type: 'canvas',
   *  >   container: 'my-container-id'
   *  > });
   *
   * In most of the cases, sigma will simply be used with the default renderer.
   * Then, since the only required parameter is the DOM container, there are
   * some simpler way to call the constructor. The four following calls do the
   * exact same things:
   *
   *  > s1 = new sigma('my-container-id');
   *  > s2 = new sigma(document.getElementById('my-container-id'));
   *  > s3 = new sigma({
   *  >   container: document.getElementById('my-container-id')
   *  > });
   *  > s4 = new sigma({
   *  >   renderers: [{
   *  >     container: document.getElementById('my-container-id')
   *  >   }]
   *  > });
   *
   * Recognized parameters:
   * **********************
   * Here is the exhaustive list of every accepted parameters, when calling the
   * constructor with to top level configuration object (fourth case in the
   * previous examples):
   *
   *   {?string} id        The id of the instance. It will be generated
   *                       automatically if not specified.
   *   {?array}  renderers An array containing objects describing renderers.
   *   {?object} graph     An object containing an array of nodes and an array
   *                       of edges, to avoid having to add them by hand later.
   *   {?object} settings  An object containing instance specific settings that
   *                       will override the default ones defined in the object
   *                       sigma.settings.
   */
  var sigma = function(conf) {
    sigma.classes.dispatcher.extend(this);

    // Private attributes:
    // *******************
    var _self = this,
        _conf = conf || {};

    // Little shortcut:
    // ****************
    // The configuration is supposed to have a list of the configuration
    // objects for each renderer.
    //  - If there are no configuration at all, then nothing is done.
    //  - If the argument passed to sigma() is a string, it will be considered
    //    as the ID of the DOM container.
    //  - If there is no renderer/container object, the given configuration object
    //    will be considered as describing the renderer
    //  - If there is no renderer/container object, it will be
    //    considered as the container itself (a DOM element).
    if (typeof _conf === 'string' || _conf instanceof HTMLElement) {
      _conf = {
        renderer: _conf
      };
    }

    var _rendererObj = _conf.renderer || _conf.container;
    if (typeof _rendererObj === 'string' || (typeof _rendererObj === 'object' && 'container' in _rendererObj)) {
      _conf.renderer = _rendererObj;
    }

    if (!_conf.renderer) {
      _conf.renderer = _conf;
    }

    // Recense the instance:
    if (!_conf.id) {
      _conf.id = 0;
      while (__instances[_conf.id]) {
        _conf.id++;
      }
    }

    if (__instances[_conf.id]) {
      throw 'sigma: Instance "' + _conf.id + '" already exists.';
    }

    Object.defineProperty(this, 'id', {
      value: _conf.id
    });

    this.animations = {};

    __instances[this.id] = this;

    // Initialize settings function:
    this.settings = new sigma.classes.configurable(
      sigma.settings,
      _conf.settings || {}
    );

    // Initialize locked attributes:
    Object.defineProperty(this, 'graph', {
      value: new sigma.classes.graph(this.settings),
      configurable: true
    });
    Object.defineProperty(this, 'middlewares', {
      value: [],
      configurable: true
    });
    Object.defineProperty(this, 'cameras', {
      value: {},
      configurable: true
    });
    Object.defineProperty(this, 'renderers', {
      value: {},
      configurable: true
    });
    Object.defineProperty(this, 'rendererPerCamera', {
      value: {},
      configurable: true
    });
    Object.defineProperty(this, 'cameraFrames', {
      value: {},
      configurable: true
    });
    Object.defineProperty(this, 'camera', {
      get: function() {
        return this.cameras[0];
      }
    });

    // Add a custom handler, to redispatch events from renderers:
    this._handler = (function(e) {
      var data = {};

      for (var key in e.data) {
        data[key] = e.data[key];
      }

      data.renderer = e.target;
      this.dispatchEvent(e.type, data);
    }).bind(this);

    // Initialize renderers:
    if (_conf.renderer) {
      this.addRenderer(_conf.renderer);
    }

    // Initialize middlewares:
    _conf.middlewares = _conf.middlewares || [];
    _conf.middlewares.forEach(function(middleware) {
      this.middlewares.push(sigma.middlewares[middleware] || middleware);
    }, this);

    // Check if there is already a graph to fill in:
    if (_conf.graph && _conf.graph instanceof Object) {
      this.graph.read(_conf.graph);
    }

    this.startRenderLoop();
  };

  /**
   * This methods will instantiate and reference a new camera. If no id is
   * specified, then an automatic id will be generated.
   *
   * @param  {?string}              id Eventually the camera id.
   * @return {sigma.classes.camera}    The fresh new camera instance.
   */
  sigma.prototype.addCamera = function(id) {
    var self = this,
        camera;

    if (!arguments.length) {
      id = 0;
      while (this.cameras['' + id])
        id++;
      id = '' + id;
    }

    if (this.cameras[id]) {
      throw 'sigma.addCamera: The camera "' + id + '" already exists.';
    }

    camera = new sigma.classes.camera(id, this.graph, this.settings);
    this.cameras[id] = camera;

    // Add a quadtree to the camera:
    camera.quadtree = new sigma.classes.quad();

    camera.bind('coordinatesUpdated', function(e) {
      self.renderCamera(camera, camera.isAnimated);
    });

    this.rendererPerCamera[id] = null;

    return camera;
  };

  /**
   * This method kills a camera, and every renderer attached to it.
   *
   * @param  {string|camera} v The camera to kill or its ID.
   * @return {sigma}           Returns the instance.
   */
  sigma.prototype.killCamera = function(v) {
    v = typeof v === 'string' ? this.cameras[v] : v;

    if (!v) {
      throw 'sigma.killCamera: The camera is undefined.';
    }

    var renderer = this.rendererPerCamera[v.id];

    this.killRenderer(renderer);

    delete this.rendererPerCamera[v.id];
    delete this.cameraFrames[v.id];
    delete this.cameras[v.id];

    if (v.kill) {
      v.kill();
    }

    return this;
  };

  /**
   * This methods will instantiate and reference a new renderer. The "type"
   * argument can be the constructor or its name in the "sigma.renderers"
   * package. If no type is specified, then "sigma.renderers.def" will be used.
   * If no id is specified, then an automatic id will be generated.
   *
   * @param  {?object}  options Eventually some options to give to the renderer
   *                            constructor.
   * @return {renderer}         The fresh new renderer instance.
   *
   * Recognized parameters:
   * **********************
   * Here is the exhaustive list of every accepted parameters in the "options"
   * object:
   *
   *   {?string}            id     Eventually the renderer id.
   *   {?(function|string)} type   Eventually the renderer constructor or its
   *                               name in the "sigma.renderers" package.
   *   {?(camera|string)}   camera Eventually the renderer camera or its
   *                               id.
   */
  sigma.prototype.addRenderer = function(options) {
    var rendererConstructor,
        camera,
        renderer;
    options = options || {};

    // Polymorphism:
    if (typeof options === 'string') {
      options = {
        container: document.getElementById(options)
      };
    }
    else if (options instanceof HTMLElement) {
      options = {
        container: options
      };
    }

    // Reference the new renderer:
    if (!options.id) {
      options.id = 0;
      while (this.renderers['' + options.id]) {
        options.id++;
      }
    }
    options.id = '' + options.id;

    if (this.renderers[options.id]) {
      throw 'sigma.addRenderer: The renderer "' + options.id + '" already exists.';
    }
    // Find the good constructor:
    rendererConstructor = options.type instanceof Function ? options.type : sigma.renderers[options.type];
    rendererConstructor = rendererConstructor || sigma.renderers.def;

    // Find the good camera:
    camera = 'camera' in options ?
      (
        options.camera instanceof sigma.classes.camera ?
          options.camera :
          this.cameras[options.camera] || this.addCamera(options.camera)
      ) :
      this.addCamera();

    if (this.cameras[camera.id] !== camera) {
      throw 'sigma.addRenderer: The camera is not properly referenced.';
    }

    if (this.rendererPerCamera[camera.id]) {
      throw 'sigma.addRenderer: The camera ' + camera.id + ' already has a renderer';
    }

    // Instantiate:
    renderer = new rendererConstructor(this.graph, camera, this.settings, options);
    this.renderers[options.id] = renderer;
    Object.defineProperty(renderer, 'id', {
      value: options.id
    });

    // Bind events:
    if (renderer.bind)
      renderer.bind(
        [
          'click',
          'rightClick',
          'clickStage',
          'doubleClickStage',
          'rightClickStage',
          'clickNode',
          'clickNodes',
          'doubleClickNode',
          'doubleClickNodes',
          'rightClickNode',
          'rightClickNodes',
          'mousedown',
          'mouseup',
          'outNode',
          'outNodes',
          'overNode',
          'overNodes',
          'downNode',
          'downNodes',
          'upNode',
          'upNodes',
          'render'
        ],
        this._handler
      );

    // Reference the renderer by its camera:
    this.rendererPerCamera[camera.id] = renderer;

    return renderer;
  };

  /**
   * This method kills a renderer.
   *
   * @param  {string|renderer} v The renderer to kill or its ID.
   * @return {sigma}             Returns the instance.
   */
  sigma.prototype.killRenderer = function(v) {
    v = this.renderers[v] || v;

    if (!v || !v instanceof Object) {
      throw 'sigma.killRenderer: The renderer is undefined.';
    }

    if (v.kill) {
      v.kill();
    }

    delete this.rendererPerCamera[v.camera.id];
    delete this.renderers[v.id];

    return this;
  };

  /**
   * This method calls the "render" method of each renderer, with the same
   * arguments than the "render" method, but will also check if the renderer
   * has a "process" method, and call it if it exists.
   *
   * It is useful for quadtrees or WebGL processing, for instance.
   *
   * @return {sigma} Returns the instance itself.
   */
  sigma.prototype.refresh = function() {
    var prefix = 0;

    // Call each middleware:
    this.middlewares.forEach(function(middleware, index) {
      middleware.call(
        this,
        (!index) ? '' : 'tmp' + prefix + ':',
        (index === this.middlewares.length - 1) ? 'ready:' : ('tmp' + (++prefix) + ':')
      );
    }, this);

    // Then, for each camera, call the "rescale" middleware, unless the
    // settings specify not to:
    for (var key in this.cameras) {
      var camera = this.cameras[key],
          renderer = this.rendererPerCamera[camera.id];
      if (camera.settings('autoRescale') && renderer) {
        sigma.middlewares.rescale.call(
          this,
          this.middlewares.length ? 'ready:' : '',
          camera.readPrefix,
          {
            width: renderer.width,
            height: renderer.height
          }
        );
      }
      else {
        sigma.middlewares.copy.call(
          this,
          this.middlewares.length ? 'ready:' : '',
          camera.readPrefix
        );
      }

      // Find graph boundaries:
      var bounds = sigma.utils.getBoundaries(
        this.graph,
        camera.readPrefix
      );

      // Refresh quadtree:
      camera.quadtree.index(this.graph.nodes(), {
        prefix: camera.readPrefix,
        bounds: {
          x: bounds.minX,
          y: bounds.minY,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY
        }
      });
    }

    // Call each renderer:
    Object.keys(this.renderers).forEach(function(key) {
      if (this.renderers[key].process) {
        try {
          this.renderers[key].process();
        }
        catch (e) {
          if (this.settings('skipErrors')) {
            if (this.settings('verbose')) {
              console.log('Warning: The renderer "' + key + '" crashed on ".process()"');
            }
          }
          else {
            throw e;
          }
        }
      }
    }, this);

    this.render();

    return this;
  };

  /**
   * This method calls the "render" method of each renderer.
   *
   * @return {sigma} Returns the instance itself.
   */
  sigma.prototype.render = function() {
    // Call each renderer:
    Object.keys(this.renderers).forEach(function(key) {
      try {
        this.renderers[key].render();
      }
      catch (e) {
        if (this.settings('skipErrors')) {
          if (this.settings('verbose')) {
            console.log('Warning: The renderer "' + key + '" crashed on ".render()"');
          }
        }
        else {
          throw e;
        }
      }
    }, this);

    return this;
  };

  /**
   * This method calls the "render" method of each renderer that is bound to
   * the specified camera. To improve the performances, if this method is
   * called too often, the number of effective renderings is limitated to one
   * per frame, unless you are using the "force" flag.
   *
   * @param  {sigma.classes.camera} camera The camera to render.
   * @param  {?boolean}             force  If true, will render the camera
   *                                       directly.
   * @return {sigma}                       Returns the instance itself.
   */
  sigma.prototype.renderCamera = function(camera, force) {
    if (force) {
      delete this.animations['camera-' + camera.id];
      var animation = function() {
        var renderer = this.rendererPerCamera[camera.id];

        try {
          renderer.render();
        }
        catch (e) {
          if (this.settings('skipErrors')) {
            if (this.settings('verbose')) {
              console.log('Warning: The renderer "' + renderer.id + '" crashed on ".render()"');
            }
          }
          else {
            throw e;
          }
        }
        animation.isFinished = true;
      }
      if (!force) {
        this.animations['camera-' + camera.id] = animation;
      }
    }
    
    return this;
  };

  /**
   * This method calls the "kill" method of each module and destroys any
   * reference from the instance.
   */
  sigma.prototype.kill = function() {
    var key;

    // Kill graph:
    this.graph.kill();

    // Kill middlewares:
    delete this.middlewares;

    // Kill each renderer:
    for (key in this.renderers) {
      this.killRenderer(this.renderers[key]);
    }

    // Kill each camera:
    for (key in this.cameras) {
      this.killCamera(this.cameras[key]);
    }

    delete this.renderers;
    delete this.cameras;

    this.killRenderLoop();

    // Kill everything else:
    for (key in this) {
      if (this.hasOwnProperty(key)) {
        delete this[key];
      }
    }

    delete __instances[this.id];
  };


  sigma.prototype.startRenderLoop = function() {
    var self = this,
        playAnimations = function() {
          var animations = self.animations || {};

          for (var animation in animations) {
            if (animations.hasOwnProperty(animation)) {
              animations[animation]();
              if (animations[animation].isFinished) {
                delete animations[animation];
              }
            }
          }
          self.refresh();
          self.currentAnimationFrame = requestAnimationFrame(playAnimations);
        };

    playAnimations();
  };

  sigma.prototype.killRenderLoop = function() {
    cancelAnimationFrame(this.currentAnimationFrame);
    this.animations = {};
  };

  sigma.prototype.clearRenderLoop = function() {
    this.animations = {};
  }

  /**
   * Returns a clone of the instances object or a specific running instance.
   *
   * @param  {?string} id Eventually an instance ID.
   * @return {object}     The related instance or a clone of the instances
   *                      object.
   */
  sigma.instances = function(id) {
    return arguments.length ?
      __instances[id] :
      sigma.utils.extend({}, __instances);
  };






  /**
   * EXPORT:
   * *******
   */
  sigma.version = '1.0.3';
  if (typeof this.sigma !== 'undefined') {
    throw 'An object called sigma is already in the global scope.';
  }
  this.sigma = sigma;

}).call(this);
