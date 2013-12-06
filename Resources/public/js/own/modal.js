var Modal;

(function ($) {
    Modal = function (content, footer, title, call) {
        this.title = title;
        this.content = content;
        this.footer = footer;
        this.call = call;

        this.show = function () {
            var self, modal, modalDialog, modalHeader, modalContent, modalFooter, modalBody, buttonOk, buttonCancel;

            this.modal = $('<div />').addClass("modal").addClass("fade");
            modalDialog = $('<div />').addClass("modal-dialog");
            modalContent = $('<div />').addClass('modal-content');

            if (this.title) {
                modalHeader = $('<div />').addClass('modal-header');
                modalContent.append(modalHeader);
            }

            modalBody = $('<div />').addClass('modal-body');
            modalContent.append(modalBody);

            if (this.footer) {
                modalFooter = $('<div />').addClass('modal-footer');
                modalContent.append(modalFooter);
            }

            modalDialog.append(modalContent);

            this.modal.append(modalDialog);

            modalBody.html(this.content);
            modalFooter.html(this.footer);
            modalHeader.html(this.title);

            this.modal.modal("show");

            if (typeof this.call === "function") {
                this.call();
            }

            return false;
        }

        this.hide = function() {
            this.modal.modal("hide");
        }
    };
}(jQuery));