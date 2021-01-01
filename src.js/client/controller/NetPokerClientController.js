/**
 * Client.
 * @module client
 */

const TableController = require("./TableController");
const InterfaceController = require("./InterfaceController");
const EventQueue=require("../../utils/EventQueue");
const TWEEN = require('@tweenjs/tween.js');

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

		this.netPokerClientView.getButtonsView().on("buttonClick", this.onButtonClick);
		//this.netPokerClientView.getTableInfoView().on(TableInfoView.BUTTON_CLICK, this.onButtonClick, this);
		this.netPokerClientView.getDialogView().on("buttonClick", this.onButtonClick);
		this.netPokerClientView.on("seatClick", this.onSeatClick);

		this.netPokerClientView.getChatView().on("chat", this.onChat);
		//this.netPokerClientView.settingsView.addEventListener(SettingsView.BUY_CHIPS_CLICK, this.onBuyChipsButtonClick, this);
		this.netPokerClientView.getSettingsView().on("checkboxChange", this.onCheckboxChange);

		this.netPokerClientView.getPresetButtonsView().on("change", this.onPresetButtonsChange);
		this.netPokerClientView.getTableButtonsView().on("tableClick", this.onTableButtonClick);

		this.netPokerClientView.clear();
		this.netPokerClientView.getLoadingScreen().show("CONNECTING");
	}

	/**
	 * Set connection.
	 * @method setProtoConnection
	 */
	setConnection(connection) {
		if (connection==this.connection)
			return;

		if (this.connection)
			this.connection.removeListener("message",this.onConnectionMessage);

		TWEEN.removeAll();
		this.netPokerClientView.clear();
		this.netPokerClientView.getLoadingScreen().show("CONNECTING");
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
	onButtonClick=(button, value)=>{
		this.connection.send("buttonClick",{
			button: button,
			value: value
		});
	}

	/**
	 * Seat click.
	 * @method onSeatClick
	 * @private
	 */
	onSeatClick=(seatIndex)=>{
		this.connection.send("seatClick",{
			seatIndex: seatIndex
		});
	}

	/**
	 * On send chat message.
	 * @method onViewChat
	 */
	onChat=(text)=>{
		this.connection.send("chat",{
			text: text
		});
	}

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
	onPresetButtonsChange=()=> {
		let presetButtonsView = this.netPokerClientView.getPresetButtonsView();
		let params={};
		let c = presetButtonsView.getCurrent();

		if (c != null) {
			params.button = c.id;
			params.value = c.value;
		}

		this.connection.send("presetButtonClick",params);
	}

	/**
	 * Checkbox change.
	 * @method onCheckboxChange
	 */
	onCheckboxChange=(id, checked)=>{
		this.connection.send("checkbox",{
			id: id,
			checked: checked
		});
	}

	/**
	 * Table button click.
	 * @method onTableButtonClick
	 */
	onTableButtonClick=(index)=>{
		this.connection.send("tableButtonClick",{
			index: index
		});
	}
}

module.exports = NetPokerClientController;