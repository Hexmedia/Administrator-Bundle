var GridModel;

(function($) {
	
	ko.dataTable.ViewModel.prototype.remove = function(id) { 
		var self = this;
		
		self.dataBind();
		
		alerts.displaySuccess("Successfuly removed " + id, 3000);
	};
	
	ko.dataTable.ViewModel.prototype.edit = function(id) {
		
	};
	
	ko.dataTable.ViewModel.prototype.revisions = function() {
		
	};

	GridModel = function() {
		var self = this;
		self.getData = function(callback, data) {
			$.ajax({
				dataType: "JSON",
				url: "./tmp/test_data_grid.php",
				data: data,
				method: 'POST',
				success: callback,
				error: function(e,a,c) {
					
				}
			});
		};
		
		
		self.postData = ko.observable({
		});
		
		self.grid = ko.computed(function() {
			return new ko.dataGrid.ViewModel({
				loader: self.getData,
				pageSize: Math.floor($('.data-area-grid').width() / 130) * 4,
				additionalData: self.postData()
			});
		});
	};
})(jQuery);