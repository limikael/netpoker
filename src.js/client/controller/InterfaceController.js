/**
 * Client.
 * @module client
 */

var ShowDialogMessage = require("../../proto/messages/ShowDialogMessage");
var ButtonsMessage = require("../../proto/messages/ButtonsMessage");
var ChatMessage = require("../../proto/messages/ChatMessage");
var TableInfoMessage = require("../../proto/messages/TableInfoMessage");
var HandInfoMessage = require("../../proto/messages/HandInfoMessage");
var PresetButtonsMessage = require("../../proto/messages/PresetButtonsMessage");
var InterfaceStateMessage = require("../../proto/messages/InterfaceStateMessage");
var CheckboxMessage = require("../../proto/messages/CheckboxMessage");
var PreTournamentInfoMessage = require("../../proto/messages/PreTournamentInfoMessage");
var TableButtonsMessage = require("../../proto/messages/TableButtonsMessage");
var TournamentResultMessage = require("../../proto/messages/TournamentResultMessage");

/**
 * Control user interface.
 * @class InterfaceController
 */
function InterfaceController(messageSequencer, view) {
	this.messageSequencer = messageSequencer;
	this.view = view;

	this.messageSequencer.addMessageHandler(ButtonsMessage.TYPE, this.onButtonsMessage, this);
	this.messageSequencer.addMessageHandler(ShowDialogMessage.TYPE, this.onShowDialogMessage, this);
	this.messageSequencer.addMessageHandler(ChatMessage.TYPE, this.onChat, this);
	this.messageSequencer.addMessageHandler(TableInfoMessage.TYPE, this.onTableInfoMessage, this);
	this.messageSequencer.addMessageHandler(HandInfoMessage.TYPE, this.onHandInfoMessage, this);
	this.messageSequencer.addMessageHandler(InterfaceStateMessage.TYPE, this.onInterfaceStateMessage, this);
	this.messageSequencer.addMessageHandler(CheckboxMessage.TYPE, this.onCheckboxMessage, this);
	this.messageSequencer.addMessageHandler(PreTournamentInfoMessage.TYPE, this.onPreTournamentInfoMessage, this);
	this.messageSequencer.addMessageHandler(TableButtonsMessage.TYPE, this.onTableButtonsMessage, this);
	this.messageSequencer.addMessageHandler(TournamentResultMessage.TYPE, this.onTournamentResultMessage, this);

	this.messageSequencer.addMessageHandler(PresetButtonsMessage.TYPE, this.onPresetButtons, this);
}

/**
 * Table buttons message.
 * @method onTableButtonsMessage
 */
InterfaceController.prototype.onTableButtonsMessage = function(m) {
	console.log("table buttons...");
}

/**
 * Buttons message.
 * @method onButtonsMessage
 */
InterfaceController.prototype.onButtonsMessage = function(m) {
	var buttonsView = this.view.getButtonsView();

	buttonsView.setButtons(m.getButtons(), m.sliderButtonIndex, parseInt(m.min, 10), parseInt(m.max, 10));
}

/**
 * PresetButtons message.
 * @method onPresetButtons
 */
InterfaceController.prototype.onPresetButtons = function(m) {
	var presetButtonsView = this.view.getPresetButtonsView();
	var buttons = presetButtonsView.getButtons();
	var havePresetButton = false;

	for (var i = 0; i < buttons.length; i++) {
		if (i > m.buttons.length) {
			buttons[i].hide();
		} else {
			var data = m.buttons[i];

			if (data == null) {
				buttons[i].hide();
			} else {
				havePresetButton = true;
				buttons[i].show(data.button, data.value);
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
InterfaceController.prototype.onShowDialogMessage = function(m) {
	var dialogView = this.view.getDialogView();

	dialogView.show(m.getText(), m.getButtons(), m.getDefaultValue());
}


/**
 * On chat message.
 * @method onChat
 */
InterfaceController.prototype.onChat = function(m) {
	this.view.chatView.addText(m.user, m.text);
}

/**
 * Handle table info message.
 * @method onTableInfoMessage
 */
InterfaceController.prototype.onTableInfoMessage = function(m) {
	var tableInfoView = this.view.getTableInfoView();

	tableInfoView.setTableInfoText(m.getText());
	tableInfoView.setJoinButtonVisible(m.getShowJoinButton());
	tableInfoView.setLeaveButtonVisible(m.getShowLeaveButton());
}

/**
 * Handle hand info message.
 * @method onHandInfoMessage
 */
InterfaceController.prototype.onHandInfoMessage = function(m) {
	var tableInfoView = this.view.getTableInfoView();

	tableInfoView.setHandInfoText(m.getText(), m.getCountDown());
}

/**
 * Handle interface state message.
 * @method onInterfaceStateMessage
 */
InterfaceController.prototype.onInterfaceStateMessage = function(m) {
	var settingsView = this.view.getSettingsView();

	settingsView.setVisibleButtons(m.getVisibleButtons());
}

/**
 * Handle checkbox message.
 * @method onCheckboxMessage
 */
InterfaceController.prototype.onCheckboxMessage = function(m) {
	console.log(m);

	var settingsView = this.view.getSettingsView();

	settingsView.setCheckboxChecked(m.getId(), m.getChecked());
}

/**
 * Handle pre torunament info message.
 * @method onPreTournamentInfoMessage
 */
InterfaceController.prototype.onPreTournamentInfoMessage = function(m) {
	var tableInfoView = this.view.getTableInfoView();

	tableInfoView.setPreTournamentInfoText(m.getText(), m.getCountdown());
}

/**
 * Handle tournament result message.
 * @method onTournamentResultMessage
 */
InterfaceController.prototype.onTournamentResultMessage = function(m) {
	var tableInfoView = this.view.getTableInfoView();

	tableInfoView.setTournamentResultText(m.getText(), m.getRightColumnText());
}

/**
 * Table buttons message.
 * @method onTableButtonsMessage
 */
InterfaceController.prototype.onTableButtonsMessage = function(m) {
	var tableButtonsView = this.view.getTableButtonsView();

	tableButtonsView.showButtons(m.getEnabled(), m.getCurrentIndex());
}

module.exports = InterfaceController;