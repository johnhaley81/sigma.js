;(function(global) {
  'use strict';

  if (typeof sigma === 'undefined') {
    throw 'sigma is not declared';
  }

  // Initialize packages:
  sigma.utils.pkg('sigma.renderers');
  sigma.renderers.def = sigma.renderers.canvas;
})(this);
