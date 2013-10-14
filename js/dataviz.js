/*
 * All functions for the Event Discussion view page
 */

(function ($, Drupal, window, document, undefined) {
  $(document).ready(function() {
    var OSEvent = {
      isOSEvent: true,
      margin: 50,
      questions: [],
      article: null,
      svg: null,
      svgGroup: null,
      circles: null,
      posts: null,
      force: null,
      postForce: null,
      gantt: null,
      rad: 0,
      w: 0,
      h: 0,
      centre: [],
      ratio: 1,
      transform: '',
      nid: null,
      spaces: null,
      data: {
        timeline: [],
        posts: [],
        questions: []
      },

      tick: function(e) {
        var q = d3.geom.quadtree(this.questions),
            i = 0,
            n = this.data.questions.length,
            w = this.w,
            h = this.h - 100;

        while (++i < n) {
          q.visit(collide(this.data.questions[i]));
        }

        var wMinMax = d3.extent(this.data.questions, function(d, i) { if (i == 0) return d.x; }),
            hMinMax = d3.extent(this.data.questions, function(d) { return d.y; }),
            newW = (wMinMax[1] - wMinMax[0]) + this.margin,
            newH = (hMinMax[1] - hMinMax[0]) + this.margin;

        if (newW > w || newH > h) {
          s = Math.min(w / newW, h / newH);
        } else {
          s = Math.max(w - 100 / newW, h / newH);
        }
        if (!s) s = 1;
         
        this.svgGroup
          .attr('transform', this.transform + ' scale('+s+')')
          .attr('data-scale', s);

        this.circles
          .attr('cx', function(d) { return d.x; })
          .attr('cy', function(d) { return d.y; })
          .attr('r', function(d) { return d.radius; });
      },

      initD3: function(dataviz, article, hashtags) {
        this.article = article;
        this.svg = d3.select(dataviz).append('svg:svg'),
        this.svgGroup = this.svg.append('svg:g');
        this.resizeEvent();
        this.nid = $(dataviz).attr('data-nid');
        this.spaces = $(dataviz).attr('data-spaces');
        this.initEvent(hashtags);
        this.initTimeline('.timeline');
      },

      initCircles: function() {
        this.circles = this.svgGroup.selectAll('circle')
            .data(this.data.questions);
        this.circles.enter().append('svg:circle')
            .attr({
              'data-nid': function(d) { return d.nid; },
              r: function(d) { return d.radius; },
              cx: Math.random() * this.w,
              cy: Math.random() * this.h
            })
            .style({
              fill: function(d) { return d.colourFill; },
              opacity: 0
            })
            .transition()
            .style('opacity', 1);
        this.circles.exit()
            .transition()
            .attr('r', 0)
            .remove();
      },

      initPosts: function(i) {
        var circleData = this.data.questions[i];
        this.posts[i] = this.qGroup[i].selectAll('circle')
                        .data(this.data.posts[i]);
        posts.enter().append('svg:circle')
             .attr({
               'data-nid': function(d) { return d.nid; },
               r: function(d) { return this.radius; },
               cx: Math.random() * (circleData.radius * 2) + circleData.x,
               cy: Math.random() * (circleData.radius * 2) + circleData.y
             })
             .style({
               fill: 'white',
               opacity: 0
             })
             .transition()
             .style('opacity', 1);
        posts.exit()
             .transition()
             .attr('r', 0)
             .remove();
      },

      sizeSVG: function(w, h) {
        this.svg
            .attr('width', w)
            .attr('height', h);
      },

      parseQuestions: function(d, hashtags) {
        if (typeof d != 'undefined') {
          $.each(d, function(k, v) {
            v.radius = OSEvent.rad;
            d[k] = v;
          });
          this.data.questions = d;
          this.data.questions = $(hashtags).updateHashtags(this);
          this.force = d3.layout.force().nodes(this.data.questions);
          this.force.start();
          this.initCircles();
          this.force.on('tick', function(e) { OSEvent.tick(e); });
        } else if (typeof d == 'undefined') {
          console.error('Questions data not loaded.');
        }
      },

      parsePosts: function(d) {
        if (typeof d != 'undefined') {
          $.each(d, function(k, v) {
            v.radius = (k+1) / 10 * OSEvent.rad;
            d[k] = v;
          });
          for (var i = 0; i < this.data.questions.length; i++) {
            INIT = typeof this.data.posts[i] == 'undefined';
            if (INIT) {
              this.data.posts[i] = d;
              this.postForce[i] = d3.layout.force().nodes(this.data.posts[i]);
              this.postForce[i].start();
            }
            this.initPosts(i);
            if (INIT) {
              this.postForce.on('tick', function(e) { OSEvent.postTick(e); });
            }
          }
        } else if (typeof d == 'undefined') {
          console.error('Posts data not loaded.');
        }
      },

      parseHistory: function(d) {
        if (typeof d != 'undefined') {
          this.data.history = d;
        } else {
          console.error('Overview not loaded');
        }
      },

      resizeEvent: function() {
        var off = $(this.article).offset();
        if (off != null) {
          $(this.article).height($(window).height() - off.top);
          this.w = $(this.article).width();
          this.h = $(this.article).height();
          this.centre = [ this.w * 0.5, this.h * 0.5 ];
          this.ratio = this.w / this.h;
          this.transform = 'translate('+(this.w*0.5)+','+(this.h*0.5)+') ';
          this.rad = Math.min(this.w, this.h) - this.margin * 2;
          this.margin = this.rad * 2 + 100;
          this.sizeSVG(this.w, this.h);
        }
      },

      initEvent: function(hashtags) {
        d3.json('/events/'+this.nid+'/json/questions', function(error, json) {
          OSEvent.parseQuestions(json, hashtags);
        });
        d3.json('/events/'+this.nid+'/json/overview', function(error, json) {
          OSEvent.parsePosts(json);
        });
      },

      initTimeline: function(timeline) {
        d3.json('/events/'+this.nid+'/json/question-activity', function(error, json) {
          OSEvent.constructTimeline(timeline, json);
        });
        $('#timeline .handle').draggable({
            cursor: 'move',
            axis: 'x',
            containment: '#timeline',
            start: function() { },
            drag: function() { },
            stop: function() { }
        });
      },

      constructTimeline: function(timeline, data) {
        var taskNames = [];
        for(var i = 0; i < this.spaces; i++) {
          taskNames.push('space-'+(i+1));
        }
        $.each(data, function(key, value) {
          value['startDate'] = moment(value['startDate']).toDate();
          value['endDate'] = moment(value['endDate']).toDate();
          OSEvent.data.timeline.push(value);
        });
        this.gantt = d3.gantt()
          .taskTypes(taskNames)
          .tickFormat('')
          .width($('#timeline div.gantt').width())
          .height($('#timeline div.gantt').height());
        this.gantt(this.data.timeline);
      }

    };

    $('#dataviz').each(function() {
      OSEvent.initD3(this, 'article.node-event', '#block-views-question-sequence-hashtags');
      $(window).resize(OSEvent.resizeEvent);

      $('#toolbox a').toggleToolbox();

      $('#block-views-question-sequence-hashtags').each(function() {
        var hashtags = $(this);
        var svg = $('#dataviz svg g');
        var tooltip = $('<div>').attr('id', 'tooltip').css({opacity:0}).appendTo($('body'));
        tooltip.click(function() {
          tooltip.animate({opacity: 0}, function() {
            tooltip
              .empty()
              .removeClass('active');
          });
        });
        $('a.hashtag-link', this).each(function(i) {
          var link = $(this);
          var nid = $(this).attr('data-nid');
          $(this).click(function(e) {
            e.preventDefault();
          });
          $('span.question-link', this).each(function() {
            $(this).click(function(e) {
              link.toggleClass('inactive');
              OSEvent.circles.data(hashtags.updateQuestions(OSEvent));
              OSEvent.force.start();
            });
          });
          $('span.info-link', this).each(function() {
            $(this).click(function(e) {
              tooltip
                .animate({opacity: 0}, tooltip.hasClass('active') ? 500 : 0, function() {
                  var circle = $('#dataviz circle[data-nid="'+nid+'"]');
                  var pos = circle.offset();
                  var rad = circle.attr('r') * svg.attr('data-scale');
                  tooltip
                    .css({
                      left: pos.left + rad * 0.5,
                      top: pos.top + rad * 0.5
                    })
                    .html($('#block-views-4cd68a34909f8d66317d44617e82e1db li.q'+nid).html())
                    .addClass('active')
                    .animate({opacity: 1});
                });
            }); 
          });
        });
      });
    });
  });

  $.fn.updateQuestions = function(OSEvent) {
    var self = $(this);
    var nids = [];
    self.find('a.inactive,a.status-8,a.status-5').each(function() {
      nids.push($(this).attr('data-nid'));
    });
    return CompileNewQuestions(OSEvent, nids);
  }

  $.fn.updateHashtags = function(OSEvent) {
    var self = $(this);
    var nids = [];
    self.find('a').each(function() {
      // If question is not active or concluding
      if ($(this).hasClass('status-5') || $(this).hasClass('status-8')) {
        nids.push($(this).attr('data-nid'));
        $(this).slideUp(0);
      } else {
        $(this).slideDown(0);
      }
    });
    return CompileNewQuestions(OSEvent, nids);
  };

  function CompileNewQuestions(OSEvent, nids) {
    var newQs = [];
    OSEvent.questions.forEach(function(d) {
      if (nids.indexOf(d.nid) > -1) {
        d.radius = 0;
      } else {
        d.radius = OSEvent.rad;
      }
      newQs.push(d);
    });
    return newQs;
  }

  /*
   * Toggle function to show/hide toolboxes
   */
  $.fn.toggleToolbox = function() {
    $(this).each(function() {
      var ids = $(this).attr('data-target').split(' ');
      $.each(ids, function(key, val) {
        var item = $('#'+val);
        item.children('.view').niceScroll({
          cursorcolor: '#666666',
          cursorborder: 'none',
          zindex: 9999,
          cursoropacitymin: 0.5,
          autohidemode: false
        });
      });
      $(this).click(function() {
        $.each(ids, function(key, val) {
          var item = $('#'+val);
          if (val.indexOf('.') > -1) {
            item = $(val);
          }
          item.toggleClass('active active-block');
          if (item.hasClass('active active-block')) {
            item.css('z-index', $('.active.active-block').length+2);
            setTimeout(function() {
              item.children('.view').getNiceScroll().resize();
            }, 500);
          } else {
            item.children('.view').getNiceScroll().hide();
            setTimeout(function() {
              item.css('z-index', '');
            }, 500);
          }
        });
        $(this).toggleClass('active active-block');
      });
    });
  };

  /*
   * Collide function for dataviz circles
   */
  function collide(node) {
    var r = node.radius + 16,
        nx1 = node.x - r,
        nx2 = node.x + r,
        ny1 = node.y - r,
        ny2 = node.y + r;
    return function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== node)) {
        var x = node.x - quad.point.x,
            y = node.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            r = node.radius + quad.point.radius;
        if (l < r) {
          l = (l - r) / l * .5;
          node.x -= x *= l;
          node.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return x1 > nx2
          || x2 < nx1
          || y1 > ny2
          || y2 < ny1;
    };
  }

})(jQuery, Drupal, this, this.document);
