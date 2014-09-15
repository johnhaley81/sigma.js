;(function(undefined) {
  'use strict';

  if (typeof sigma === 'undefined') {
    throw 'sigma is not declared';
  }

  sigma.canvas.background = function(context, camera, width, height, nodes, settings) {
    var i = 0,
    size = 0,
    prefix = settings('prefix') || '',
    currentY;

    while (!size || size > 32) {
      if (nodes.length < (i+2)) {
        return;
      }
      size = Math.abs(nodes[i][prefix + 'y'] - nodes[i+1][prefix + 'y']);
      i++;
    }

    nodes.forEach(function(node) {
      if ((node.type != 'merge' && node.type != 'commit' && node.type != 'workingDirectory') || node.hidden) {
        return;
      }

      var y = node[prefix + 'y'];
      if (!(node.y % 64)) {
        context.beginPath();
        context.fillStyle = 'rgba(112, 128, 144, 0.075)';
        context.fillRect(0, y - (size/2), width, size);
      }
    });
  };

}).call(this);
