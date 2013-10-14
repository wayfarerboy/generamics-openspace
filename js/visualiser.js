osvisuals = (function ($, Drupal, window, document, undefined) {
  var osvisuals = {
    margin: 50,
    w: 0,
    h: 0,
    data: [],
    display: {},
    svg: {},
    zoomSvg: null,
    questions: null,
    posts: null,
    postGroup: null,
    timeline: null,
    force: null,
    tip: null,
    jitter: 0.1,
    postForces: {},
    radius: 12,
    radMinMax: { min: 0, max: 1000 },
    transform: '',
    transformVals: {},
    curData: null,
    timelineData: null,
    zoom: false,
    textSettings: {
      letterWidth: 0,
      letterHeight: 0,
      lineHeight: 1.2,
      fontFamily: 'Helvetica, Free Sans, Arial, sans-serif',
      margin: 1.5,
      curText: '',
      eleSize: 1,
      baseScale: 12
    },

    initTextSettings: function() {
      var testString = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      var textTest = d3.selectAll('body')
        .append('svg:svg')
        .attr({ width: $(window).width(), height: $(window).height() });
      var text = textTest.append('svg:text')
        .text(testString)
        .attr({ id:'d3texttest', x: 0, y: 0})
        .style({'font-size': this.textSettings.baseScale+'px'});
      var ele = text[0][0].getBBox();
      this.textSettings.letterWidth = ele.width / testString.length;
      this.textSettings.letterHeight = ele.height;
      textTest.remove();
      this.textSettings.eleSize = this.radius * 2 + this.textSettings.letterWidth * this.textSettings.margin;
    },

    createLabel: function(data, attr) {
      var self = osvisuals;
      var settings = self.textSettings;
      var w = self.radius * 2;
      var val = null;
      switch(attr) {
        case 'hashtag':
          val = '#'+data.hashtag;
          break;
        case 'tagSize': 
          val = settings.eleSize / ((data.hashtag.length+1) * settings.letterWidth) * settings.baseScale;
          break;
        case 'textCol':
          val = data.textColour;
          break;
        case 'tagY':
          val = settings.eleSize / ((data.hashtag.length+1) * settings.letterWidth) * settings.baseScale * 0.2;
          break;
      }
      return val;
    },
        
    loadData: function(osvisuals, url) {
      d3.json(url, osvisuals.initData);
    },
    
    initData: function(e, data) {
      var self = osvisuals;
      self.data = data;
      self.curData = self.data.activeQuestions;
      self.initSize()
          .initForce()
          .initDisplay()
          .initTips()
          .initQuestions()
          .initTimeline()
          .finishInit();
      //self.selectQuestion({value:18278});
    },

    updateData: function(data, timestamp) {
      var self = osvisuals;
      self.data = osdata.getD3Array(timestamp);
    },
    
    initSize: function() {
      var container = $('#dataviz');
      var article = $('article.node-event');
      var off = article.offset();
      if (off != null) {

        article.height($(window).height() - off.top);
        article.width($('header#header').width());

        this.w = article.width();
        this.h = article.height();

        container.width(this.w);
        container.height(this.h);

        this.radius = Math.min(this.w, this.h) - this.margin * 2;
        this.transformVals = {
          x: this.w * 0.5,
          y: this.h * 0.5 - this.margin
        };
        this.transform = 'translate('+this.transformVals.x+','+this.transformVals.y+') ';
        this.margin = this.radius * 2 + 100;
        this.initTextSettings();
      }
      return this;
    },

    initDisplay: function() {
      this.display = {
        posts: d3.select('#dataviz-posts'),
        questions: d3.select('#dataviz-questions')
      };

      this.svg = {
        posts: this.display.posts
          .append('svg:svg')
            .attr({
              'class': 'posts',
              width: this.w,
              height: this.h
            }),
        questions: this.display.questions
          .append('svg:svg')
            .attr({
              'class': 'questions',
              width: this.w,
              height: this.h
            })
          .append('svg:g')
            .attr('id', 'dataviz-scaler')
      };

      this.zoomSvg = this.svg.questions
        .append('svg:g')
          .attr('id', 'dataviz-zoom');
      return this;
    },
    
    initTimeline: function() {
      var self = this;
      var ostb = ostoolbar;
      var taskNames = [];
      for(var i = 0; i < parseInt($('#dataviz').attr('data-spaces')); i++) {
        taskNames.push('space-'+(i+1));
      }
      var gantt = $('#timeline div.gantt');
      this.timeline = d3.gantt()
        .taskTypes(taskNames)
        .tickFormat('')
        .width(gantt.width())
        .height(gantt.height());
      this.timeline(this.data.questions.values());

      $('#timeline .handle').draggable({
          cursor: 'move',
          axis: 'x',
          containment: '#timeline',
          stop: function() {
            var tData = self.initTimelineData();
            if (tData !== null) {
              var cur = ostb.totalActivities - ostb.step;
              var left = parseInt($(this).css('left'));
              var date = tData.tlScale(left);
              console.log(cur, left, date, post);
              var post = osdata.searchPosts(date);
              ostb.totalActivities = post.index;
              ostb.compileActivities('#activity', cur, post.index);
              ostb.scrollToActivity(post.nid);
            }
          }
      });
      return this;
    },

    initTimelineData: function() {
      if (osdata !== null) {
        this.timelineData = {};
        this.timelineData.wrapper = $('#timeline');
        this.timelineData.handle = $('.handle', this.timelineData.wrapper);
        this.timelineData.maxW = this.timelineData.wrapper.innerWidth() - this.timelineData.handle.outerWidth();
        this.timelineData.scale = d3.scale.linear()
            .domain([osdata.timeRange[0], osdata.timeRange[1]])
            .range([0, this.timelineData.maxW]);
        this.timelineData.tlScale = d3.scale.linear()
            .domain([0, this.timelineData.maxW])
            .range([osdata.timeRange[0], osdata.timeRange[1]]);
      }
      return this.timelineData;
    },

    updateTimeline: function(timestamp) {
      var os = osvisuals;
      var tData = os.initTimelineData();
      if (tData !== null) {
        var val = os.timelineData.scale(moment(timestamp, 'X').toDate());
        os.timelineData.handle.css({left: val});
      }
    },

    initForce: function() {
      this.force = d3.layout.force()
        .nodes(this.curData);
      this.force.start();
      return this;
    },
    
    initTips: function() {
      var self = osvisuals;
      this.tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
          var data = self.data.questions.get(d);
          var html = $('#users li.uid-'+data.uid).html();
          return html;
        });
      return this;
    },

    initQuestions: function() {
      var self = this;

      this.questions = this.zoomSvg.selectAll('g.question')
        .data(this.curData, function(d) { return d.value; });

      this.questions.enter()
        .append('svg:g')
        .attr({
          id: function(d) { return 'question-'+d.value; },
          'class': 'question',
          'data-nid': function(d) { return d.value; }
        })
        .each(function(d) {

          var data = self.data.questions.get(d.value);

          d3.select(this).append('svg:circle')
            .attr({ r: 0 })
            .style('fill', data.colour)
          .transition()
            .attr({ r: self.radius });
        
          d3.select(this).append('svg:text')
            .text(self.createLabel(data, 'hashtag'))
            .attr({
              y: self.createLabel(data, 'tagY'),
              'text-anchor': 'middle',
              opacity: 0,
            })
            .style({
              'font-size': self.createLabel(data, 'tagSize')+'px',
              fill: self.createLabel(data, 'textCol'),
              'font-family': self.textSettings.fontFamily
            })
          .transition()
            .attr('opacity', 1);

          d3.select(this).append('svg:circle')
            .attr({ cy: self.radius * 0.6, r: 0, 'opacity': 0.3 })
            .style({
              fill: 'white',
              stroke: 'black',
              'stroke-width': self.radius * 0.02
            })
          .transition()
            .attr({'r': self.radius * 0.25});

          d3.select(this).append('svg:text')
            .text(data.count)
            .attr({
              y: self.radius * 0.7,
              'text-anchor': 'middle',
              opacity: 0
            })
            .style({
              'font-size': (self.radius * 0.25)+'px',
              fill: 'black',
              'font-family': self.textSettings.fontFamily,
              'font-weight': 'bold'
            })
          .transition()
            .attr('opacity', 0.5);

          d3.select(this).append('svg:circle')
            .attr({
              r: 0,
              fill: 'transparent',
              stroke: 'white',
              'stroke-width': 50,
              opacity: 0,
              'class': 'question-hover'
            })
            .on('click', self.selectQuestion)
          .transition()
            .attr('r', self.radius);
        });

      this.questions.exit()
        .transition()
          .attr({
            opacity: 0,
            transform: 'scale(0)'
          });
          
      return this;
    },
    
    selectQuestion: function(e) {
      var self = osvisuals;
      if (self.zoom) {
        self.questions.attr('class', 'question');
        self.zoom = false;
        self.zoomSvg
          .transition()
          .attr({
            'class': '',
            transform: 'translate(0,0) scale(1)'
          });
        self.force.resume();
        $('#dataviz-questions').fadeIn(1000);
        $('#dataviz-posts').fadeOut(function() {
          self.posts = null;
          $(this).empty();
        }, 1000);
      } else {
        var data = self.data.activePosts[e.value];
        if (data) {
          self.force.stop();
          self.posts = new self.postGroup(self, self.data.activePosts[e.value]);
          self.zoom = true;
          var qObj = $('#question-'+e.value+' > circle');
          d3.select('#question-'+e.value).attr('class', 'question active');
          var ele1 = qObj[0].getBBox();
          var origScale = parseFloat($('#dataviz-scaler').attr('data-scale'));
          var ele2 = $('#dataviz-scaler')[0];
          var scale = self.h / (ele1.width * origScale);
          var x = ele1.x * origScale * -scale;
          var y = ele1.y * origScale * -scale;
          $('#dataviz-questions').fadeOut(1000);
          $('#dataviz-posts').fadeIn(1000);
          self.zoomSvg
            .transition()
            .duration(1000)
            .attr({
              transform: 'translate('+x+','+y+') scale('+scale+')'
            });
        }
      }
    },

    finishInit: function() {
      this.force.on('tick', this.tickQuestionsAlt);
      return this;
    },
    
    tickQuestionsAlt: function(e) {
      var self = osvisuals;
      var dampenedAlpha = e.alpha * 0.1;
      if (!self.zoom) {
        self.questions
          .each(self.gravity(dampenedAlpha))
          .each(self.collideAlt(self.data.activeQuestions, self.jitter));
      }
      self.questions
        .attr({ transform: function(d) { if (d) return 'translate('+(d.x)+','+(d.y)+')'; }
        });
      self.scaleGroup(self.w, self.h, self.margin);
    },

    gravity: function(alpha) {
      var self = osvisuals;
      var cx = self.w / 2,
          cy = self.h / 2,
          ax = alpha / 8,
          ay = alpha;
      return function(d) {
        d.x += (cx - d.x) * ax;
        d.y += (cy - d.y) * ay;
      };
    },

    collideAlt: function(data, jitter) {
      var self = osvisuals;
      return function(d) {
        data.forEach(function(v, k) {
          if (d != v) {
            var x = d.x - v.x,
                y = d.y - v.y,
                distance = Math.sqrt(x * x + y * y),
                minDistance = self.radius + self.radius + 12;
            if (distance < minDistance) {
              distance = (distance - minDistance) / distance * jitter;
              var moveX = x * distance,
                  moveY = y * distance;
              d.x -= moveX;
              d.y -= moveY;
              v.x += moveX;
              v.y += moveY;
            }
          }
        });
      };
    },

    scaleGroup: function(w, h, margin) {
      if (!this.zoom) {
        var wMinMax = d3.extent(this.curData, function(d) { return d.x; }),
            hMinMax = d3.extent(this.curData, function(d) { return d.y; }),
            newW = (wMinMax[1] - wMinMax[0]) + margin,
            newH = (hMinMax[1] - hMinMax[0]) + margin * 1.5,
            s = 1;
        if (newW > w || newH > h) {
          s = Math.min(w / newW, (h - margin) / newH);
        } else {
          s = Math.max(w - (margin * 2) / newW, (h - margin) / newH);
        }
        if (!s) {
          s = 1;
        } else {
          s = Math.abs(s);
        }
        this.svg.questions.attr({
          transform: this.transform+' scale('+s+')',
          'data-scale': s
        });
      }
    },

    postGroup: function(self, data) {
      var nodes = d3.map(data).entries(),
          links = [],
          link = null,
          node = null,
          jitter = 0.1,
          darkenScaler = 3,
          fontSize = 0.15,
          scale = d3.scale.linear()
            .domain([nodes.length-1, 0]);

      var getRadius = function() {
        var radius = self.radius / nodes.length * 0.75;
        return radius;
      };

      var formatText = function(text) {
        text = text.split(' ');
        var textTest = d3.select('body').append('svg:svg').append('svg:g');
            radius = getRadius() - 40,
            fSize = radius * fontSize,
            line = [],
            finalText = [],
            rect = null,
            testSvg = null,
            testLine = null;

        text.forEach(function(v, k) {
          if (k > 0) {
            line.push(v);
            testSvg = textTest.append('svg:text').text(line.join(' '))
              .attr({ x: 0, y: 0})
              .style({'font-size': fSize+'px' });
            rect = textTest[0][0].getBBox();
            if (rect.width > radius) {
              finalText.push(line.join(' '));
              line = [];
            }
            testSvg.remove();
          } else {
            line.push(v);
          }
          if (k + 1 === text.length && line.length > 0) {
            finalText.push(line.join(' '));
          }
        });
        textTest.remove();
        return finalText;
      };

      nodes.forEach(function(v, k) {
        if (k > 0) {
          links.push({ source: k-1, target: k });
        }
        nodes[k].scale = (1 - scale(k)) * 0.5 + 0.5;
        var postInfo = self.data.posts.get(v.value);
        nodes[k].text = formatText(postInfo.text);
      });

      var tickPosts = function(e) {
        var dampenedAlpha = e.alpha;
        node
          .each(gravity(dampenedAlpha))
          .each(collideAlt(nodes, jitter));
        /*link.attr({*/
        /*x1: function(d) { return d.source.x; },*/
        /*y1: function(d) { return d.source.y; },*/
        /*x2: function(d) { return d.target.x; },*/
        /*y2: function(d) { return d.target.y; }*/
        /*});*/
        node.attr({
          transform: function(d) { return 'translate('+d.x+','+d.y+') scale('+d.scale+')'; }
        });
      };
      
      var gravity = function(alpha) {
        var self = osvisuals;
        var cx = self.w / 2,
            cy = self.h / 2,
            ax = alpha / 8,
            ay = alpha;
        return function(d) {
          d.x += (cx - d.x) * ax;
          d.y += (cy - d.y) * ay;
        };
      };

      var collideAlt = function(data, jitter) {
        var self = osvisuals;
        var r = 1;
        return function(d) {
          data.forEach(function(v, k) {
            r = getRadius() * d.scale;
            if (d != v) {
              var x = d.x - v.x,
                  y = d.y - v.y,
                  distance = Math.sqrt(x * x + y * y),
                  minDistance = r + r + 12;
              if (distance < minDistance) {
                distance = (distance - minDistance) / distance * jitter;
                var moveX = x * distance,
                    moveY = y * distance;
                d.x -= moveX;
                d.y -= moveY;
                v.x += moveX;
                v.y += moveY;
              }
            }
          });
        };
      };

      var createLabel = function(d, data, attr) {
        var settings = self.textSettings;
        var question = self.data.questions.get(data.qid);
        var val = null;
        switch(attr) {
          case 'fontSize': 
            val = settings.eleSize / (data.hashtag.length * settings.letterWidth) * settings.baseScale;
            break;
          case 'textCol':
            val = question.textColour;
            break;
          case 'fill':
            var rgb = d3.rgb(question.colour);
            val = rgb.darker(scale(d.index)*darkenScaler).toString();
            break;
          case 'quoteCol':
            var rgb = d3.scale.linear()
              .domain([nodes.length-1, 0])
              .range([d3.rgb('white'), d3.rgb(question.colour)]);
            val = rgb(d.index).toString();
            break;
        }
        return val;
      };

      var force = d3.layout.force()
        .size([self.w, self.h])
        .linkDistance(10)
        .on('tick', tickPosts);
      
      link = self.svg.posts.selectAll('.link');
      node = self.svg.posts.selectAll('.node');
      
      force
        .nodes(nodes)
        .links(links)
        .start();
      
      /*link = link.data(links)
        .enter()
        .append('line')
          .attr('class', 'link')
          .style('stroke', function(d) {
            var col = d3.rgb('white');
            var rgb = col.darker(scale(d)*darkenScaler);
            return rgb.toString();
          });
      */
      node = node.data(nodes, function(d) { return d.value; })
        .enter()
        .append('g')
          .attr({ 'class': 'node' })
        .each(function(d) {
          var data = self.data.posts.get(d.value);
          var radius = getRadius();
          var quoteCol = createLabel(d, data, 'quoteCol');
          var quoteSize = radius * 2;
          var quoteTextSize = radius * fontSize;

          d3.select(this).append('circle')
            .attr('r', radius)
            .style('fill', createLabel(d, data, 'fill'));

          d3.select(this).append('svg:text')
            .text('“')
            .attr({
              x: radius * -0.75,
              y: radius * 0.85,
              'opacity': 0.3,
              'text-anchor': 'middle'
            })
            .style({
              'font-size': quoteSize+'px',
              fill: quoteCol,
              'font-family': self.textSettings.fontFamily
            });

          d3.select(this).append('svg:text')
            .text('”')
            .attr({
              x: radius * 0.75,
              y: radius * 1.6,
              'opacity': 0.3,
              'text-anchor': 'middle'
            })
            .style({
              'font-size': quoteSize+'px',
              fill: quoteCol,
              'font-family': self.textSettings.fontFamily
            });
          d3.select(this).append('svg:image')
            .attr({
              'xlink:href': $('#users li.uid-'+data.uid+' div.full img').attr('src'),
              y: radius * 0.65,
              x: radius * -0.15,
              width: radius * 0.25,
              height: radius * 0.25,
              opacity: (1 - scale(d.index)) * 0.6 + 0.4
            });
              
          d3.select(this).append('svg:text')
            .attr({
              dy: d.text.length * -0.4 * quoteTextSize,
              'text-anchor': 'middle'
            })
            .style({
              'font-size': quoteTextSize+'px',
              fill: createLabel(d, data, 'textCol'),
              'font-family': self.textSettings.fontFamily
            })
            .each(function(d) {
              var el = d3.select(this);
              var lines = d.text;
              lines.forEach(function(v, k) {
                var tspan = el.append('svg:tspan').text(v);
                if (k > 0) {
                  tspan.attr({x:0,dy:quoteTextSize});
                }
              });
            });

        });
    }
  };

  return osvisuals;
})(jQuery, Drupal, this, this.document);

