(function () {
	'use strict';

	// The theme's section container (setup.js) preventDefault()s every wheel
	// event and only applies deltaY to its own vertical scroll, so horizontal
	// trackpad swipes never reach the strip's native overflow-x scrolling.
	// Handle horizontal-dominant gestures here and keep them from bubbling.
	function init() {
		document.querySelectorAll('.project-card-list').forEach(function (list) {
			list.addEventListener('wheel', function (e) {
				if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
				e.preventDefault();
				e.stopPropagation();
				list.scrollLeft += e.deltaX * (e.deltaMode === 0 ? 1 : 18);
			}, { passive: false });
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
