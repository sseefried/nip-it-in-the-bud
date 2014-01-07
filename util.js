var Util = (function() {

  var resistanceString = function(r) {
    return "(" + Math.round(r*100.0) + "%)";
  }

  //
  // Returns a copy of the array in which the indices
  // in "toRemove" have been removed.
  // Does NOT update in place
  //
  var removeArrayElements = function(a, toRemove) {
    var i, a_ = [];
    for (i = 0; i < a.length; i++) {
      if ( toRemove.indexOf(i) < 0 ) {
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
           removeArrayElements:  removeArrayElements,
           propertiesOf:         propertiesOf });

})();