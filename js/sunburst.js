var ossunburst = (function ($, Drupal, window, document, undefined) {
  
  var ossunburst = {
    w: 0,
    h: 0,
    r: 0,
    margin: 0,
    eid: 0,
    slideDur: 500,
    charDelay: 30,
    zoom: 0.3,
    hasVisuals: false,
    selected: null,
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
    cols: {},
    css: {},
    offset: {top:0,left:0},

/*
 * -------------------------------------------------------------
 * Initialisation functions
 * ========================
 * Run once functions
 * -------------------------------------------------------------
 */

    // Main functions to start sunburst
    init: function() {
      console.info('Initialising sunburst');
      var os = ossunburst;

      // Static variables
      os.initVars();

      // DOM changes
      os.initDOM();

      // Sizes and size variables
      os.initSize();

      // Data formatting from DOM
      os.parseDOMData();
      /**/
      if (os.hasVisuals) {
        // Create main visuals
        os.setupSunburst();
      } else {
        // Only load hashtags
        os.formatData(function(){ os.dataviz.hide(); });
      }

      // Setup pietimer to update data as and when
      os.timer.updateOnNew(os.updateData, 60);

      // Page resize function (resets visuals)
      $(window).resize(function() {
        if (!os.hasVisuals || !os.body.hasClass('initialising')) {
          console.info('Resizing window');
          clearTimeout($(window).data('resizeTmout'));
          $(window).data('resizeTmout', setTimeout(function() {
            os.initSize();
            if (os.hasVisuals) {
              if (os.body.hasClass('initialising')) {
                os.setupSunburst();
              }
              // Create main visuals
              os.click(os.selected);
              os.sunburstIn();
            } else {
              // Only load hashtags
              os.formatData(function(){ os.dataviz.hide(); });
            }
          }, 1000));
        }
      });

      return os;
    },

    // Setup main variables that do not change
    initVars: function() {
      console.info('Initialising variables');
      var os = ossunburst;
      os.html = $('html');
      os.body = $('body');
      os.dataviz = $('#dataviz');
      os.spinner = $('#spinner');
      os.timeDisplay = $('#time-display');
      os.timer = $('#dataviz-timer');
      os.article = $('article.node-event');
      os.header = $('header#header');
      os.contentMain = $('#content-main');
      os.contentHeader = $('#content-header');
      os.eid = parseInt(os.timer.attr('data-eid'));
      os.timeline = d3.scale.linear().range([2,0]);
      os.data = {
        'key': 'event-'+os.eid, 
        'type': 'event', 
        'values': [], 
        'id': os.eid
      };
      os.url = {
        posts: os.timer.attr('data-url-posts'),
        questions: os.timer.attr('data-url-questions')
      };
      os.hashtags = $('#hashtags div.view-content ul');
    },

    // Create D3 svg visuals
    setupSunburst: function() {
      console.info('Setting up sunburst');
      var os = ossunburst;
      
      // Separate values into their outer ring sections
      this.partition = d3.layout.partition()
        .children(function(d) { return d.values; })
        .value(function(d) { return 1; });

      // Create main arc function
      this.arc = d3.svg.arc()
        .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, os.x(d.x))); })
        .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, os.x(d.x + d.dx))); })
        .innerRadius(function(d) { return Math.max(0, os.y(d.y)); })
        .outerRadius(function(d) { return Math.max(0, os.y(d.y + d.dy)); });

      os.formatData(os.createSunburst);
    },

    createSunburst: function() {
      console.info('Create sunburst');
      var os = ossunburst;

      // Add new paths with data
      os.nodes = os.svg.selectAll('path')
        .data(os.partition.nodes(os.data));
      os.nodes.enter()
        .append('svg:path')
          .attr('d', os.arc)
          .attr('class', os.generateClass)
          .style('fill', os.segmentColour)
          .style('stroke', 'white')
          .style('stroke-width', '0.1em')
        //.on('click', function(selected) {
        //  os.graphClick(selected);
        //})
        //.on('mouseover', os.mouseover)
        //.on('mouseout', os.mouseout)
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

      os.sunburstIn();
      $('#events li').addClass('active');
    },

    sunburstIn: function() {
      console.info('Sunburst in');
      var os = ossunburst;
      os.svg.transition()
        .duration(os.slideDur)
        .attr('transform', 'translate('+os.w/2+','+os.h/2+') scale(1)')
        .style('opacity', 1);
      if (os.selected === null) {
        os.selected = os.nodes[0][0].__data__;
      }
      os.body.removeClass('initialising');
      os.spinner.removeClass('active');
    },

