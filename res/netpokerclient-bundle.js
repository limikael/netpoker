(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const Resources=require("./Resources");

class NetPokerClient {
	constructor(params) {
		this.params=params;

		this.element=params.element;
		this.pixiApp=new PIXI.Application({
			width: this.element.clientWidth,
			height: this.element.clientHeight
		});

		this.pixiApp.view.style.position="absolute";
		this.pixiApp.view.style.top=0;
		this.pixiApp.view.style.left=0;

		this.element.appendChild(this.pixiApp.view);

		let spriteSheetUrl=
			this.params.resourceBaseUrl+
			"/netpokerclient-spritesheet.json";

		this.resources=new Resources(spriteSheetUrl);
	}

	async run() {
		await this.resources.load();

		let table=this.resources.createSprite("table");
		this.pixiApp.stage.addChild(table);
	}
}

module.exports=NetPokerClient;

},{"./Resources":2}],2:[function(require,module,exports){
const THEME=require("./theme.json");

class Resources {
	constructor(spriteSheetUrl) {
		this.spriteSheetUrl=spriteSheetUrl
	}

	createSprite(id) {
		let fn=THEME[id];
		return new PIXI.Sprite(this.sheet.textures[fn]);
	}

	async load() {
		await new Promise((resolve,reject)=>{
			PIXI.Loader.shared.add(this.spriteSheetUrl);
			PIXI.Loader.shared.load(resolve);
		});

		this.sheet=PIXI.Loader.shared.resources[this.spriteSheetUrl];
	}
}

module.exports=Resources;

},{"./theme.json":3}],3:[function(require,module,exports){
module.exports={
	"table": "table.png"
}
},{}],4:[function(require,module,exports){
const NetPokerClient=require("./app/NetPokerClient");
const ArrayUtil=require("../utils/ArrayUtil");

(function($) {
	$.fn.netpoker=function(params) {
		$(this).each(function() {
			let paramsCopy={...params};
			paramsCopy.element=$(this)[0];
			let netPokerClient=new NetPokerClient(paramsCopy);
			netPokerClient.run();
		});
	}
})(jQuery);

},{"../utils/ArrayUtil":5,"./app/NetPokerClient":1}],5:[function(require,module,exports){
class ArrayUtil {

	/**
	 * Remove an element.
	 * @method remove
	 * @static
	 */
	static remove(array, element) {
		var index = array.indexOf(element);

		if (index >= 0)
			array.splice(index, 1);
	}

	/**
	 * Shuffles the "arr" Array (in place) according to a randomly chosen permutation
	 * This is the classic Fisher-Yates style shuffle.
	 * @method
	 * @static
	 */
	static shuffle(arr) {
		var n = arr.length;
		while (n > 0) {
			var k = Math.floor(Math.random() * n);
			n--;
			var temp = arr[n];
			arr[n] = arr[k];
			arr[k] = temp;
		}

		return arr;
	}

	/**
	 * Check if every value in both arrays equal.
	 * It doesn't do deep comparision in case the conatined elements are arrays.
	 * Not tested since I didn't actually need it.
	 * @method equals
	 * @static
	 */
	static equals(a, b) {
		if (a.length != b.length)
			return false;

		for (var i = 0; i < a.length; i++)
			if (a[i] != b[i])
				return false;

		return true;
	}

	/**
	 * Comparision function for numeric sort.
	 * @method compareNumbers
	 */
	static compareNumbers(a, b) {
		return a - b;
	}

	/**
	 * Shallow copy.
	 * @method copy
	 */
	static copy(array) {
		var copy = [];

		for (var i = 0; i < array.length; i++)
			copy.push(array[i]);

		return copy;
	}
}

module.exports = ArrayUtil;
},{}]},{},[4]);
