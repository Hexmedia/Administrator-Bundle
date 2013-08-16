(function($) {
	ko.bindingHandlers.dump = {
		init: function(element, valueAccessor) {
			return {'controlsDescendantBindings': true};
		},
		update: function(element, valueAccessor, allBindingsAccessor) {
			var value = valueAccessor(), allBindings = allBindingsAccessor();

			if (typeof value === 'function') {
				console.log(value());
			} else {
				console.log(value);
			}
			
		
		}
	};
}(jQuery));