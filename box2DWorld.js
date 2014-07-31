// Author: Sean Seefried

var Box2DWorld = function(Box2D) {

  var allowSleep = false; // Allow objects that are at rest to fall asleep and be
                         // excluded from calculations


  var Vec2             = Box2D.Common.Math.b2Vec2;
  var AABB             = Box2D.Collision.b2AABB;
  var BodyDef          = Box2D.Dynamics.b2BodyDef;
  var Body             = Box2D.Dynamics.b2Body;
  var FixtureDef       = Box2D.Dynamics.b2FixtureDef;
  var Fixture          = Box2D.Dynamics.b2Fixture;
  var World            = Box2D.Dynamics.b2World;
  var PolygonShape     = Box2D.Collision.Shapes.b2PolygonShape;
  var CircleShape      = Box2D.Collision.Shapes.b2CircleShape;
  var EdgeChainDef     = Box2D.Collision.Shapes.b2EdgeChainDef;
  var DebugDraw        = Box2D.Dynamics.b2DebugDraw;
  var RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef;

  var world = new World(new Vec2(0,9.8), allowSleep); // world with gravity down

  // sseefried: A helper function I created to simplify creating dynamic bodies.
  var createBody = function(bodySpec, fixtureSpecs) {
    var bodyDef = new BodyDef, fixtureDef, body, i, spec;

    bodyDef.type = bodySpec.bodyType || Body.b2_staticBody;
    bodyDef.position.x = bodySpec.x || 0;
    bodyDef.position.y = bodySpec.y || 0;
    bodyDef.angularDamping = bodySpec.angularDamping || 0;

    body = world.CreateBody(bodyDef);

    fixtureDef = new FixtureDef;
    for (i in fixtureSpecs) {

      spec                   = fixtureSpecs[i];
      fixtureDef.density     = spec.density || 1;
      fixtureDef.friction    = spec.friction || 1.0;
      fixtureDef.restitution = spec.restitution || 0.0;
      fixtureDef.shape       = spec.shape;


      // if (bodyDef.type === b2.Body.b2_dynamicBody) {
      //   fixtureDef.filter.categoryBits = 0x0002;
      //   fixtureDef.filter.maskBits     = 0x0001;
      // }
      body.CreateFixture(fixtureDef);
    }
    return body;
  };

  var createDynamicBody = function(bodySpec, fixtureSpecs) {
    // FIXME: Must be better way of copying object
    var bs = { bodyType:       Body.b2_dynamicBody,
               x:              bodySpec.x,
               y:              bodySpec.y,
               angularDamping: bodySpec.anglularDamping };

    return createBody(bs, fixtureSpecs);
  };
  
  /*
   * Creates a half pipe of @width@ and @height@, using @n@ vectors to create the
   * semicircular "bowl"
   */
  var createHalfPipe = function(x,y, w, h, n) {
    var shape,
        edgeWidth = w*0.005,
        bowlShapes = [], points, i, a, b;

        a = w/2;
        b = h - edgeWidth*w;

        // x^2/a^2 + y^2/b^2 = 1 -- ellipse
        // y^2 = (1 - x^2/a^2)*b^2

        var l = edgeWidth*w, r = (1-edgeWidth)*w, w_ = a*2, px,py, x_, y_;

        px = -a;
        py = 0;

        for (i=0; i < n; i++) {
          shape = new PolygonShape;
          x_ = (i+1)/n*w_ - w_/2;
          y_ = Math.sqrt(b*b*(1 - x_*x_/(a*a)));
          // points must be in clock-wise order.
          points = [ new Vec2(w_/2+px,py),
                     new Vec2(w_/2+x_,y_),
                     new Vec2(w_/2+x_,h),
                     new Vec2(w_/2+px,h)
                   ];

          shape.SetAsArray(points,points.length);
          px = x_;
          py = y_;

          bowlShapes.push({ density: 1.0,
                            friction: 1.0,
                            restitution: 0.0,
                            shape: shape });
        }

  //   shape.SetAsArray(points, points.length);
    return createBody({ bodyType: Body.b2_staticBody, x: x, y: y }, bowlShapes);

  };

  var mag =  function(pt) {
    return Math.sqrt(pt.x*pt.x + pt.y*pt.y);
  };

  //
  // Returns true if @pt@ is within distance @d@ of @pt_@
  //
  var nearPoint= function(pt,pt_,d) {
    var x = pt.x - pt_.x,
        y = pt.y - pt_.y;

    return (Math.sqrt(x*x + y*y) <= d);
  };

  return({
    world:             world,
    Vec2:              Vec2,
    AABB:              AABB,
    BodyDef:           BodyDef,
    Body:              Body,
    FixtureDef:        FixtureDef,
    Fixture:           Fixture,
    World:             World,
    PolygonShape:      PolygonShape,
    CircleShape:       CircleShape,
    EdgeChainDef:      EdgeChainDef,
    DebugDraw:         DebugDraw,
    RevoluteJointDef:  RevoluteJointDef,
    createBody:        createBody,
    createDynamicBody: createDynamicBody,
    createHalfPipe:    createHalfPipe,
    mag:               mag,
    nearPoint:         nearPoint
  });
};