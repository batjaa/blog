jQuery(document).ready(function(){

	$('#contact-form').submit(function(e) {
		e.preventDefault();

		var action = $(this).attr('action'),
			$spinner = $('<i />').addClass('fa fa-lg fa-spin fa-spinner');
			originalSubmitBtnHtml = $('#contact-form-submit-btn').attr('disabled','disabled').html();

		$('#contact-form-submit-btn').html('').append($spinner);
		$('#message').empty();

	  var $form = $(this);
		$.post(action, $form.serialize())
			.then(function (data) {
				$('#message').html(data);
				$('#contact-form-submit-btn').html(originalSubmitBtnHtml).removeAttr('disabled');
				// if(data.match('Thank you') !== null) $('#contact-form').slideUp('fast');
			});

		return false;
	});

});
