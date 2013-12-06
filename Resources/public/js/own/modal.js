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
                modalHeader.html(this.title);
            }

            modalBody = $('<div />').addClass('modal-body');
            modalContent.append(modalBody);
            modalBody.html(this.content);

            if (this.footer) {
                modalFooter = $('<div />').addClass('modal-footer');
                modalContent.append(modalFooter);
                modalFooter.html(this.footer);
            }

            modalDialog.append(modalContent);

            this.modal.append(modalDialog);

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