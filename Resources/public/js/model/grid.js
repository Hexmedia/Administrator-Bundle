var GridModel;

(function ($) {

    GridModel = function () {
        var self = this, grid = new ko.bootstrap.GridModel(), pagination,
            limit, offset, onScroll, containerWidth, elementWidth, perLine, data,
            windowHeight, loading;

        pagination = new ko.bootstrap.PaginationModel({
            goToPage: function (p) {
                self.getData();
            }
        });

        $(document).ready(function () {
            var elementDiv = $("<div></div>").addClass("data-grid-element").appendTo($(".data-grid"));
            containerWidth = $(".data-grid").width();
            elementWidth = elementDiv.width();
            elementDiv.remove();
            windowHeight = $(window).height();
            perLine = Math.floor(containerWidth / elementWidth);
        });

        limit = ko.observable(100);
        offset = ko.observable(0);
        itemCount = ko.observable();

        onScroll = function () {
            if (typeof perLine !== "undefined") {
                limit(perLine * 7);
            }

//            if ($(document).scrollTop() + windowHeight >= $(document).height() * 0.8) {
//                offset(grid.items().length);
//                self.getData();
//            }
        };

        onScroll();

        self.urlData = ko.observable({});

        data = $.extend({}, self.urlData(), {
            page: pagination.page(),
            pageSize: pagination.pageSize(),
        });

        $(document).scroll(function (c, a) {
            onScroll();
        });

        self.getData = function (local) {
            console.log("GETTING DATA");

            console.log(entitiesData);

            if (!loading) {
                var prepareEntities;

                loading = true;

                prepareEntities = function (entities) {
                    var t, j;

                    j = 0;
                    loading = false;

                    for (t in entities) {
                        var item;

                        item = entities[j++];
                        item.checked = ko.observable(false);
                        item.class = ko.computed(function () {
                            return "data-grid-element" + (this.checked() ? " is-checked" : "");
                        }, item);
                        item.select = function (itemEl) {
                            itemEl.checked(!itemEl.checked());
                        };

                        grid.items.push(item);
                    }
                };

                if (typeof local !== "undefined" && local) {
                    prepareEntities(entitiesData.entities);
                } else {
                    $.ajax({
                        dataType: "json",
                        url: self.getUrl(data),
                        method: 'GET',
                        success: function (response) {
                            prepareEntities(response.entities);
                        },
                        error: function (e, a, c) {

                        }
                    });
                }
            }
        };

        self.grid = ko.computed(function () {
            return grid;
        });

        grid.parent = self;

        self.allChecked = ko.computed({
            read: function () {
                var i, items = grid.items();
                for (i in items) {
                    if (items[i].checked() === false) {
                        return false;
                    }
                }

                return true;
            },
            write: function (change) {
                var i, items = table.items();
                for (i in items) {
                    items[i].checked(change);
                }
            }
        });

        self.getData(true);
    };
})(jQuery);