/*
 * -------------------------------------------------------------
 * DOM functions
 * ==================
 * Run when initialising and when the browser changes size
 * -------------------------------------------------------------
 */

    // Initial sizing functions
    initSize: function() {
      console.info('Initialising sizes');

      var os = ossunburst;

      // Reset all element sizes
      os.body.addClass('initialising novisuals');
      os.article.removeAttr('style');
      os.dataviz.removeAttr('style');
      os.timeDisplay.removeAttr('style');
      os.timer.removeAttr('style');
      os.header.removeAttr('style');
      os.contentHeader.removeAttr('style');
      os.contentMain.removeAttr('style');
      os.usersQuestionsEvents.removeAttr('style');

      // Get all offsets
      var off = os.article.offset();
      var offHeader = os.contentHeader.offset();
      var offMain = os.contentMain.offset();

      // Add scrollbar at all times
      os.html.css('overflow-y', 'scroll');

      // Set article placement
      os.article.css({
        minHeight: $(window).height() - off.top,
        width: os.header.width(),
        position: 'fixed',
        left: off.left,
        top: off.top,
        overflow: 'visible'
      });
      os.spinner.addClass('active');
      console.info('Added spinner');

      // Get page margin size
      os.margin = parseInt($('#content').css('padding-left'));

      // Set width and height variables
      var w = os.article.width();
      os.w = w - os.hashtags.width() - os.margin * 2;
      os.h = os.article.height() - os.margin * 2;

      // Adjustment for extra zoom
      os.r = Math.min(os.w, os.h) / 2;
      os.w = os.w + os.r * os.zoom;
      os.h = os.h + os.r * os.zoom;
      os.r = Math.min(os.w, os.h) / 2;


      if (os.article.width() * 0.5 > os.hashtags.width()) {
        os.body.removeClass('novisuals');
        os.hasVisuals = true;
      } else {
        os.hasVisuals = false;
      }

      if (os.hasVisuals) {
        // Set data visualisation size
        os.dataviz.css({
          width: os.w,
          height: os.h,
          marginLeft: os.hashtags.width() - os.zoom * 0.5 * os.r,
          marginTop: os.zoom * -0.5 * os.r
        });

        // Fix header
        os.header.css({
          width: os.header.innerWidth(),
          position: 'fixed',
          top: 0
        });

        // Fix tabs header
        os.contentHeader.css({
          width: os.contentHeader.innerWidth(),
          position: 'fixed',
          top: offHeader.top
        });

        // Allow for scrolling when displaying activities
        os.contentMain.css({
          position: 'relative',
          marginTop: offMain.top,
          marginBottom: 0
        });

        // Set same with for users, questions and events dataviz labels
        os.usersQuestionsEvents.css({
          left: this.w / 2,
          top: this.h / 2,
          fontSize: (Math.min(this.w, this.h) / 400)+'em'
        });

        os.timer.css({
          marginBottom: os.margin,
          marginRight: os.margin
        });

        os.timeDisplay.css({
          marginTop: os.margin,
          marginRight: os.margin
        });

        d3.select('#dataviz svg')
          .attr({
            width: os.w,
            height: os.h
          });

        os.svg.attr('transform', 'translate('+os.w*0.5+','+os.h*0.5+') scale(1.5)');

        // Set dataviz sizes for svg
        os.x = d3.scale.linear()
          .range([0, 2 * Math.PI]);
        os.y = d3.scale.sqrt()
          .range([0, os.r]);
      }
    },

    // Fixes to DOM that are easier than making php changes 
    // To remove later
    initDOM: function() {
      console.info('Initialising DOM');

      var os = ossunburst;

      $('<div>')
        .attr('id', 'events')
        .append($('<ul>').append($('<li>')
          .addClass('root event-'+os.eid)
          .append($('#logo-profile img').clone().addClass('badge'))
          .append($('<p>').html($('#site-name').text()))
          .append($('#logo-profile img').addClass('profile'))
        ))
        .appendTo(os.contentMain);

      // Create main svg tag
      var svg = d3.select('#dataviz').append('svg:svg');
      os.svg = svg.append('svg:g').style('opacity', 0);

      os.usersQuestionsEvents = $('#users,#questions,#events').appendTo(os.dataviz);
      if (parseInt(os.timer.attr('data-duration')) === 0) {
        os.timeDisplay.addClass('nomax');
      }
      os.timeDisplay.appendTo(os.dataviz);
      os.timer.appendTo(os.dataviz);

      // Start moment twitter date intefval
      os.setMoment(os.hashtags);
    },

