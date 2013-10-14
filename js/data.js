osdata = (function ($, Drupal, osvisuals, ostoolbar, window, document, undefined) {
  var osdata = {

    eid: 0,
    curTime: 0,
    postNum: 10,
    questions: d3.map(),
    posts: d3.map(),
    users: d3.map(),
    statusCheck: [ false, false ],
    colours: d3.scale.category20(),
    timeRange: [],

    // Check if data has changed
    hasChanged: function(timestamp) {
      return this.timeRange[1] > this.parseTimestamp(timestamp);
    },

    // An ajax check to see if event has new content (posts, updates, etc)
    ping: function(callback) {
      var url = '/events/'+this.eid+'/ping';
      $.ajax(url, {
        'dataType': 'json',
        'success': function(d) {
          if (d.length > 0) {
            var t = parseInt(d[0].changed);
            if (t > timeRange[1]) {
              callback();
            }
          }
        }
      });
    },

    getTextCol: function(rgb) {
      brightness = Math.sqrt(
        rgb.r * rgb.r * 0.299 +
        rgb.g * rgb.g * 0.587 +
        rgb.b * rgb.b * 0.114
      );
      return (brightness < 130) ? "#FFFFFF" : "#000000";
    },

    // Parse post data
    setPost: function(data) {
      data.postDate = moment(data.timestamp, 'X').toDate();
      osdata.posts.set(data.nid, data);
      var question = osdata.questions.get(data.qid);
      question.count += 1;
      osdata.questions.get(question.qid, question);
    },

    // Parse question data
    setQuestion: function(data) {
      var self = osdata;
      data.startDate = moment(data.start, 'X').toDate();
      if (typeof data.end !== 'undefined') {
        data.endDate = moment(data.end, 'X').toDate();
      } else {
        data.endDate = moment().toDate();
      }
      data.colour = self.colours(parseInt(data.nid) % 20);
      data.textColour = self.getTextCol(d3.rgb(data.colour));
      var col = d3.rgb(data.colour);
      if (data.textColour === '#FFFFFF') {
        data.backColour = col.darker();
      } else {
        data.backColour = col.brighter();
      }
      data.count = 0;
      osdata.questions.set(data.nid, data);
    },

    searchPosts: function(date) {
      var data = this.posts.values();
      var bisect = d3.bisector(function(d) { return d.posted; }).right;
      return data[bisect(data, date)];
    },

    setUser: function(data) {
      osdata.users.set(data.uid, data);
    },

    // Get a list of question nids that are active
    // in the supplied timestamp
    getActiveQuestions: function() {
      var t = this.curTime;
      var qids = [];
      this.questions.values().filter(function(d) {
        return d.start <= t && (typeof d.end === 'undefined' || d.end > t);
      }).forEach(function(v, k) {
        qids.push(v.nid);
      });
      return qids;
    },

    // Get X most recent posts to supplied timestamp
    getRecentPosts: function() {
      var posts = this.posts.values();
      var pids = {};
      posts = posts.filter(function(v) { return v.postDate <= osdata.curTime; });
      posts
        .slice(Math.max(posts.length * -1, this.postNum * -1))
        .forEach(function(v, k) {
          if (typeof pids[v.qid] === 'undefined') {
            pids[v.qid] = [];
          }
          pids[v.qid].push(v.nid);
        });
      return pids;
    },

    getD3Array: function(timestamp) {
      if (typeof timestamp !== 'undefined') {
        this.curTime = this.parseTimestamp(timestamp);
      }
      var data = {
        questions: this.questions,
        posts: this.posts,
        users: this.users,
        activeQuestions: d3.map(this.getActiveQuestions()).entries(),
        activePosts: this.getRecentPosts()
      };
      return data;
    },

    // Function to make ajax calls and retrieve data from database
    // args can equal either a timestamp (to retrieve only items after
    // supplied date) or a post nid to retrieve post details
    retrieveData: function(type, callback, args) {
      var url = '';
      switch (type) {
        case 'questions':
          url = '/events/'+this.eid+'/json/questions';
          if (typeof args !== 'undefined') {
            url = url + '/'+args;
          }
          break;
        case 'posts':
          url = '/events/'+this.eid+'/json/posts';
          if (typeof args !== 'undefined') {
            url = url + '/'+args;
          }
          break;
        case 'users':
          url = '/events/'+this.eid+'/json/users';
          break;
        case 'author':
          url = '/events/'+this.eid+'/json/author';
          break;
      }
      if (url !== '') {
        d3.json(url, callback);
      }
    },

    // If time isn't set, return the current time
    // otherwise parse the supplied time to an integer
    parseTimestamp: function(t) {
      if (typeof t === 'undefined') {
        return this.curTime;
      }
      return moment(t, 'X').toDate();
    },

    // Go through each question and add to main array
    parseQuestionData: function(e, d) {
      osdata.parseData(e, d, 0);
    },

    // Go through each post and add to main array
    parsePostData: function(e, d) {
      osdata.parseData(e, d, 1);
    },

    // Go through each post and add to main array
    parseUserData: function(e, d) {
      osdata.parseData(e, d, 2);
    },

    parseData: function(err, json, type) {
      if (!err) {
        var callback = null;
        switch(type) {
          case 0:
            callback = osdata.setQuestion;
            break;
          case 1:
            callback = osdata.setPost;
            break;
          case 2:
            callback = osdata.setUser;
            break;
        }
        json.forEach(function(v, k) {
          callback(v);
        });
        osdata.statusCheck[type] = true;
      } else {
        console.log('Error retrieving data');
        console.error(err);
      }
    },

    // Function to return data to requester
    returnData: function(self, callback) {
      if (self.statusCheck[0] && self.statusCheck[1]) {
        clearInterval(self.checkInterval);
        self.timeRange = d3.extent(self.posts.values(), function(d) { return d.postDate; });
        if (typeof callback !== 'undefined') {
          callback();
        }
      }
    },

    // Main data collection function to setup data object and arrays
    getData: function(callback, t) {
      this.curTime = this.parseTimestamp(t);
      this.statusCheck = [ false, false ];
      this.retrieveData('questions', this.parseQuestionData);
      this.retrieveData('posts', this.parsePostData);
      this.retrieveData('users', this.parseUserData);
      this.retrieveData('author', this.parseUserData);
      this.checkInterval = setInterval(function() {
        osdata.returnData(osdata, callback);
      }, 500);
      return this;
    },

    // Initialisation function
    init: function(eid, timestamp) {
      this.eid = eid;
      this.curTime = this.parseTimestamp(timestamp);
      return this;
    }
  }

  return osdata;
    
})(jQuery, Drupal, osvisuals, ostoolbar, this, this.document);
