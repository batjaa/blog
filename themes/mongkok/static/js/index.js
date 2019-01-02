define(['jquery', 'hammer', 'bootstrap', 'setup', 'resize-text', 'bar-chart', 'donut-chart', 'progress-chart', 'jquery-color', 'portfolio', 'ticker', 'google-maps', 'contact', 'css-book', 'colorbox'], function($, Hammer) {
	$(function() {
		window.Hammer = Hammer;

		// Primary Color
		var primaryColor = $.Color($('.nav-toggle').css('background-color'));


		/* Setting objects */
		// Add property-value pairs in the following format to set up various components of the theme.
		// [Property]: [Value],

		var navSettings = {
				navPosition: 'top',
				offCanvasAnimation: 'push',
				verticalNavWidth: '220px',
				verticalNavShowIcons: true,
				navScrollingAnimationDuration: 300,
			},

			welcomeSettings = {
				fixFirstSection: true,
			},

			scrollingSettings = {
				momentumScrolling: true,
			},

			barChartSettings = {
				labelFontColor: primaryColor.toHexString(),
				labelFontSize: 12,
				labelFontWeight: 400,
				defaultBarFillColor: primaryColor.transition('#ffffff', 0.85).toHexString(),
				barVerticalSpacing: 3,
			},

			donutChartSettings = {
				paddingLeft: 150,
				labelFontSize: 12,
				labelFontWeight: 700,
				labelFontColor: '#666',
				arcStrokeColor: '#fff',
				arcStrokeWidth: 3,
				defaultArcFillColor: primaryColor.toHexString(),
				arcInnerRadiusPercent: 0,
				showLabel: true,
				showPercentage: false,
				heightToWidthRatio: 1/2,
			},

			progressChartSettings = {
				defaultColor: primaryColor.toHexString(),
				labelFontColor: '#666',
				labelWidth: 60,
			},

			portfolioSettings = {
				heightToWidthRatio: 3/4,
				minThumbnailWidth: 220,
				itemDetailsDropCap: true,
				animationDuration: 300,
				autoScroll: true,
			},

			cssBookSettings = {
				disable3dStyle: false,
				bookTransformPreset: 1,
				pageOffset: 6,
				thickness: 30,
				bookInitialTransform: 'translateZ(-100px) rotateY(-30deg)',
				bookHoverTransform: 'translateZ(0) rotateY(0deg) rotateX(0deg)',
				frontFaceInitialTransform: 'rotateY(0deg)',
				frontFaceHoverTransform: 'rotateY(-180deg)',
			},

			lightboxImageSettings = {
				rel: 'gal',
				scalePhotos: true,
				maxWidth: '90%',
				maxHeight: '90%',
			},

			lightboxVideoSettings = {
				rel: 'gal',
				iframe: true,
				innerWidth: 640,
				innerHeight: 390,
				maxWidth: '90%',
				maxHeight: '90%',
			},

			lightboxWebpageSettings = {
				iframe: true,
				width: '80%',
				height: '80%',
				maxWidth: '90%',
				maxHeight: '90%',
			};

		// Setup
		$('body').setup($.extend({}, navSettings, welcomeSettings, scrollingSettings));

		// Charts
		$('.bar-chart').barChart(barChartSettings);
		$('.progress-chart').progressChart(progressChartSettings);
		$('.donut-chart').donutChart(donutChartSettings);

		// Portfolio
		$('#portfolio').portfolio(portfolioSettings);
		$('#blog').portfolio(portfolioSettings);

		// CSS Books
		$('figure.css-book').cssBook(cssBookSettings);

		// Activate Colorbox Lightbox
		$('a.lightbox-image').colorbox(lightboxImageSettings);
		$('a.lightbox-video').colorbox(lightboxVideoSettings);
		$('a.lightbox-webpage').colorbox(lightboxWebpageSettings);

		window.textResized = 0;
		// Resize text
		setTimeout(function(){
			$('.span-text').resizeText();

			var spanTextLength = $('.span-text').length,
				checkResized;

			checkResized = setInterval(function () {
				if (window.textResized == spanTextLength){
					clearInterval(checkResized);
					$('.ticker').ticker();

					setTimeout(function () {
						// Preloader
						$(document).ready(function () {
							$('.preloader').animate({
								opacity: 0},
								400, function() {
									$(this).hide();
								});
						});
					}, 400);
				}
			}, 100);
		}, 200);

		window.postLoad();
	});
});