;(function(undefined) {
  'use strict';

  if (typeof sigma === 'undefined') {
    throw 'sigma is not declared';
  }

  if (typeof conrad === 'undefined') {
    throw 'conrad is not declared';
  }

  // Initialize packages:
  sigma.utils.pkg('sigma.renderers');

  /**
   * This function is the constructor of the canvas sigma's renderer.
   *
   * @param  {sigma.classes.graph}            graph     The graph to render.
   * @param  {sigma.classes.camera}           camera    The camera.
   * @param  {configurable}                   settings  The sigma instance settings function.
   * @param  {object}                         object    The options object.
   * @return {sigma.renderers.canvas}                   The renderer instance.
   */
  sigma.renderers.canvas = function(graph, camera, settings, options) {
    if (typeof options !== 'object') {
      throw 'sigma.renderers.canvas: Wrong arguments.';
    }

    if (!(options.container instanceof HTMLElement)) {
      throw 'Container not found.';
    }

    sigma.classes.dispatcher.extend(this);

    // Initialize main attributes:
    Object.defineProperty(this, 'conradId', {
      value: sigma.utils.id()
    });

    this.graph = graph;
    this.camera = camera;
    this.contexts = {};
    this.domElements = {};
    this.options = options;
    this.container = this.options.container;
    this.settings = settings

    // Node indexes:
    this.nodesOnScreen = [];
    this.edgesOnScreen = [];

    // Conrad related attributes:
    this.jobs = {};

    // Find the prefix:
    this.options.prefix = 'renderer' + this.conradId + ':';

    // Initialize the DOM elements:

    this.initDOM('canvas', 'scene');
    this.contexts.edges = this.contexts.scene;
    this.contexts.nodes = this.contexts.scene;
    this.contexts.labels = this.contexts.scene;
    this.contexts.background = this.contexts.scene;

    this.initDOM('canvas', 'mouse');
    this.contexts.hover = this.contexts.mouse;

    // Initialize captors:
    this.captors = [];
    this.options.captors = this.options.captors || [sigma.captors.mouse, sigma.captors.touch];
    this.options.captors.forEach(function(captor) {
      captor = sigma.captors[captor] || captor;
      this.captors.push( new captor(this.domElements.mouse, this.camera, this.settings));
    }, this);

    // Bind resize:
    window.addEventListener(
      'resize',
      this.boundResize = this.resize.bind(this),
      false
    );

    // Deal with sigma events:
    sigma.misc.bindEvents.call(this, this.options.prefix);
    sigma.misc.drawHovers.call(this, this.options.prefix);

    this.resize(false);
  };

  /**
   * This method renders the graph on the canvases.
   *
   * @param  {?object}                options Eventually an object of options.
   * @return {sigma.renderers.canvas}         Returns the instance itself.
   */
  sigma.renderers.canvas.prototype.render = function(options) {
    options = options || {};
    this.options.prefix = this.options.prefix || '';

    var index = {},
        drawLayers = this.settings('drawLayers'),
        embedSettings = this.settings.embedObjects(options, {
          prefix: this.options.prefix
        });

    // Apply the camera's view:
    this.camera.applyView(
      undefined,
      this.options.prefix,
      {
        width: this.width,
        height: this.height
      }
    );

    // Clear canvases:
    this.clear();

    // Kill running jobs:
    for (var jobName in this.jobs) {
      if (conrad.hasJob(jobName)) {
        conrad.killJob(jobName);
      }
    }

    // Find which nodes are on screen:
    this.edgesOnScreen = [];
    this.nodesOnScreen = this.camera.quadtree.area(
      this.camera.getRectangle(this.width, this.height)
    );

    this.nodesOnScreen.forEach(function(node) {
      index[node.id] = node;
    }, this);

    this.graph.edges().forEach(function(edge) {
      var source = index[edge.source],
          target = index[edge.target];
      if (source && !source.hidden && target && !target.hidden && !edge.hidden) {
        this.edgesOnScreen.push(edge);
      }
    }, this);

    drawLayers.forEach(function(type) {
      if (type == 'background') {
        // Draw background
        if (sigma.canvas.background) {
          sigma.canvas.background(this.contexts.background, this.camera, this.width, this.height, this.nodesOnScreen, embedSettings);
        }
        return;
      }

      var renderers = sigma.canvas[type];
      (this[type + 'OnScreen'] || this.nodesOnScreen).forEach(function(item) {
        var renderer = renderers[item.type] || renderers.def,
            args = (type == 'edges')
                ? [item, index[item.source], index[item.target], this.contexts[type], embedSettings]
                : [item, this.contexts[type], embedSettings];

        renderer.apply(renderer, args);
      }, this);
    }, this);

    this.dispatchEvent('render');

    return this;
  };

  /**
   * This method creates a DOM element of the specified type, switches its
   * position to "absolute", references it to the domElements attribute, and
   * finally appends it to the container.
   *
   * @param  {string} tag The label tag.
   * @param  {string} id  The id of the element (to store it in "domElements").
   */
  sigma.renderers.canvas.prototype.initDOM = function(tag, id) {
    var dom = document.createElement(tag);

    dom.style.position = 'absolute';
    dom.setAttribute('class', 'sigma-' + id);

    this.domElements[id] = dom;
    this.container.appendChild(dom);

    if (tag.toLowerCase() === 'canvas') {
      this.contexts[id] = dom.getContext('2d');
    }
  };

  /**
   * This method resizes each DOM elements in the container and stores the new
   * dimensions. Then, it renders the graph.
   *
   * @param  {?number}                width  The new width of the container.
   * @param  {?number}                height The new height of the container.
   * @return {sigma.renderers.canvas}        Returns the instance itself.
   */
  sigma.renderers.canvas.prototype.resize = function(newWidth, newHeight) {
    if (newWidth === undefined || newHeight === undefined) {
      newWidth = this.container.offsetWidth;
      newHeight = this.container.offsetHeight;
    }

    if (newWidth !== this.width || newHeight !== this.height) {
      this.width = newWidth;
      this.height = newHeight;

      for (var key in this.domElements) {
        this.domElements[key].style.width = newWidth + 'px';
        this.domElements[key].style.height = newHeight + 'px';

        if (this.domElements[key].tagName.toLowerCase() === 'canvas') {
          this.domElements[key].setAttribute('width', newWidth + 'px');
          this.domElements[key].setAttribute('height', newHeight + 'px');
        }
      }
    }

    return this;
  };

  /**
   * This method clears each canvas.
   *
   * @return {sigma.renderers.canvas} Returns the instance itself.
   */
  sigma.renderers.canvas.prototype.clear = function() {
    for (var key in this.domElements) {
      if (this.domElements[key].tagName.toLowerCase() === 'canvas') {
        this.domElements[key].width = this.domElements[key].width;
      }
    }

    return this;
  };

  /**
   * This method kills contexts and other attributes.
   */
  sigma.renderers.canvas.prototype.kill = function() {
    window.removeEventListener('resize', this.boundResize);
    var captor;
    while (captor = this.captors.pop()) {
      captor.kill();
    }
    delete this.captors;

    // Kill contexts:
    for (var key in this.domElements) {
      this.domElements[key].parentNode.removeChild(this.domElements[key]);
      delete this.domElements[key];
      delete this.contexts[key];
    }
    delete this.domElements;
    delete this.contexts;
  };

  /**
   * The labels, nodes and edges renderers are stored in the three following
   * objects. When an element is drawn, its type will be checked and if a
   * renderer with the same name exists, it will be used. If not found, the
   * default renderer will be used instead.
   *
   * They are stored in different files, in the "./canvas" folder.
   */
  sigma.utils.pkg('sigma.canvas.nodes');
  sigma.utils.pkg('sigma.canvas.edges');
  sigma.utils.pkg('sigma.canvas.labels');
}).call(this);
