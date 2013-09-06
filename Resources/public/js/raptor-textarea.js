(function ($) {
    $(document).ready(function () {
        $("textarea").css({
            'border-top-left-radius': '0',
            'border-top-right-radius': '0'
        });

        $('textarea:not(.no-raptor)').raptor({
            autoEnable: true,
            enableUi: false,
            unloadWarning: false,
            classes: 'raptor-editing-inline',
            plugins: {
                textBold: true,
                textItalic: true,
                textUnderline: true,
                textStrike: true,
                textBlockQuote: true,
                textSizeDecrease: true,
                textSizeIncrease: true,
                insertFile: true,
                clearFormatting: true,
                hr: true,
                tableCreate: true,
                tableDeleteRow: true,
                tableDeleteColumn: true,
                tableCellButton: true,
                tableSupport: true,
                tableSplitCells: true,
                tableMergeCells: true,
                tableInsertRow: true,
                tableInsertColumn: true,
                linkTypeEmail: true,
                linkTypeExternal: true,
                linkTypeDocument: true,
                linkCreate: true,
                linkRemove: true,
                floatLeft: true,
                floatNone: true,
                floatRight: true,
                viewSource: true,
                paste: true,
                dock: {
                    docked: true,
                    dockToElement: true
                }
            },
            disabledPlugins: ['unsavedEditWarning']
        });
    });
})(jQuery);