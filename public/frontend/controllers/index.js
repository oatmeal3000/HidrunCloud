angular.module('iotgo').
  controller('IndexCtrl', [ '$scope',
    function ($scope) {
      $scope.slides = [{
        href: 'https://github.com/oatmeal3000/qupy',
        src: '/images/home/slideshow/iot.jpg'
      }, {
        href: 'https://github.com/oatmeal3000/qupy',
        src: '/images/home/slideshow/indiegogo.jpg'
      }];
    }
  ]);
