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
  sigma.plugins.animate = function(s, animate, options) {
    var o = options || {},
        nodeIds = o.nodeIds,
        id = ++_id,
        duration = o.duration || s.settings('animationsTime'),
        easing = typeof o.easing === 'string' ?
          sigma.utils.easings[o.easing] :
          typeof o.easing === 'function' ?
          o.easing :
          sigma.utils.easings.quadraticInOut,
        start = sigma.utils.dateNow(),
        // Store initial positions:
        startPositions = s.graph.nodes(nodeIds).reduce(function(res, node) {
          var k;
          res[node.id] = {};

          for (k in animate) {
            if (k in node) {
              res[node.id][k] = node[k];
            }
          }
          return res;
        }, {});

    s.animations = s.animations || {};
    sigma.plugins.animate.kill(s);

    function step() {
      var p = (sigma.utils.dateNow() - start) / duration;

      if (p >= 1) {
        s.graph.nodes(nodeIds).forEach(function(node) {
          for (var k in animate) {
            if (k in animate) {
              node[k] = node[animate[k]] !== undefined ? node[animate[k]] : animate[k];
            }
          }
        });

        if (typeof o.onComplete === 'function') {
          o.onComplete();
        }

        step.isFinished = true;
      } else {
        p = easing(p);
        s.graph.nodes(nodeIds).forEach(function(node) {
          for (var k in animate) {
            if (k in animate) {
              var valueAnimatingTo = node[animate[k]] !== undefined ? node[animate[k]] : animate[k];

              if (k.match(/color$/)) {
                node[k] = interpolateColors(
                  startPositions[node.id][k],
                  valueAnimatingTo,
                  p
                );
              } else {
                node[k] =
                  valueAnimatingTo * p +
                  startPositions[node.id][k] * (1 - p);
              }
            }
          }
        });
      }
    }

    s.animations[id] = step;
  };

  sigma.plugins.animate.start = function(s) {
    var playAnimations = function() {
      var animations = s.animations || {};

      for(var animation in animations) {
        if(animations.hasOwnProperty(animation)) {
          animations[animation]();

          if (animations[animation].isFinished) {
            delete animations[animation];
          }
        }
      }

      s.refresh();
      s.currentAnimationFrame = requestAnimationFrame(playAnimations);
    };

    playAnimations();
  };

  sigma.plugins.animateNode = function(s, node, animate, options) {
    var o = options || {},
        id = ++_id,
        animateIsFn = typeof animate === 'function',
        duration = o.duration || s.settings('animationsTime') || 500,
        easing = typeof o.easing === 'string' ?
          sigma.utils.easings[o.easing] :
          typeof o.easing === 'function' ?
          o.easing :
          sigma.utils.easings.quadraticInOut,
        start = sigma.utils.dateNow(),
        // Store initial positions:
        startPositions = (function() {
          var result = {};

          for (var k in animate) {
            if (k in node) {
              result[k] = node[k];
            }
          }

          return result;
        })();

    s.animations = s.animations || {};

    function step() {
      var p = (sigma.utils.dateNow() - start) / duration;


      if (animateIsFn){
        var isFinished = animate(node, startPositions, p);

        if (isFinished) {
          step.isFinished = true;

          if ( typeof o.onComplete === 'function') {
            o.onComplete();
          }
        }
      } else if (p >= 1) {
        var finalValues = o.resetValuesOnComplete ? startPositions : animate;

        for (var k in finalValues) {
          if (k in finalValues) {
            node[k] = finalValues[k];
          }
        }

        step.isFinished = true;
        if (typeof o.onComplete === 'function') {
          o.onComplete();
        }
      } else {
        p = easing(p);
        for (var k in animate) {
          if (k in animate) {
            if (k.match(/color$/)) {
              node[k] = interpolateColors(
                startPositions[k],
                animate[k],
                p
              );
            } else {
              node[k] =
                animate[k] * p +
                startPositions[k] * (1 - p);
            }
          }
        }
      }
    }

    s.animations[id] = step;
  };

  sigma.plugins.animate.kill = function(s) {
    cancelAnimationFrame(s.currentAnimationFrame);
    s.animations = {};
  };
}).call(window);
