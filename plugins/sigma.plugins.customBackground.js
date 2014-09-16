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
          x = node[prefix + 'x'],
          yOffset = y - (size/2),
          padding = size * 0.1;

      context.save();
      context.beginPath();
      context.globalAlpha = 0.1;
      context.fillStyle = node.color;
      context.fillRect(x, yOffset + padding, node.type == 'workingDirectory' ? width : labelEdge - x, size - (2 * padding));
      context.globalAlpha = 1;
      context.fillRect(labelEdge, yOffset + padding, 2, size - (2*padding));

      if (node.type == 'workingDirectory') {
        context.setLineDash([2]);
        context.strokeStyle = node.color;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(
          x,
          yOffset + size - padding
        );
        context.lineTo(
          width,
          yOffset + size - padding
        );
        context.stroke();
      }

      context.restore();
    });
  };

}).call(this);
