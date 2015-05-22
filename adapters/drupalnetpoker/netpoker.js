jQuery(function($) {
	/**
	 * Update number of players based on new state.
	 * @method updateNumPlayers
	 */
	function updateNumPlayers(data) {
		if (!data) {
			console.log("got no data...");
			return;
		}

		$('.netpoker-current-players').each(function(i, el) {
			var cashgameId=$(el).attr("cashgame-id");

			if (cashgameId && data.hasOwnProperty(cashgameId))
				$(el).text(data[cashgameId]);
		});
	}

	/**
	 * We got the new state with number of players.
	 * @method onNumPlayersStateLoaded
	 */
	function onNumPlayersStateLoaded(data) {
		console.log("num players state loaded...");
		console.log(data);

		updateNumPlayers(data);

		setTimeout(loadNumPlayersState, 1000);
	}

	/**
	 * Request the number of players based on the current state.
	 * @method requestNumPlayersState
	 */
	function loadNumPlayersState() {
		var numPlayersState = {};

		$('.netpoker-current-players').each(function(i, el) {
			numPlayersState[$(el).attr("cashgame-id")] = parseInt($(el).text());
		});

		var stateEncoded = encodeURIComponent(JSON.stringify(numPlayersState));
		var url = Drupal.settings.basePath + "?q=netpoker/pollNumPlayers";
		url+="&state="+stateEncoded;

		$.getJSON(url, onNumPlayersStateLoaded);
	}

	$(document).ready(function() {
		loadNumPlayersState();
	});
});