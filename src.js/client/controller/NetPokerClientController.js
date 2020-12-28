/**
 * Client.
 * @module client
 */

const TableController = require("./TableController");
const InterfaceController = require("./InterfaceController");
const EventQueue=require("../../utils/EventQueue");

/**
 * Main controller
 * @class NetPokerClientController
 */
class NetPokerClientController {
	constructor(view) {
		this.netPokerClientView = view;
		this.connection = null;
		this.eventQueue = new EventQueue();

		this.tableController = new TableController(this.eventQueue, this.netPokerClientView);
		this.interfaceController = new InterfaceController(this.eventQueue, this.netPokerClientView);

		/*this.netPokerClientView.getButtonsView().on(ButtonsView.BUTTON_CLICK, this.onButtonClick, this);
		this.netPokerClientView.getTableInfoView().on(TableInfoView.BUTTON_CLICK, this.onButtonClick, this);
		this.netPokerClientView.getDialogView().on(DialogView.BUTTON_CLICK, this.onButtonClick, this);
		this.netPokerClientView.on(NetPokerClientView.SEAT_CLICK, this.onSeatClick, this);

		this.netPokerClientView.chatView.addEventListener("chat", this.onViewChat, this);
		this.netPokerClientView.settingsView.addEventListener(SettingsView.BUY_CHIPS_CLICK, this.onBuyChipsButtonClick, this);
		this.netPokerClientView.settingsView.addEventListener(SettingsView.CHECKBOX_CHANGE, this.onCheckboxChange, this);

		this.netPokerClientView.getPresetButtonsView().addEventListener(PresetButtonsView.CHANGE, this.onPresetButtonsChange, this);
		this.netPokerClientView.getTableButtonsView().on(TableButtonsView.TABLE_CLICK, this.onTableButtonClick, this);*/
	}

	/**
	 * Set connection.
	 * @method setProtoConnection
	 */
	setConnection(connection) {
		if (connection==this.connection)
			return;

		if (this.connection)
			this.connection.off("message",this.onConnectionMessage);

		this.netPokerClientView.clear();
		this.eventQueue.clear();
		this.connection=connection;

		if (this.connection)
			this.connection.on("message",this.onConnectionMessage);
	}

	/**
	 * Incoming message.
	 * Enqueue for processing.
	 * @method onProtoConnectionMessage
	 * @private
	 */
	onConnectionMessage=(message)=>{
		this.eventQueue.enqueue(message.type,message);
	}

	/**
	 * Button click.
	 * This function handles clicks from both the dialog and game play buttons.
	 * @method onButtonClick
	 * @private
	 */
	/*NetPokerClientController.prototype.onButtonClick = function(e) {
		if (!this.protoConnection)
			return;

		console.log("button click, v=" + e.value);

		var m = new ButtonClickMessage(e.button, e.value);
		this.protoConnection.send(m);
	}*/

	/**
	 * Seat click.
	 * @method onSeatClick
	 * @private
	 */
	/*NetPokerClientController.prototype.onSeatClick = function(e) {
		var m = new SeatClickMessage(e.seatIndex);
		this.protoConnection.send(m);
	}*/

	/**
	 * On send chat message.
	 * @method onViewChat
	 */
	/*NetPokerClientController.prototype.onViewChat = function(e) {
		var message = new ChatMessage();
		message.user = "";
		message.text = e.text;

		this.protoConnection.send(message);
	}*/

	/**
	 * On buy chips button click.
	 * @method onBuyChipsButtonClick
	 */
	/*NetPokerClientController.prototype.onBuyChipsButtonClick = function() {
		console.log("buy chips click");

		this.protoConnection.send(new ButtonClickMessage(ButtonData.BUY_CHIPS));
	}*/

	/**
	 * PresetButtons change message.
	 * @method onPresetButtonsChange
	 */
	/*NetPokerClientController.prototype.onPresetButtonsChange = function() {
		var presetButtonsView = this.netPokerClientView.getPresetButtonsView();
		var message = new PresetButtonClickMessage();

		var c = presetButtonsView.getCurrent();
		if (c != null) {
			message.button = c.id;
			message.value = c.value;
		}

		this.protoConnection.send(message);
	}*/

	/**
	 * Checkbox change.
	 * @method onCheckboxChange
	 */
	/*NetPokerClientController.prototype.onCheckboxChange = function(ev) {
		this.protoConnection.send(new CheckboxMessage(ev.checkboxId, ev.checked));
	}*/

	/**
	 * Table button click.
	 * @method onTableButtonClick
	 */
	/*NetPokerClientController.prototype.onTableButtonClick = function(index) {
		this.protoConnection.send(new TableButtonClickMessage(index));
	}*/
}

module.exports = NetPokerClientController;