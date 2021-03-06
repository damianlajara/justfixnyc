'use strict';

// Issues controller
angular.module('issues').controller('IssuesChecklistController', ['$scope', 'Issues',
  function($scope, Issues) {

    $scope.checklist = {};
    $scope.open = [];

    // detects if checklist is included in the update view or the onboarding form
    // used mainly to switch CTA at the bottom
    if($scope.updateView === undefined) $scope.updateView = false;

    Issues.getChecklist().then(function (data) {
      
      var i = 0;
      for(var area in data[0]) {
        var issues = data[0][area].issues;

        // add to checklist object
        $scope.checklist[area] = {
          numChecked : $scope.newIssue.issues[area] ? $scope.newIssue.issues[area].length : 0,
          issues: issues
        };

        // initialize newIssues
        if(!$scope.newIssue.issues[area]) $scope.newIssue.issues[area] = [];

        // add issues that are already selected
        issues.forEach(function (issue) {

          // ugly ugly ugly
          if($scope.issues[area] && 
            $scope.issues[area].map(function(i) { return i.title; }).indexOf(issue.title) !== -1) {
              $scope.select(area,issue);
          }
        });

        $scope.open[i++] = false;

      }
    }, function (err) {
      console.error(err);
    });

    $scope.oneAtATime = true;
    $scope.status = {
      idx: -1,
      isFirstOpen: true,
      isFirstDisabled: false
    };

    $scope.select = function(area, issue) {

      if(!this.isSelected(area, issue)) {
        $scope.newIssue.issues[area].push(issue);
        $scope.checklist[area].numChecked++;
      } else {
        var i = $scope.newIssue.issues[area].indexOf(issue);
        $scope.newIssue.issues[area].splice(i, 1);
        $scope.checklist[area].numChecked--;
      }
    };
    $scope.isSelected = function(area, issue) {
      if(!$scope.newIssue.issues[area]) return false; 
      return $scope.newIssue.issues[area].indexOf(issue) !== -1;
    };
    // $scope.prevGroup = function(idx) {
    //   $scope.open[idx] = false;
    //   $scope.open[idx-1] = true;
    // };
    // $scope.nextGroup = function(idx) {
    //   $scope.open[idx] = false;
    //   $scope.open[idx+1] = true;
    // };
    $scope.closeGroup = function(idx) {
      $scope.open[idx] = false;
      //$window.scrollTo(0, 0);
    };

  }
]);