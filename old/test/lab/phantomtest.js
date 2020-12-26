var page = require('webpage').create();
page.open('http://limikael-netpoker.jit.su/table.html?viewcase=buy_in_dialog',
	function() {
		console.log("rendering...");
		page.render('example.png');
		phantom.exit();
	}
);