/*
 * -------------------------------------------------------------
 * Data functions
 * ==============
 * -------------------------------------------------------------
 */

    // Gather data from initial dom elements
    // to create question and user ids, and create
    // css data and click events for all

    parseDOMData: function() {
      var os = ossunburst;

      // Gather question data from hashtags
      os.hashtags
        .children('li')
        .each(function() {
          var self = $(this);
          // Set data and set css styling
          os.setData(self);
          // Add a click action
          os.clickHashtag(self); 
        });

      // Gather user data from labels
      $('#users')
        .find('li')
        .each(function() {
          var self = $(this);

          // Set data and set css styling
          os.setData(self);
        });

      // Apply css
      os.createStyle(JSS.toCSS(os.css));
    },

    // Set the data for the DOM element, and create
    // the css styling, colours and hover events for the node

    setData: function(item) {
      console.info('Setting data');

      var os = ossunburst;
      var self = $(item);

      // Get data wrapper
      var data = self.children('div.data');

      // Set node id and type, then set label id
      var id = parseInt(data.attr('data-id'));
      var type = data.attr('data-type');
      var url = data.attr('data-url');
      var node = data.attr('data-node');
      if (typeof node === 'undefined') {
        node = type+'-'+id;
      }
      var label = $('#'+type+' li.'+type+'-'+id);

      if (id && type) {
        // Create CSS label/post styling and colour
        os.addCss(type, id);

        // Assign data to object and add hover
        self
          .data({
            id: id,
            type: type,
            label: label,
            url: url,
            node: '.'+node
          });
        if (os.hasVisuals && (type === 'question' || type === 'event' || type === 'post')) {
          self.hover(function() {
            self.addClass('flash');
            os.markSelected(1, os.nodes.filter(self.data('node')), label, self);
            setTimeout(function() {
              self.removeClass('flash');
            }, 50);
          }, function() {
            os.markSelected(0, os.nodes.filter(self.data('node')), label, self);
          });
        }
      }
    },

    formatData: function(callback) {
      var os = ossunburst;
      d3.json(os.url.questions, function(error, json) {
        if (error) return console.warn(error);
        os.formatQuestions(json, function() {
          d3.json(os.url.posts, function(error, json) {
            if (error) return console.warn(error);
            os.formatPosts(json, callback);
          })
        });
      });
    },

    // Format the json array and then run the callback function

    formatPosts: function(json, callback) {
      var os = ossunburst;
      if (json.length > 0) {
        console.log('Formatting data from '+json.length+' records');
    
        // Set maximum and minimum timestamp values
        os.timeline.domain(d3.extent(json, function(d) { return d.timestamp; }));

        // Generate fully nested details
        os.data.values = d3.nest()
          .key(function(d) { return 'question-'+d.qid; })
          .key(function(d) { return 'user-'+d.uid; })
          .entries(json);
        
      } else {

        // Generate fully nested details
        os.data.values = d3.nest()
          .key(function(d) { return 'question-'+d.qid; })
          .entries(os.qids.values());

      }

      callback();

      counts = {};
      json.forEach(function(v,k) {
        if (typeof counts[v.qid] === 'undefined') {
          counts[v.qid] = 0;
        }
        if (v.uid) {
          counts[v.qid]++;
        }
      });

      d3.map(counts).forEach(function(k,v) {
        var tag = os.hashtags.find('li.question-'+k);
        var count = tag.find('a.discuss-link span.hashtag span.count');
        if (tag.hasClass('concluding')) {
          count.text('Concluding');
        } else {
          count.text(v);
        }
        count.data('count', v);
      });

      setTimeout(function() {
        os.hashtags.children('li.on').each(function(i) {
          var item = $(this);
          setTimeout(function() {
            item.addClass('active');
          }, i * 100);
        });
      }, 600);

    },

    formatQuestions: function(json, callback) {
      var os = ossunburst;
      console.log('Formatting data from '+json.length+' questions');
    
        var qids = json.map(function(d) { return d.qid; }),
            data = d3.map(json),
            newQids = d3.set(qids).values(),
            oldQids = [],
            addQids = [],
            removeQids = [];
        
        if (typeof os.qids === 'undefined') {
          os.qids = d3.map();
        }

        os.qids.forEach(function(v,k) {
          oldQids.push(v.qid);
        });

        newQids.forEach(function(v,k) {
          if (oldQids.indexOf(v) === -1) {
            addQids.push(v);
          }
        });
        
        oldQids.forEach(function(v,k) {
          if (newQids.indexOf(v) === -1) {
            removeQids.push(v);
          }
        });
        
        removeQids.forEach(function(v,k) {
          var tag = os.hashtags.children('li.activity.question-'+v);
          tag
            .find('div.data')
            .empty()
            .end()
            .removeAttr('style')
            .removeClass('active expanded');
          setTimeout(function() {
            os.hashtags.children('li.activity.question-'+v+' div.data').empty();
            tag.removeClass('on');
          }, 550);
        });

        addQids.forEach(function(v,k) {
          var tag = os.hashtags.children('li.activity.question-'+v);
          tag
            .addClass('on')
            .find('a.discuss-link span.hashtag span.count')
            .remove()
            .end()
            .find('a.discuss-link span.hashtag')
            .append($('<span>').addClass('count').text('0'))
            .end()
            .find('a.discuss-link i.conclude')
            .each(function() {
              var uid = os.timer.attr('data-uid');
              var host = data.get(k).author;
              if (uid !== host) {
                $(this).addClass('inactive');
              }
            });
        });

        data.forEach(function(k,v) {
          if (v.status === '7') {
            var tag = os.hashtags.children('li.activity.question-'+v.qid);
            tag.addClass('concluding');
          }
          os.qids.set(v.qid, v);
        });

        callback();
    },

    // An area of the display has been chosen
    // Re-adjust display to reflect this
    getActivity: function(activities, wrapper, init, callback) {
      console.log('Getting activity');
      var os = ossunburst,
          off = null;

      // This activity list has been opened before, slidedown and show items
      // -- ! This probably isn't the correct way to go about this
      // -- ! So I'm looking to remove this and keep the 
      // -- ! initial activities load if it doesn't use up
      // -- ! too many resources
      if (init && $('li', wrapper).length > 0 && false) {

        // Reset spinner and twitter icons and replace click bindings
        os.focusHashtag(activities);

        // Scroll page up to top of body
        
        callback();

        // Update visuals
        os.click(os.nodes.filter(activities.data('node'))[0][0].__data__);
      } else {

        // The activity has never been opened before
        // Load the contents into a new container and
        // append it to the data wrapper

        // Create list container if not done so before
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

          // Add question title and playall button 
          // and click events if not done before
          if (init) {
            tempWrap.find('h2').insertBefore(wrapList);
            tempWrap.find('a.play-all')
              .insertBefore(wrapList)
              .click(function(e) {
                if (!wrapper.hasClass('playing')) {
                  e.preventDefault();
                  os.play(wrapper);
                } else {
                  $('span.caption', this).text('Play all');
                  os.stop(wrapper);
                }
              });
          }

          // Parse list of items, and remove any that exist
          var items = $('li.post', tempWrap);
          if (!init) {
            console.log('Removing items already loaded');
            for (var i = 0; i < items.length; i++) {
              var id = items.eq(i).find('div.data').attr('data-id');
              if (wrapper.find('li.post-'+id).length > 0) {
                items = items.slice(0, i);
                break;
              }
            }
          }
          items.addClass('new');

          // Prepend new list items, match user to segment in dataviz
          // and add play button
          wrapList.prepend(items);
          $('li.post.new', wrapList)
            .each(function(i) {
              os.setData(this);
              var item = $(this).removeClass('new');
              $('a.play', this).click(function(e) {
                e.preventDefault();
                $('a.play-all span.caption', wrapper).text(' Stop');
                os.play(wrapper, item.index());
              });
              setTimeout(function() {
                item.addClass('active');
              }, 100 * Math.min(i, 5));
            });

          // Set auto increment timer for all newly posted dates
          os.setTimes(wrapList.find('.moment-convert'));

          // Reset spinner and twitter icons and replace click bindings
          os.focusHashtag(activities);

          // Scroll page up to top of body if the hashtag has opened this list
          if (init) {
            os.body.scrollTop(0);
          }

          // Slide down wrapper to reveal new posts
          callback();
        });
      }
    },

    updateData: function(ele, url) {
      var os = ossunburst;
      console.log('Updating data at '+url);
      os.formatData(function() {
        os.nodes.data(os.partition.nodes(os.data));
        os.click(os.data);
      });
    },

