;(function(undefined) {
  'use strict';

  if (typeof sigma === 'undefined')
    throw 'sigma is not declared';

  // Initialize packages:
  sigma.utils.pkg('sigma.canvas.labels');

  /**
   * This label renderer will just display the label on the right of the node.
   *
   * @param  {object}                   node     The node object.
   * @param  {CanvasRenderingContext2D} context  The canvas context.
   * @param  {configurable}             settings The settings function.
   */
  sigma.canvas.labels.def = function(node, context, settings) {
    var fontSize,
        prefix = settings('prefix') || '',
        size = node[prefix + 'size'],
        labelWidth = 0,
        labelPlacementX,
        labelPlacementY,
        alignment;

    if (size < settings('labelThreshold'))
      return;

    if (typeof node.label !== 'string')
      return;

    alignment =
      node.alignment ||
      settings('labelAlignment') ||
      settings('defaultLabelAlignment');

    fontSize = (settings('labelSize') === 'fixed') ?
      settings('defaultLabelSize') :
      settings('labelSizeRatio') * size;

    context.font = (settings('fontStyle') ? settings('fontStyle') + ' ' : '') +
      fontSize + 'px ' + settings('font');

    if (node.boldLabel) {
      context.font = "bold " + context.font;
    }

    if (node.italicLabel) {
      context.font = "italic " + context.font;
    }

    if (settings('labelColor') === 'node') {
      if (node.selected) {
        context.fillStyle = '#fff';
      } else {
        context.fillStyle = node.labelColor || node.color || settings('defaultNodeColor');
      }
    } else {
      context.fillStyle = settings('defaultLabelColor');
    }

    labelWidth = context.measureText(node.label).width;
    labelPlacementX = Math.round(node[prefix + 'x'] + size + 3);
    labelPlacementY = Math.round(node[prefix + 'y'] + fontSize / 3);

    switch (alignment) {
      case 'inside':
        if (labelWidth <= size * 2) {
          labelPlacementX = Math.round(node[prefix + 'x'] - labelWidth / 2);
        }
        break;
      case 'center':
        labelPlacementX = Math.round(node[prefix + 'x'] - labelWidth / 2);
        break;
      case 'left':
        labelPlacementX =
          Math.round(node[prefix + 'x'] - size - labelWidth - 3);
        break;
      case 'left-edge':
        labelPlacementX = 3;

        if (labelWidth > node[prefix + 'x'] - size - 3) {
          labelPlacementX =
            Math.round(node[prefix + 'x'] - size - labelWidth - 3);
        }
        break;
      case 'left-offset':
        labelPlacementX = Math.round((settings('labelOffset') || 0) + 3);

        if (labelWidth > node[prefix + 'x'] - size - 3) {
          labelPlacementX =
            Math.round(node[prefix + 'x'] - size - labelWidth - 3);
        }
        break;
      case 'right':
        labelPlacementX = Math.round(node[prefix + 'x'] + size + 3);
        break;
      case 'right-edge':
        labelPlacementX = Math.round(context.canvas.width - labelWidth - 3);

        if (labelPlacementX < node[prefix + 'x'] + size + 3) {
          labelPlacementX = Math.round(node[prefix + 'x'] + size + 3);
        }
        break;
      case 'right-offset':
        labelPlacementX =
          Math.round(
            context.canvas.width -
            (settings('labelOffset') || 0) -
            3
          );

        if (labelPlacementX < node[prefix + 'x'] + size + 3) {
          labelPlacementX = Math.round(node[prefix + 'x'] + size + 3);
        }
        break;
      case 'top':
        labelPlacementX = Math.round(node[prefix + 'x'] - labelWidth / 2);
        labelPlacementY = labelPlacementY - size - fontSize;
        break;
      case 'bottom':
        labelPlacementX = Math.round(node[prefix + 'x'] - labelWidth / 2);
        labelPlacementY = labelPlacementY + size + fontSize;
        break;
      default:
        // Default is aligned 'right'
        labelPlacementX = Math.round(node[prefix + 'x'] + size + 3);
        break;
    }

    context.fillText(
      node.label,
      labelPlacementX,
      labelPlacementY
    );
  };
}).call(this);
