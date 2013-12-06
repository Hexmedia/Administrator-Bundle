(function ($) {
    $(document).ready(function () {
        var changeHeight = function () {
            var docHeight, windowHeight, height;

            docHeight = $(document).height();
            windowHeight = $(window).height();

            height = Math.max(docHeight, windowHeight);

            $('.container>.content').each(function () {
                var toSet = height - 3 - $(".container>.header").height();

                $(this).find('.menu').height(toSet);
                $(this).find('.main-content').height(toSet);
            });
        }

        $(window).resize(function () {
            changeHeight();
        });

        changeHeight();

        $('[data-toggle="modal2"]').click(function () {
            var modal, modalDialog, modalContent, href;

            modal = $('<div />').addClass("modal").addClass("fade");
            modalDialog = $('<div />').addClass("modal-dialog");
            modalContent = $('<div />').addClass('modal-content');

            if ($(this).data('modal-class')) {
                $(modal).addClass($(this).data('modal-class'));
            }

            modalDialog.append(modalContent);
            modal.append(modalDialog);

            $(modal).modal('show');

            modalContent.html($("<div />").addClass("modal-loading").text("loading..."));

            href = $(this).attr('href');

            $.ajax(href, {
                success: function (response) {
                    modalContent.html(response);
                },
                error: function () {
                    $(modal).modal("hide");
                }
            });

            return false;
        });

        $("select[multiple]").chosen();

        $('[data-delete]').click(function () {
            var self, modal, footer, buttonOk, buttonCancel;

            self = this;

            buttonOk = $("<button />").addClass("btn").addClass("btn-primary").text(Translator.get("Confirm"));
            buttonCancel = $("<button />").addClass("btn").text(Translator.get("Cancel"));

            footer = $('<p />');

            footer.append(buttonOk);
            footer.append(buttonCancel);

            modal = new Modal($(this).data('delete'), footer);

            buttonCancel.click(function () {
                modal.hide();
            });

            buttonOk.click(function () {
                $.ajax($(self).attr('href'), {
                    type: "DELETE",
                    dataType: "jsonp",
                    success: function () {
                        window.location.reload();
                    },
                    error: function () {
                        Translator.get("An error has occured!");
                    }
                });
            });

            modal.show();
        });
    });

    $('[data-toggle="confirm"]').click(function () {
        var self, modal, modalDialog, modalContent, modalHeader, modalFooter, modalBody, buttonOk, buttonCancel;

        self = this;

        modal = $('<div />').addClass("modal").addClass("fade");
        modalDialog = $('<div />').addClass("modal-dialog");
        modalContent = $('<div />').addClass('modal-content');
        modalHeader = $('<div />').addClass('modal-header');
        modalFooter = $('<div />').addClass('modal-footer');
        modalBody = $('<div />').addClass('modal-body');

        modalContent.append(modalHeader);
        modalContent.append(modalBody);
        modalContent.append(modalFooter);
        modalDialog.append(modalContent);
        modal.append(modalDialog);

        modalHeader.text($(this).data("confirm-title"));
        modalBody.html("<p>" + $(this).data("confirm-body") + "</p>");

        buttonOk = $("<button />").addClass("btn").addClass("btn-primary").text(Translator.get("Confirm"));
        buttonCancel = $("<button />").addClass("btn").text(Translator.get("Cancel"));

        modalFooter.append(buttonOk);
        modalFooter.append(buttonCancel);

        $(modal).modal("show");

        buttonCancel.click(function () {
            $(modal).modal("hide");
        });

        buttonOk.click(function () {
            if ($(self).data("confirm-type") == "ajax") {
                $.ajax($(self).attr('href'), {
                    type: $(self).data("confirm-method"),
                    success: function () {
                        document.location.reload();
                    },
                    error: function () {
                        alert("An error has occured!");
                    }
                });
            } else {
                document.location.href = $(self).attr('href');
            }
        });

        return false;
    });
}(jQuery));