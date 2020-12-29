class PixiUtil {
	static findTopParent(o) {
		while (o.parent)
			o=o.parent;

		return o;
	}
}

module.exports=PixiUtil;