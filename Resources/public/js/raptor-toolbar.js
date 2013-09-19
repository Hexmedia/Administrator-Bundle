var generateRoute = function(url, fun) {
    var type = fun();

    return Routing.generate(url, { "type" : type });
};

(function ($) {
    $(document).ready(function () {
        $(".hexmedia-content-save").each(function() {
            var self = this;

            $(this).raptor(
                {
                    plugins: {
                        dock: {
                            docked: true,
                            docketToElement: false
                        },
                        save: {
                            plugin: 'saveJson'

                        },
                        saveJson: {
                            url: generateRoute("HexMediaAdminEditModeSaveJson",
                                function() { return $(self).attr('data-type'); }),
                            postName: 'content',
                            id: function() { return $(self).attr('data-id'); }
                        }
                    }
                }
            );
        });
    });
})(jQuery);