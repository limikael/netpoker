<?php

	namespace wpnetpoker;

	/**
	 * Echo for attribute.
	 */
	function echo_attr($s) {
		echo htmlspecialchars($s);
	}

	/**
	 * Echo for html.
	 */
	function echo_html($s) {
		echo htmlspecialchars($s);
	}

	/**
	 * A simple templating engine. This is a simple example of how to use this class:
	 *
	 * <code>    
	 *   $t=new Template("templatefile.php");
	 *   $t->set("hello","hello world");
	 *   $t->show();
	 * </code>
	 *
	 * In this example, we have a template called `templatefile.php` that gets loaded
	 * and rendered using the `show` call. The variables registered using the `set` method
	 * will be made available to the template in the global scope. The contents of 
	 * the `templatefile.php` for this example could be:
	 *
	 * <code>
	 *   <html>
	 *     <body>
	 *       We say hello like this: <?php echo $hello; ?>
	 *     </body>
	 *   </html>
	 * </code>
	 */
	class Template {

		private $filename;
		private $vars;

		/**
		 * Create a Template for the specified file.
		 * @param mixed $filename The file to use as template.
		 */
		public function __construct($filename) {
			$this->filename=$filename;
			$this->vars=array();
		}

		/**
		 * Set a variable that can be accessed by the template. 
		 * 
		 * The variable will be available to the template in the global scope.
		 * @param mixed $name The name of the variable.
		 * @param mixed $value The value that the variable should take.
		 */
		public function set($name, $value) {
			$this->vars[$name]=$value;
		}

		/**
		 * Render the template and output it to the browser.
		 */
		public function show() {
			foreach ($this->vars as $key=>$value)
				$$key=$value;

			require $this->filename;
		}

		/**
		 * Render template, but don't ouput it to the browser.
		 * 
		 * This is useful if we want to
		 * use a template inside another template. For example, we might have a
		 * page template that defaines header and footer for our page. Inside the page
		 * template we want to display the content generated by a content template.
		 * We can do this by first rendering the content template:
		 *
		 * <code>
		 *   $contentTemplate=new Template("the_content_templte.php");
		 *   // Set any variables used by the content template.
		 *   $content=$contentTemplate->render();
		 * </code>
		 *
		 * Now, we use the rendered content as input for our page template and output
		 * everything to the browser:
		 *
		 * <code>
		 *   $pageTemplate=new Template("the_page_template.php");
		 *   $pageTemplate->set("content",$content);
		 *   $pageTemplate->show();
		 * </code>
		 */
		public function render() {
			foreach ($this->vars as $key=>$value)
				$$key=$value;

			ob_start();
			require $this->filename;
			return ob_get_clean();
		}
	}