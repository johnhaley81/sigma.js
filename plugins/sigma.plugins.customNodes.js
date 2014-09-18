;(function(undefined) {
  'use strict';

  if (typeof sigma === 'undefined') {
    throw 'sigma is not declared';
  }

  var sigmaInstance = undefined;
  function register(name, drawFns, contains, drawImageForNode) {
    sigma.canvas.nodes[name] = function(node, context, settings) {
      var args = arguments,
      prefix = settings('prefix') || '',
      size = node[prefix + 'size'],
      color = node.color || settings('defaultNodeColor'),
      borderColor = node.borderColor || color,
      x = node[prefix + 'x'],
      y = node[prefix + 'y'];

      context.save();

      if (!(drawFns instanceof Array)) {
        drawFns = [drawFns];
      }

      drawFns.forEach(function(drawFn) {
        drawFn(node, x, y, size, color, context, settings);
      });

      if (drawImageForNode) {
        drawImage(node,x,y,size,context);
      }

      context.restore();
    };

    sigma.canvas.nodes[name].contains = contains;
  }

  function drawImage(node,x,y,size,context) {
    if(sigmaInstance && node.image && node.image.url) {
      var url = node.image.url;
      var ih = node.image.h || 1; // 1 is arbitrary, anyway only the ratio counts
      var iw = node.image.w || 1;
      var scale = node.image.scale || 1;
      var clip = node.image.clip || 1;

      // create new IMG or get from imgCache
      var image = imgCache[url];
      if(!image) {
        image = document.createElement('IMG');
        image.src = url;
        image.onload = function(){
          // TODO see how we redraw on load
          // need to provide the sigmaInstance as a parameter to the library
          console.log("redraw on image load");
        };
        imgCache[url] = image;
      }

      // calculate position and draw
      var xratio = (iw<ih) ? (iw/ih) : 1;
      var yratio = (ih<iw) ? (ih/iw) : 1;
      var r = size*scale;

      // Draw the clipping disc:
      context.save(); // enter clipping mode
      context.beginPath();
      context.arc(x,y,size*clip,0,Math.PI*2,true);
      context.closePath();
      context.clip();

      // Draw the actual image
      context.drawImage(image,
        x+Math.sin(-3.142/4)*r*xratio,
        y-Math.cos(-3.142/4)*r*yratio,
        r*xratio*2*Math.sin(-3.142/4)*(-1),
        r*yratio*2*Math.cos(-3.142/4)
      );
      context.restore(); // exit clipping mode

    }
  }

  // Initialize package:
  sigma.utils.pkg('sigma.canvas.nodes');

  var drawSelectedPulse = function (node, x, y, size, color, context, settings) {
    color = 'orange'
    var prefix = settings('prefix') || '',
        selectedNode = sigmaInstance.graph.nodes(node.selectedId);

    node.color = color;

    context.save();

    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2, true);
    context.lineWidth = 1;
    context.strokeStyle = color;
    context.globalAlpha = node.opacity;
    context.stroke();

    // Quit the "clipping mode":
    context.restore();

    if (node.animation){
      return;
    }

    node.animation = true;
    sigma.plugins.animateNode(
      sigmaInstance,
      node,
      {
        size: node.size * 2,
        opacity: 0
      },
      {
        duration: 2000,
        onComplete: function() {
          node.animation = false;
        },
        resetValuesOnComplete: true
      }
    );

  };

  var selectedPulseContains = function() {return false;};

  register('selectedPulse', drawSelectedPulse, selectedPulseContains);

  sigma.canvas.nodes.commit = (function() {
    var _cache = {},
    _loading = {},
    _callbacks = {};

    // Return the renderer itself:
    var renderer = function(node, context, settings) {
      var args = arguments,
      prefix = settings('prefix') || '',
      color = node.color || settings('defaultNodeColor'),
      url = node.url,
      x = node[prefix + 'x'],
      y = node[prefix + 'y'],
      size = node[prefix + 'size']

      if (node.hidden) {
        return;
      }

      if (_cache[url]) {
        context.save();

        // Draw the clipping disc:
        context.beginPath();
        context.arc(
          x,
          y,
          size,
          0,
          Math.PI * 2,
          true
        );
        context.closePath();
        context.clip();

        // Draw the image
        context.drawImage(
          _cache[url],
          x - size,
          y - size,
          2 * size,
          2 * size
        );

        // Quit the "clipping mode":
        context.restore();

        // Draw the border:
        context.beginPath();
        context.arc(
          x,
          y,
          size,
          0,
          Math.PI * 2,
          true
        );
        context.lineWidth = size / 5;
        context.strokeStyle = color || settings('defaultNodeColor');
        context.stroke();

      } else {
        if (sigma.canvas.nodes.image){
          sigma.canvas.nodes.image.cache(url);
        }
        sigma.canvas.nodes.def.apply(
          sigma.canvas.nodes,
          args
        );
      }
    };

    // A public method to cache images, to make it possible to
    // preload images before the initial rendering:
    renderer.cache = function(url, callback, executeCallbackOnFailure) {
      if (callback){
        _callbacks[url] = callback;
      }

      if (_loading[url]){
        return;
      }

      var img = new Image();

      img.onload = function() {
        _loading[url] = false;
        _cache[url] = img;

        if (_callbacks[url]) {
          _callbacks[url].call(this, img);
          delete _callbacks[url];
        }
      };

      if (executeCallbackOnFailure){
        img.onerror = function(err){
          if (_callbacks[url]) {
            _callbacks[url].call(this, img);
            delete _callbacks[url];
          }
        };
      }

      _loading[url] = true;
      img.src = url;
    };

    return renderer;
  })();

  sigma.canvas.nodes.workingDirectory = function (node, context, settings) {
    var prefix = settings('prefix') || '',
      color = node.color || settings('defaultNodeColor'),
      x = node[prefix + 'x'],
      y = node[prefix + 'y'],
      size = node[prefix + 'size'];

    // Draw the underlying color disc
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI*2, false);
    context.fillStyle = color;
    context.fill();

    // Lighten the disc a little
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI*2, false);
    context.fillStyle = 'rgba(255, 255, 255, 0.666)';
    context.fill();

    // Draw the border:
    context.beginPath();
    context.arc(
      x,
      y,
      size,
      0,
      Math.PI * 2,
      true
    );
    context.lineWidth = size / 5;
    context.strokeStyle = color || settings('defaultNodeColor');
    context.stroke();
  };

  sigma.canvas.nodes.rolledUpCommit = function (node, context, settings) {
    var prefix = settings('prefix') || '',
      color = node.color || settings('defaultNodeColor'),
      x = node[prefix + 'x'],
      y = node[prefix + 'y'],
      size = node[prefix + 'size'];

    context.save();

    // Draw the square
    context.fillStyle = color;
    context.fillRect(x - size / 2, y - size / 2, size, size);
    context.restore();
  };

  var drawLabel = function (node, x, y, size, color, context, settings) {
    var label = node.text || "",
    fontSize = (settings('labelSize') === 'fixed') ?
      settings('defaultLabelSize') :
      settings('labelSizeRatio') * size,
    width,
    padding = 5;

    fontSize -= 3;

    context.font = (settings('fontStyle')
        ? settings('fontStyle') + ' '
        : '')
      + fontSize + 'px '  + settings('font');

    width = context.measureText(label).width || width;

    var top = y - fontSize/2 - padding,
      bottom = y + fontSize/2 + padding,
      left = x - width - 2*padding,
      right = x;

    // start at bottom right, go around clockwise
    context.fillStyle = node.color;
    context.fillRect(left, top, right - left, bottom - top);

    // darken the border around the label
    context.beginPath();
    context.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    context.lineWidth = 1;
    context.rect(left, top, right - left, bottom - top);
    context.stroke();

    // draw the tetx
    context.fillStyle = 'white';
    context.fillText(label, left + padding, bottom - 1.5*padding);

    // save the boundaries so we can calculate the contains afterwards
    node.top = top;
    node.bottom = bottom;
    node.left = left;
    node.right = right;
  }
  var labelContains = function(node, x, y) {
    return x >= node.left && x <= node.right && y >= node.top && y <= node.bottom;
  }
  register("ref-label", drawLabel, labelContains);

  var drawMerge = function (node, x, y, size, color, context) {
    context.beginPath();
    context.arc(x, y, size/2, 0, Math.PI*2, false);
    context.strokeStyle = color;
    context.fill();
  }
  register("merge", drawMerge, null);

  /**
  * Exporting
  * ----------
  */
  this.CustomNodes = {
    init: function(instance) {
      sigmaInstance = instance;
    }
  };
}).call(this);
