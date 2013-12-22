var Util = (function() {

  var resistanceString = function(r) {
    return "(" + Math.round(r*100.0) + "%)";
  }


  var propertiesOf = function(o) {
    var p, a = [];
    for (p in o) {
      if (o.hasOwnProperty(p)) {
        a.push(p);
      }
    }
    return a;
  };

  return({ resistanceString: resistanceString,
           propertiesOf:     propertiesOf});

})();

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

//
// 'width' is width in metres of world.
//
var GameView = function($, Box2D, canvasSelector) {
  var canvas = $(canvasSelector)[0],
      b2,
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

  var showAntibioticLink = function(ab, resistances) {
    $('#antibiotics').append('<span id="' +
                              ab + '" style="display:none;"><a href="#">' + ab +
                              '</a><span id="'+ ab + '-resistance">'+
                              Util.resistanceString(gameState.resistances[ab]) +'</span></span>');
    bindAntibioticHandler(ab);
  };

  var bindAntibioticHandler = function(antibiotic) {
    var i, el;

    var handler = function() {
        killGermsWithAntibiotic(antibiotic);
    };

    el = $('#' + antibiotic + ' a');
    el.unbindClickAndTouchstart();
    el.clickOrTouchstart(handler);

  };

  var resetWorld = function() {
    b2 = Box2DWorld(Box2D);
  };

  var clearAntibioticLinks = function() {
    $('#antibiotics').empty();
  };

  var setupDebugDraw = function() {
    var debugDraw = new b2.DebugDraw();
    context = canvas.getContext('2d');

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

  var collideAtPos = function(body, pos) {
    var fixture, vec = new b2.Vec2(pos.x, pos.y);
    for (fixture = body.GetFixtureList(); fixture; fixture = fixture.GetNext()) {
      if (fixture.TestPoint(vec)) {
        return true;
      }
    }
    return false;
  }

  // 'width' is in metres
  var init = function(w) {
    width  = w;
    height = heightInPixels/widthInPixels * width;
    scale  = widthInPixels/width;
  };

  // Initialisation
  b2 = Box2DWorld(Box2D);
  // return methods
  return ({ b2:                   b2, // FIXME eventualy don't expose this.
            init:                 init,
            createBeaker:         createBeaker,
            clearAntibioticLinks: clearAntibioticLinks,
            showAntibioticLink:   showAntibioticLink,
            setupDebugDraw:       setupDebugDraw,
            resetWorld:           resetWorld,
            collideAtPos:         collideAtPos
          });
};

var Game = function ($, canvasSelector, view) {
  jQueryExtend($); //
//  var Antibiotics = { Penicillin: 2, Ciprofloxacin: 5 };
  var Antibiotics = { Penicillin: 50, Ciprofloxacin: 200 };

  // sseefried: I don't want to use magic numbers in my code, so I'm defining the
  //   width and height for now. FIXME: get this directly from the canvas.
  var canvas = $(canvasSelector)[0]; // FIXME: remove
  var widthInPixels  = $(canvas).width(); // FIXME: remove
  var heightInPixels = $(canvas).height(); // FIXME: remove

  var width = 40;
  var height = heightInPixels/widthInPixels * width;

  var scale = widthInPixels/width; // world is 40m wide

  var germSize = 1;

  var stepsInSecond = 30;
  var timeStep = 1/stepsInSecond;

  var doublingPeriod = 3; // in seconds

  var resistanceIncrease = 1.1; // multiplier for resistance increase

  var velocityIterations = 8;
  var positionIterations = 100;

  var Condition = { continuing: 0, failed: 1, success: 2};

  var initGameState = function() {
    var i, props = Util.propertiesOf(Antibiotics);
    gameState = { score: 0, resistances: {}};

    view.clearAntibioticLinks();

    for (i in props) {
      gameState.resistances[props[i]] = 0.10; // initial resistance chance of 0.10
      view.showAntibioticLink(props[i], gameState.resistances);
    }
  };

  initGameState();

  var randomMultiplyTime = function() {
    // +1 is because it cannot be zero
    return Math.round(Math.random() * 2 * doublingPeriod * stepsInSecond) + 1;
  };

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
      var i, resistances = {}, props = Util.propertiesOf(Antibiotics);
      for (i in props) {
        resistances[props[i]] = (Math.random() < gameState.resistances[props[i]]) ? true : false;
      };
      return resistances;
    };

    var createGerm = function(o) {
      var body = view.b2.createDynamicBody({x: o.x, y: o.y, angularDamping: 0.7},
                           [{ density: 1.0,
                              friction: 1.0,
                              restitution: 0.0,
                              shape: new view.b2.CircleShape(o.r) }]),
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
      var body, germ, resist, newResist;
      for (body = view.b2.world.GetBodyList(); body; body = body.GetNext()) {
        if (germ = body.GetUserData()) {
          if (!germ.resistances[antibiotic]) {
            view.b2.world.DestroyBody(body);
            gameState.score += 1;
          }
        }
      }
      // increase the chance that germs are resistant
      resist = gameState.resistances[antibiotic];
      newResist = Math.min(0.99, resist*resistanceIncrease);
      gameState.resistances[antibiotic] = newResist;
      $('#' + antibiotic + '-resistance').html(resistanceString(newResist));
    }

    var killGermAtPos = function(pos) {
      var body, numGerms = 0;
          // TODO: I really should be checking a bounding box, but instead
          // I just check every object in the world.
      for (body = view.b2.world.GetBodyList(); body; body = body.GetNext()) {
        if (body.GetUserData()) {
          if (view.collideAtPos(body, pos)) {
            view.b2.world.DestroyBody(body);
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
        var pos = { x : (e.pageX - offset.left)/scale,
                         y : (e.pageY - offset.top)/scale };
        killGermAtPos(pos);
      };
    };


    var multiplyGerms = function() {
      var pos, count = 0, b, circleShape, r, t;
      for (b = view.b2.world.GetBodyList(); b; b = b.GetNext()) {
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
      for (body = view.b2.world.GetBodyList(); body; body = body.GetNext()) {
        if (userData = body.GetUserData()) {
          shape = body.GetFixtureList().GetShape();
          shape.SetRadius(shape.GetRadius() * userData.growthRate);
        }
      }
    }

    var animate = function() {
      var animateId;

      view.b2.world.Step(timeStep, velocityIterations, positionIterations);
      gameState.step += 1;
      view.b2.world.ClearForces();
      view.b2.world.DrawDebugData();
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


    var checkAndEnableAntibiotics = function() {
      var i, props = Util.propertiesOf(Antibiotics), el;
      for (i in props) {
        el = $('#' + props[i]);
        if (!el.is(":visible") && gameState.score >= Antibiotics[props[i]]) {
          el.show();
          showMessage('<p>Antibiotic "'+ props[i] +'" enabled!</p>' +
                      '<p>The percentage next to the antibiotic is the germ\'s natural chance of immunity.</p>' +
                      '<p>Each use of an antibiotic will increase the chance of immunity ' +
                      'in subsequent levels. Use sparingly!</p>');
          return true;
        }
      }
      return false;
    }

    var resetHandler = function() {
      $('#message').hide();
      destroy(); // destroy must come before initGameState()
      $('#reset').unbindClickAndTouchstart();
      $('#antiobiotics').html(''); // clear antibiotic links
      initGameState();
      start(1);
    };

    ///////////////////////////////////////////////////////////////
    view.init(width);
    startingGerms = startingGerms || 1;

    gameState.step = 0;
    gameState.condition = Condition.continuing;
    gameState.startingGerms = startingGerms;

    view.createBeaker({x: 20, y: height/2, width: 36, height: height*2/3, wallWidth: 1});
    createGerms(startingGerms);

    $('#level').html("Level: " + startingGerms);

    $('#reset').unbindClickAndTouchstart();
    $('#reset').clickOrTouchstart(resetHandler);
    bindGameHandler(posHandler(canvasSelector));
//    bindAntibioticHandlers();

    view.setupDebugDraw();
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
    view.resetWorld();
  }

  return ({
    showMessage:  showMessage,
    start:        start,
    destroy:      destroy
  })

};

jQuery(document).ready(function() {
  var pos = $('#canvas').position(),
      h = $(window).height(),
      w = $(window).width(),
      min = Math.min(w,h),
      leftMargin = Math.round((w - min)/2),
      percent = 0.8;

  $('#canvas').attr('width', min).attr('height', min)
              .css('left', leftMargin)
              .css('top', pos.top*2);
  $('#message').css('left', leftMargin + ((1 - percent)/2)*min)
               .css('top', pos.top*2 + 0.2*min)
               .css('width', min*percent);

  gameView = GameView($, Box2D, '#canvas');
  game = Game(jQuery, '#canvas', gameView);
//  $('#debug').html("height = " + window.innerHeight);

  game.start(1);
  game.showMessage("<p>Click on the germs to kill them!</p>");

});