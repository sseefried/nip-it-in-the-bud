//
// 'width' is width in metres of world.
//
var GameView = function($, Box2D, canvasSelector, jQueryExtend) {
  jQueryExtend($);
  var canvas = $(canvasSelector)[0],
      context = canvas.getContext('2d'), // 2D canvas context
      b2, // FIXME: Remove eventually
      widthInPixels  = $(canvas).width(),
      heightInPixels = $(canvas).height(),
      width, height, scale,
      velocityIterations = 8,
      positionIterations = 100;

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

  //
  // Adds (initially hidden) antibiotic link
  //
  var addAntibioticLink = function(ab, abHandler, resistances) {
    $('#antibiotics').append('<span id="' +
                              ab + '" style="display:none;"><a href="#">' + ab +
                              '</a><span id="'+ ab + '-resistance">'+
                              Util.resistanceString(resistances[ab]) +'</span></span>');
    bindAntibioticHandler(ab, abHandler);
  };

  var showAntibioticLink = function(ab) {
    $('#antibiotics #' + ab).show();
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

  var unbindAllHandlers = function() {
    $(document).unbindClickAndTouchstart();
  };

  //
  // 'handler' is a function which expects
  // an object with field 'x' and 'y' in
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

  var bindResetHandler = function(handler) {
    $('#reset').clickOrTouchstart(handler);
  };

  var updateAntibioticResistance = function(antibiotic, str) {
    $('#' + antibiotic + '-resistance').html(str);
  };

  var updateScore = function(score) {
    $('#score').html("Score: " + score);
  };

  var getGermData = function(germ) {
    return germ.GetUserData();
  };

  //
  // o is object containing fields 'x', 'y', 'r' for
  // (x,y) position and radius r.
  //
  // 'germData' is arbitrary user data associated with the
  // germ.
  var createGerm = function(o, germData) {
    var body = b2.createDynamicBody({x: o.x, y: o.y, angularDamping: 0.7},
                                [{ density: 1.0,
                                   friction: 1.0,
                                   restitution: 0.0,
                                   shape: new b2.CircleShape(o.r) }]);
    body.SetUserData(germData);
    return body;
  };

  var getGermPos = function(germ) {
    return germ.GetPosition();
  };

  var getGermRadius = function(germ) {
    var shape = germ.GetFixtureList().GetShape();
    return shape.GetRadius();
  };

  var setGermRadius = function(germ, r) {
    var shape = germ.GetFixtureList().GetShape();
    shape.SetRadius(r);
  };

  var stepPhysics = function(timeStep) {
    b2.world.Step(timeStep, velocityIterations, positionIterations);
    b2.world.ClearForces();
  };

  var drawDebugData = function() {
    b2.world.DrawDebugData();
  };

  var updateLevel = function(level) {
    $('#level').html("Level: " + level);
  };

  //
  // 'o' is an object with fields
  //  - pos
  //  - color
  //  - modifiers
  //  - font
  //  - size (1 to 100)
  //  - message
  //
  var floatingMessage = function(o) {
    context.fillStyle = o.color;
    context.font = (o.modifiers || "") + " " + Math.round(o.size*heightInPixels/100) + "px " + o.font;

    context.textAlign = "center";
    context.fillText(o.message, o.pos.x*widthInPixels/width, o.pos.y*heightInPixels/height);
  };

  // return methods
  return ({ init:                       init,
            heightInPixels:             (function() { return heightInPixels; }),
            widthInPixels:              (function() { return widthInPixels; }),
            createBeaker:               createBeaker,


            clearAntibioticLinks:       clearAntibioticLinks,
            // FIXME: The existence of both addAntibioticLink and showAntibioticLink
            // feels somehow superfluous to me. Shouldn't the just come into existence once?
            // not in this two-step process of being added (but hidden) and then shown later?
            addAntibioticLink:          addAntibioticLink,
            showAntibioticLink:         showAntibioticLink,

            updateAntibioticResistance: updateAntibioticResistance,
            setupDebugDraw:             setupDebugDraw,
            resetWorld:                 resetWorld,

            // FIXME: I'd like to rename 'collideAtPos'
            collideAtPos:               collideAtPos,
            showMessage:                showMessage,
            clearMessage:               clearMessage,
            bindHandler:                bindHandler,
            unbindHandler:              unbindHandler,
            unbindAllHandlers:          unbindAllHandlers,
            bindPosHandler:             bindPosHandler,
            bindResetHandler:           bindResetHandler,
            setContinueAction:          setContinueAction,
            installContinueHandler:     installContinueHandler,
            unschedule:                 unschedule,
            schedule:                   schedule,
            updateScore:                updateScore,
            updateLevel:                updateLevel,
            floatingMessage:            floatingMessage,

            // germ functions
            //
            // FIXME: I'd actually like to have a germ API. Whenever you create a germ an
            // object is returned that has all these methods defined on it. Much more
            // object-oriented that way.
            // view.getGermData(germ) just looks so much more convoluted rather than
            // germ.getGermData()
            //
            destroyGerm:                destroyGerm,
            createGerm:                 createGerm,
            getGermData:                getGermData,
            getGermPos:                 getGermPos,
            getGermRadius:              getGermRadius,
            setGermRadius:              setGermRadius,

            stepPhysics:                stepPhysics,
            drawDebugData:              drawDebugData,
            numBodies:                  numBodies //FIXME: Remove
          });
};