var propertiesOf = function(o) {
  var p, a = [];
  for (p in o) {
    if (o.hasOwnProperty(p)) {
      a.push(p);
    }
  }
  return a;
};


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
      // preventDefault prevents touch things as "double tap to zoom"
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


var Game = function ($, Box2D, canvasSelector) {
  jQueryExtend($); //
  var Antibiotics = { Penicillin: 50, Ciprofloxacin: 200 };

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

  var resistanceIncrease = 1.1; // multiplier for resistance increase

  var b2;


  var velocityIterations = 8;
  var positionIterations = 100;

  var Condition = { continuing: 0, failed: 1, success: 2};


  var initGameState = function() {
    var i, props = propertiesOf(Antibiotics);
    gameState = { score: 0, resistances: {}};
    for (i in props) {
      gameState.resistances[props[i]] = 0.10; // initial resistance chance of 0.10
    }
  };

  initGameState();

  (function() {
    var i, props = propertiesOf(Antibiotics);

    for (i in props) {
      $('#antibiotics').append('<a href="#" style="display: none;"id="' +
                               props[i] + '">' + props[i] + '</a> ');
    }

  })();

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


  var showMessage = function(message) {
    var animateId;

    if (gameState.animator) {
      clearTimeout(gameState.animator.animateId);
    }
    if (gameState.handler) {
      $(document).unbindClickAndTouchstart(gameState.handler);
    }




    $('#message').html(message + '<p><a href="#" id="continue">Click here</a> to continue</p>');
    $('#message').show();

    var handler = function(e) {
      $('#message').hide();
      if (gameState.animator) {
        animateId = setTimeout(gameState.animator.animateFun, timeStep*1000);
        gameState.animator.animateId = animateId;
      }
      $('#continue').unbindClickAndTouchstart(handler);
      $(document).clickOrTouchstart(gameState.handler);
    };

    $('#continue').clickOrTouchstart(handler);
  };

  var bindGameHandler = function(handler) {
    $(document).unbindClickAndTouchstart();
    $(document).clickOrTouchstart(handler);
    gameState.handler = handler;
  };


  var start = function(startingGerms) {
    var context   = canvas.getContext("2d"), i;


    var clickToStartNewGame = function() {
      var handler =function() {
        var newGame;
        destroy();
        start(gameState.startingGerms + 1);
      };
      $(document).clickOrTouchstart(handler);
    };

    //
    // Randomly generates antiobiotics resistance for bacteria
    //
    var antibioticResistances = function() {
      var i, resistances = {}, props = propertiesOf(Antibiotics);
      for (i in props) {
        resistances[props[i]] = (Math.random() < gameState.resistances[props[i]]) ? true : false;
      };
      return resistances;
    };

    var createGerm = function(o) {
      var body = b2.createDynamicBody({x: o.x, y: o.y, angularDamping: 0.7},
                           [{ density: 1.0,
                              friction: 1.0,
                              restitution: 0.0,
                              shape: new b2.CircleShape(o.r) }]),
          t = randomMultiplyTime();
      body.SetUserData({ multiplyAt: gameState.step + t,
                         growthRate: growthRateForSteps(t),
                         // either inherent or create for the first time
                         resistances: (o.resistances || antibioticResistances()) });
      return body;
    };

    var createGerms = function(n) {
      var i;
      for (i=0; i < n; i++) {
        createGerm({x: width/2 + width/2*(Math.random() - 0.5),
                    y: 25,
                    r: germSize * (0.8 + Math.random() * 0.4)});
      }
    };

    var killGermsWithAntibiotic = function(antibiotic) {
      var body, germ, resist;
      for (body = b2.world.GetBodyList(); body; body = body.GetNext()) {
        if (germ = body.GetUserData()) {
          if (!germ.resistances[antibiotic]) {
            b2.world.DestroyBody(body);
            gameState.score += 1;
          }
        }
      }
      // increase the chance that germs are resistant
      resist = gameState.resistances[antibiotic];
      gameState.resistances[antibiotic] = Math.min(0.99, resist*resistanceIncrease);
      console.log("Resistance of " + antibiotic + " increased to " + gameState.resistances[antibiotic]);
    }

    var killGermAtPos = function(mousePos) {
      var body, numGerms = 0;
          // TODO: I really should be checking a bounding box, but instead
          // I just check every object in the world.
      for (body = b2.world.GetBodyList(); body; body = body.GetNext()) {
        if (body.GetUserData()) {
          if (collideWithMouse(body, mousePos)) {
            b2.world.DestroyBody(body);
            gameState.score += 1;
          } else {
            numGerms += 1; // still alive
          }
        }
      }
      if (numGerms === 0) {
        gameState.condition = Condition.success;
      }

    };


    var posHandler = function(selector) {
      return function(e) {
        var offset = $(selector).offset();
        var mousePos = { x : (e.pageX - offset.left)/scale,
                         y : (e.pageY - offset.top)/scale };
        killGermAtPos(mousePos);
      };
    };


    var multiplyGerms = function() {
      var pos, count = 0, b, circleShape, r, t;
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
            userData.multiplyAt = gameState.step + t;
            userData.growthRate = growthRateForSteps(t);
            // create new germ. Inherits resistances
            createGerm({x: pos.x+0.2, y: pos.y, r: r, resistances: userData.resistances});
          }
        }
      }
    };

    var failedMessage = function() {
      context.fillStyle = "red";
      context.font = "bold " + Math.round(widthInPixels/10) + "px Helvetica";
      context.textAlign = "center";
      context.fillText("INFECTED!", widthInPixels/2, heightInPixels/5)
    }

    var successMessage = function() {
      context.fillStyle = "green";
      context.font = "bold "+ Math.round(widthInPixels/15) + "px Helvetica";
      context.textAlign = "center";
      context.fillText("Epidemic averted!", widthInPixels/2, heightInPixels/5);
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
      var animateId;

      b2.world.Step(timeStep, velocityIterations, positionIterations);
      gameState.step += 1;
      b2.world.ClearForces();
      b2.world.DrawDebugData();
      multiplyGerms();
      $('#score').html("Score: " + gameState.score);


      if (!checkAndEnableAntibiotics()) {

        switch (gameState.condition) {
          case Condition.continuing:
            growGerms();
            animateId = setTimeout(animate, timeStep*1000);
            gameState.animator = { animateFun: animate, animateId: animateId };
            break;
          case Condition.failed:
            failedMessage();
            break;
          case Condition.success:
            successMessage();
            clickToStartNewGame();
            break;
        }
      }
    };

    var bindAntibioticHandlers = function() {
      var i, props = propertiesOf(Antibiotics), el, antibiotic;

      var handler = function(antibiotic) {
        return (function() {
          killGermsWithAntibiotic(antibiotic);
        });
      };

      for (i in props) {
        el = $('#' + props[i]);
        el.unbindClickAndTouchstart();
        el.clickOrTouchstart(handler(props[i]));
      }
    };

    var checkAndEnableAntibiotics = function() {
      var i, props = propertiesOf(Antibiotics), el;
      for (i in props) {
        el = $('#' + props[i]);
        if (!el.is(":visible") && gameState.score >= Antibiotics[props[i]]) {
          el.show();
          showMessage('<p>Antibiotic "'+ props[i] +'" enabled!</p>' +
                      '<p>A small portion of germs per level may be immune to this antibiotic. ' +
                      'Immunity is passed on to those germs offspring. Also, and this is very ' +
                      'important, each use of an antibiotic will increase the chance of immunity ' +
                      'in subsequent levels. Use sparingly!');
          return true;
        }
      }
      return false;
    }

    var resetHandler = function() {
      $('#message').hide();
      destroy(); // destroy must come before initGameState()
      $('#reset').unbindClickAndTouchstart();
      initGameState();
      start(1);
    };

    ///////////////////////////////////////////////////////////////
    startingGerms = startingGerms || 1;

    b2 = Box2DWorld(Box2D);


    gameState.step = 0;
    gameState.condition = Condition.continuing;
    gameState.startingGerms = startingGerms;

    createBeaker({x: 20, y: height/2, width: 36, height: height*2/3, wallWidth: 1});
    createGerms(startingGerms);

    $('#level').html("Level: " + startingGerms);

    $('#reset').unbindClickAndTouchstart();
    $('#reset').clickOrTouchstart(resetHandler);
    bindGameHandler(posHandler(canvasSelector));
    bindAntibioticHandlers();

    setupDebugDraw();
    animate();

  };

  var destroy = function() {
    if (gameState.animator) {
      clearTimeout(gameState.animator.animateId);
      gameState.animator = undefined;
    }
    if (gameState.handler) {
      $(document).unbindClickAndTouchstart(gameState.handler);
    }
    b2.world = undefined;
  }

  return ({
    showMessage:  showMessage,
    start:        start,
    destroy:      destroy
  })

};

jQuery(document).ready(function() {
  var pos = $('#canvas').position(),
      h = $(window).height() - pos.top,
      w = $(window).width(),
      min = Math.min(w,h),
      leftMargin = Math.max(0, Math.round((w - min)/2)),
      percent = 0.8;



  $('#canvas').attr('width', min).attr('height', min).css('left', leftMargin)
              .css('top', pos.top*1.8);
  $('#message').css('left', leftMargin + ((1 - percent)/2)*min)
               .css('top', pos.top*1.8 + 0.2*min)
               .css('width', min*percent);

  game = Game(jQuery, Box2D, '#canvas');
//  $('#debug').html("height = " + window.innerHeight);

  game.start(1);
  game.showMessage("<p>Click on the germs to kill them!</p>");



});