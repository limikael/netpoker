class PixiUtil {
	static findTopParent(o) {
		while (o.parent)
			o=o.parent;

		return o;
	}

	static globalHitTest(object, globalPoint) {
		if((globalPoint.x >= object.getBounds().x ) && 
				(globalPoint.x <= (object.getBounds().x + object.getBounds().width)) &&
				(globalPoint.y >= object.getBounds().y) && 
				(globalPoint.y <= (object.getBounds().y + object.getBounds().height)))
			return true;

		return false;
	}
}

module.exports=PixiUtil;