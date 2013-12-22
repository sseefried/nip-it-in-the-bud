var jQueryExtend = function(jQuery) {
  var $ = jQuery;
  //
  // A function that adds a mouse handler for
  //
  var proto = $(window).__proto__;
  proto.clickOrTouchstart = function(handler) {
    $(this).click(handler);
    $(this).on("touchstart", function(event) {
      var e = event.originalEvent, ts;
      // preventDefault prevents things as "double tap to zoom"
      // and "pinch and zoom" on mobile devices. You may not want this.
      e.preventDefault();
      ts = e.touches;
      for (i=0; i < ts.length; i++) {
        handler(ts[i]);
      }
    });
  };

  proto.unbindClickAndTouchstart = function(handler) {
    if (handler) {
      $(this).unbind("click", handler);
      $(this).unbind("touchstart", handler);
    } else {
      $(this).unbind("click");
      $(this).unbind("touchstart");
    }
  };
};