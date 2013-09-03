var alerts;
var orgAlert = alert;

(function($) {
	$(document).ready(function() {
		alerts = new AlertModel();

		if ($('.alerts').get(0)) {
			ko.applyBindings(alerts, $('.alerts').get(0));
		}

//		if ($('.data-area-list').get(0)) {
//			ko.applyBindings(new ListModel(), $('.data-area-list').get(0));
//		}
//
//		if ($('.data-area-grid').get(0)) {
//			ko.applyBindings(new GridModel(), $('.data-area-grid').get(0));
//		}
//
//		if ($('.edit-content').get(0)) {
//			ko.applyBindings(new EditModel(), $('.edit-content').get(0));
//		}

		//Rewriting alert from native to app.
		window.alert = alerts.displayWarning;

		if ($("input[type='date']").get(0)) {
			$("input[type='date']").parent().find('input').datepicker({
				format: 'dd/mm/yyyy'
			}).attr('type', 'text').attr('readonly', true);
		}
	});

}(jQuery));