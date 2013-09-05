(function ($) {
    $(document).ready(function () {
        $(".hexmedia-area").raptor(
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
                        url: Routing.generate("HexMediaAdminEditModeSaveJson", {
                            "type": "area"
                        }),
                        postName: 'text',
                        id: function() { return $(this.raptor.getElement()).attr('data-id') }
                    }
                }
            }
        );
    });
})(jQuery);