var Util = (function() {

  var resistanceString = function(r) {
    return "(" + Math.round(r*100.0) + "%)";
  }

  var deleteArrayElements = function(a, toDelete) {
    var i, a_ = [];
    for (i = 0; i < a.length; i++) {
      if ( toDelete.indexOf(i) < 0 ) {
        a_.push(a[i]);
      }
    }
    return a_;
  };

  var propertiesOf = function(o) {
    var p, a = [];
    for (p in o) {
      if (o.hasOwnProperty(p)) {
        a.push(p);
      }
    }
    return a;
  };

  return({ resistanceString:     resistanceString,
           deleteArrayElements:  deleteArrayElements,
           propertiesOf:         propertiesOf });

})();