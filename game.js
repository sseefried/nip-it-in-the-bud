var Game = function ($, Box2D, canvasSelector) {

  // sseefried: I don't want to use magic numbers in my code, so I'm defining the
  //   width and height for now. FIXME: get this directly from the canvas.
  var canvas = $(canvasSelector)[0];
  var widthInPixels  = $(canvas).width();
  var heightInPixels = $(canvas).height();

  var width = 40;
  var height = heightInPixels/widthInPixels * width;

  var scale = widthInPixels/width; // world is 40m wide

  var germSize = 1.5;

  var stepsInSecond = 30;
  var timeStep = 1/stepsInSecond;

  var doublingPeriod = 3; // in seconds

  var b2 = Box2DWorld(Box2D);

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

  var createGerm = function(o) {
    var body = b2.createDynamicBody({x: o.x, y: o.y, angularDamping: 0.7},
                         [{ density: 1.0,
                            friction: 1.0,
                            restitution: 0.0, 
                            shape: new b2.CircleShape(germSize) }]);
    body.SetUserData({ type: "germ"});
    return body;

  }

  var collideWithMouse = function(body, mousePos) {
    var fixture, vec = new b2.Vec2(mousePos.x, mousePos.y);
    for (fixture = body.GetFixtureList(); fixture; fixture = fixture.GetNext()) {
      if (fixture.TestPoint(vec)) {
        return true;
      }
    }
    return false;
  }


  var start = function() {

    var gameState = { step: 0, condition: Condition.continuing },
        context = canvas.getContext("2d");

    createBeaker({x: 20, y: height/2, width: 36, height: height*2/3, wallWidth: 1});
    createGerm({x: width/2, y: 25});

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

    $(canvas).click(mouseHandler(canvasSelector));

    var multiplyGerms = function() {
      var newPos, count = 0;
      for (b = b2.world.GetBodyList(); b; b = b.GetNext()) {
        if (userData = b.GetUserData()) { 
          count += 1;
          if (b.GetPosition().y < height/6) {
            gameState.condition = Condition.failed;
          }

          if (gameState.step === (doublingPeriod*stepsInSecond - 1)) {
            newPos = b.GetPosition();
            newPos.x += 0.1;
            createGerm(newPos);
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

    var failedMessage = function() {
      context.fillStyle = "red";
      context.font = "bold " + Math.round(widthInPixels/10) + "px Helvetica";
      context.textAlign = "center";
      context.fillText("FAILED!", widthInPixels/2, heightInPixels/5)

    }

    var successMessage = function() {
      context.fillStyle = "green";
      context.font = "bold 64px Helvetica";
      context.textAlign = "center";
      context.fillText("Success!", widthInPixels/2, heightInPixels/5)
    }


    var animate = function() {
      b2.world.Step(timeStep, velocityIterations, positionIterations);
      gameState.step = (gameState.step + 1) % (doublingPeriod * stepsInSecond);
      b2.world.ClearForces();
      b2.world.DrawDebugData();
      multiplyGerms();

      switch (gameState.condition) {
        case Condition.continuing:
          setTimeout(function() { animate(); }, timeStep*1000);
          break;
        case Condition.failed: 
          failedMessage();
          break;
        case Condition.success:
          successMessage();
          break;
      }
    };

    setupDebugDraw();
    animate();

  };

  return ({
    start: start
  })

};

jQuery(document).ready(function() { 
  var aspect = 1, h = $(window).height() - $('#content').height()*1.1, w = h*aspect;
  $('#canvas').attr('width', w);
  $('#canvas').attr('height', h);

  game = Game(jQuery, Box2D, '#canvas');
});