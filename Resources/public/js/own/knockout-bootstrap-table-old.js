(function($) {
	ko.dataTable = {
		ViewModel: function(options) {
			var self = this;

			this.options = {
				loader: null,
				items: [],
				columns: [],
				pageSize: 10,
				pageSizeOptions: [1, 2, 3, 10, 20, 50, 100],
				showPages: 10,
				additionalData: {}
			};

			$.extend(this.options, options);

			this.loader = this.options.loader;

			this.filter = ko.observable("");

			this.additionalData = ko.observable(this.options.additionalData);
			this.itemsData = ko.observableArray(this.options.items);
			this.itemsDataCount = ko.computed(function() {
				return self.itemsData().length;
			});
			this.allItemsCount = ko.observable();
			this.columnsData = ko.observableArray(this.options.columns);
			this.columnsDataCount = ko.computed(function() {
				return self.columnsData().length;
			});
			this.filter = ko.observable();
			this.page = ko.observable(1);
			this.pageSize = ko.observable(this.options.pageSize);
			this.pageSizeOptions = ko.observableArray(this.options.pageSizeOptions);
			this.showPages = ko.observable(this.options.showPages);

			this.items = ko.computed(function() {
				var items = self.itemsData();

				$.each(items, function(key, val) {
					items[key] = val;
					items[key].checked = ko.observable(false);
					items[key].isChecked = ko.computed({
						read: function() {
							return val.checked();
						},
						write: function() {
							val.checked(!val.checked());
							self.allChecked(false);
						}
					});
				});

				return items;
			});

			this.itemsCount = ko.computed(function() {
				return self.items().length;
			});

			this.columns = ko.computed(function() {
				var columns = [];
				var i = 0;

				columns[i++] = {
					display: '<input type="checkbox" value="1" name="group[all]" />',
					name: 'group',
					sortable: false
				};

				$.each(self.columnsData(), function(k, column) {
					columns[i++] = column;
				});

				columns[i++] = {
					display: "Add Action", //FIXME add add action here
					name: "actions",
					sortable: false
				};

				return columns;
			});

			this.columnsCount = ko.computed(function() {
				return self.columns().length;
			});

			this.sort = ko.observable();
			this.sortDirection = ko.observable();

			this.totalPages = ko.computed(function() {
				return self.allItemsCount() / self.pageSize();
			});
			this.pages = ko.computed(function() {
				var pages = [];

				var s = Math.floor(Math.max(1, self.page() - self.showPages() / 2));
				var e = Math.floor(Math.min(self.totalPages(), self.page() + self.showPages() / 2));
				var r = e - s;

				if (r < self.showPages()) {
					if (e === self.totalPages() && s !== 1) {
						s = Math.floor(Math.max(1, s - self.showPages() + r));
					} else if (s === 1 && e !== self.totalPages()) {
						e = Math.floor(Math.min(self.totalPages(), self.showPages()));
					}
				}

				for (; s <= e; s++) {
					pages.push(s);
				}

				return pages;
			});
			this.goToPage = function(p) {
				if (p >= 1 && p <= self.totalPages()) {
					self.page(p);
				}
			};
			this.prevPage = function() {
				self.goToPage(self.page() - 1);
			};
			this.nextPage = function() {
				self.goToPage(self.page() + 1);
			};
			this.firstPage = function() {
				self.page(1);
			};
			this.lastPage = function() {
				self.page(self.totalPages());
			};

			this.doSort = function(obj) {
				var name = obj.name;

				if (self.sort() === obj.name) {
					self.sortDirection(self.sortDirection() === "ASC" ? "DESC" : "ASC");
				} else {
					self.sort(obj.name);
					self.sortDirection("DESC");
				}
			};

			this.allChecked = ko.observable(false);

			this.isChecked = ko.computed({
				read: function() {
					return self.allChecked();
				},
				write: function() {
					var checked = !self.allChecked();

					for (var i in self.items()) {
						self.items()[i].checked(checked);
					}

					return self.allChecked(checked);
				}
			});

			this.dataBind = function() {
				var post = this.additionalData();

				post.page = this.page();
				post.pageSize = this.pageSize();
				post.sort = this.sort();
				post.sortDirection = this.sortDirection();

				post.filter = this.filter();

				self.loader(function(data) {
					if (typeof data.items !== 'undefined') {
						self.itemsData(data.items);
					}

					if (typeof data.columns !== 'undefined') {
						self.columnsData(data.columns);
					}

					if (typeof data.pageSizeOptions !== 'undefined') {
						self.pageSizeOptions(data.pageSizeOptions);
					}

					if (typeof data.itemsCount !== 'undefined') {
						self.allItemsCount(data.itemsCount);
					}
				}, post);
			};
			
			this.content = ko.computed(function() {
				self.dataBind();
			});
		}
	};

	var te = new ko.nativeTemplateEngine();

	te.addTemplate = function(name, html) {
		document.write('<script type="text/html" id="' + name + '">' + html + '</script>');
	};

	te.addTemplate('kbl_group', '<input type="checkbox" data-bind="checked: isChecked, name: \'group[\' + $data.id + \']\'" />');
	te.addTemplate('kbl_group_all', '<span /><input type="checkbox" data-bind="checked: $root.isChecked" />');
	te.addTemplate('kbl_actions', '<a class="icon-edit" href="#" data-bind="click: $parent.edit"></a><a class="icon-trash" href="#" data-bind="modal: {\'title\':\'Delete \' + name, \'body\':\'<p>Do you want to delete \' + name, \'buttons\': [{\'name\':\'Delete\', \'action\': function() { $root.remove($data.id); }}]}"></a>');
	te.addTemplate('kbl_table', '<table class="table table-hover"></table>');
	te.addTemplate('kbl_group_actions', '\
			Bulk: <div class="btn-group">\
			<button class="btn">Trash</button>\
			<button class="btn">Publish</button>\
			<button class="btn">Unpublish</button>\
		  </div>')

	te.addTemplate('kbl_table_header', '\
		<thead><tr>\
				<th data-bind="template: {\'name\':\'kbl_group_all\', \'data\':$data}"></th>\
			<!-- ko foreach: columnsData -->\
				<th>\
					<!-- ko if: $data.sortable -->\
					<a data-bind="html: display, click: $root.doSort"></a>\
					<!-- /ko -->\
					<!-- ko ifnot: $data.sortable -->\
					<div data-bind="html: display"></div>\
					<!-- /ko -->\
				</th>\
			<!-- /ko -->\
		</tr></thead>');
	te.addTemplate('kbl_table_list', '<tbody data-bind="foreach: items">\
			<tr>\
				<td data-bind="template: { \'name\': \'kbl_group\', \'data\': $data }"></td>\
				<!-- ko foreach: $parent.columnsData -->\
				<td data-bind="html: $parent[name]"></td>\
				<!-- /ko -->\
				<td data-bind="template: { \'name\': \'kbl_actions\', \'data\': $data }"></td>\
			</tr></tbody>');
	te.addTemplate('kbl_pagination', '<tfoot><tr><td data-bind="attr: {\'colspan\': columnsCount}">\
			<div data-bind="foreach: pageSizeOptions">\
				<!-- ko if: $data == $root.pageSize() -->\
                    <span data-bind="text: $data"/>\
                <!-- /ko -->\
                <!-- ko if: $data != $root.pageSize() -->\
                    <a href="#" data-bind="text: $data + \' \', click: function() { $root.pageSize($data) }"/>\
                <!-- /ko -->\
			</div>\
			<div data-bind="if: totalPages() > 1">\
				<div class="pagination">\
					<ul>\
						<li data-bind="css:{disabled:isFirstPage()}">\
							<a href="#" data-bind="click: $root.firstPage">« first</a>\
						</li>\
						<li data-bind="css:{disabled:isFirstPage()}">\
							<a href="#" data-bind="click: $root.prevPage">« prev</a>\
						</li>\
						<!-- ko foreach: pages() -->\
							<li data-bind="css: { active: $data === ($root.page()), disabled: $data == ($root.page())}">\
								<a href="#" data-bind="text: $data, click: $root.goToPage"/>\
							</li>\
						<!-- /ko -->\
						<li data-bind="css: { disabled: isLastPage() }">\
							<a href="#" data-bind="click: $root.nextPage">next »</a>\
						</li>\
						<li data-bind="css: { disabled: isLastPage() }">\
							<a href="#" data-bind="click: $root.lastPage">last »</a>\
						</li>\
					</ul>\
				</div>\
			</div>\
		</td></tr></tfoot>');
	te.addTemplate('kbl_actions_template', '<a class="icon-edit"></a><a class="icon-delete"></a>');
	te.addTemplate('kbl_filter_template', '\
						<div class="well well-large">\
							<form class="navbar-search pull-left">\
								<input type="text" class="search-query" placeholder="Search" data-bind="value: filter, valueUpdate: \'change\'">\
							</form>\
						</div>');

	ko.bindingHandlers.dataTable = {
		init: function(element, valueAccessor) {
			return {'controlsDescendantBindings': true};
		},
		update: function(element, valueAccessor, allBindingsAccessor) {
			var viewModel = valueAccessor(), allBindings = allBindingsAccessor();


			var tableTemplate = allBindings.tableTemplate || "kbl_table";
			var filterTemplate = allBindings.filterTemplate || "kbl_filter_template";
			var groupActionsTemplate = allBindings.groupActionsTemplate || "kbl_group_actions";
			var tableHeaderTemplate = allBindings.tableHeaderTemplate || "kbl_table_header";
//			var tableHeaderContentTemplate = allBindings.tableHeaderContentTemplate || "kbl_header_content";
			var tableListTemplate = allBindings.tableListTemplate || "kbl_table_list";
			var tableListContentTemplate = allBindings.tableListContentTemplate || "kbl_list_content";
			var tablePaginationTemplate = allBindings.tablePaginationTemplate || "kbl_pagination";
			var groupTemplate = allBindings.groupTemplate || "kbl_group";

			ko.renderTemplate(tableTemplate, viewModel, {templateEngine: te}, $('<div />').appendTo(element), "replaceNode");

			var table = $(element).find('table')[0];

			ko.renderTemplate(groupActionsTemplate, viewModel, {templateEngine: te}, $('<div />').prependTo(element), "replaceNode");
			ko.renderTemplate(filterTemplate, viewModel, {templateEngine: te}, $('<div />').prependTo(element), "replaceNode");
			ko.renderTemplate(tableHeaderTemplate, viewModel, {templateEngine: te}, $('<div />').appendTo(table), "replaceNode");
			ko.renderTemplate(tableListTemplate, viewModel, {templateEngine: te}, $('<div />').appendTo(table), "replaceNode");
			ko.renderTemplate(tablePaginationTemplate, viewModel, {templateEngine: te}, $('<div />').appendTo(table), "replaceNode");
		}
	};
}(jQuery));