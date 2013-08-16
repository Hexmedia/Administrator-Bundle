(function($) {
	ko.dataGrid = {
		ViewModel: ko.dataTable.ViewModel
	};
	
	//Extending ViewModel
	
	ko.dataGrid.ViewModel

	//End of extending
	var te = new ko.nativeTemplateEngine();

	te.addTemplate = function(name, html) {
		document.write('<script type="text/html" id="' + name + '">' + html + '</script>');
	};

	te.addTemplate('kbl_grid', '<div class="row-fluid data-grid" data-bind="foreach: items">\
		<div class="data-grid-element" data-bind="template: {\'name\':\'kbl_grid_item\', \'data\':$data}, click: $root.select"></div>\
		</div>');

	te.addTemplate('kbl_grid_item', '\
			<div class="border" >\
				<img src="" data-bind="attr: {\'src\': $data.image, \'width\':$data.size.width,\'height\':$data.size.height}" />\
				<h5 data-bind="text: $data.name" />\
			</div>\
			\
			\
		');
	
	te.addTemplate('kbl_grid_pagination', '\
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
			</div>');

	ko.bindingHandlers.dataGrid = {
		init: function(element, valueAccessor) {
			return {'controlsDescendantBindings': true};
		},
		update: function(element, valueAccessor, allBindingsAccessor) {
			var viewModel = valueAccessor(), allBindings = allBindingsAccessor();

			var gridTemplate = allBindings.gridTemplate || "kbl_grid";
			var filterTemplate = allBindings.filterTemplate || "kbl_filter_template";
//			var groupActionsTemplate = allBindings.groupActionsTemplate || "kbl_group_actions";
//			var tableHeaderTemplate = allBindings.tableHeaderTemplate || "kbl_table_header";
////			var tableHeaderContentTemplate = allBindings.tableHeaderContentTemplate || "kbl_header_content";
//			var tableListTemplate = allBindings.tableListTemplate || "kbl_table_list";
//			var tableListContentTemplate = allBindings.tableListContentTemplate || "kbl_list_content";
			var paginationTemplate = allBindings.paginationTemplate || "kbl_grid_pagination";
//			var groupTemplate = allBindings.groupTemplate || "kbl_group";

			ko.renderTemplate(gridTemplate, viewModel, {templateEngine: te}, $('<div />').appendTo(element), "replaceNode");
//
			var grid = $(element).find('div.data-grid')[0];
//
//			ko.renderTemplate(groupActionsTemplate, viewModel, {templateEngine: te}, $('<div />').prependTo(element), "replaceNode");
			ko.renderTemplate(filterTemplate, viewModel, {templateEngine: te}, $('<div />').prependTo(element), "replaceNode");
//			ko.renderTemplate(tableHeaderTemplate, viewModel, {templateEngine: te}, $('<div />').appendTo(table), "replaceNode");
//			ko.renderTemplate(tableListTemplate, viewModel, {templateEngine: te}, $('<div />').appendTo(table), "replaceNode");
			ko.renderTemplate(paginationTemplate, viewModel, {templateEngine: te}, $('<div />').appendTo(element), "replaceNode");
		}
	};
}(jQuery));