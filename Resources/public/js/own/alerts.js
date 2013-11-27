var alerts = {
    display: function (type, message) {
        switch (type) {
            case "info":
            case "error":
            case "success":
            case "warning":
                break;
            default:
                type = "message";
        }

        $(".alerts").html($("<div />").addClass("alert").addClass("alert-" + type).html(message));
    },
    displayInfo: function (message) {
        alerts.display("info", message);
    },
    displayError: function (message) {
        alerts.display("error", message);
    },
    displayWarning: function (message) {
        alerts.display("warning", message);
    },
    displaySuccess: function(message) {
        alerts.display("success", message);
    }
};