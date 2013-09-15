(function($) {
    ko.bootstrap.GridModel = function() {
        var self = this;

        this.items = ko.observableArray([]);

        this.itemsCount = ko.computed(function() {
            return self.items().length;
        });
    };

    ko.bootstrap.te.addTemplate("kbl_grid", "\
			<div class=\"row-fluid data-grid\" data-bind=\"foreach: items\">\
				<div class=\"data-grid-element\" data-bind=\"template: {'name':'kbl_grid_item', 'data':$data}\"></div>\
			</div>\
		");

    ko.bootstrap.te.addTemplate("kbl_grid_item", "\
			<div class=\"border\" >\
				<img src=\"\" data-bind=\"attr: {'src': $data.image, 'width':$data.size.width, 'height':$data.size.height}\" />\
				<h5 data-bind=\"text: $data.name\" />\
			</div>\
		");

    ko.bindingHandlers.grid = {
        init: function(element, valueAccessor, allBindingsAccessor) {
            return {"controlsDescendantBindings": true};
        },
        update: function(element, valueAccessor, allBindingsAccessor) {
            var viewModel = valueAccessor(), allBindings = allBindingsAccessor(), gridTemplate;

            gridTemplate = allBindings.gridTemplate || "kbl_grid";

            ko.renderTemplate(gridTemplate, viewModel, {templateEngine: ko.bootstrap.te}, $("<div />").appendTo(element), "replaceNode");
        }
    };
}(jQuery));