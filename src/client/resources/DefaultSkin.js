module.exports = {
	graphics: {
		textures: [
			{
				id: "componentsTexture",
				file: "components.png"
			},
			{
				id: "table",
				file: "table.png"
			}
		],
		tableBackground: { 
			texture: "table",
			coords: [0, 0, 960, 720]
		},


		timerBackground: { 
			texture: "componentsTexture",
			coords: [121,200,32,32]
		},

		seatPlate: { 
			texture: "componentsTexture",
			coords: [40, 116, 160, 70]
		},

		cardFrame: { 
			texture: "componentsTexture",
			coords: [498, 256, 87, 122]
		},
		cardBack: { 
			texture: "componentsTexture",
			coords: [402, 256, 87, 122]
		},

		dividerLine: { 
			texture: "componentsTexture",
			coords: [568, 77, 2, 170]
		},

		suitSymbol0: { 
			texture: "componentsTexture",
			coords: [246, 67, 18, 19]
		},
		suitSymbol1: { 
			texture: "componentsTexture",
			coords: [269, 67, 18, 19]
		},
		suitSymbol2: { 
			texture: "componentsTexture",
			coords: [292, 67, 18, 19]
		},
		suitSymbol3: { 
			texture: "componentsTexture",
			coords: [315, 67, 18, 19]
		},
		
		framePlate: { 
			texture: "componentsTexture",
			coords: [301, 262, 74, 76]
		},
		bigButton: { 
			texture: "componentsTexture",
			coords: [33, 298, 95, 94]
		},
		dialogButton: { 
			texture: "componentsTexture",
			coords: [383, 461, 82, 47]
		},
		dealerButton: { 
			texture: "componentsTexture",
			coords: [197, 236, 41, 35]
		},

		textScrollbarTrack: { 
			texture: "componentsTexture",
			coords: [371,50,60,10]
		},
		textScrollbarThumb: { 
			texture: "componentsTexture",
			coords: [371,32,60,10]
		},
		wrenchIcon: { 
			texture: "componentsTexture",
			coords: [462,389,21,21]
		},
		chatBackground: { 
			texture: "componentsTexture",
			coords: [301,262,74,76]
		},
		checkboxBackground: { 
			texture: "componentsTexture",
			coords: [501,391,18,18]
		},
		checkboxTick: { 
			texture: "componentsTexture",
			coords: [528,392,21,16]
		},
		buttonBackground: { 
			texture: "componentsTexture",
			coords: [68,446,64,64]
		},
		sliderBackground: { 
			texture: "componentsTexture",
			coords: [313,407,120,30]
		},
		sliderKnob: { 
			texture: "componentsTexture",
			coords: [318,377,28,28]
		},
		upArrow: { 
			texture: "componentsTexture",
			coords: [483,64,12,8]
		},

		chip0: { 
			texture: "componentsTexture",
			coords: [30, 25, 40, 30]
		},
		chip1: { 
			texture: "componentsTexture",
			coords: [70, 25, 40, 30]
		},
		chip2: { 
			texture: "componentsTexture",
			coords: [110, 25, 40, 30]
		},
		chip3: { 
			texture: "componentsTexture",
			coords: [150, 25, 40, 30]
		},
		chip4: { 
			texture: "componentsTexture",
			coords: [190, 25, 40, 30]
		}
	},


	positions: {

		communityCardsPosition: [255, 190],

		seatPosition0: [287, 118], 
		seatPosition1: [483, 112], 
		seatPosition2: [676, 118],
		seatPosition3: [844, 247], 
		seatPosition4: [817, 413], 
		seatPosition5: [676, 490],
		seatPosition6: [483, 495], 
		seatPosition7: [287, 490], 
		seatPosition8: [140, 413],
		seatPosition9: [123, 247],


		dealerButtonPosition0: [347, 133],
		dealerButtonPosition1: [395, 133],
		dealerButtonPosition2: [574, 133],
		dealerButtonPosition3: [762, 267],
		dealerButtonPosition4: [715, 358],
		dealerButtonPosition5: [574, 434],
		dealerButtonPosition6: [536, 432],
		dealerButtonPosition7: [351, 432],
		dealerButtonPosition8: [193, 362],
		dealerButtonPosition9: [168, 266],


		betPosition0: [225,150], 
		betPosition1: [478,150], 
		betPosition2: [730,150],
		betPosition3: [778,196], 
		betPosition4: [748,322], 
		betPosition5: [719,360],
		betPosition6: [481,360], 
		betPosition7: [232,360], 
		betPosition8: [199,322],
		betPosition9: [181,200],

		potPosition: [485,315],
		bigButtonPosition: [366,575]

	},
	colors: {

		chipsColor0: 0x404040, 
		chipsColor1: 0x008000, 
		chipsColor2: 0x808000, 
		chipsColor3: 0x000080, 
		chipsColor4: 0xff0000
	},
	strings: {},
	values: {
		betAlign: [
			"left", "center", "right",
			"right", "right", 
			"right", "center", "left",
			"left", "left"
		]
	}
	/*,

	,*/

}