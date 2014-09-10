;(function(undefined) {
  'use strict';

  if (typeof sigma === 'undefined')
    throw 'sigma is not declared';

  // Initialize packages:
  sigma.utils.pkg('sigma.misc');
  sigma.utils.pkg('sigma.canvas.nodes');
  /**
   * This helper will bind any no-DOM renderer (for instance canvas or WebGL)
   * to its captors, to properly dispatch the good events to the sigma instance
   * to manage clicking, overring etc...
   *
   * It has to be called in the scope of the related renderer.
   */
  sigma.misc.bindEvents = function(prefix) {
    var i,
        l,
        mX,
        mY,
        captor,
        self = this;

    function getNodes(e) {
      if (e) {
        mX = 'x' in e.data ? e.data.x : mX;
        mY = 'y' in e.data ? e.data.y : mY;
      }

      var i,
          j,
          l,
          n,
          x,
          y,
          s,
          inserted,
          selected = [],
          modifiedX = mX + self.width / 2,
          modifiedY = mY + self.height / 2,
          containsFunc,
          point = self.camera.cameraPosition(
            mX,
            mY
          ),
          nodes = self.camera.quadtree.point(
            point.x,
            point.y
          );

      if (nodes.length)
        for (i = 0, l = nodes.length; i < l; i++) {
          n = nodes[i];
          containsFunc = ((n.type && sigma.canvas.nodes[n.type] && sigma.canvas.nodes[n.type].contains)
            ? sigma.canvas.node[n.type].contains
            : genericNodeContains);

          if (!n.hidden && containsFunc(n, modifiedX, modifiedY)) {
            // Insert the node:
            inserted = false;

            for (j = 0; j < selected.length; j++)
              if (n.size > selected[j].size) {
                selected.splice(j, 0, n);
                inserted = true;
                break;
              }

            if (!inserted)
              selected.push(n);
          }
        }

      return selected;
    }

    function genericNodeContains(node, x, y) {
      var nodeX = n[prefix + 'x'],
          nodeY = n[prefix + 'y'],
          nodeSize = n[prefix + 'size'];

      return
        (x > nodeX - s)
        &&
        (x < nodeX + s)
        &&
        (y > nodeY - s)
        &&
        (y > nodeY - s)
        &&
        Math.sqrt(
          Math.pow(x - nodeX, 2) +
          Math.pow(y - nodeY, 2)
        ) < s
    }

    function bindCaptor(captor) {
      var nodes,
          over = {};

      function onClick(e) {
        if (!self.settings('eventsEnabled'))
          return;

        self.dispatchEvent('click', e.data);

        nodes = getNodes(e);

        if (nodes.length) {
          self.dispatchEvent('clickNode', {
            node: nodes[0],
            captor: e.data
          });
          self.dispatchEvent('clickNodes', {
            node: nodes,
            captor: e.data
          });
        } else
          self.dispatchEvent('clickStage', {captor: e.data});
      }

      function onDoubleClick(e) {
        if (!self.settings('eventsEnabled'))
          return;

        self.dispatchEvent('doubleClick', e.data);

        nodes = getNodes(e);

        if (nodes.length) {
          self.dispatchEvent('doubleClickNode', {
            node: nodes[0],
            captor: e.data
          });
          self.dispatchEvent('doubleClickNodes', {
            node: nodes,
            captor: e.data
          });
        } else
          self.dispatchEvent('doubleClickStage', {captor: e.data});
      }

      function onRightClick(e) {
        if (!self.settings('eventsEnabled'))
          return;

        self.dispatchEvent('rightClick', e.data);

        if (nodes.length) {
          self.dispatchEvent('rightClickNode', {
            node: nodes[0],
            captor: e.data
          });
          self.dispatchEvent('rightClickNodes', {
            node: nodes,
            captor: e.data
          });
        } else
          self.dispatchEvent('rightClickStage', {captor: e.data});
      }

      function onOut(e) {
        if (!self.settings('eventsEnabled'))
          return;

        var k,
            i,
            l,
            out = [];

        for (k in over)
          out.push(over[k]);

        over = {};
        // Dispatch both single and multi events:
        for (i = 0, l = out.length; i < l; i++)
          self.dispatchEvent('outNode', {
            node: out[i],
            captor: e.data
          });
        if (out.length)
          self.dispatchEvent('outNodes', {
            nodes: out,
            captor: e.data
          });
      }

      function onMouseup(e) {
        if (!self.settings('eventsEnabled'))
          return;
        var nodes = getNodes(e);
        if (nodes.length) {
          self.dispatchEvent('mouseup', {node: nodes[0]});
        }
        onMove(e);
      }

      function onMousedown(e) {
        if (!self.settings('eventsEnabled'))
          return;
        var nodes = getNodes(e);
        if (nodes.length) {
          self.dispatchEvent('mousedown', {node: nodes[0]});
        }
        onMove(e);
      }

      function onMove(e) {
        if (!self.settings('eventsEnabled'))
          return;

        nodes = getNodes(e);

        var i,
            k,
            n,
            newOut = [],
            newOvers = [],
            currentOvers = {},
            l = nodes.length;

        // Check newly overred nodes:
        for (i = 0; i < l; i++) {
          n = nodes[i];
          currentOvers[n.id] = n;
          if (!over[n.id]) {
            newOvers.push(n);
            over[n.id] = n;
          }
        }

        // Check no more overred nodes:
        for (k in over)
          if (!currentOvers[k]) {
            newOut.push(over[k]);
            delete over[k];
          }

        // Dispatch both single and multi events:
        for (i = 0, l = newOvers.length; i < l; i++)
          self.dispatchEvent('overNode', {
            node: newOvers[i],
            captor: e.data
          });
        for (i = 0, l = newOut.length; i < l; i++)
          self.dispatchEvent('outNode', {
            node: newOut[i],
            captor: e.data
          });
        if (newOvers.length)
          self.dispatchEvent('overNodes', {
            nodes: newOvers,
            captor: e.data
          });
        if (newOut.length)
          self.dispatchEvent('outNodes', {
            nodes: newOut,
            captor: e.data
          });
      }

      // Bind events:
      captor.bind('click', onClick);
      captor.bind('mousedown', onMousedown);
      captor.bind('mouseup', onMouseup);
      captor.bind('mousemove', onMove);
      captor.bind('mouseout', onOut);
      captor.bind('doubleclick', onDoubleClick);
      captor.bind('rightclick', onRightClick);
      self.bind('render', onMove);
    }

    for (i = 0, l = this.captors.length; i < l; i++)
      bindCaptor(this.captors[i]);
  };
}).call(this);
