//
// The GameView object is concerned with visual representation and binding/unbinding event handers.
// (The game logic is in the Game object.)
// - 'width' is width in metres of world.
//
// The "Germ API"
// --------------
//
// The Game object doesn't need to be (and shouldn't be) aware of the internal representation
// of a germ object inside the GameView. Each germ object must conform to the Germ API
// detailed below (see function 'createGerm' for more details.)
//
var GameView = function($, Box2D, canvasSelector, jQueryExtend, GermAnim) {
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

    var drawBeaker = function() {
      var sf = widthInPixels/width;
      context.fillStyle = "rgb(80,80,80)";
      context.fillRect( (o.x - o.width/2) * sf, (o.y - (o.wallWidth/2)+ o.height/2) * sf,
                        o.width*sf, o.wallWidth*sf);
      context.fillRect( (o.x - o.width/2) * sf, (o.y - (o.wallWidth/2) - o.height/2) * sf,
                        o.wallWidth*sf, o.height*sf);
      context.fillRect( (o.x - o.wallWidth + o.width/2) * sf, (o.y - (o.wallWidth/2) - o.height/2) * sf,
                        o.wallWidth*sf, o.height*sf);

    };

    return({ drawBeaker: drawBeaker });

  };


  //
  // Clears all the antibiotic links
  //
  var clearAntibioticLinks = function() {
    $('#antibiotics').empty();
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

  //
  // Shows a previously hidden antibiotic link
  //
  // Precondition: addAntibioticLink must have been called before for given 'ab'
  //
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

  var showMessage = function(message) {
    $('#message').css("color", "rgb(128,128,128)");
    $('#message').html(message + '<p><a href="#" id="continue">Click here</a> to continue</p>');
    $('#message').show();
  };

  var clearMessage = function() {
    $('#message').hide();
  };


  // 'width' is in metres
  var init = function(w) {
    context = canvas.getContext('2d');
    width  = w;
    height = heightInPixels/widthInPixels * width;
    scale  = widthInPixels/width;
    b2     = Box2DWorld(Box2D);
  };

  var setContinueHandler = function(handler) {
    var el = $('#continue');
    el.unbindClickAndTouchstart();
    el.clickOrTouchstart(handler);
  };

  //
  // Schedules an 'animate' function to run every 'period' milliseconds.
  // Returns an "animator" which is a data structure to manage animation
  //
  //
  var schedule = function(animate, period) {
    var animateId = setInterval(animate, period);
    return { animateFun: animate, animateId: animateId, period: period };
  };

  //
  // Takes the "animator" returned from function 'schedule' and
  // reschedules the animation.
  //
  var reschedule = function(animator) {
    animator.animateId = setInterval(animator.animateFun, animator.period);
  };

  //
  // Takes an "animator" argument and unschedules animation.
  //
  var unschedule = function(animator) {
    clearInterval(animator.animateId);
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
  var bindTouchHandler = function(handler) {
    bindHandler(function(e) {
      var offset = $(canvasSelector).offset();
      var pos = { x : (e.pageX - offset.left)/scale,
                  y : (e.pageY - offset.top)/scale };
      handler([pos]);
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




  //
  // o is object containing fields 'x', 'y', 'r' for
  // (x,y) position and radius r.
  //
  // 'data' is arbitrary user data associated with the
  // germ.
  //
  // The returned object conforms to the Germ API.
  //
  var createGerm = function(o, data) {
    var body = b2.createDynamicBody({x: o.x, y: o.y, angularDamping: 0.7},
                                [{ density: 1.0,
                                   friction: 1.0,
                                   restitution: 0.0,
                                   shape: new b2.CircleShape(o.r) }]);
    var germAnim = GermAnim();
    body.SetUserData(data);

    var getData = function() {
      return body.GetUserData();
    };

    var getPos = function() {
      return body.GetPosition();
    };

    var getRadius = function() {
      var shape = body.GetFixtureList().GetShape();
      return shape.GetRadius();
    };

    var setRadius = function(r) {
      var shape = body.GetFixtureList().GetShape();
      shape.SetRadius(r);
    };

    var getRotation = function() {
      return body.GetAngle();
    };

    //
    // Destroy must be called on the germ to deallocate
    // all its sub-components and remove it from the Box2D world.
    //
    var destroy = function() {
      b2.world.DestroyBody(body);
    };

    //
    // In Box2D germs are Box2D "body"s.
    //
    var isAtPos = function(pos) {
      var fixture, vec = new b2.Vec2(pos.x, pos.y);
      for (fixture = body.GetFixtureList(); fixture; fixture = fixture.GetNext()) {
        if (fixture.TestPoint(vec)) {
          return true;
        }
      }
      return false;
    };

    var drawFrame = function() {
      var r = getRadius()*widthInPixels/width, pos  = getPos(), rotation = getRotation(),
          rx = pos.x * widthInPixels/width, ry = pos.y * heightInPixels/height;
      germAnim.drawFrame(context, rx, ry, r, rotation);
    };

    //
    // The fields below are the definition of the Germ API.
    //
    return({ isAtPos:                    isAtPos,
             getData:                    getData,
             getPos:                     getPos,
             getRadius:                  getRadius,
             setRadius:                  setRadius,
             getRotation:                getRotation,
             drawFrame:                  drawFrame,
             destroy:                    destroy
           });

  };

  var clearCanvas = function() {
    context.clearRect(0,0,widthInPixels,heightInPixels);
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

            showMessage:                showMessage,
            clearMessage:               clearMessage,
            bindHandler:                bindHandler,
            unbindHandler:              unbindHandler,
            unbindAllHandlers:          unbindAllHandlers,
            bindTouchHandler:           bindTouchHandler,
            bindResetHandler:           bindResetHandler,
            setContinueHandler:         setContinueHandler,

            // Scheduling, re-scheduling and unscheduling of animation
            schedule:                   schedule,
            unschedule:                 unschedule,
            reschedule:                 reschedule,

            // Update score and level indicators
            updateScore:                updateScore,
            updateLevel:                updateLevel,
            floatingMessage:            floatingMessage,
            // Returns a germ that conforms to Germ API
            createGerm:                 createGerm,
            stepPhysics:                stepPhysics,
            drawDebugData:              drawDebugData,
            clearCanvas:                clearCanvas
          });
};