/*
 * -------------------------------------------------------------
 * Click and mouse functions
 * =========================
 * Interaction functions
 * -------------------------------------------------------------
 */

    focusHashtag: function(activities) {
      var os = ossunburst;

      // Reset the hashtags and hide deselected
      activities
        .removeClass('selected')
        .siblings('li.on')
        .each(function() {
          var item = $(this);
          setTimeout(function() {
            item.removeClass('active');
          }, 100);
        });

      // Replace spinner with twitter icon and replace click
      activities
        .find('> a > i.twitter')
        .addClass('icon-comment')
        .end()
        .find('> a > i.conclude')
        .addClass('icon-edit')
        .end()
        .children('a')
        .children('i.twitter,i.conclude')
        .removeClass('icon-spinner icon-spin')
        .css('color', '')
        .each(function() {
          var self = $(this);
          os.twitterClick(self, self.parent().attr('href'));
        });
    },

    clickHashtag: function(wrapper) {
      var os = ossunburst;
      
      var twitter = wrapper
        .children('a')
        .click(function(e) { e.preventDefault(); })
        .children('i.twitter,i.conclude')
        .each(function() {
          var self = $(this);
          os.twitterClick(self, self.parent().attr('href'));
        });
      var hashtag = $('span.hashtag', wrapper);
      var expand = $('i.expand', hashtag);
      var data = $('div.activity-data.data', wrapper);
      hashtag.click(function(e) {
        if (!os.hasVisuals || !os.body.hasClass('animating')) {
          if (parseInt($('span.count', hashtag).data('count')) > 0) {
            os.body.addClass('animating');
            if (!wrapper.hasClass('expanded')) {
              wrapper
                .siblings('li.on')
                .each(function(i) {
                  var item = $(this);
                  setTimeout(function() {
                    item.removeClass('active');
                  }, 100 * i);
                });
              setTimeout(function() {
                wrapper
                  .addClass('expanded')
                  .css('min-height', 2000);
              }, wrapper.siblings('li.on').length * 100);
              expand.addClass('icon-rotate-90');
              twitter
                .unbind('click')
                .removeClass('icon-edit icon-comment')
                .addClass('icon-spinner icon-spin')
                .css('color', 'white');
              if (os.hasVisuals) {
                os.click(os.nodes.filter(wrapper.data('node'))[0][0].__data__);
              }
              os.getActivity(wrapper, data, true, function() {
                setTimeout(function() {
                  var ol = $('ol', wrapper);
                  var off = ol.offset();
                  $(document).scrollTop(0);
                  wrapper.css('min-height', ol.outerHeight() + off.top);
                  os.setTimer(wrapper.data('id'));
                }, wrapper.siblings('li').length * 100);
              });
            } else {
              os.stop(data);
              expand.removeClass('icon-rotate-90')
              wrapper.attr('style', '');
              setTimeout(function() {
                wrapper.removeClass('expanded');
              }, 500);
              wrapper
                .siblings('li.on')  
                .each(function(i) {
                  var item = $(this);
                  setTimeout(function() {
                    item.addClass('active');
                  }, 100 * i + 500);
                });

              os.timeDisplay.removeClass('active');
              setTimeout(function() {
                clearInterval(os.timeDisplay.data('interval'));
                os.timeDisplay.find('span.time').empty();
              }, 550);
      
              if (os.hasVisuals) {
                os.click(os.nodes.filter(wrapper.data('node'))[0][0].__data__.parent);
                os.click(os.nodes.filter(wrapper.data('node'))[0][0].__data__.parent);
              }
            }
          } else {
            hashtag.addClass('shake');
            var intro = introJs();
            intro.setOptions({
              steps: [{
                element: wrapper[0],
                intro: 'Nothing has been posted yet. Why not start the discussion?',
                position: 'right'
              }],
              showStepNumbers: false,
              skipLabel: 'OK'
            });
            setTimeout(function() {
              hashtag.removeClass('shake');
              intro.start();
            }, 550);
          }
        }
      });
    },

    twitterClick: function(ele, href) {
      var self = $(ele);
      self.click(function() {
        if (self.hasClass('inactive')) {
          self.parent().addClass('shake');
          setTimeout(function() {
            self.parent().removeClass('shake');
          }, 550);
        } else {
          if (self.hasClass('twitter')) {
            window.location = href;
          } else {
            window.location = self.attr('data-url');
          }
        }
      });
    },

    click: function(selected) {
      var os = ossunburst;
      var self = d3.select(this);
      os.selected = selected;
      var details = os.getTypeAndId(selected.key);
      var all = $('#events li.active,#users li.active,#questions li.active');
      all.removeClass('active');
      setTimeout(function() {
        all.removeClass('root');
      }, os.slideDur);
      os.nodes
        .attr('class', function(d) { return os.generateClass(d, selected); })
        .transition()
          .duration(os.slideDur)
          .style('fill', function(d) { return os.segmentColour(d, selected); })
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
            os.body.removeClass('animating');
          });
    },

    graphClick: function(selected) {
      var os = ossunburst;
      if (!os.body.hasClass('animating')) {
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
      var os = ossunburst;
      if (!os.body.hasClass('animating') && typeof node[0][0] !== 'undefined') {
        if (!hashtag.hasClass('expanded')) {
          if (node[0][0].__data__.depth - os.selected.depth === 1) {
            if (selected === 1 && typeof node[0][0] !== 'undefined') {
              node
              .transition()
                .duration(0)
                .style('fill', os.cols[node[0][0].__data__.key][1])
              .transition()
                .duration(os.slideDur * 4)
                .style('fill', os.cols[node[0][0].__data__.key][0]);

              hashtag.addClass('selected');
              label.addClass('selected');
            } else {
              hashtag.removeClass('selected');
              label.removeClass('selected');
            }
          }
        }
      }
    },

/*
 * -------------------------------------------------------------
 * CSS and colour functions
 * ========================
 * -------------------------------------------------------------
 */

    // Add a unique colour for the specified item
    addCss: function(type, id) {
      var os = ossunburst,
          col = os.colours(id),
          rgb = d3.rgb(col),
          rgb2 = rgb.darker(1.5),
          col2 = rgb2.toString(),
          cls = type+'-'+id;

      // Create the colour entry for use later
      os.cols[cls] = [ col, col2 ];

      // Activity post display colours
      os.css['.activity.'+cls+', .post.'+cls] = {
        'background-color': col,
        fill: col2
      };

      // Selected border colours
      os.css['.selected.activity.'+cls+', .selected.post.'+cls] = {
        'background-color': col2
      };
    },

    // Create the custom css in the head
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

    segmentColour: function(d, selected) {
      var os = ossunburst,
          col = 'transparent',
          c = null,
          scale = null;

      if (d.depth > 0) {
        c = os.cols[(d.values ? d : d.parent).key];
        if (typeof c !== 'undefined') {
          col = c[0];
          if (d.timestamp && typeof d.author === 'undefined') {
            if (typeof selected === 'undefined' || selected.depth === 0 || os.selected === null) {
              scale = d3.interpolateRgb(d3.rgb(os.cols[d.parent.parent.key][0]), d3.rgb(col));
              col = scale(0.2);
            }
            col = d3.rgb(col).brighter(os.timeline(d.timestamp));
          } else if (d.parent && d.parent.depth === 1) {
            if (typeof selected === 'undefined' || selected.depth === 0 || os.selected === null) {
              scale = d3.interpolateRgb(d3.rgb(os.cols[d.parent.key][0]), d3.rgb(col));
              col = scale(0.2);
            }
          }
        }
      }
      return col;
    },

/*
 * -------------------------------------------------------------
 * Timeline functions
 * ==================
 * Functions that control display of posts over time
 * -------------------------------------------------------------
 */

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
        $(document).scrollTop(0);
        items
          .slice(0, index)
          .each(function(i) {
            if (i < 5) {
              var item = $(this);
              setTimeout(function() {
                item.removeClass('active');
              }, 100 * i);
            } else {
              $(this).removeClass('active');
            }
          });
        setTimeout(function() {
          os.reveal(wrapper, items, index);
        }, 550);
      } else {
        os.stop(wrapper);
      }
    },
    
    stop: function(wrapper) {
      $('span.play-progress', wrapper).empty().pietimer('pause');
      wrapper
        .removeClass('playing')
        .find('li.post')
        .each(function(i) {
          var item = $(this);
          if (i < 5) {
            setTimeout(function() {
              item.addClass('active');
            }, 100 * i);
          } else {
            setTimeout(function() {
              item.addClass('active');
            }, 550);
          }
        });
      $('a.play-all', wrapper)
        .find('i')
        .addClass('icon-play')
        .removeClass('icon-stop')
        .end()
        .find('span.caption')
        .text('Play all');
    },

    reveal: function(wrapper, items, index, progress, stats) {
      if (wrapper.hasClass('playing')) {
        if (typeof stats === 'undefined') {
          stats = $('<span>')
            .addClass('status')
            .append($('<span>').addClass('current'))
            .append(' of ')
            .append($('<span>').addClass('total').text(items.length))
            .appendTo($('span.caption', wrapper).html('Stop '));
        }
        if (typeof progress === 'undefined') {
          progress = $('span.play-progress', wrapper);
        }
        var os = ossunburst;
        var item = items.eq(index);
        stats.find('.current').text(items.length - index);
        var delay = item.text().length * os.charDelay;
        var label = $('#user li'+item.data('node'));
        item.addClass('active');
        if (os.hasVisuals) {
          os.markSelected(1, os.nodes.filter(item.data('node')), label, item);
        }
        progress.pietimer({
          seconds: delay / 1000,
          color: '#cccccc',
        }, function() {
          if (index > 0) {
            if (os.hasVisuals) {
              os.markSelected(0, os.nodes.filter(item.data('node')), label, item);
            }
            os.reveal(wrapper, items, index-1, progress, stats);
          } else {
            if (os.hasVisuals) {
              os.markSelected(0, os.nodes.filter(item.data('node')), label, item);
            }
          }
        });
        if (index === 0) {
          os.stop(wrapper);
        } else {
          progress.pietimer('start');
        }
      }
    },

