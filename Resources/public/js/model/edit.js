var EditModel;

(function($) {
	EditModel = function() {
		var self = this;
		
		this.realTitle = ko.observable();
		this.title = ko.computed({
			read: function() {
				return self.realTitle();
			},
			write: function(text) {
				self.realTitle(text);
				
				if (!self.savedPermalink()) {
					self.realPermalink(text);
				}
			}
		});
		
		this.realPermalink = ko.observable();
		
		this.permalink = ko.computed({
			read: function() {
				return self.realPermalink();
			},
			write: function(text){
				self.realPermalink(text.slugify());
			}
		});
		this.savedPermalink = ko.observable();
	};
})(jQuery);