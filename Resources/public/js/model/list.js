var ListModel;

(function($) {
	var sortModel = function() {
		var self = this;

		self.sort = ko.observable("id");
		self.direction = ko.observable("ASC");
	};

	ListModel = function() {
		var self = this, table = new ko.bootstrap.TableModel(), pagination, deleteConfirm, sort;

		pagination = new ko.bootstrap.PaginationModel({
			goToPage: function(p) {
				self.getData();
			}
		});

		sort = new sortModel();

		self.sort = ko.observable(sort);

		self.urlData = ko.observable({});

		self.getData = function(local) {
			var prepareEntities;

			prepareEntities = function(entities) {
				for (t in entities) {
					var items = [], c, t, j;

					items = [];
					j = 0;
					for (t in entities) {
						var i = items.length;

						items[i] = entities[i];
						items[i].number = ++j + 10 * (self.pagination().page() - 1);
						items[i].checked = ko.observable(false);
					}

					table.items(items);
				}
			};

			if (typeof local !== "undefined" && local) {
				console.log(entitiesData.entities);
				prepareEntities(entitiesData.entities);
				pagination.itemCount(entitiesData.entitiesCount);
			} else {
				var data = $.extend({}, self.urlData(), {
					page: pagination.page(),
					sort: sort.sort(),
					pageSize: pagination.pageSize(),
					sortDirection: (typeof sort.direction() === "string" ? sort.direction().toLowerCase() : sort.direction())
				});

				$.ajax({
					dataType: "json",
					url: self.getUrl(data),
					method: 'GET',
					success: function(response) {
						console.log(response.entities);
						prepareEntities(response.entities);
						//Pagination
						pagination.itemCount(response.entitiesCount);

					},
					error: function(e, a, c) {

					}
				});
			}
		};

		self.list = ko.computed(function() {
			return table;
		});

		self.action = function() {
		};

		self.pagination = ko.computed(function() {
			return pagination;
		});

		table.parent = self;

		self.allChecked = ko.computed({
			read: function() {
				var i, items = table.items();

				for (i in items) {
					if (items[i].checked() === false) {
						return false;
					}
				}

				return true;
			},
			write: function(change) {
				var i, items = table.items();

				for (i in items) {
					items[i].checked(change);
				}
			}
		});

		deleteConfirm = new ko.bootstrap.ConfirmModel({
			action: function(data) {
				//Here request delete action and on success show succes, and reload items.
				$("#element_" + data.id).remove();
				alerts.displaySuccess("Success", 10000);
			},
			message: "Realy want to delete?"
		});

		self.deleteConfirm = ko.observable(deleteConfirm);

		self.getData(true);
	};

	ko.bindingHandlers.sort = {
		init: function() {
			return {"controlsDescendantBindings": false};
		},
		update: function(element, valueAccessor, allBindingsAccessor, vm, bindingContext) {
			var viewModel = valueAccessor(), allBindings = allBindingsAccessor(), name, direction = null;

			//Need to check if view model is an object and if yes set name propertly

			if (typeof viewModel == 'object') {
				name = viewModel.name || "id";
			} else {
				name = viewModel;
			}

			$(element).bind('click', function() {
				direction = viewModel.direction || null;

				if (bindingContext.$parentContext.$data.parent.sort().sort() === name && direction === null) {
					direction = bindingContext.$parentContext.$data.parent.sort().direction();

					if (direction === "ASC") {
						direction = "DESC";
					} else {
						direction = "ASC";
					}
				} else {
					direction = bindingContext.$parentContext.$data.parent.sort().direction();
				}

				bindingContext.$parentContext.$data.parent.sort().sort(name);
				bindingContext.$parentContext.$data.parent.sort().direction(direction);

				//Need to be moved to sortModel
				bindingContext.$parentContext.$data.parent.getData();
				return false;
			});
//			bindingContext.$parentContext.$data.parent.sort.sr
		}
	};
})(jQuery);