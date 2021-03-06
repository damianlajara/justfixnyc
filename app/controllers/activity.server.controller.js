'use strict';

var _ = require('lodash'),
    Q = require('q'),
    errorHandler = require('./errors.server.controller'),
    s3Handler = require('../services/s3.server.service'),
    mongoose = require('mongoose'),
    User = mongoose.model('User');


var aptSpaces = ['generalApt', 'entryHallway', 'kitchen', 'bathroom', 'diningRoom', 'livingRoom', 'bedrooms', 'publicAreas', 'otherContent'];

var list = function(req, res) {

  if(req.user) {
    res.json(req.user.activity);
  } else {
    res.status(400).send({
      message: 'User is not signed in'
    });
  }
};

var s3upload = function(file) {

  var uploaded = Q.defer();

  // this is mainly for user friendliness. this field can be freely tampered by attacker.
  // if (!/^image\/(jpe?g|png|gif)$/i.test(file.type)) {
  //     return uploaded.reject('images only');
  // }

  if(!file) uploaded.reject('no file?');

  var type = file.originalFilename.match(/\.([0-9a-z]+)(?:[\?#]|$)/i)[0];

  s3Handler.uploadFile(file.path, type)
    .then(function (data) {
      console.log('s3 file success!', data);
      var url = data.Location;
      var resizedUrl = url.replace( /justfix/i, 'justfixresized' );

      uploaded.resolve({ url: data.Location, thumb: resizedUrl });
    }).fail(function (err) {
      console.log(err);
      uploaded.reject(err);
    });

  return uploaded.promise;

};

var create = function(req, res) {
  var user = req.user;
  var activity = req.body;
  //var files = req.files;

  //console.log(req.body, req.files);
  // don't forget to delete all req.files when done

  if(user) {

    // ignore area related activities from follow up check
    if(aptSpaces.indexOf(activity.key) === -1) {
      // remove from follow up flags
      var idx = user.followUpFlags.indexOf(activity.key);
      if(idx < 0) return res.status(500).send({ message: 'Follow up key not found, this is bad' });
      else user.followUpFlags.splice(idx, 1);
    }

    // add to action flags
    if(activity.key !== 'otherContent') user.actionFlags.push(activity.key);

    var allInitial = true;
    // for every area in issues
    for(var area in user.issues) {
      // if the area has issues...
      if(user.issues[area].length) {
        // if the area content hasn't been done yet
        if(user.actionFlags.indexOf(area) === -1) allInitial = false;
      }
    }
    if(allInitial) user.actionFlags.push('allInitial');
    else {
      var idx = user.actionFlags.indexOf('allInitial');
      if(idx !== -1) user.actionFlags.splice(idx, 1);
    }

    // init photos array
    activity.photos = [];

    var files = req.files;

    // init photos queue
    var uploadQueue = [];

    for(var file in files) uploadQueue.push(s3upload(files[file]));

    Q.allSettled(uploadQueue).then(function (results) {

      results.forEach(function (r) {
        if(r.state !== 'fulfilled') res.status(500).send({ message: err });

        activity.photos.push({
          url: r.value.url, 
          thumb: r.value.thumb
        });
      });

      // add activity object
      user.activity.push(activity);

      // add activity to db
      user.save(function(err) {
        if(err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        } else {
          res.jsonp(user);
        }
      });
    });  // end of Q.allSettled

  } else {
    res.status(400).send({
      message: 'User is not signed in'
    });
  }
};

module.exports = {
  list: list,
  create: create
};