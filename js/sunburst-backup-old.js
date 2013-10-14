ossunburst = (function ($, Drupal, window, document, undefined) {
  
  var ossunburst = {
    w: 0,
    h: 0,
    r: 0,
    margin: 0,
    eid: 0,
    slideDur: 500,
    charDelay: 30,
    x: null,
    y: null,
    svg: null,
    partition: null,
    arc: null,
    nodes: null,
    timeline: null,
    colours: d3.scale.category20(),
    dataviz: null,
    timer: null,
    url: '',
    css: null,
    offset: {top:0,left:0},

    initSize: function() {
      var os = ossunburst;
      os.article = $('article.node-event');
      var off = os.article.offset();
      if (off != null) {

        os.article.css({
          minHeight: $(window).height() - off.top,
          width: $('header#header').width(),
          position: 'fixed',
          left: off.left,
          top: off.top
        });
        var ht = $('#hashtags').after($('<div>').addClass('clearfix'));
        this.hashtags = $('ul', ht);
        this.margin = parseInt($('#content').css('padding-left'));
        this.w = os.article.width() - this.hashtags.width() * 0.25- this.margin * 2;
        this.h = os.article.height() - this.margin * 2;
        this.offset.left = this.hashtags.width() * 0.5;
        this.dataviz.css({
          width: this.w,
          height: this.h,
          marginLeft: this.offset.left
        });
        this.hashtags
          .find('li')
          .each(function() {
            var self = $(this);
            // Append the data attributes to parent jQuery data object
            os.setActivityData(self, 'questions');
            // Set click to child i tag instead of a tag
            self
              .children('a').click(function(e) { e.preventDefault(); })
              .children('i.twitter').click(function(e) { window.location = $(this).parent().attr('href'); });
            // Set a click action for the hashtag
            os.clickHashtag(self); 
          });
        this.r = Math.min(this.w, this.h) / 2;
        this.x = d3.scale.linear()
          .range([0, 2 * Math.PI]);
        this.y = d3.scale.sqrt()
          .range([0, this.r]);
      }
      return this;
    },

    clickHashtag: function(wrapper) {
      var os = ossunburst;
      var self = wrapper;
      var hashtag = $('span.hashtag', wrapper);
      var data = $('div.activity-data.data', self);
      hashtag.click(function(e) {
        if (!$('body').hasClass('animating')) {
          $('body').addClass('animating');
          if (!self.hasClass('expanded')) {
            self
              .find('span.hashtag i.expand')
              .addClass('icon-rotate-90')
              .end()
              .siblings('li.active')
              .each(function(i) {
                var item = $(this);
                setTimeout(function() {
                  item.removeClass('active');
                }, 100 * i);
              })
              .end()
              .each(function() {
                var ol = $('ol', this);
                var off = ol.position();
                setTimeout(function() {
                  $(this).css({
                    minHeight: ol.height() + off.top
                  });
                }, 500);
              }); 
              .addClass('expanded')
              .find('> a > i.twitter')
              .unbind('click')
              .removeClass('icon-twitter')
              .addClass('icon-spinner icon-spin')
              .css('color', 'white');
            os.click(os.nodes.filter(self.data('node'))[0][0].__data__);
            os.getActivity(self, data, true);
          } else {
            self
              .find('span.hashtag i.expand')
              .removeClass('icon-rotate-90')
              .end()
              .siblings('li.active')
              .slideDown(os.slideDur);
            data.slideUp(os.slideDur, function() {
              self.removeClass('expanded')
            });
            os.click(os.nodes.filter(self.data('node'))[0][0].__data__.parent);
            os.click(os.nodes.filter(self.data('node'))[0][0].__data__.parent);
          }
        }
      });
    },

    setActivityData: function(item, type) {
      var os = ossunburst;
      var self = $(item);
      var data = self.children('div.data').slideUp(0);
      var label = $('#'+type+' li.'+data.attr('data-node'));
      self
        .data({
          node: '.'+data.attr('data-node'),
          url: data.attr('data-url'),
          page: 0
        })
        .hover(function() {
          os.markSelected(1, os.nodes.filter(self.data('node')), label, self);
        }, function() {
          os.markSelected(0, os.nodes.filter(self.data('node')), label, self);
        });
    },

    getActivity: function(activities, wrapper, init) {
      var os = ossunburst,
          more = true,
          off = null;

      if (init && $('li', wrapper).length > 0) {
        // Reset spinner and twitter icons and replace click bindings
        os.focusHashtag(activities);

        // Scroll page up to top of body if the hashtag has opened this list
        if (init) {
          $('body').scrollTop(0);
        }

        wrapper.slideDown(os.slideDur);
        os.click(os.nodes.filter(activities.data('node'))[0][0].__data__);
      } else {

        var wrapList = $('ol', wrapper);
        if (wrapList.length === 0) {
          wrapList = $('<ol>').appendTo(wrapper);
        } else {
          init = false;
        }

        // Append items to a temporary wrapper
        tempWrap = $('<div>');
        tempWrap.load(activities.data('url'), {
          data: { page: activities.data('page') }
        }, function() {

          // Add question title if not done before
          if (init) {
            tempWrap.find('h2').insertBefore(wrapList);
            tempWrap.find('a.play-all')
              .insertBefore(wrapList)
              .click(function(e) {
                if (!wrapper.hasClass('playing')) {
                  e.preventDefault();
                  $('span.caption', this).text(' Stop');
                  os.play(wrapper);
                } else {
                  $('span.caption', this).text(' Play all');
                  os.stop(wrapper);
                }
              });
          }

          // Append new list items and match user to segment in dataviz
          var items = $('li.post', tempWrap);
          wrapList.append(items);
          $('li.post', wrapList)
            .each(function() {
              os.setActivityData(this, 'users');
              var item = $(this);
              $('a.play', this).click(function(e) {
                e.preventDefault();
                os.play(wrapper, item.index());
              });
            });

          // Set auto increment timer for all posted dates
          os.setMoment(wrapList);

          // Reset spinner and twitter icons and replace click bindings
          os.focusHashtag(activities);

          // Scroll page up to top of body if the hashtag has opened this list
          if (init) {
            $('body').scrollTop(0);
          }

          // Slide down wrapper to reveal new posts
          wrapper.slideDown(os.slideDur);
        });
      }
    },

    play: function(wrapper, index) {
      var os = ossunburst;
      var items = wrapper.find('li.post');
      if (typeof index === 'undefined') {
        index = items.length - 1;
      }
      if (index > 0 && !wrapper.hasClass('playing')) {
        wrapper.addClass('playing');
        $('a.play-all i', wrapper)
          .removeClass('icon-play')
          .addClass('icon-stop');
        jQuery('body').scrollTop(0);
        for (var i = index - 1; i >= 0; i--) {
          items.eq(i).hide();
        }
        os.reveal(wrapper, items, index);
      }
    },
    
    stop: function(wrapper) {
      if (wrapper.hasClass('playing')) {
        $('span.play-progress', wrapper).empty().pietimer('pause');
        wrapper
          .removeClass('playing')
          .find('li.post')
          .fadeIn()
          .slideDown();
        $('a.play-all i', wrapper)
          .addClass('icon-play')
          .removeClass('icon-stop');
      }
    },

    reveal: function(wrapper, items, index, progress) {
      if (wrapper.hasClass('playing')) {
        if (typeof progress === 'undefined') {
          progress = $('span.play-progress', wrapper);
        }
        var os = ossunburst;
        var item = items.eq(index);
        var delay = item.text().length * os.charDelay;
        var label = $('#user li'+item.data('node'));
        item
          .slideDown(function() {
            os.markSelected(1, os.nodes.filter(item.data('node')), label, item);
          });
        progress.pietimer({
          seconds: delay / 1000,
          color: '#cccccc',
        }, function() {
          if (index > 0) {
            os.markSelected(0, os.nodes.filter(item.data('node')), label, item);
            os.reveal(wrapper, items, index-1);
          } else {
            os.markSelected(0, os.nodes.filter(item.data('node')), label, item);
          }
        });
        if (index === 0) {
          os.stop(wrapper);
        } else {
          progress.pietimer('start');
        }
      }
      console.log(index);
    },

    focusHashtag: function(activities) {
      var os = ossunburst;
      // Reset the hashtags and hide deselected
      activities
        .removeClass('selected')
        .siblings('li.active')
        .slideUp(os.slideDur);

      // Replace spinner with twitter icon and replace click
      activities
        .find('> a > i.twitter')
        .removeClass('icon-spinner icon-spin')
        .css('color', '')
        .addClass('icon-twitter')
        .click(function() {
          window.location = $(this).parent().attr('href');
        });
    },

    positionBlocks: function() {
      var os = ossunburst;
      var header = $('#header');
      var contentMain = $('#content-main');
      var contentHeader = $('#content-header');
      var offHeader = contentHeader.offset();
      var offMain = contentMain.offset();

      header.css({
        width: header.innerWidth(),
        position: 'fixed',
        top: 0
      });

      contentHeader.css({
        width: contentHeader.innerWidth(),
        position: 'fixed',
        top: offHeader.top
      });


      contentMain.css({
        position: 'relative',
        marginTop: offMain.top,
        marginBottom: 0
      });

      $('<div>')
        .attr('id', 'events')
        .append($('<ul>').append($('<li>')
          .addClass('root event-'+this.eid)
          .append($('<img>').attr('src', $('#logo img').attr('src')).addClass('badge'))
          .append($('<p>').html($('#site-name').text()))
          .append($('<img>').attr('src', $('#logo img').attr('src')).addClass('profile'))
        ))
        .appendTo($('#content-main'));

      $('#users,#questions,#events')
        .appendTo(os.dataviz)
        .css({
          left: this.w / 2,
          top: this.h / 2,
          fontSize: (Math.min(this.w, this.h) / 400)+'em'
        });
    },

    formatData: function(json, callback) {
      var os = ossunburst;

      // Set maximum and minimum timestamp values
      os.timeline.domain(d3.extent(json, function(d) { return d.timestamp; }));
      var qids = json.map(function(d) { return 'question-'+d.qid; });
      qids.forEach(function(v,k) {
        $('#hashtags .activity.'+v).addClass('active');
      });
      var uids = json.map(function(d) { return 'user-'+d.uid; });
      var eids = ['event-'+os.eid];
      var css = d3.map(qids.concat(uids, eids)).values();
      os.css = {};
      cssOut = {};
      css.forEach(function(v,k) {
        var col = os.colours(k);
        var rgb = d3.rgb(col);
        var rgb2 = rgb.darker(3);
        var col2 = rgb2.toString();
        os.css[v] = [ col, col2 ];
        cssOut['.activity.'+v+', .post.'+v] = {
          'background-color': col,
          fill: col2
        };
        cssOut['.selected.activity.'+v+', .selected.post.'+v] = {
          'border-color': col2,
          fill: col2 
        };
      });
      os.createStyle(JSS.toCSS(cssOut));

      // Generate fully nested details
      os.data.values = d3.nest()
        .key(function(d) { return 'question-'+d.qid; })
        .key(function(d) { return 'user-'+d.uid; })
        .entries(json);

      callback();
    },

    setMoment: function(ele) {
      var dates = $('.moment-convert', $(ele));
      if (dates.length) {
        var os = ossunburst;
        Drupal.settings.openspace.moment_interval = setInterval(function() {
          os.setTimes($('.moment-update.moment-convert'), false);
        }, 60000);
        os.setTimes(dates, true);
      }
    },

    setTimes: function(ele, isnew) {
      var self = this;
      $(ele).each(function() {
        var obj = $(this);
        if (isnew) {
          self.setTimeText(obj, moment(obj.text(), 'YYYY-MM-DDTHH:mm:ss Z'));
        } else {
          self.setTimeText(obj, obj.data('moment'));
        }
      });
    },

    setTimeText: function(ele, datetime) {
      if (datetime) {
        if (datetime.diff(moment(), 'hours') < 24) {
          ele
            .text(datetime.fromNow(true))
            .addClass('moment-update')
            .data('moment', datetime);
        } else {
          ele.text(datetime.format('D MMM')); 
        }
      }
    },

    createStyle: function(css) {
      var head = document.getElementsByTagName("head")[0];
      var style_el = document.createElement("style");
      head.appendChild(style_el);

      if(style_el.styleSheet){// IE
        style_el.styleSheet.cssText = css;
      } else {// w3c
        var style_content = document.createTextNode(css)
        style_el.appendChild(style_content);
      }
    },

    getTypeAndId: function(key) {
      if (key) {
        id = key.split('-');
        return { type: id[0], id: id[1] };
      }
      return null;
    },

    updateData: function(ele, url) {
      var os = ossunburst;
      d3.json(os.url.posts, function(error, json) {
        if (error) return console.warn(error);
        os.formatData(json, function() {
          os.nodes.data(os.partition.nodes(os.data));
        });
      });
    },

    setupSunburst: function() {
      var os = ossunburst;
      this.svg = d3.select('#dataviz').append('svg:svg')
        .attr({
          width: this.w,
          height: this.h
        })
      .append('svg:g')
        .attr('transform', 'translate('+this.w/2+','+this.h/2+') scale(1.5)')
        .style('opacity', 0);

      this.partition = d3.layout.partition()
        .children(function(d) { return d.values; })
        .value(function(d) { return 1; });

      this.arc = d3.svg.arc()
        .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, os.x(d.x))); })
        .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, os.x(d.x + d.dx))); })
        .innerRadius(function(d) { return Math.max(0, os.y(d.y)); })
        .outerRadius(function(d) { return Math.max(0, os.y(d.y + d.dy)); });

      d3.json(os.url.posts, function(error, json) {
        if (error) return console.warn(error);
        os.timeline = d3.scale.linear().range([3,0]);
        os.formatData(json, function() {
          os.nodes = os.svg.selectAll('path')
            .data(os.partition.nodes(os.data));
          os.nodes.enter()
            .append('svg:path')
              .attr('d', os.arc)
              .attr('class', function(d) {
                var details = os.getTypeAndId(d.key);
                if (!details) {
                  return 'post';
                } else {
                  return 'node-'+details.type+' '+details.type+'-'+details.id;
                }
              })
              .style({
                fill: function(d) {
                  var col = os.css[(d.values ? d : d.parent).key][0];
                  var scale = null;
                  if (d.timestamp) {
                    scale = d3.interpolateRgb(d3.rgb(os.css[d.parent.parent.key][0]), d3.rgb(col));
                    return d3.rgb(scale(0.2)).brighter(os.timeline(d.timestamp));
                  } else if (d.parent && d.parent.depth === 1) {
                    scale = d3.interpolateRgb(d3.rgb(os.css[d.parent.key][0]), d3.rgb(col));
                    return scale(0.2);
                  } else if (d.depth === 0) {
                    return 'transparent';
                  }
                  return col;
                },
                stroke: 'white',
                'stroke-width': '0.1em'
              })
            .on('click', function(selected) {
              os.graphClick(selected);
            })
            .on('mouseover', os.mouseover)
            .on('mouseout', os.mouseout)
            .each(function(d) {
              if (d.depth < 2 && d.key) {
                var c = os.arc.centroid(d);
                var details = os.getTypeAndId(d.key);
                var ele = '#'+details.type+'s li.'+details.type+'-'+details.id;
                if (details.type !== 'event') {
                  $(ele).css({ left: c[0], top: c[1] });
                }
                $(ele).addClass('active');
              }
            });

          os.svg.transition()
            .duration(os.slideDur)
            .attr('transform', 'translate('+os.w/2+','+os.h/2+') scale(1)')
            .style('opacity', 1);

          $('#events li').addClass('active');
        });
      });
    },

    graphClick: function(selected) {
      if (!$('body').hasClass('animating')) {
        var os = ossunburst;
        var details = os.getTypeAndId(selected.key);
        if (details && details.type) {  
          var active = $('#hashtags li.active.expanded.activity');
          if (details.type === 'event' && active.length > 0) {
            $('span.hashtag', active).trigger('click');
          } else if (details.type === 'question' && active.length === 0) {
            $('#hashtags li.question-'+details.id+' span.hashtag').trigger('click');
          }
        }
      }
    },

    init: function() {
      $('html').css('overflow-y', 'scroll');
      this.dataviz = $('#dataviz');
      this.timer = $('#dataviz-timer');
      this.eid = parseInt(this.timer.attr('data-eid'));
      this.data = {
        'key': 'event-'+this.eid, 
        'type': 'event', 
        'values': [], 
        'id': this.eid
      };
      this.url = {
        posts: this.timer.attr('data-url-posts'),
        questions: this.timer.attr('data-url-questions'),
        users: this.timer.attr('data-url-users')
      };
      this.initSize();
      this.setupSunburst();
      this.positionBlocks();
      this.timer.updateOnNew(this.updateData);
    },

    mouseover: function(selected) {
      if (selected.depth === 1) { 
        var node = d3.select(this);
        var os = ossunburst;
        var label = $('#questions li.'+selected.key);
        var hashtag = $('li.'+selected.key, os.hashtag);
        os.markSelected(1, node, label, hashtag);
      }
    },

    mouseout: function(selected) {
      if (selected.depth === 1) { 
        var node = d3.select(this);
        var os = ossunburst;
        var label = $('#questions li.'+selected.key);
        var hashtag = $('li.'+selected.key, os.hashtag);
        os.markSelected(0, node, label, hashtag);
      }
    },

    markSelected: function(selected, node, label, hashtag) {
      if (!$('body').hasClass('animating')) {
        if (!hashtag.hasClass('expanded')) {
          var os = ossunburst;
          if (selected === 1) {
            node
            .transition()
              .duration(0)
              .style('fill', os.css[node[0][0].__data__.key][1])
            .transition()
              .duration(os.slideDur * 4)
              .style('fill', os.css[node[0][0].__data__.key][0]);

            hashtag.addClass('selected');
            label.addClass('selected');
          } else {
            hashtag.removeClass('selected');
            label.removeClass('selected');
          }
        }
      }
    },

    click: function(selected) {
      var os = ossunburst;
      var self = d3.select(this);
      var details = os.getTypeAndId(selected.key);
      var all = $('#events li.active,#users li.active,#questions li.active');
      all.removeClass('active');
      setTimeout(function() {
        all.removeClass('root');
      }, os.slideDur);
      os.nodes
        .attr('class', function(d) {
          var details = os.getTypeAndId(d.key);
          var root = '';
          if (selected.id === d.id) {
            root = ' root';
          }
          if (!details) {
            return 'post';
          } else {
            return 'node-'+details.type+' '+details.type+'-'+details.id+root;
          }
          return '';
        })
        .transition()
          .duration(os.slideDur)
          .style('fill', function(d) {
            var col = os.css[(d.values ? d : d.parent).key][0];
            var scale = null;
            if (d.timestamp) {
              scale = d3.interpolateRgb(d3.rgb(os.css[d.parent.parent.key][0]), d3.rgb(col));
              if (selected.depth === 0) {
                col = scale(0.2);
              }
              return d3.rgb(col).brighter(os.timeline(d.timestamp));
            } else if (d.parent && d.parent.depth === 1) {
              scale = d3.interpolateRgb(d3.rgb(os.css[d.parent.key][0]), d3.rgb(col));
              if (selected.depth === 0) {
                col = scale(0.2);
              }
              return col;
            } else if (d.depth === 0) {
              return 'transparent';
            }
            return col;
          })
          .style('stroke-width', function(d) { return d.depth === selected.depth ? 0 : '0.1em'; })
          .style('stroke', function(d) { return d.depth === selected.depth ? 'transparent' : 'white'; })
          .attrTween('d', os.arcTween(selected))
          .each('end', function(d) {
            if (d.depth < 2 + selected.depth && d.depth >= selected.depth) {
              if (d.depth === 0 || d.key === selected.key || d.parent.key === selected.key) {
                var details = os.getTypeAndId(d.key);
                var c = os.arc.centroid(d);
                var ele = '#'+details.type+'s li.'+details.type+'-'+details.id;
                if (details.type !== 'event') {
                  if (details.type === 'question' && d.key === selected.key) {
                    $(ele).css({ left: '', top: '' });
                  } else {
                    $(ele).css({ left: c[0], top: c[1] });
                  }
                }
                if (d.key === selected.key) {
                  $(ele).addClass('root');
                }
                $(ele).addClass('active');
              }
            }
            $('body').removeClass('animating');
          });
    },

    arcTween: function(d) {
      var os = ossunburst,
          xd = d3.interpolate(os.x.domain(), [d.x, d.x + d.dx]),
          yd = d3.interpolate(os.y.domain(), [d.y, 1]),
          yr = d3.interpolate(os.y.range(), [d.y ? 20 : 0, os.r]);
      return function(d, i) {
        return i
          ? function(t) { return os.arc(d); }
          : function(t) { os.x.domain(xd(t)); os.y.domain(yd(t)).range(yr(t)); return os.arc(d); };
      };
    }

  };

  return ossunburst;

})(jQuery, Drupal, this, this.document);
