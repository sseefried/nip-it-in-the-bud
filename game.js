var Game = function ($, Box2D, canvasSelector) {

  // sseefried: I don't want to use magic numbers in my code, so I'm defining the
  //   width and height for now. FIXME: get this directly from the canvas.
  var canvas = $(canvasSelector)[0];
  var widthInPixels  = $(canvas).width();
  var heightInPixels = $(canvas).height();

  var width = 40;
  var height = heightInPixels/widthInPixels * width;

  var scale = widthInPixels/width; // world is 40m wide

  var germSize = 1;

  var stepsInSecond = 30;
  var timeStep = 1/stepsInSecond;

  var doublingPeriod = 3; // in seconds

  var b2;
  var gameState;

  var velocityIterations = 8;
  var positionIterations = 100;

  var Condition = { continuing: 0, failed: 1, success: 2};


 var setupDebugDraw = function() {
    var debugDraw = new b2.DebugDraw();
    context = canvas.getContext('2d');

    // rshankar: Use this canvas context for drawing the debugging screen
    debugDraw.SetSprite(context);
    debugDraw.SetDrawScale(scale);
    // rshankar: Fill boxes with alpha transparency of 0.3
    debugDraw.SetFillAlpha(0.3);
    debugDraw.SetLineThickness(1.0);

    // rshankar: Display all shapes and joints
    debugDraw.SetFlags(b2.DebugDraw.e_shapeBit | b2.DebugDraw.e_jointBit);
    b2.world.SetDebugDraw(debugDraw);
  };

  //
  // Draws a beaker centred at (x,y) of size (width,height)
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

  var randomMultiplyTime = function() {
    // +1 is because it cannot be zero
    return Math.round(Math.random() * 2 * doublingPeriod * stepsInSecond) + 1;
  };

  var collideWithMouse = function(body, mousePos) {
    var fixture, vec = new b2.Vec2(mousePos.x, mousePos.y);
    for (fixture = body.GetFixtureList(); fixture; fixture = fixture.GetNext()) {
      if (fixture.TestPoint(vec)) {
        return true;
      }
    }
    return false;
  }


  var growthRateForSteps = function(t) {
    return Math.pow(2,1/t);
  }


  var start = function(startingGerms) {
    b2 = Box2DWorld(Box2D);
    startingGerms = startingGerms || 1;
        context   = canvas.getContext("2d"), i;

    gameState = { step: 0, condition: Condition.continuing, startingGerms: startingGerms };

    $('#level').html("Level: " + startingGerms);

    $('#reset').click(function() {
      $('#reset').unbind("click");
      destroy();
      start(1);
    });


    var clickToStartNewGame = function() {
      $(document).unbind("click");
      $(document).click(function() {
        var newGame;
        destroy();
        start(gameState.startingGerms + 1);
      });
    };

    var createGerm = function(o) {
      var body = b2.createDynamicBody({x: o.x, y: o.y, angularDamping: 0.7},
                           [{ density: 1.0,
                              friction: 1.0,
                              restitution: 0.0, 
                              shape: new b2.CircleShape(o.r) }]),
          t = randomMultiplyTime();
      body.SetUserData({ multiplyAt: gameState.step + t,
                         growthRate: growthRateForSteps(t) });
      return body;
    };

    var createGerms = function(n) {
      for (i=0; i < n; i++) {
        createGerm({x: width/2 + width/2*(Math.random() - 0.5),
                    y: 25,
                    r: germSize * (0.8 + Math.random() * 0.4)});
      }
    };


    createBeaker({x: 20, y: height/2, width: 36, height: height*2/3, wallWidth: 1});
    createGerms(gameState.startingGerms);


    var mouseHandler = function(selector) { 
      var offset = $(selector).offset();
      return function(e) {
        var aabb = new b2.AABB(),
             mousePos = { x : (e.pageX - offset.left)/scale, 
                          y : (e.pageY - offset.top)/scale },
            body, numGerms = 0;
            // TODO: I really should be checking a bounding box, but instead
            // I just check every object in the world.
        for (body = b2.world.GetBodyList(); body; body = body.GetNext()) {
          if (body.GetUserData()) {
            if (collideWithMouse(body, mousePos)) {
              b2.world.DestroyBody(body);
            } else {
              numGerms += 1; // still alive
            }
          }
        }
        if (numGerms === 0) { 
          gameState.condition = Condition.success;
        }
      };
    };

    $(document).unbind("click");
    $(document).click(mouseHandler(canvasSelector));


    var multiplyGerms = function() {
      var pos, count = 0, circleShape, r, t;
      for (b = b2.world.GetBodyList(); b; b = b.GetNext()) {
        if (userData = b.GetUserData()) { 
          count += 1;
          if (b.GetPosition().y < height/6) {
            gameState.condition = Condition.failed;
          }

          if (gameState.step === userData.multiplyAt) {
            pos = b.GetPosition();
            circleShape = b.GetFixtureList().GetShape();
            // Update multiply time for current germ
            r = circleShape.GetRadius()/2;
            circleShape.SetRadius(r);
            t = randomMultiplyTime();
            b.SetUserData({ multiplyAt: gameState.step + t,
                            growthRate: growthRateForSteps(t) });
            // create new germ
            createGerm({x: pos.x, y: pos.y, r: r});
          }
        }
      }
    };

    var failedMessage = function() {
      context.fillStyle = "red";
      context.font = "bold " + Math.round(widthInPixels/10) + "px Helvetica";
      context.textAlign = "center";
      context.fillText("FAILED!", widthInPixels/2, heightInPixels/5)
    }

    var successMessage = function() {
      context.fillStyle = "green";
      context.font = "bold "+ Math.round(widthInPixels/10) + "px Helvetica";
      context.textAlign = "center";
      context.fillText("Success!", widthInPixels/2, heightInPixels/5);
      context.fillStyle ="#333333";
      context.font = "bold " + Math.round(widthInPixels/30) + "px Helvetica";
      context.fillText("Click to continue", widthInPixels/2, 2*heightInPixels/5);
    }

    var growGerms = function() {
      var body, fixture, shape, userData;
      for (body = b2.world.GetBodyList(); body; body = body.GetNext()) {
        if (userData = body.GetUserData()) {
          shape = body.GetFixtureList().GetShape();
          shape.SetRadius(shape.GetRadius() * userData.growthRate);
        }
      }
    }

    var animate = function() {

      b2.world.Step(timeStep, velocityIterations, positionIterations);
      gameState.step = (gameState.step + 1);
      b2.world.ClearForces();
      b2.world.DrawDebugData();
      multiplyGerms();

      switch (gameState.condition) {
        case Condition.continuing:
          growGerms();
          gameState.animateTimeoutId = setTimeout(function() { animate(); }, timeStep*1000);
          break;
        case Condition.failed: 
          failedMessage();
          break;
        case Condition.success:
          successMessage();
          clickToStartNewGame();
          break;
      }

    };

    setupDebugDraw();
    animate();

  };

  var destroy = function() {
    clearTimeout(gameState.animateTimeoutId);
    b2.world = null;
  }

  return ({
    start:   start,
    destroy: destroy
  })

};

jQuery(document).ready(function() { 
  var aspect = 1, h = $(window).height() - $('#content').height()*1.1, w = h*aspect;
  $('#canvas').attr('width', w);
  $('#canvas').attr('height', h);

  game = Game(jQuery, Box2D, '#canvas');


});