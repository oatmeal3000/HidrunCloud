angular.module('iotgo')
.controller('DevicesCtrl', [ '$scope', '$window', '$location', 'User', 'Devices',
  function ($scope, $window, $location, User, Devices) {
    if (! User.isLoggedIn()) {
      $window.alert('Restricted area, please login first!');
      $location.path('/login');
      return;
    }

    var _devices;

    $scope.showModal = function (selector) {
      var deviceDetail = angular.element(selector);
      deviceDetail.on('shown.bs.modal', function () {
        // datetime picker
        angular.element('#datetimepicker').datetimepicker();
      });
      deviceDetail.modal();
    };

    $scope.hideModal = function () {
      angular.element('.modal').modal('hide');
    };

    $scope.createDevice = function () {
      if (! $scope.device || ! $scope.device.name ||
           ! $scope.device.group) {
        $window.alert('Device name and group are required!');
        return;
      }

      Devices.save({
        name: $scope.device.name,
        type: "00",
        group: $scope.device.group
      }, function () {
        $scope.hideModal();
        $scope.device = null;
        $scope.devices = groupBy(_devices, 'group');
      }, function () {
        $window.alert('Create device failed! Please try again later.');
      });
    };
   
    $scope.addDevice = function () {
      if (! $scope.device || ! $scope.device.name || !$scope.device.group ||
          ! $scope.device.deviceid || ! $scope.device.apikey) {
        $window.alert('Device name, group, id and api key are required!');
        return;
      }

      Devices.add({
        name: $scope.device.name,
        group: $scope.device.group,
        deviceid: $scope.device.deviceid,
        apikey: $scope.device.apikey
      }, function () {
        $scope.hideModal();
        $scope.device = null;
        $scope.devices = groupBy(_devices, 'group');
      }, function () {
        $window.alert('Add device failed! Please try again later.');
      });
    };

    $scope.showDevice = function (device) {
      $scope.activeDevice = device;
      $scope.activeDevice.params = $scope.activeDevice.params || {};
      $scope.activeDevice.clientCamera = $scope.activeDevice.clientCamera || ''; //sunkailiang 20151005

      $scope.showModal('#activeDevice');
    };

    $scope.saveDevice = function () {
      if (! $scope.activeDevice || ! $scope.activeDevice.name ||
        ! $scope.activeDevice.group) {
        $window.alert('Device name and group are required!');
        return;
      }

      $scope.activeDevice.$save(function (device) {
        if (device.error) {
          $window.alert(device.reason);
          return;
        }

        $scope.devices = groupBy(_devices, 'group');
      }, function () {
        $window.alert('Save device failed! Please try again later.');
      });
    };

    $scope.deleteDevice = function () {
      if (! $window.confirm('You really want to delete this device?')) {
        return;
      }

      Devices.remove($scope.activeDevice.deviceid, function () {
        $scope.hideModal();
        $scope.devices = groupBy(_devices, 'group');
        $scope.activeDevice = null;
      }, function () {
        $window.alert('Delete device failed! Please try again later.');
      });
    };

    $scope.turnOn = function (device, property) {
      update(device, property, 'on');
    };

    $scope.turnOff = function (device, property) {
      update(device, property, 'off');
    };

    $scope.isDeviceOnline = function (device) {
      if (! device ) return false;
      return device.online ? 'Device Online' : ' Device Offline';
    };

    $scope.addTimer = function (actionName) {
      var timerAt = angular.element('#timerAt').val();
      var timerAction = angular.element('#timerAction label.active input').val();
      if (! timerAt || ! timerAction) {
        $window.alert('Please specify timer details!');
        return;
      }

      var timer = {
        enabled: true,
        type: 'once',
        at: (new Date(timerAt)).toISOString(),
        do: {}
      };
      timer.do[actionName] = timerAction;

      var timers = angular.extend([], $scope.activeDevice.params.timers || []);
      timers.push(timer);
      update($scope.activeDevice, 'timers', timers);
    };

    $scope.removeTimer = function (timer) {
      var timers = angular.extend([], $scope.activeDevice.params.timers);
      timers.splice(timers.indexOf(timer), 1);
      update($scope.activeDevice, 'timers', timers);
    };

    /* addCommand , sunkailiang 20150921 */ 
    $scope.addCommand = function () {
      var commandName = angular.element('#commandName').val();
      if (! commandName ) {
        $window.alert('Please specify command for device!');
        return;
      }

      var commands = angular.extend([], $scope.activeDevice.params.commands || []);
      commands.push(commandName);
      update($scope.activeDevice, 'commands', commands);
    };

    /* removeCommand , sunkailiang 20150921 */
    $scope.removeCommand = function (commandName) {
      var commands = angular.extend([], $scope.activeDevice.params.commands);
      commands.splice(commands.indexOf(commandName), 1);
      update($scope.activeDevice, 'commands', commands);
    };

    /* issueCommand , sunkailiang 20150921 */
    $scope.issueCommand = function (commandName, device, property) {
      command(device, property);
      $window.alert(commandName + ' has been issued. ');
    };
 
    var groupBy = function (input, property) {
      if (! angular.isArray(input) || ! angular.isString(property)) {
        return input;
      }

      var group = {};

      angular.forEach(input, function (item) {
        var name = item[property];
        if (! name) {
          group['Default Group'] = group['Default Group'] || [];
          group['Default Group'].push(item);
          return;
        }

        group[name] = group[name] || [];
        group[name].push(item);
      });

      return group;
    };

    var pending = null;
    var canSendReq = function (device) {
  //  if (! isIndieDevice(device)) return true; //sunkailiang 20150923

      if (! device.online) {
        $window.alert('Device is offline, operation can not be performed!');
        return false;
      }

      if (! Object.keys(device).length) {
        $window.alert('Device status is unknown, please wait for a moment.');
        return false;
      }

      if (pending) {
        $window.alert('Request in progress, please wait for a moment.');
        return false;
      }

      return true;
    };

    var isIndieDevice = function (device) {
      return parseInt(device.deviceid.substr(2, 1), 16) >= 8;
    };

    var update = function (device, property, value) {
      if (! canSendReq(device)) return;
      
      pending = { params: {} };
      pending.params[property] = value;

      Devices.send({
        action: 'update',
        apikey: device.apikey,
        deviceid: device.deviceid,
        params: pending.params
      }, function () {
        $scope.$apply(function () {
          angular.extend(device.params, pending.params);
        });
        pending = null;
      }, function () {
        $window.alert('Operation failed, please try again later.');
        pending = null;
      });
    };
   
    //sunkailiang 20150924 
    var command = function (device, property) {
      if (! canSendReq(device)) return;
      
      Devices.send({
        command: property,
        apikey: device.apikey,
        deviceid: device.deviceid,
      }, function () {
        pending = null;
      }, function () {
        $window.alert('Operation failed, please try again later.');
        pending = null;
      });
    };

 
    var isActive = User.isActive();
    if (isActive) {
      Devices.query(function (devices) {
        _devices = devices;
        $scope.devices = groupBy(_devices, 'group');
      }, function () {
        $window.alert('Retrieve device list failed!');
      });
      $('#checkActiveDiv').hide();
    } else {
      $scope.isDisabled = !isActive;
      $('#checkActiveDiv').show();
      var isExpire = User.isExpire();
      if (isExpire) {
        $('#checkActiveSpan').show();
      }
    }

  }
]);
