ostoolbar = (function ($, Drupal, osdata, osvisuals, window, document, undefined) {

  var ostoolbar = {

    totalActivities: 25,
    step: 25,
    data: null,
    heightCheck: $('#activity').height() - ($(window).height() * 1.5),
    lock: true,
    scrollTout: null,
    visualsH: $('#dataviz').height(),
    headerH: $('#header').height(),

    init: function() {
      this.data = osvisuals.data.posts.values().reverse();
      this.initToolbar()
          .initHashtags(osvisuals.data.activeQuestions)
          .initActivity(this.data.slice(0,this.step));

      $('body').scrollTop(0).scroll(function() {
        var os = ostoolbar;
        var val = $(this).scrollTop();
        clearTimeout(os.scrollTout);
        os.scrollTout = setTimeout(function() {
          var articles = $('#activity article');
          for (var i = 0; i < articles.length; i++) {
            var item = articles.eq(i);
            if (item.offset().top + item.height() - val - os.headerH > 0) {
              osvisuals.updateTimeline(articles.eq(Math.max(0, i-1)).attr('data-timestamp'));
              break;
            }
          }
        }, 500);
        if (!os.lock) {
          if (val > os.heightCheck && os.totalActivities < os.data.length) {
            os.totalActivities = Math.min(os.totalActivities + os.step, os.data.length);
            os.compileActivities('#activity', os.data.slice(os.totalActivities - os.step, os.totalActivities));
          }
        }
      });
      osvisuals.updateTimeline($('#activity article').last().attr('data-timestamp'));
    },

    initToolbar: function() {
      $('#toolbox a').each(function() {
        if ($(this).attr('data-target')) {
          var ids = $(this).attr('data-target').split(' ');
          $(this).click(function() {
            $.each(ids, function(key, val) {
              var item = $('#'+val);
              if (val.indexOf('.') > -1) {
                item = $(val);
              }
              item.toggleClass('active active-block');
              if (item.hasClass('active active-block')) {
                item.css('z-index', $('.active.active-block').length+2);
              } else {
                setTimeout(function() {
                  item.css('z-index', '');
                }, 500);
              }
            });
            $(this).toggleClass('active active-block');
          });
        } else if ($(this).hasClass('help')) {
          $(this).click(function() {
            var button = $(this).addClass('active active-block');
            introJs().start().onexit(function() {
              button.removeClass('active active-block');
            })
            .onchange(function(ele) {
              switch(parseInt($(ele).attr('data-step'))) {
                case 5:
                  $('#toolbox a.activity').trigger('click');
                  $('.introjs-tooltip').animate({opacity: 1}, 550, function() { $(this).css('left', 640); });
                  break;
                case 6:
                  $('#toolbox a.activity').trigger('click');
                  break;
                case 7:
                  $('#toolbox a.hashtags').trigger('click');
                  break;
              }
            });
          });
        }
      });
      return this;
    },

    initActivity: function(data) {
      var self = ostoolbar;
      self.compileActivities('#activity', data);
    },

    compileActivities: function(id, data) {
      var wrapper = $(id),
          item = $('<article>')
            .addClass('new')
            .append($('<aside>').addClass('posted'))
            .append($('<img>').addClass('picture'))
            .append($('<p>')
              .addClass('author')
              .append($('<span>').addClass('username'))
                .append(' ')
              .append($('<span>').addClass('twitter'))
            )
            .append($('<p>').addClass('quote'))
            .append($('<p>').addClass('question').append('to ').append($('<span>').addClass('title')));
          articles = [],
          post = null,
          i = 0,
          nid = 0,
          newSection = $('<section>');

      $.each(data, function(k, post) {

        question = osdata.questions.get(post.qid);
        user = osdata.users.get(post.uid);
        var date = moment(post.timestamp, 'X').fromNow(true);
        if (date === 's') {
          date = 'now';
        }

        var newItem = item.clone();
        wrapper.append(newItem);
        newItem
          .addClass('activity nid-'+post.nid+' '+(question.textColour === '#FFFFFF' ? 'dark' : 'light'))
          .attr({
            'data-nid': post.nid,
            'data-qid': post.qid,
            'data-timestamp': post.timestamp
          })
          .css({
            backgroundColor: question.backColour,
            color: question.textColour
          })
          .find('aside.posted').html(date).end()
          .find('img').attr('src', user.profile).end()
          .find('p.author span.username').html(user.name).end()
          .find('p.author span.twitter').html(user.twitter).end()
          .find('p.quote').html(post.text).end()
          .find('p.question span.title').html(question.text).end()
          .hover(function() {
            d3.select('#question-'+$(this).attr('data-qid')+' circle.question-hover')
              .attr('class', 'question-hover selected');
            d3.select('#post-'+$(this).attr('data-nid')+' circle.post-hover')
              .attr('class', 'post-hover selected');
          }, function() {
            d3.select('#question-'+$(this).attr('data-qid')+' circle.question-hover')
              .attr('class', 'question-hover');
            d3.select('#post-'+$(this).attr('data-nid')+' circle.post-hover')
              .attr('class', 'post-hover');
          });
      });

      var h = wrapper.height();
      ostoolbar.heightCheck = h - ($(window).height() * 1.5);
      ostoolbar.lock = false;
      return this;
    },

    scrollToActivity: function(nid) {
      console.log('Scroll to '+nid, $('article.nid-'+nid));
      $('body').scrollTo($('article.activity.nid-'+nid).offset().top);
    },

    initHashtags: function(data) {
      $('#hashtags').each(function() {
        var self = $(this),
            icon = $('<i>').addClass('icon-twitter'),
            url = 'https://twitter.com/intent/tweet?',
            link = $('<a>').addClass('active').hide(),
            newLink = null,
            question = null;
        data.forEach(function(v,k) {
          question = osdata.questions.get(v.value);
          user = osdata.users.get(question.uid);
          newLink = $('a.nid-'+question.nid, self);
          if (newLink.length > 0) {
            if (typeof question.end !== 'undefined') {
              newLink.addClass('active').unbind('click');
            }
          } else {
            newLink = link.clone();
            newLink
              .attr('href', url+$.param({ 'screen_name': user.twitter, hashtags: question.hashtag }))
              .css({
                backgroundColor: question.colour,
                color: question.textColour
              })
              .html('#'+question.hashtag)
              .append(icon.clone())
              .addClass('nid-'+question.nid);
            self.append(newLink.clone());
          }
        });

        $('a', self)
          .not('.active')
          .slideUp(function() {
            $(this).remove();
          });

        $('a.active', self)
          .slideDown(function() {
            $(this).removeClass('active');
          });
      });
      return this;
    }
  };

  return ostoolbar;
})(jQuery, Drupal, osdata, osvisuals, this, this.document);