/*
 * -------------------------------------------------------------
 * Time-based functions (moment et al)
 * ===================================
 * -------------------------------------------------------------
 */

    setMoment: function(ele) {
      var dates = $('.moment-convert', $(ele));
      var os = ossunburst;
      setInterval(function() {
        os.setTimes($('.moment-update.moment-convert'));
      }, 60000);
    },

    setTimes: function(ele) {
      var self = this;
      $(ele).each(function() {
        var obj = $(this);
        var dateObj = obj.data('moment');
        if (typeof dateObj === 'undefined') {
          self.setTimeText(obj, moment(obj.text(), 'YYYY-MM-DDTHH:mm:ss Z'));
        }
        self.setTimeText(obj, dateObj);
      });
    },

    setTimeText: function(ele, datetime) {
      if (datetime) {
        ele
          .text(datetime.twitterShort())
          .addClass('moment-update')
          .data('moment', datetime);
      }
    },

    setTimer: function(qid) {
      var os = ossunburst;
      var startTime = os.qids.get(qid).timestamp * 1000;
      var max = parseInt(os.timer.attr('data-duration'));
      var time = os.timeDisplay.children('span.time');

      os.setTimerDuration(time, startTime, max);
      os.timeDisplay
        .addClass('active')
        .data('interval', setInterval(function() {
          os.setTimerDuration(time, startTime, max);
        }, 1000));
    },

    setTimerDuration: function(ele, startTime, max) {
      var os = ossunburst,
          dayStr = '',
          dur = null,
          days = null;

      if (max === 0) {
        dur = moment.duration(new Date().getTime() - startTime);
      } else {
        dur = moment.duration((max + startTime) - new Date().getTime());
      }

      days = dur.days();
      dayStr = '';

      if (days >= 1) {
        dayStr = Math.floor(days)+' days ';
      }
      ele.text(dayStr+moment(dur.asMilliseconds()).format('hh:mm:ss'));
      if (max > 0 && days >= max) {
        //callback();
      }
    },

/*
 * -------------------------------------------------------------
 * Calculation functions
 * =====================
 * Misc functions to calculate various values
 * -------------------------------------------------------------
 */

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
    },

    getTypeAndId: function(key) {
      if (key) {
        id = key.split('-');
        return { type: id[0], id: id[1] };
      }
      return null;
    },

    generateClass: function(d, selected) {
      var os = ossunburst,
          root = '',
          details = os.getTypeAndId(d.key);

      if (selected.key === d.key) {
        root = ' root';
      }
      if (details === null) {
        return 'post';
      }
      return 'node-'+details.type+' '+details.type+'-'+details.id+root;
    }

  };

  return ossunburst;

})(jQuery, Drupal, this, this.document);
