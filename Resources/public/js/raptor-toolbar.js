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
                            url: Routing.generate("HexMediaAdminEditModeSaveJson"),
                            postName: 'content',
                            id: function() { return $(this.raptor.getElement()).attr('data-type') + ":" + $(this.raptor.getElement()).attr('data-id'); }
                        }
                    }
                }
            );
        });
    });
})(jQuery);