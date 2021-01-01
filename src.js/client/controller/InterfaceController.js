/**
 * Client.
 * @module client
 */

/**
 * Control user interface.
 * @class InterfaceController
 */
class InterfaceController {
	constructor(eventQueue, view) {
		this.eventQueue = eventQueue;
		this.view = view;

		this.eventQueue.on("buttons",this.onButtonsMessage);
		this.eventQueue.on("showDialog",this.onShowDialogMessage);
		this.eventQueue.on("chat",this.onChat);
		this.eventQueue.on("tableInfo",this.onTableInfoMessage);
		this.eventQueue.on("handInfo",this.onHandInfoMessage);
		this.eventQueue.on("interfaceState",this.onInterfaceStateMessage);
		this.eventQueue.on("chekbox",this.onCheckboxMessage);
		this.eventQueue.on("preTournamentInfo",this.onPreTournamentInfoMessage);
		this.eventQueue.on("tableButtons",this.onTableButtonsMessage);
		this.eventQueue.on("tournamentResult",this.onTournamentResultMessage);
		this.eventQueue.on("presetButtons",this.onPresetButtonsMessage);
		this.eventQueue.on("stateComplete",this.onStateComplete);
	}

	onStateComplete=()=>{
		this.view.getLoadingScreen().hide();
	}

	/**
	 * Buttons message.
	 * @method onButtonsMessage
	 */
	onButtonsMessage=(m)=>{
		var buttonsView = this.view.getButtonsView();

		buttonsView.clear();
		buttonsView.showButtons(m.buttons,m.values);

		if (m.hasOwnProperty("sliderIndex"))
			buttonsView.showSlider(m.sliderIndex,m.sliderMax);
	}

	/**
	 * PresetButtons message.
	 * @method onPresetButtons
	 */
	onPresetButtonsMessage=(m)=> {
		var presetButtonsView = this.view.getPresetButtonsView();
		var buttons = presetButtonsView.getButtons();
		var havePresetButton = false;

		for (var i = 0; i < buttons.length; i++) {
			if (i > m.buttons.length) {
				buttons[i].hide();
			} else {
				if (!m.buttons[i]) {
					buttons[i].hide();
				} else {
					havePresetButton = true;
					buttons[i].show(m.buttons[i], m.values[i]);
				}
			}
		}

		presetButtonsView.setCurrent(m.current);

		if (havePresetButton)
			this.view.getButtonsView().clear();
	}

	/**
	 * Show dialog.
	 * @method onShowDialogMessage
	 */
	onShowDialogMessage=(m)=>{
		var dialogView = this.view.getDialogView();

		dialogView.show(m.text, m.buttons, m.defaultValue);
	}


	/**
	 * On chat message.
	 * @method onChat
	 */
	onChat=(m)=>{
		this.view.chatView.addText(m.user, m.text);
	}

	/**
	 * Handle table info message.
	 * @method onTableInfoMessage
	 */
	onTableInfoMessage=(m)=>{
		var tableInfoView = this.view.getTableInfoView();

		tableInfoView.setTableInfoText(m.text);
		tableInfoView.setJoinButtonVisible(m.showJoinButton);
		tableInfoView.setLeaveButtonVisible(m.showLeaveButton);
	}

	/**
	 * Handle hand info message.
	 * @method onHandInfoMessage
	 */
	onHandInfoMessage=(m)=>{
		var tableInfoView = this.view.getTableInfoView();

		tableInfoView.setHandInfoText(m.text, m.countdown);
	}

	/**
	 * Handle interface state message.
	 * @method onInterfaceStateMessage
	 */
	onInterfaceStateMessage=(m)=>{
		var settingsView = this.view.getSettingsView();

		settingsView.setVisibleButtons(m.visibleButtons);
	}

	/**
	 * Handle checkbox message.
	 * @method onCheckboxMessage
	 */
	onCheckboxMessage=(m)=>{
		console.log(m);

		var settingsView = this.view.getSettingsView();

		settingsView.setCheckboxChecked(m.getId(), m.getChecked());
	}

	/**
	 * Handle pre torunament info message.
	 * @method onPreTournamentInfoMessage
	 */
	onPreTournamentInfoMessage=(m)=>{
		var tableInfoView = this.view.getTableInfoView();

		tableInfoView.setPreTournamentInfoText(m.getText(), m.getCountdown());
	}

	/**
	 * Handle tournament result message.
	 * @method onTournamentResultMessage
	 */
	onTournamentResultMessage=(m)=>{
		var tableInfoView = this.view.getTableInfoView();

		tableInfoView.setTournamentResultText(m.getText(), m.getRightColumnText());
	}

	/**
	 * Table buttons message.
	 * @method onTableButtonsMessage
	 */
	onTableButtonsMessage=(m)=>{
		var tableButtonsView = this.view.getTableButtonsView();

		tableButtonsView.showButtons(m.getEnabled(), m.getCurrentIndex());
	}
}

module.exports = InterfaceController;