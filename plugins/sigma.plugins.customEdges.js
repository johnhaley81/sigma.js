;(function(undefined) {
  'use strict';

  if (typeof sigma === 'undefined') {
    throw 'sigma is not declared';
  }

  sigma.utils.pkg('sigma.canvas.edges');
  sigma.canvas.edges.commit = function(edge, source, target, context, settings) {
    var color = edge.color,
    prefix = settings('prefix') || '',
    edgeColor = settings('edgeColor'),
    defaultNodeColor = settings('defaultNodeColor'),
    defaultEdgeColor = settings('defaultEdgeColor');

    if (!color){
      switch (edgeColor) {
        case 'source':
          color = source.color || defaultNodeColor;
          break;
        case 'target':
          color = target.color || defaultNodeColor;
          break;
        default:
          color = defaultEdgeColor;
          break;
      }
    }

    context.strokeStyle = color;
    context.lineWidth = edge[prefix + 'size'] || 1;
    context.beginPath();
    context.moveTo(
      source[prefix + 'x'],
      source[prefix + 'y']
    );
    context.arcTo(
      target[prefix + 'x'],
      source[prefix + 'y'],
      target[prefix + 'x'],
      target[prefix + 'y'],
      10
    );
    context.lineTo(
      target[prefix + 'x'],
      target[prefix + 'y']
    );
    context.stroke();
  };

  sigma.canvas.edges.workingDirectory = function(edge, source, target, context, settings) {
    var color = edge.color,
    prefix = settings('prefix') || '',
    edgeColor = settings('edgeColor'),
    defaultNodeColor = settings('defaultNodeColor'),
    defaultEdgeColor = settings('defaultEdgeColor');

    if (!color){
      switch (edgeColor) {
        case 'source':
          color = source.color || defaultNodeColor;
          break;
        case 'target':
          color = target.color || defaultNodeColor;
          break;
        default:
          color = defaultEdgeColor;
          break;
      }
    }

    context.save();

    context.setLineDash([2]);
    context.strokeStyle = color;
    context.lineWidth = edge[prefix + 'size'] || 1;
    context.beginPath();
    context.moveTo(
      source[prefix + 'x'],
      source[prefix + 'y']
    );
    context.arcTo(
      target[prefix + 'x'],
      source[prefix + 'y'],
      target[prefix + 'x'],
      target[prefix + 'y'],
      10
    );
    context.lineTo(
      target[prefix + 'x'],
      target[prefix + 'y']
    );
    context.stroke();

    context.restore();
  };
}).call(this);
