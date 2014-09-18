/**
 * This plugin provides a method to animate a sigma instance by interpolating
 * some node properties. Check the sigma.plugins.animate function doc or the
 * examples/animate.html code sample to know more.
 */
;(function() {
  'use strict';

  if (typeof sigma === 'undefined')
    throw 'sigma is not declared';

  sigma.utils.pkg('sigma.plugins');

  var _id = 0,
      _cache = {};

  // TOOLING FUNCTIONS:
  // ******************
  function parseColor(val) {
    if (_cache[val])
      return _cache[val];

    var result = [0, 0, 0];

    if (val.match(/^#/)) {
      val = (val || '').replace(/^#/, '');
      result = (val.length === 3) ?
        [
          parseInt(val.charAt(0) + val.charAt(0), 16),
          parseInt(val.charAt(1) + val.charAt(1), 16),
          parseInt(val.charAt(2) + val.charAt(2), 16)
        ] :
        [
          parseInt(val.charAt(0) + val.charAt(1), 16),
          parseInt(val.charAt(2) + val.charAt(3), 16),
          parseInt(val.charAt(4) + val.charAt(5), 16)
        ];
    } else if (val.match(/^ *rgba? *\(/)) {
      val = val.match(
        /^ *rgba? *\( *([0-9]*) *, *([0-9]*) *, *([0-9]*) *(,.*)?\) *$/
      );
      result = [
        +val[1],
        +val[2],
        +val[3]
      ];
    }

    _cache[val] = {
      r: result[0],
      g: result[1],
      b: result[2]
    };

    return _cache[val];
  }

  function interpolateColors(c1, c2, p) {
    c1 = parseColor(c1);
    c2 = parseColor(c2);

    var c = {
      r: c1.r * (1 - p) + c2.r * p,
      g: c1.g * (1 - p) + c2.g * p,
      b: c1.b * (1 - p) + c2.b * p
    };

    return 'rgb(' + [c.r | 0, c.g | 0, c.b | 0].join(',') + ')';
  }

  /**
   * This function will animate some specified node properties. It will
   * basically call requestAnimationFrame, interpolate the values and call the
   * refresh method during a specified duration.
   *
   * Recognized parameters:
   * **********************
   * Here is the exhaustive list of every accepted parameters in the settings
   * object:
   *
   *   {?(function|string)} easing     Either the name of an easing in the
   *                                   sigma.utils.easings package or a
   *                                   function. If not specified, the
   *                                   quadraticInOut easing from this package
   *                                   will be used instead.
   *   {?number}            duration   The duration of the animation. If not
   *                                   specified, the "animationsTime" setting
   *                                   value of the sigma instance will be used
   *                                   instead.
   *   {?function}          onComplete Eventually a function to call when the
   *                                   animation is ended.
   *
   * @param  {sigma}   s       The related sigma instance.
   * @param  {object}  animate An hash with the keys being the node properties
   *                           to interpolate, and the values being the related
   *                           target values.
   * @param  {?object} options Eventually an object with options.
   */
  sigma.plugins.animateNodes = function(instance, animation, options) {
    var nodes = instance.graph.nodes((options || {}).nodeIds);
    nodes.forEach(function(node) {
      sigma.plugins.animateNode(instance, node, animation, options);
    });
  };

  sigma.plugins.animateNode = function(instance, node, animation, options) {
    options = options || {};
    options.onComplete = options.onComplete || function () {};
    instance.animations = instance.animations || {};

    var id = ++_id,
        animationIsFn = typeof animation === 'function',
        duration = options.duration || instance.settings('animationsTime') || 500,
        start = sigma.utils.dateNow(),
        startPositions = {},
        easing;

    switch (typeof options.easing) {
      case 'string':
        easing = sigma.utils.easings[options.easing]
        break;
      case 'function':
        easing = options.easing;
      default:
        easing = sigma.utils.easings.quadraticInOut;
    }

    if (animationIsFn) {
      options.saveStartPositions = options.saveStartPositions || {};

      for (var key in options.saveStartPositions) {
        if (options.saveStartPositions.hasOwnProperty(key) && key in node) {
          startPositions[key] = node[key];
        }
      }
    } else {
      for (var key in animation) {
        if (key in node) {
          startPositions[key] = node[key];
        }
      }
    }

    function step() {
      var p = (sigma.utils.dateNow() - start) / duration;

      if (animationIsFn){
        if (animation(node, startPositions, p)) {
          step.isFinished = true;
          options.onComplete();
        }
      }
      else if (p >= 1) {
        var finalValues = options.resetValuesOnComplete ? startPositions : animation;

        for (var key in finalValues) {
          node[key] = finalValues[key];
        }

        step.isFinished = true;
        options.onComplete();
      }
      else {
        p = easing(p);
        for (var key in animation) {
          if (key.match(/color$/)) {
            node[key] = interpolateColors(
              startPositions[key],
              animation[key],
              p
            );
          }
          else {
            node[key] =
              animation[key] * p +
              startPositions[key] * (1 - p);
          }
        }
      }
    }

    instance.animations['node-' + id] = step;
  };
}).call(window);
