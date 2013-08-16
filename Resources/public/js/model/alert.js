var AlertModel;

(function($) {
	AlertModel = function() {
		var self = this;

		self.alerts = ko.observableArray([]);

		self.add = function(msg, type, dismiss) {
			alert = {
				message: msg,
				aclass: "alert alert-" + type,
				id: new Date().getTime()
			};
			
			var l = self.alerts().length;
			var al = self.alerts();
			al[l] = alert;
			
			self.alerts(al);
			
			if (typeof dismiss === "number") {
				setTimeout(function() {
					var al = self.alerts();
					for (var i in al) {
						if (al[i].id === alert.id) {
							break;
						}
					}
					
					al.splice(i, 1);
					
					self.alerts(al);
				}, dismiss * 1000);
			}
		};

		self.displayWarning = function(msg, dismiss) {
			self.add(msg, 'warning', dismiss);
		};

		self.displayError = function(msg, dismiss) {
			self.add(msg, 'error', dismiss);
		};

		self.displayInfo = function(msg, dismiss) {
			self.add(msg, 'info', dismiss);
		};

		self.displaySuccess = function(msg, dismiss) {
			self.add(msg, 'success', dismiss);
		};
	};
}(jQuery));