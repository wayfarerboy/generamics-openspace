var VerletPhysics2D = toxi.physics2d.VerletPhysics2D,
    VerletParticle2D = toxi.physics2d.VerletParticle2D,
    ParticleString2D = toxi.physics2d.ParticleString2D,
    GravityBehavior = toxi.physics2d.behaviors.GravityBehavior,
    AttractionBehavior = toxi.physics2d.behaviors.GravityBehavior,
    Rect = toxi.geom.Rect,
    Vec2D = toxi.geom.Vec2D,
    Circle = toxi.geom.Circle;

import toxi.physics2d.constraints.*;
import toxi.physics2d.behaviors.*;
import toxi.physics2d.*;
import toxi.geom.*;

int choice, sWidth;
float curScale, scaleFilter, margin, particleSize;
boolean MOUSEDOWN;
VerletPhysics2D physics;
AttractionBehavior centreAttractor;
Vec2D centre;
Rect choiceRect;
ArrayList spaces;

void setup() {
  size(200,200);
  particleSize = 50;
  scaleFilter = 0.9;
  curScale = 1.0;
  margin = 10;
  sWidth = 2;
  choice = -1;
  MOUSEDOWN = true;
  physics = new VerletPhysics2D();
  physics.setDrag(1);
  physics.addBehavior(new GravityBehavior(new Vec2D(0,0)));
  centre = new Vec2D(width * 0.5, height * 0.5);
  centreAttractor = new AttractionBehavior(new Vec2D(0,0), particleSize * 5, 0.05);
  spaces = new ArrayList();
}

void draw() {
  background(0); 
  if (spaces.size() > 0) {
    physics.update();

    Rect area = new Rect(new Vec2D(0,0), new Vec2D(0,0));
    for (int i = 0; i < spaces.size(); i += 1) {
      SpaceObj _s = spaces.get(i);
      Rect _area = _s.GetArea();
      area.union(_area);
    }

    // Get scale and transform details
    float _scale = min(width / (area.width * 2), height / (area.height * 2));
    curScale = scaleFilter * curScale + (1.0 - scaleFilter) * _scale;
    Vec2D _mouse = new Vec2D(mouseX, mouseY);

    int _count = 0;
    choice = -1;
    for (int i = 0; i < spaces.size(); i += 1) {
      SpaceObj _s = spaces.get(i);
      boolean _HOVER = _s.Update(curScale, _mouse);
      if (_HOVER && choice == -1) {
        choice = _count;
      }
      _count += 1;
    }
    
    if (choice > -1) {
      if (mousePressed && !MOUSEDOWN) {
        MOUSEDOWN = true;
        // SpaceObj _s =  spaces.get(choice);
        // _s.Kill();
        // spaces.remove(choice);
      }
    }
  }
  if (mousePressed && !MOUSEDOWN) {
    MOUSEDOWN = true;
    spaces.add(new SpaceObj(physics, centre, centreAttractor, margin, particleSize, false));
    SpaceObj _s = spaces.get(0);
  } else if (!mousePressed && MOUSEDOWN) {
    MOUSEDOWN = false;
  }
}

void resizeCanvas(int _width, int _height) {
  size(_width, _height);
  centre = new Vec2D(_width * 0.5, _height * 0.5);
}

class SpaceObj {
  VerletPhysics2D physics, questionPhysics;
  VerletParticle2D p;
  AttractionBehavior behaviour, centreAttr, questionCentre;
  Vec2D centre;
  ArrayList posts;
  float spaceSize, questionSize, margin, spaceScale, scaleStep, curScale, opacity;
  color selected, unselected;
  boolean MOUSEDOWN, POST, DEAD;
  
  SpaceObj(VerletPhysics2D _p, Vec2D _c, AttractionBehavior _cA, float _m, float _s, boolean _q) {
    physics = _p;
    margin = _m;
    centre = _c;
    centreAttr = _cA;
    spaceSize = _s;
    posts = new ArrayList();
    POST = _q;
    MOUSEDOWN = true;
    DEAD = false;
    selected = color(255);
    unselected = color(255);
    opacity = 1.0;
    Vec2D _rndLoc = Vec2D.randomVector().scale(spaceSize*0.5);
    _rndLoc = Vec2D.randomVector();
    p = new VerletParticle2D(_rndLoc);
    p.addBehavior(centreAttr);
    physics.addParticle(p);
    //physics.addBehavior(new AttractionBehavior(p, spaceSize + 2, -1.2, 0.01));
    physics.addBehavior(new AttractionBehavior(p, 1.0, -1.2));
    if (!POST) {
      posts = new ArrayList();
      questionPhysics = new VerletPhysics2D();
      questionPhysics.setDrag(0.05);
      questionPhysics.addBehavior(new GravityBehavior(new Vec2D(0,0)));
    } else {
      spaceScale = 2.0;
      scaleStep = 1.0 / (10 * 25) * -1.0;
      curScale = 1.0;
    }
  }
  
  boolean Update(float _scale, Vec2D _mouse) {
    Vec2D _p = p.scale(_scale).add(centre);
    float _rad = spaceSize * _scale;
    if (POST) {
      curScale = scaleFilter * curScale + (1.0 - scaleFilter) * spaceScale;
      _rad = curScale * _rad;
      opacity = curScale;
      spaceScale += scaleStep;
      if (curScale < 0.0) {
        this.Kill();
      }
    }

    boolean _HOVER = this.IsHover(_mouse, _p, _rad * 0.5);
    if (_HOVER) {
      tint(0.5);
      fill(selected);
    } else {
      tint(opacity);
      fill(unselected);
    }
    ellipse(_p.x, _p.y, _rad, _rad);
    if (_HOVER) {
      if (mousePressed && !MOUSEDOWN) {
        MOUSEDOWN = true;
        if (!POST) {
          this.AddPost();
        }
      } else if (!mousePressed && MOUSEDOWN) {
        MOUSEDOWN = false;
      }
    }
    
    if (!POST) {
      if (posts.size() > 0) {
        questionPhysics.update();

        int _kill = -1;
        int _count = 0;
        for (SpaceObj _post : posts) {
          _post.UpdateCentre(p.scale(_scale).add(centre));
          _post.Update(_scale, _mouse);
          if (_post.DEAD && _kill == -1) {
            _kill = _count;
          }
          _count += 1;
        }
        if (_kill > -1) {
          posts.remove(_kill);
        }
      }
    }
    return _HOVER;
  }

  void AddPost() {
    SpaceObj _q = new SpaceObj(questionPhysics, centre, new AttractionBehavior(new Vec2D(), spaceSize, 0.05, 0.1), spaceSize * 0.2, margin, true);
    posts.add(_q);
  }
  
  void RemovePost(int _choice) {
    SpaceObj _s = questions.get(_choice);
    _s.Kill();
    posts.remove(_choice);
  }
  
  void UpdateCentre(Vec2D _centre) {
    centre = _centre;
  }

  boolean IsHover(Vec2D _mouse, Vec2D _loc, float _rad) {
    Circle _circle = new Circle(_loc.x, _loc.y, _rad);
    return _circle.containsPoint(_mouse); 
  }

  Rect GetArea() {
    float _pSize = spaceSize * 0.5;
    return new Rect(
      (abs(p.x) + _pSize + margin) * -1,
      (abs(p.y) + _pSize + margin) * -1,
      abs(p.x) + _pSize + margin,
      abs(p.y) + _pSize + margin
    );
  }
  
  void Kill() {
    physics.removeParticle(p);
    physics.removeBehavior(behaviour);
    DEAD = true;
  }
}
