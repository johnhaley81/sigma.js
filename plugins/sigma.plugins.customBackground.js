;(function(undefined) {
  'use strict';

  if (typeof sigma === 'undefined') {
    throw 'sigma is not declared';
  }

  sigma.canvas.background = function(context, camera, width, height, nodes, settings) {
    var i = 0,
        size = 32 / camera.ratio,
        prefix = settings('prefix') || '',
        labelPadding = 8,
        labelEdge = width - (settings('labelOffset') || 0) - labelPadding;

    nodes.forEach(function(node) {
      if ((node.type != 'merge' && node.type != 'commit' && node.type != 'workingDirectory') || node.hidden) {
        return;
      }

      var y = node[prefix + 'y'],
        yOffset = y - (size/2),
        x = node[prefix + 'x'],
        padding = size * 0.2;

      context.save();
      context.beginPath();
      context.globalAlpha = 0.1;
      context.fillStyle = node.color;
      context.fillRect(x, yOffset + padding, labelEdge - x, size - padding);
      context.globalAlpha = 1;
      context.fillRect(labelEdge, yOffset + padding, 2, size - padding);
      context.restore();
    });
  };

}).call(this);
