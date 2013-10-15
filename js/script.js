/**
 * @file
 * A JavaScript file for the theme.
 *
 * In order for this JavaScript to be loaded on pages, see the instructions in
 * the README.txt next to this file.
 */

// JavaScript should be made compatible with libraries other than jQuery by
// wrapping it with an "anonymous closure". See:
// - http://drupal.org/node/1446420
// - http://www.adequatelygood.com/2010/3/JavaScript-Module-Pattern-In-Depth

(function ($, Drupal, window, document, undefined) {

  function createHashtags(strArr) {
    var newStrArr = [];
    var matchRet = {};
    var whitelist = 'conclusion, question, i, have, what, where, who, why, when, which, how, a, an, as, at, before, but, by, for, from, is, in, into, like, of, off, on, onto, per, since, than, the, this, that, to, up, via, with, do';
    whitelist = whitelist.split(',');
    var matchObj = {};
    for (var i = 0; i < whitelist.length; i++) {
      matchObj[whitelist[i].trim()] = true;
    }
    strArr.forEach(function(val, key) {
      var wordArr = val.toLowerCase().match(/\w+/g);
      var retArr = [];
      var hashtag = '';
      for (var i = 0; i < wordArr.length; i++) {
        var word = wordArr[i].trim();
        if (!matchObj[word]) {
          retArr.push(word);
        }
      }
      hashtag = retArr[0];
      retArr.shift();
      while(matchRet[hashtag] == true) {
        if (retArr.length > 0) {
          hashtag += retArr[0];
          retArr.shift();
        } else {
          hashtag += ('0' + (Math.floor(Math.random() * 100)+10)).slice(-2);
        }
        if (hashtag.length > 16) {
          hashtag = hashtag.slice(0, 14);
        }
      }
      matchRet[hashtag] = true;
      newStrArr.push(hashtag);
    });
    return newStrArr;
  }

  Drupal.behaviors.editablefields_submit = {
    attach: function (context) {
      var hashtags = $('#views-form-question-sequence-sort-questions-page tr.draggable');
      var updating = 1;
      if (hashtags.length > 0) {
        var questions = [];
        hashtags.find('.question-text').each(function() {
          questions.push($(this).text());
        });
        var tagsList = createHashtags(questions);
        $('.editablefield-item', hashtags).each(function(i) {
          var $this = $(this);
          var field = $this.find('input[type=text],textarea,select');
          var help = $this.find('.form-actions');
          var submit = $this.find('input.form-submit');
          if (field.length == 1) {
            $this.once('editablefield', function() {
              field.change(function() {
                var tagsMatch = {};
                var val = field.val();
                field.val('');
                var MATCH = false;
                hashtags.find('.editablefield-item input').each(function() {
                  if (val == $(this).val()) {
                    MATCH = true;
                  }
                });
                field.val(val);
                if (MATCH || val.search(/\W/) > -1 || val.length > 16) {
                  msg = '';
                  if (MATCH) {
                    msg = 'Hashtag not unique.';
                  } else if (val.length > 16) {
                    msg = 'Too many characters.';
                  } else if (val.search(' ') > -1) {
                    msg = 'No spaces allowed.';
                  } else if (val.search(/\W/) > -1) {
                    msg = 'Only alphanumeric characters.';
                  }
                  field.addClass('error');
                  if (help.find('p.instructions').length > 0) {
                    $('p.instructions', help).html(msg);
                  } else {
                    help.append($('<p>').addClass('instructions').html(msg));
                  }
                } else {
                  submit.triggerHandler('click');
                }
              });
            });
            submit.hide();
            if (field.val() == '') {
              setTimeout(function() {
                field.val(tagsList[i]);
                submit.triggerHandler('click');
              }, 1000 * updating);
              updating += 1;
            }
          }
        });
      } else {
        var $this = $(this);
        // There is only one editable field in that form, we can hide the submit
        // button.
        $('.editablefield-item').once('editablefield', function() {
          if ($this.find('input[type=text],textarea,select').length == 1) {
            $this.find('input.form-submit').hide();
            $this.find('input[type=text],textarea,select').change(function() {
              $this.find('input.form-submit').triggerHandler('click');
            });
          }
        });
      }
    }
  };


  Drupal.behaviors.openspaceMomentConvert = {
    attach: function(context, settings) {
      if (typeof Drupal.settings.openspace == 'undefined') {
        Drupal.settings.openspace = [];
      }
      if (typeof Drupal.settings.openspace.moment_interval != 'undefined') {
        clearInterval(Drupal.settings.openspace.moment_interval);
      }
      var dates = $('.moment-convert');
      if (dates.length) {
        var self = this;
        Drupal.settings.openspace.moment_interval = setInterval(function() {
          self.setTimes($('.moment-update.moment-convert'), false);
        }, 60000);
        self.setTimes(dates, true);
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
        ele
          .text(datetime.twitterShort())
          .addClass('moment-update')
          .data('moment', datetime);
      }
    }
  };
  Drupal.attachBehaviors('.moment-convert');

  Drupal.behaviors.openspaceTabindexCorrect = {
    attach: function(context, settings) {
      $('#draggableviews-table-question_sequence-sort_questions_page input.form-text').each(function(i) {
        $(this).attr('tabindex', i+1);
      });
    }
  };
  Drupal.attachBehaviors('#draggableviews-table-question_sequence-sort_questions_page');

  $(document).ready(function() {

    // Menu
    $('#main-menu-link').click(function() {
      $('i', this)
        .removeAttr('class')
        .addClass('icon-spinner icon-spin');
    });

    /*
      Auto updating views

      * View only updates if ping returns a result
      * Only new view rows are fetched and appended to view content
    */
    $('.autoupdate-row.views-row-first').each(function() {
      var self = $(this);
      self.updateOnNew(AppendViewContent);
    });
    $('div.ajax-data').each(function() {
      var self = $(this);
      self.updateOnNew(ReplaceViewContent);
    });

    // Setup dataviz on event visualisation pages
    $('#dataviz').each(function() {
      ossunburst.init();
    });

    // Front page resizing
    $('body.front').each(function() {
      var body = $(this);
      body.scrollTop(0);
      var main = $('section.main-page');
      var margin = $(window).height() - main.offset().top - main.outerHeight();
      $('h1.title').css({ marginTop: margin * 0.4 });
      main.css({marginBottom: margin * 0.6});
      $('section.page-1,section.page-2').each(function() {
        $(this).height($(window).height() * 0.8);
        var para = $('p', this);
        var off = $(window).height() * 0.8 - para.height();
        para.css({
          paddingTop: off * 0.4,
          paddingBottom: off * 0.6
        });
      });
      var trigHeight = $(window).height() * 0.9;
      body.scroll(function() {
        var val = body.scrollTop();
        $('section.page-1,section.page-2', body).each(function() {
          var off = $(this).offset().top;
          if (val >= off - trigHeight && val < off + $(this).height() * 0.9) {
            $(this).addClass('scrolled');
          } else {
            $(this).removeClass('scrolled');
          }
        });
      });
      $('section.main-page a.about', body).click(function(e) {
        e.preventDefault();
        body.animate({ scrollTop: $('section.page-1', body).offset().top });
      });
    });

    $('input[size]').removeAttr('size');

    $('form.node-event-form').each(function() {
      $('div.description', this).each(function(i) {
        var desc = $(this);
        var wrapper = desc.parents('div.form-wrapper');
        var label = wrapper.find('label').eq(0);
        wrapper.attr({
          'data-intro': desc.html(),
          'data-step': i+1
        });
        label
          .append( $('<a>').attr('name', label.attr('for')))
          .append(
            $('<i>')
              .addClass('icon-question-sign')
              .click(function() {
                introJs('#page').setOptions({
                  showStepNumbers: false,
                  skipLabel: 'OK',
                }).goToStep(i+1).start();
              })
          );
        desc.remove();
      });
      var partWrapper = $('<ul>').appendTo($('#edit-field-participants > div'));
      var partInput = $('input#edit-field-participants-und').attr('placeholder', 'comma,separated,usernames, noleading,atsign');
      var val = $.trim(partInput.val());
      var participants = val.split(', ');
      if (participants[0] === '') {
        participants = [];
      }
      $('#friends ul li.friend').each(function() {
        var self = $(this);
        var username = $('span.p-nickname', self).html().substring(1);
        var link = $('<li>').addClass('follower');
        if (participants.indexOf(username) > -1) {
          link.addClass('active');
        }
        partWrapper.append(link
          .html(self.html())
          .prepend($('<i>').addClass('icon-li icon-ok'))
          .click(function(e) {
            e.preventDefault();
            if (participants.indexOf(username) > -1) {
              participants.splice(participants.indexOf(username), 1);
            } else {
              participants.push(username);
            }
            partInput.attr('value', participants.join(', '));
            link.toggleClass('active');
          })
        );
      });
      if (window.location.hash !== '') {
        $('body').animate({'scrollTop': ($(window.location.hash).offset().top)});
      }
    });

    $('body.page-node-add-post').each(function() {
      $('#edit-field-body-und-0-format--2')
        .children('option:selected')
        .removeAttr('selected')
        .end()
        .children('option[value="tweet_with_preview_"]')
        .attr('selected', 'selected');
      if ($.url().param('conclusion') === 1) {
        $('#edit-flag-conclusion').attr('checked', 'checked');
      }
    });

    $('.view-display-id-invitations_admin').each(function() {
      if ($('.view-empty', this).length > 0) {
        $('fieldset', this).hide();
      } else {
        var $STATUS = false;
        $('#edit-select', this).addClass('collapsed');
        $('.field-invitation-status', this).each(function() {
          if ($.trim($(this).text()) === 'Accepted') {
            $STATUS = true;
          }
        });
        if ($STATUS) {
          $('.view-footer').show();
        }
      }
    });

    $('.page-user').each(function() {
      $('#profile', this).each(function() {
        var self = $(this);
        var form = $('<div>').addClass('twitter-login').hide();
        form.load(self.attr('data-url'), function() {
          if (self.hasClass('has-account')) {
            var profile = $('<table>').append(form.find('tbody').clone());
            var cells = profile.find('td');
            for (var i = 3; i < cells.length; i++) {
              cells.eq(i).remove();
            }
            profile.append(
              $('<a>')
                .attr('href', '#')
                .addClass('twitter')
                .click(function(e) {
                  e.preventDefault();
                  form.find('#edit-accounts-0-delete').prop('checked', true);
                  form.find('#edit-buttons-submit').trigger('click');
                })
                .append($('<i>').addClass('icon-twitter'))
                .append(' ')
                .append('Remove Twitter account')
            );
            self
              .append(profile)
              .append(form)
              .removeClass('loading');
          } else {
            self.append( 
              $('<a>')
                .attr('href', '#')
                .addClass('twitter')
                .click(function(e) {
                  e.preventDefault();
                  $('#edit-submit', form).trigger('click');
                })
                .append($('<i>').addClass('icon-twitter'))
                .append(' ')
                .append('Log in with Twitter')
            );  
            self.append(form).removeClass('loading');
          }
        });
      });
    });
  });

  /*
    Check for new content in event before running callback function
  */
  $.fn.updateOnNew = function(callback, pause) {
    var eid = $(this).attr('data-eid');
    var url = $(this).attr('data-url');
    var self = $(this).setTimestamp(eid);
    if (typeof pause === 'undefined') {
      pause = 60;
    }
    self.pietimer(
      {
        seconds: pause,
        color: '#000033',
        height: 20,
        width: 20
      },
      function() {
        var timestamp = self.data('timestamp');
        if (timestamp > 0) {
          self
            .find('canvas.pie_timer')
            .after($('<i>').addClass('icon-spinner icon-spin pie-spinner'));
          $.ajax({
            url: '/events/'+eid+'/ping/'+timestamp,
            dataType: 'json',
            beforeSend: function(jqXHR, settings) {
              console.log('Updating data at '+settings.url);
            },
            success: function(data) {
              if (data.length > 0) {
                var changed = parseInt(data[0].changed);
                if (changed > timestamp) {
                  console.info('Data changed '+(data[0].changed - changed)+' secs ago');
                  self.data('timestamp', parseInt(data[0].changed));
                  callback(self, url);
                } else {
                  console.info('No new data found.');
                }
              } else {
                console.info('No new data found.');
              }
              self.updateOnNew(callback, pause);
            },
            error: function(jqXHR, textStatus, errorThrown) {
              console.error(textStatus);
              self.updateOnNew(callback);
            }
          });
        } else {
          self.updateOnNew(callback, pause);
        }
      }
    );
    self.pietimer('start');
    return self;
  };

  /*
    Get data value
  */
  $.fn.getData = function(attr) {
    var self = $(this);
    var data = $('div.data');
    return data.attr('data-'+attr);
  };

  /*
    Set data value
  */
  $.fn.setData = function(attr, val) {
    var self = $(this);
    var data = $('div.data');
    data.attr('data-'+attr, val);
    return val;
  };

  /*
   * Get timestamp of last updated content
   */
  $.fn.setTimestamp = function(eid) {
    var self = $(this);
    if (!self.data('timestamp')) {
      if (self.attr('data-timestamp')) {
        self.data('timestamp', parseInt(self.attr('data-timestamp')));
      } else {
        self.data('timestamp', 0);
        $.ajax({
          url: '/events/'+eid+'/ping',
          dataType: 'json',
          success: function(data) {
            if (data.length > 0) {
              self.data('timestamp', parseInt(data[0].changed));
            } else {
              self.data('timestamp', 0);
            }
          }
        });
      }
    }
    return self;
  };

  /*
     Reveal rows of a view if any row has class '.new'
  */
  $.fn.revealRows = function(pause) {
    $(this).find('.views-row.new').each(function(i) {
      setTimeout(function() {
        $(this)
          .slideDown()
          .removeClass('new');
      }, pause * i);
    });
    return $(this);
  };

  /*
   * Update views content if new content is available
   */
  function AppendViewContent(ele, url) {
    var self = $(ele);
    var rows = $('<div>');
    rows.load(url+'/'+self.getData('timestamp'), function() {
      self
        .parent()
        .append(rows.find('.views-content').children().addClass('timestamp-updated'))
        .revealRows(50)
        .end();
    });
  }
  
  /*
   * Replace views content if new content is available
   */
  function ReplaceViewContent(ele, url) {
    console.log('Replacing content with: '+ url);
    var self = $(ele).parent().siblings('.view-content');
    var rows = $('<div>');
    rows.load(url, function() {
      var oldrows = self.find('tr.timestamp-data');
      rows.find('tr.timestamp-data').each(function(i) {
        var timestamp = $(this).attr('class').match(/[0-9]{10}/);
        if (timestamp != null && !oldrows.eq(i).hasClass('updated-'+timestamp)) {
          $(this).addClass('timestamp-updated');
        }
      });
      self.html(rows.html());
      self.find('tr.timestamp-updated').removeClass('timestamp-updated');
    });
  }

})(jQuery, Drupal, this, this.document);
