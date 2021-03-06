;(function(undefined) {
  'use strict';

  if (typeof sigma === 'undefined')
    throw 'sigma is not declared';

  // Initialize packages:
  sigma.utils.pkg('sigma.captors');

  /**
   * The user inputs default captor. It deals with mouse events, keyboards
   * events and touch events.
   *
   * @param  {DOMElement}   target   The DOM element where the listeners will be
   *                                 bound.
   * @param  {camera}       camera   The camera related to the target.
   * @param  {configurable} settings The settings function.
   * @return {sigma.captor}          The fresh new captor instance.
   */
  sigma.captors.mouse = function(target, camera, settings) {
    var _self = this,
        _target = target,
        _camera = camera,
        _settings = settings,
        _handlers = _settings('handlers') || {},
        _moveCameraOnDragModifier = _settings('moveCameraOnDragModifier'),
        _assignedHandlers = [],
        _defaultHandlers = {},

        // CAMERA MANAGEMENT:
        // ******************
        // The camera position when the user starts dragging:
        _startCameraX,
        _startCameraY,
        _startCameraAngle,

        // The latest stage position:
        _lastCameraX,
        _lastCameraY,
        _lastCameraAngle,
        _lastCameraRatio,

        // MOUSE MANAGEMENT:
        // *****************
        // The mouse position when the user starts dragging:
        _startMouseX,
        _startMouseY,

        _isMouseDown,
        _isMoving,
        _movingTimeoutId;

    sigma.classes.dispatcher.extend(this);

    /**
     * The handler listening to the 'move' mouse event. It will effectively
     * drag the graph.
     *
     * @param {event} e A mouse event.
     */
    _defaultHandlers._moveHandler = function(e) {
      var x,
          y,
          pos;

      if (!_settings('mouseEnabled')){
        return;
      }

      // Dispatch event:
      _self.dispatchEvent('mousemove', {
        x: sigma.utils.getX(e) - e.target.width / 2,
        y: sigma.utils.getY(e) - e.target.height / 2,
        clientX: e.clientX,
        clientY: e.clientY,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey
      });

      if (_moveCameraOnDragModifier && e[_moveCameraOnDragModifier] && _isMouseDown) {
        _isMoving = true;

        if (_movingTimeoutId) {
          clearTimeout(_movingTimeoutId);
        }

        _movingTimeoutId = setTimeout(function() {
          _isMoving = false;
        }, _settings('dragTimeout'));

        sigma.misc.animation.killAll(_camera);

        _camera.isMoving = true;
        pos = _camera.cameraPosition(
          sigma.utils.getX(e) - _startMouseX,
          sigma.utils.getY(e) - _startMouseY,
          true
        );

        x = _startCameraX - pos.x;
        y = _startCameraY - pos.y;

        if (x !== _camera.x || y !== _camera.y) {
          _lastCameraX = _camera.x;
          _lastCameraY = _camera.y;

          _camera.goTo({
            x: _camera.x,
            y: y
          });
        }

        if (e.preventDefault) {
          e.preventDefault();
        }
        else {
          e.returnValue = false;
        }

        e.stopPropagation();
        return false;
      }
    }

    /**
     * The handler listening to the 'up' mouse event. It will stop dragging the
     * graph.
     *
     * @param {event} e A mouse event.
     */
    _defaultHandlers._upHandler = function(e) {
      if (!_settings('mouseEnabled')) {
        return;
      }

      if (_isMouseDown) {
        _isMouseDown = false;

        if (_movingTimeoutId) {
          clearTimeout(_movingTimeoutId);
        }

        _camera.isMoving = false;

        var x = sigma.utils.getX(e),
            y = sigma.utils.getY(e);

        if (_isMoving) {
          sigma.misc.animation.killAll(_camera);
          sigma.misc.animation.camera(
            _camera,
            {
              x: _camera.x +
                _settings('mouseInertiaRatio') * (_camera.x - _lastCameraX),
              y: _camera.y +
                _settings('mouseInertiaRatio') * (_camera.y - _lastCameraY)
            },
            {
              easing: 'quadraticOut',
              duration: _settings('mouseInertiaDuration')
            }
          );
        } else if (
          _startMouseX !== x ||
          _startMouseY !== y
        ) {
          _camera.goTo({
            x: _camera.x,
            y: _camera.y
          });
        }

        _self.dispatchEvent('mouseup', {
          x: x - e.target.width / 2,
          y: y - e.target.height / 2,
          clientX: e.clientX,
          clientY: e.clientY,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey
        });

        // Update _isMoving flag:
        _isMoving = false;
      }
    }

    /**
     * The handler listening to the 'down' mouse event. It will start observing
     * the mouse position for dragging the graph.
     *
     * @param {event} e A mouse event.
     */
    _defaultHandlers._downHandler = function(e) {
      if (!_settings('mouseEnabled')) {
        return;
      }

      _startCameraX = _camera.x;
      _startCameraY = _camera.y;

      _lastCameraX = _camera.x;
      _lastCameraY = _camera.y;

      _startMouseX = sigma.utils.getX(e);
      _startMouseY = sigma.utils.getY(e);

      switch (e.which) {
        case 2:
          // Middle mouse button pressed
          // Do nothing.
          break;
        case 3:
          // Right mouse button pressed
          _self.dispatchEvent('rightclick', {
            x: _startMouseX - e.target.width / 2,
            y: _startMouseY - e.target.height / 2,
            clientX: e.clientX,
            clientY: e.clientY,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey
          });
          break;
        // case 1:
        default:
          // Left mouse button pressed
          _isMouseDown = true;

          _self.dispatchEvent('mousedown', {
            x: _startMouseX - e.target.width / 2,
            y: _startMouseY - e.target.height / 2,
            clientX: e.clientX,
            clientY: e.clientY,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey
          });
      }
    }

    /**
     * The handler listening to the 'out' mouse event. It will just redispatch
     * the event.
     *
     * @param {event} e A mouse event.
     */
    _defaultHandlers._outHandler = function(e) {
      if (_settings('mouseEnabled')) {
        _self.dispatchEvent('mouseout');
      }
    }

    /**
     * The handler listening to the 'click' mouse event. It will redispatch the
     * click event, but with normalized X and Y coordinates.
     *
     * @param {event} e A mouse event.
     */
    _defaultHandlers._clickHandler = function(e) {
      if (_settings('mouseEnabled')) {
        _self.dispatchEvent('click', {
          x: sigma.utils.getX(e) - e.target.width / 2,
          y: sigma.utils.getY(e) - e.target.height / 2,
          clientX: e.clientX,
          clientY: e.clientY,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey
        });
      }

      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false;
      }

      e.stopPropagation();
      return false;
    }

    /**
     * The handler listening to the double click custom event. It will
     * basically zoom into the graph.
     *
     * @param {event} e A mouse event.
     */
    _defaultHandlers._doubleClickHandler = function(e) {
      var pos,
          ratio,
          animation;

      if (!_settings('mouseEnabled')) {
        return;
      }

      ratio = 1 / _settings('doubleClickZoomingRatio');

      _self.dispatchEvent('doubleclick', {
        x: _startMouseX - e.target.width / 2,
        y: _startMouseY - e.target.height / 2,
        clientX: e.clientX,
        clientY: e.clientY,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey
      });

      if (_settings('doubleClickEnabled')) {
        pos = _camera.cameraPosition(
          sigma.utils.getX(e) - e.target.width / 2,
          sigma.utils.getY(e) - e.target.height / 2,
          true
        );

        animation = {
          duration: _settings('doubleClickZoomDuration')
        };

        sigma.utils.zoomTo(_camera, pos.x, pos.y, ratio, animation);
      }

      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false;
      }

      e.stopPropagation();
      return false;
    }

    /**
     * The handler listening to the 'wheel' mouse event. It will basically zoom
     * in or not into the graph.
     *
     * @param {event} e A mouse event.
     */
    _defaultHandlers._wheelHandler = function(e) {
      var pos,
          ratio,
          animation;

      if (!_settings('mouseEnabled')) {
        return;
      }

      ratio = sigma.utils.getDelta(e) > 0 ?
        1 / _settings('zoomingRatio') :
        _settings('zoomingRatio');

      pos = _camera.cameraPosition(
        sigma.utils.getX(e) - e.target.width / 2,
        sigma.utils.getY(e) - e.target.height / 2,
        true
      );

      animation = {
        duration: _settings('mouseZoomDuration')
      };

      sigma.utils.zoomTo(_camera, pos.x, pos.y, ratio, animation);

      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false;
      }

      e.stopPropagation();
      return false;
    };

    function handlerOverrideWrapper(override, original) {
      if (!override) {
        return original;
      } else {
        return function(e) {
          if (override(e)) {
            original(e);
          }
        };
      }
    }

    function addListener(target, event, handlerName) {
      var handler = handlerOverrideWrapper(_handlers[handlerName], _defaultHandlers[handlerName]);
      target.addEventListener(event, handler, false);
      _assignedHandlers.push({target: target, event: event, handler: handler});
    }

    sigma.utils.doubleClick(_target, 'click', _defaultHandlers._doubleClickHandler);
    addListener(_target, 'DOMMouseScroll', '_wheelHandler');
    addListener(_target, 'mousewheel', '_wheelHandler');
    addListener(_target, 'mousemove', '_moveHandler');
    addListener(_target, 'mousedown', '_downHandler');
    addListener(_target, 'click', '_clickHandler');
    addListener(_target, 'mouseout', '_outHandler');
    addListener(document, 'mouseup', '_upHandler');

    /**
     * This method unbinds every handlers that makes the captor work.
     */
    this.kill = function() {
      sigma.utils.unbindDoubleClick(_target, 'click');

      var handlerInfo;
      while (handlerInfo = _assignedHandlers.pop()) {
        handlerInfo.target.removeEventListener(handlerInfo.event, handlerInfo.handler);
      }
    };
  };


}).call(this);
