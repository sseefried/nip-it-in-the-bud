//
// 'width' is width in metres of world.
//
var GameView = function($, Box2D, canvasSelector) {
  var canvas = $(canvasSelector)[0],
      context = canvas.getContext('2d'), // 2D canvas context
      b2, // FIXME: Remove eventually
      widthInPixels  = $(canvas).width(),
      heightInPixels = $(canvas).height(),
      width, height, scale;
  //
  // Draws a beaker centred at (x,y) of size (width,height) in the virtual co-ordinates.
  //
  var createBeaker = function(o) {
    var baseShape = new b2.PolygonShape,
        sideShape = new b2.PolygonShape;

    baseShape.SetAsBox(o.width/2,     o.wallWidth/2);
    sideShape.SetAsBox(o.wallWidth/2, (o.height - o.wallWidth)/2);

    b2.createBody({x: o.x - (o.width - o.wallWidth)/2, y: o.y}, [ { shape: sideShape}]);
    b2.createBody({x: o.x + (o.width - o.wallWidth)/2, y: o.y}, [ { shape: sideShape}]);
    b2.createBody({x: o.x, y: o.y + o.height/2}, [ { shape: baseShape }]);

  };

  var showAntibioticLink = function(ab, abHandler, resistances) {
    $('#antibiotics').append('<span id="' +
                              ab + '" style="display:none;"><a href="#">' + ab +
                              '</a><span id="'+ ab + '-resistance">'+
                              Util.resistanceString(resistances[ab]) +'</span></span>');
    bindAntibioticHandler(ab, abHandler);
  };

  var bindAntibioticHandler = function(antibiotic, antibioticHandler) {
    var i, el;
    el = $('#' + antibiotic + ' a');
    el.unbindClickAndTouchstart();
    el.clickOrTouchstart(antibioticHandler);
  };

  var resetWorld = function() {
    b2 = Box2DWorld(Box2D);
  };

  var clearAntibioticLinks = function() {
    $('#antibiotics').empty();
  };

  var setupDebugDraw = function() {
    var debugDraw = new b2.DebugDraw();

    // Use this canvas context for drawing the debugging screen
    debugDraw.SetSprite(context);
    debugDraw.SetDrawScale(scale);
    // Fill boxes with alpha transparency of 0.3
    debugDraw.SetFillAlpha(0.3);
    debugDraw.SetLineThickness(1.0);

    // Display all shapes and joints
    debugDraw.SetFlags(b2.DebugDraw.e_shapeBit | b2.DebugDraw.e_jointBit);
    b2.world.SetDebugDraw(debugDraw);
  };

  //
  // In Box2D germs are Box2D "body"s.
  //
  var collideAtPos = function(germ, pos) {
    var fixture, vec = new b2.Vec2(pos.x, pos.y);
    for (fixture = germ.GetFixtureList(); fixture; fixture = fixture.GetNext()) {
      if (fixture.TestPoint(vec)) {
        return true;
      }
    }
    return false;
  };

  var destroyGerm = function(germ) {
    b2.world.DestroyBody(germ);
  };

  // FIXME: Just for debug
  var numBodies = function() {
    var body, n = 0;
    for (body = b2.world.GetBodyList(); body; body = body.GetNext()) {
      n += 1;
    }
    return n;
  };

  var showMessage = function(message) {
    $('#message').html(message + '<p><a href="#" id="continue">Click here</a> to continue</p>');
    $('#message').show();
  };

  var clearMessage = function() {
    $('#message').hide();
  };

  var unschedule = function(animator) {
    clearTimeout(animator.animateId);
  };

  // 'width' is in metres
  var init = function(w) {
    context = canvas.getContext('2d');
    width  = w;
    height = heightInPixels/widthInPixels * width;
    scale  = widthInPixels/width;
    b2     = Box2DWorld(Box2D);
  };


  var bb = function() {
    return b2;
  };

  var setContinueAction = function(handler, newHandler) {
    $('#continue').unbindClickAndTouchstart(handler);
    $(document).clickOrTouchstart(newHandler);
  };

  var installContinueHandler = function(handler) {
    $('#continue').clickOrTouchstart(handler);
  };

  // schedule modifies 'animator'
  var schedule = function(animator, millis) {
    animator.animateId = setTimeout(animator.animateFun, millis);
  };

  var bindHandler = function(handler) {
    $(document).unbindClickAndTouchstart();
    $(document).clickOrTouchstart(handler);
  };

  var unbindHandler = function(handler) {
    $(document).unbindClickAndTouchstart(handler);
  };

  //
  // 'handler' is a function which expects
  // and object with field 'x' and 'y' in
  // the virtual co-ordinates.
  //
  var bindPosHandler = function(handler) {
    bindHandler(function(e) {
      var offset = $(canvasSelector).offset();
      var pos = { x : (e.pageX - offset.left)/scale,
                  y : (e.pageY - offset.top)/scale };
      handler(pos);
    });
  };

  var getGermData = function(germ) {
    return germ.GetUserData();
  }

  // return methods
  return ({ bb:                     bb,
            init:                   init,
            createBeaker:           createBeaker,
            clearAntibioticLinks:   clearAntibioticLinks,
            showAntibioticLink:     showAntibioticLink,
            setupDebugDraw:         setupDebugDraw,
            resetWorld:             resetWorld,
            collideAtPos:           collideAtPos,
            destroyGerm:            destroyGerm,
            showMessage:            showMessage,
            clearMessage:           clearMessage,
            bindHandler:            bindHandler,
            unbindHandler:          unbindHandler,
            bindPosHandler:         bindPosHandler,
            setContinueAction:      setContinueAction,
            installContinueHandler: installContinueHandler,
            unschedule:             unschedule,
            schedule:               schedule,
            getGermData:            getGermData,
            numBodies:              numBodies //FIXME: Remove
          });
};